import { Document, DocumentType, AlertStatus } from '@prisma/client';
import { prisma } from '../utils/prisma.js';
import { NotFoundError, ForbiddenError } from '../middleware/errorHandler.js';

export interface CreateDocumentDTO {
    documentType: DocumentType;
    title: string;
    description?: string;
    issueDate?: string;
    expiryDate?: string;
    fileUrl?: string;
    fileType?: string;
    fileSizeBytes?: number;
}

export interface DocumentWithAlerts extends Document {
    alerts?: { alertType: string; scheduledAt: Date; status: AlertStatus }[];
    daysUntilExpiry?: number | null;
}

class DocumentService {
    async create(
        bikeId: string,
        userId: string,
        dto: CreateDocumentDTO
    ): Promise<DocumentWithAlerts> {
        // Verify bike ownership
        const bike = await prisma.bike.findFirst({
            where: { id: bikeId, userId, deletedAt: null },
        });

        if (!bike) {
            throw new NotFoundError('Bike not found');
        }

        const document = await prisma.document.create({
            data: {
                bikeId,
                userId,
                documentType: dto.documentType,
                title: dto.title,
                description: dto.description,
                issueDate: dto.issueDate ? new Date(dto.issueDate) : undefined,
                expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
                fileUrl: dto.fileUrl,
                fileType: dto.fileType,
                fileSizeBytes: dto.fileSizeBytes,
            },
        });

        // Generate alerts if there's an expiry date
        if (document.expiryDate) {
            await this.generateAlerts(document);
        }

        return this.enrichDocument(document);
    }

    async findByBike(bikeId: string, userId: string): Promise<DocumentWithAlerts[]> {
        const bike = await prisma.bike.findFirst({
            where: { id: bikeId, userId, deletedAt: null },
        });

        if (!bike) {
            throw new NotFoundError('Bike not found');
        }

        const documents = await prisma.document.findMany({
            where: { bikeId, deletedAt: null },
            include: {
                alerts: {
                    where: { status: AlertStatus.PENDING },
                    orderBy: { scheduledAt: 'asc' },
                },
            },
            orderBy: { expiryDate: 'asc' },
        });

        return documents.map((doc) => this.enrichDocument(doc));
    }

    async findById(documentId: string, userId: string): Promise<DocumentWithAlerts> {
        const document = await prisma.document.findFirst({
            where: { id: documentId, deletedAt: null },
            include: {
                alerts: { orderBy: { scheduledAt: 'asc' } },
                bike: { select: { userId: true, nickname: true, brand: true, model: true } },
            },
        });

        if (!document) {
            throw new NotFoundError('Document not found');
        }

        if (document.userId !== userId) {
            throw new ForbiddenError('You do not have access to this document');
        }

        return this.enrichDocument(document);
    }

    async update(
        documentId: string,
        userId: string,
        dto: Partial<CreateDocumentDTO>
    ): Promise<DocumentWithAlerts> {
        await this.findById(documentId, userId);

        const updated = await prisma.document.update({
            where: { id: documentId },
            data: {
                title: dto.title,
                description: dto.description,
                documentType: dto.documentType,
                issueDate: dto.issueDate ? new Date(dto.issueDate) : undefined,
                expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
                fileUrl: dto.fileUrl,
                fileType: dto.fileType,
                fileSizeBytes: dto.fileSizeBytes,
            },
        });

        // Regenerate alerts if expiry date changed
        if (dto.expiryDate !== undefined) {
            await prisma.documentAlert.deleteMany({
                where: { documentId, status: AlertStatus.PENDING },
            });

            if (updated.expiryDate) {
                await this.generateAlerts(updated);
            }
        }

        return this.enrichDocument(updated);
    }

    async delete(documentId: string, userId: string): Promise<void> {
        await this.findById(documentId, userId);

        await prisma.document.update({
            where: { id: documentId },
            data: { deletedAt: new Date() },
        });

        // Cancel pending alerts
        await prisma.documentAlert.updateMany({
            where: { documentId, status: AlertStatus.PENDING },
            data: { status: AlertStatus.ACKNOWLEDGED },
        });
    }

    async findExpiringDocuments(userId: string, days: number = 30): Promise<DocumentWithAlerts[]> {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + days);

        const documents = await prisma.document.findMany({
            where: {
                userId,
                deletedAt: null,
                expiryDate: {
                    lte: futureDate,
                    gte: new Date(),
                },
            },
            include: {
                bike: { select: { nickname: true, brand: true, model: true } },
            },
            orderBy: { expiryDate: 'asc' },
        });

        return documents.map((doc) => this.enrichDocument(doc));
    }

    private async generateAlerts(document: Document): Promise<void> {
        if (!document.expiryDate) return;

        const alertConfigs = [
            { alertType: '30_day', daysBefore: 30 },
            { alertType: '7_day', daysBefore: 7 },
            { alertType: '1_day', daysBefore: 1 },
            { alertType: 'expired', daysBefore: 0 },
        ];

        const now = new Date();
        const alerts = [];

        for (const config of alertConfigs) {
            const alertDate = new Date(document.expiryDate);
            alertDate.setDate(alertDate.getDate() - config.daysBefore);
            alertDate.setHours(9, 0, 0, 0); // 9 AM

            if (alertDate > now) {
                alerts.push({
                    documentId: document.id,
                    userId: document.userId,
                    alertType: config.alertType,
                    scheduledAt: alertDate,
                    status: AlertStatus.PENDING,
                });
            }
        }

        if (alerts.length > 0) {
            await prisma.documentAlert.createMany({ data: alerts });
        }
    }

    private enrichDocument(document: Document | any): DocumentWithAlerts {
        const now = new Date();
        let daysUntilExpiry: number | null = null;

        if (document.expiryDate) {
            const diffTime = new Date(document.expiryDate).getTime() - now.getTime();
            daysUntilExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }

        return {
            ...document,
            daysUntilExpiry,
        };
    }
}

export const documentService = new DocumentService();
