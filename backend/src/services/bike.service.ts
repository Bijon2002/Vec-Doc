import { Bike, FuelType, VehicleType } from '@prisma/client';
import { prisma } from '../utils/prisma.js';
import { NotFoundError, ForbiddenError } from '../middleware/errorHandler.js';

export interface CreateBikeDTO {
    nickname?: string;
    brand: string;
    model: string;
    year: number;
    engineCapacityCc?: number;
    fuelType?: FuelType;
    vehicleType?: VehicleType;
    registrationNumber?: string;
    vinNumber?: string;
    oilChangeIntervalKm?: number;
    currentOdometerKm?: number;
    lastOilChangeKm?: number;
    isPrimary?: boolean;
    purchaseDate?: string;
}

export interface UpdateBikeDTO extends Partial<CreateBikeDTO> {
    isActive?: boolean;
}

export interface OilChangeStatus {
    status: 'ok' | 'due_soon' | 'overdue';
    kmRemaining: number;
    kmSinceLastChange: number;
    percentageUsed: number;
    nextChangeAtKm: number;
    overdueByKm: number;
}

class BikeService {
    async create(userId: string, dto: CreateBikeDTO): Promise<Bike> {
        // If this is set as primary, unset other primary bikes
        if (dto.isPrimary) {
            await prisma.bike.updateMany({
                where: { userId, isPrimary: true, deletedAt: null },
                data: { isPrimary: false },
            });
        }

        // If no bikes exist, make this the primary
        const bikeCount = await prisma.bike.count({
            where: { userId, deletedAt: null },
        });

        const bike = await prisma.bike.create({
            data: {
                userId,
                nickname: dto.nickname,
                brand: dto.brand,
                model: dto.model,
                year: dto.year,
                engineCapacityCc: dto.engineCapacityCc,
                fuelType: dto.fuelType || FuelType.PETROL,
                vehicleType: dto.vehicleType || VehicleType.MOTORBIKE,
                registrationNumber: dto.registrationNumber,
                vinNumber: dto.vinNumber,
                oilChangeIntervalKm: dto.oilChangeIntervalKm || 2500,
                currentOdometerKm: dto.currentOdometerKm || 0,
                lastOilChangeKm: dto.lastOilChangeKm || 0,
                isPrimary: dto.isPrimary || bikeCount === 0,
                purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : undefined,
            },
        });

        // Create default maintenance schedules
        await this.createDefaultSchedules(bike.id);

        return bike;
    }

    async findAllByUser(userId: string): Promise<(Bike & { oilChangeStatus: OilChangeStatus })[]> {
        const bikes = await prisma.bike.findMany({
            where: { userId, deletedAt: null },
            orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
        });

        return bikes.map((bike) => ({
            ...bike,
            oilChangeStatus: this.calculateOilChangeStatus(bike),
        }));
    }

    async findById(bikeId: string, userId: string): Promise<Bike & { oilChangeStatus: OilChangeStatus }> {
        const bike = await prisma.bike.findFirst({
            where: { id: bikeId, deletedAt: null },
            include: {
                documents: {
                    where: { deletedAt: null },
                    orderBy: { expiryDate: 'asc' },
                    take: 5,
                },
                maintenanceRecords: {
                    orderBy: { performedAt: 'desc' },
                    take: 5,
                },
                _count: {
                    select: {
                        documents: { where: { deletedAt: null } },
                        maintenanceRecords: true,
                    },
                },
            },
        });

        if (!bike) {
            throw new NotFoundError('Bike not found');
        }

        if (bike.userId !== userId) {
            throw new ForbiddenError('You do not have access to this bike');
        }

        return {
            ...bike,
            oilChangeStatus: this.calculateOilChangeStatus(bike),
        };
    }

