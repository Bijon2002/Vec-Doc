import { MaintenanceRecord } from '@prisma/client';
import { prisma } from '../utils/prisma.js';
import { NotFoundError, ForbiddenError } from '../middleware/errorHandler.js';

export interface CreateMaintenanceDTO {
    maintenanceType: string;
    odometerAtMaintenance: number;
    costAmount?: number;
    costCurrency?: string;
    serviceCenterName?: string;
    serviceCenterLocation?: string;
    technicianNotes?: string;
    partsUsed?: { name: string; brand?: string; quantity: string }[];
    receiptUrl?: string;
    performedAt?: string;
}

class MaintenanceService {
    async create(
        bikeId: string,
        userId: string,
        dto: CreateMaintenanceDTO
    ): Promise<MaintenanceRecord> {
        // Verify bike ownership
        const bike = await prisma.bike.findFirst({
            where: { id: bikeId, userId, deletedAt: null },
            include: {
                maintenanceSchedules: {
                    where: { maintenanceType: dto.maintenanceType },
                },
            },
        });

        if (!bike) {
            throw new NotFoundError('Bike not found');
        }

        // Calculate next due km based on schedule
        const schedule = bike.maintenanceSchedules[0];
        const nextDueKm = schedule?.intervalKm
            ? dto.odometerAtMaintenance + schedule.intervalKm
            : undefined;

        const nextDueDate = schedule?.intervalDays
            ? new Date(Date.now() + schedule.intervalDays * 24 * 60 * 60 * 1000)
            : undefined;

        const record = await prisma.maintenanceRecord.create({
            data: {
                bikeId,
                maintenanceType: dto.maintenanceType,
                odometerAtMaintenance: dto.odometerAtMaintenance,
                costAmount: dto.costAmount,
                costCurrency: dto.costCurrency || 'INR',
                serviceCenterName: dto.serviceCenterName,
                serviceCenterLocation: dto.serviceCenterLocation,
                technicianNotes: dto.technicianNotes,
                partsUsed: dto.partsUsed || [],
                receiptUrl: dto.receiptUrl,
                performedAt: dto.performedAt ? new Date(dto.performedAt) : new Date(),
                nextDueKm,
                nextDueDate,
            },
        });

        // If this is an oil change, update the bike record
        if (dto.maintenanceType === 'oil_change') {
            await prisma.bike.update({
                where: { id: bikeId },
                data: {
                    lastOilChangeKm: dto.odometerAtMaintenance,
                    lastOilChangeDate: record.performedAt,
                    currentOdometerKm: Math.max(bike.currentOdometerKm, dto.odometerAtMaintenance),
                },
            });
        } else {
            // Update odometer if maintenance odometer is higher
            if (dto.odometerAtMaintenance > bike.currentOdometerKm) {
                await prisma.bike.update({
                    where: { id: bikeId },
                    data: { currentOdometerKm: dto.odometerAtMaintenance },
                });
            }
        }

        return record;
    }

    async findByBike(
        bikeId: string,
        userId: string,
        type?: string
    ): Promise<MaintenanceRecord[]> {
        const bike = await prisma.bike.findFirst({
            where: { id: bikeId, userId, deletedAt: null },
        });

        if (!bike) {
            throw new NotFoundError('Bike not found');
        }

        return prisma.maintenanceRecord.findMany({
            where: {
                bikeId,
                ...(type && { maintenanceType: type }),
            },
            orderBy: { performedAt: 'desc' },
        });
    }

    async findById(recordId: string, userId: string): Promise<MaintenanceRecord> {
        const record = await prisma.maintenanceRecord.findUnique({
            where: { id: recordId },
            include: {
                bike: { select: { userId: true, brand: true, model: true, nickname: true } },
            },
        });

        if (!record) {
            throw new NotFoundError('Maintenance record not found');
        }

        if ((record as any).bike.userId !== userId) {
            throw new ForbiddenError('You do not have access to this record');
        }

        return record;
    }

    async getUpcoming(userId: string): Promise<{
        bikeId: string;
        bikeName: string;
        maintenanceType: string;
        nextDueKm: number | null;
        nextDueDate: Date | null;
        currentOdometerKm: number;
        kmRemaining: number | null;
    }[]> {
        const bikes = await prisma.bike.findMany({
            where: { userId, deletedAt: null, isActive: true },
            include: {
                maintenanceSchedules: { where: { isEnabled: true } },
                maintenanceRecords: {
                    orderBy: { performedAt: 'desc' },
                    distinct: ['maintenanceType'],
                },
            },
        });

        const upcoming = [];

        for (const bike of bikes) {
            for (const schedule of bike.maintenanceSchedules) {
                const lastRecord = bike.maintenanceRecords.find(
                    (r) => r.maintenanceType === schedule.maintenanceType
                );

                let nextDueKm = null;
                let kmRemaining = null;

                if (schedule.intervalKm) {
                    const lastKm = lastRecord?.odometerAtMaintenance || 0;
                    nextDueKm = lastKm + schedule.intervalKm;
                    kmRemaining = nextDueKm - bike.currentOdometerKm;
                }

                const nextDueDate = lastRecord?.nextDueDate || null;

                upcoming.push({
                    bikeId: bike.id,
                    bikeName: bike.nickname || `${bike.brand} ${bike.model}`,
                    maintenanceType: schedule.maintenanceType,
                    nextDueKm,
                    nextDueDate,
                    currentOdometerKm: bike.currentOdometerKm,
                    kmRemaining,
                });
            }
        }

        // Sort by urgency (lowest km remaining first)
        return upcoming.sort((a, b) => {
            if (a.kmRemaining === null) return 1;
            if (b.kmRemaining === null) return -1;
            return a.kmRemaining - b.kmRemaining;
        });
    }

    async updateSchedule(
        bikeId: string,
        userId: string,
        maintenanceType: string,
        intervalKm?: number,
        intervalDays?: number,
        isEnabled?: boolean
    ): Promise<void> {
        const bike = await prisma.bike.findFirst({
            where: { id: bikeId, userId, deletedAt: null },
        });

        if (!bike) {
            throw new NotFoundError('Bike not found');
        }

        await prisma.maintenanceSchedule.upsert({
            where: { bikeId_maintenanceType: { bikeId, maintenanceType } },
            create: {
                bikeId,
                maintenanceType,
                intervalKm,
                intervalDays,
                isEnabled: isEnabled ?? true,
            },
            update: {
                ...(intervalKm !== undefined && { intervalKm }),
                ...(intervalDays !== undefined && { intervalDays }),
                ...(isEnabled !== undefined && { isEnabled }),
            },
        });
    }
}

export const maintenanceService = new MaintenanceService();