    async update(bikeId: string, userId: string, dto: UpdateBikeDTO): Promise<Bike> {
        const bike = await this.findById(bikeId, userId);

        // If setting as primary, unset others
        if (dto.isPrimary) {
            await prisma.bike.updateMany({
                where: { userId, isPrimary: true, deletedAt: null, id: { not: bikeId } },
                data: { isPrimary: false },
            });
        }

        return prisma.bike.update({
            where: { id: bikeId },
            data: {
                nickname: dto.nickname,
                brand: dto.brand,
                model: dto.model,
                year: dto.year,
                engineCapacityCc: dto.engineCapacityCc,
                fuelType: dto.fuelType,
                vehicleType: dto.vehicleType,
                registrationNumber: dto.registrationNumber,
                vinNumber: dto.vinNumber,
                oilChangeIntervalKm: dto.oilChangeIntervalKm,
                currentOdometerKm: dto.currentOdometerKm,
                isPrimary: dto.isPrimary,
                isActive: dto.isActive,
                purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : undefined,
            },
        });
    }

    async delete(bikeId: string, userId: string): Promise<void> {
        await this.findById(bikeId, userId);

        await prisma.bike.update({
            where: { id: bikeId },
            data: {
                deletedAt: new Date(),
                isPrimary: false,
            },
        });

        // If this was primary, assign new primary
        const remainingBikes = await prisma.bike.findFirst({
            where: { userId, deletedAt: null },
            orderBy: { createdAt: 'desc' },
        });

        if (remainingBikes) {
            await prisma.bike.update({
                where: { id: remainingBikes.id },
                data: { isPrimary: true },
            });
        }
    }

    async setPrimary(bikeId: string, userId: string): Promise<Bike> {
        await this.findById(bikeId, userId);

        // Unset all other primaries
        await prisma.bike.updateMany({
            where: { userId, isPrimary: true, deletedAt: null },
            data: { isPrimary: false },
        });

        return prisma.bike.update({
            where: { id: bikeId },
            data: { isPrimary: true },
        });
    }

    async updateOdometer(bikeId: string, userId: string, newOdometer: number): Promise<Bike> {
        const bike = await this.findById(bikeId, userId);

        if (newOdometer < bike.currentOdometerKm) {
            throw new ForbiddenError('New odometer reading cannot be less than current');
        }

        return prisma.bike.update({
            where: { id: bikeId },
            data: { currentOdometerKm: newOdometer },
        });
    }

    calculateOilChangeStatus(bike: Bike): OilChangeStatus {
        const interval = bike.oilChangeIntervalKm;
        const lastChangeKm = bike.lastOilChangeKm;
        const currentKm = bike.currentOdometerKm;

        const kmSinceChange = currentKm - lastChangeKm;
        const kmRemaining = interval - kmSinceChange;
        const nextChangeAtKm = lastChangeKm + interval;
        const percentageUsed = Math.min(100, (kmSinceChange / interval) * 100);

        let status: 'ok' | 'due_soon' | 'overdue';
        if (kmRemaining <= 0) {
            status = 'overdue';
        } else if (kmRemaining <= 250) {
            status = 'due_soon';
        } else {
            status = 'ok';
        }

        return {
            status,
            kmRemaining: Math.max(0, kmRemaining),
            kmSinceLastChange: kmSinceChange,
            percentageUsed: Math.round(percentageUsed * 100) / 100,
            nextChangeAtKm,
            overdueByKm: Math.abs(Math.min(0, kmRemaining)),
        };
    }

    private async createDefaultSchedules(bikeId: string): Promise<void> {
        const defaultSchedules = [
            { maintenanceType: 'oil_change', intervalKm: 2500, intervalDays: 180 },
            { maintenanceType: 'chain_lubrication', intervalKm: 500, intervalDays: 30 },
            { maintenanceType: 'air_filter', intervalKm: 5000, intervalDays: 180 },
            { maintenanceType: 'general_service', intervalKm: 5000, intervalDays: 180 },
        ];

        await prisma.maintenanceSchedule.createMany({
            data: defaultSchedules.map((s) => ({ bikeId, ...s })),
        });
    }
}

export const bikeService = new BikeService();
