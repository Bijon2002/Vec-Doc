import { getDatabase, generateId } from './database';

export interface Bike {
    id: string;
    userId: string;
    nickname?: string;
    brand: string;
    model: string;
    year: number;
    engineCapacityCc?: number;
    fuelType: string;
    registrationNumber?: string;
    chassisNumber?: string;
    engineNumber?: string;
    color?: string;
    purchaseDate?: string;
    imageUri?: string;
    oilChangeIntervalKm: number;
    lastOilChangeKm: number;
    currentOdometerKm: number;
    isPrimary: boolean;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    oilChangeStatus?: {
        status: 'ok' | 'due_soon' | 'overdue';
        kmRemaining: number;
        percentageUsed: number;
    };
}

interface CreateBikeDTO {
    userId: string;
    nickname?: string;
    brand: string;
    model: string;
    year: number;
    engineCapacityCc?: number;
    fuelType?: string;
    registrationNumber?: string;
    chassisNumber?: string;
    engineNumber?: string;
    color?: string;
    purchaseDate?: string;
    imageUri?: string;
    oilChangeIntervalKm?: number;
    lastOilChangeKm?: number;
    currentOdometerKm?: number;
    isPrimary?: boolean;
}

function calculateOilChangeStatus(bike: Bike): Bike['oilChangeStatus'] {
    const kmSinceLastChange = bike.currentOdometerKm - bike.lastOilChangeKm;
    const kmRemaining = bike.oilChangeIntervalKm - kmSinceLastChange;
    const percentageUsed = (kmSinceLastChange / bike.oilChangeIntervalKm) * 100;

    let status: 'ok' | 'due_soon' | 'overdue';
    if (percentageUsed >= 100) {
        status = 'overdue';
    } else if (percentageUsed >= 80) {
        status = 'due_soon';
    } else {
        status = 'ok';
    }

    return { status, kmRemaining, percentageUsed };
}

function mapRowToBike(row: any): Bike {
    const bike: Bike = {
        id: row.id,
        userId: row.user_id,
        nickname: row.nickname || undefined,
        brand: row.brand,
        model: row.model,
        year: row.year,
        engineCapacityCc: row.engine_capacity_cc || undefined,
        fuelType: row.fuel_type,
        registrationNumber: row.registration_number || undefined,
        chassisNumber: row.chassis_number || undefined,
        engineNumber: row.engine_number || undefined,
        color: row.color || undefined,
        purchaseDate: row.purchase_date || undefined,
        imageUri: row.image_uri || undefined,
        oilChangeIntervalKm: row.oil_change_interval_km,
        lastOilChangeKm: row.last_oil_change_km,
        currentOdometerKm: row.current_odometer_km,
        isPrimary: row.is_primary === 1,
        isActive: row.is_active === 1,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
    bike.oilChangeStatus = calculateOilChangeStatus(bike);
    return bike;
}

// Get all bikes for user
export async function getBikesByUserId(userId: string): Promise<Bike[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync(
        'SELECT * FROM bikes WHERE user_id = ? AND is_active = 1 ORDER BY is_primary DESC, created_at DESC',
        [userId]
    );
    return rows.map(mapRowToBike);
}

// Get single bike
export async function getBikeById(id: string): Promise<Bike | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync('SELECT * FROM bikes WHERE id = ?', [id]);
    if (!row) return null;
    return mapRowToBike(row);
}

// Create new bike
export async function createBike(dto: CreateBikeDTO): Promise<Bike> {
    const db = await getDatabase();
    const id = generateId();
    const now = new Date().toISOString();

    // If this is first bike or marked as primary, unset other primaries
    if (dto.isPrimary) {
        await db.runAsync(
            'UPDATE bikes SET is_primary = 0 WHERE user_id = ?',
            [dto.userId]
        );
    }

    // Check if this is the first bike (make it primary)
    const existingBikes = await db.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM bikes WHERE user_id = ? AND is_active = 1',
        [dto.userId]
    );
    const shouldBePrimary = dto.isPrimary || (existingBikes?.count === 0);

    await db.runAsync(
        `INSERT INTO bikes (
            id, user_id, nickname, brand, model, year, engine_capacity_cc,
            fuel_type, registration_number, chassis_number, engine_number,
            color, purchase_date, image_uri, oil_change_interval_km,
            last_oil_change_km, current_odometer_km, is_primary, is_active,
            created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
        [
            id, dto.userId, dto.nickname || null, dto.brand, dto.model, dto.year,
            dto.engineCapacityCc || null, dto.fuelType || 'petrol',
            dto.registrationNumber || null, dto.chassisNumber || null,
            dto.engineNumber || null, dto.color || null, dto.purchaseDate || null,
            dto.imageUri || null, dto.oilChangeIntervalKm || 3000,
            dto.lastOilChangeKm || 0, dto.currentOdometerKm || 0,
            shouldBePrimary ? 1 : 0, now, now
        ]
    );

    return getBikeById(id) as Promise<Bike>;
}

// Update bike
export async function updateBike(id: string, updates: Partial<Omit<Bike, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'oilChangeStatus'>>): Promise<Bike | null> {
    const db = await getDatabase();
    const now = new Date().toISOString();

    const fields: string[] = ['updated_at = ?'];
    const values: any[] = [now];

    const fieldMap: Record<string, string> = {
        nickname: 'nickname',
        brand: 'brand',
        model: 'model',
        year: 'year',
        engineCapacityCc: 'engine_capacity_cc',
        fuelType: 'fuel_type',
        registrationNumber: 'registration_number',
        chassisNumber: 'chassis_number',
        engineNumber: 'engine_number',
        color: 'color',
        purchaseDate: 'purchase_date',
        imageUri: 'image_uri',
        oilChangeIntervalKm: 'oil_change_interval_km',
        lastOilChangeKm: 'last_oil_change_km',
        currentOdometerKm: 'current_odometer_km',
        isPrimary: 'is_primary',
        isActive: 'is_active',
    };

    for (const [key, dbField] of Object.entries(fieldMap)) {
        if (key in updates) {
            fields.push(`${dbField} = ?`);
            let value = (updates as any)[key];
            if (typeof value === 'boolean') value = value ? 1 : 0;
            values.push(value ?? null);
        }
    }

    values.push(id);

    await db.runAsync(
        `UPDATE bikes SET ${fields.join(', ')} WHERE id = ?`,
        values
    );

    return getBikeById(id);
}

// Delete bike (soft delete)
export async function deleteBike(id: string): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
        'UPDATE bikes SET is_active = 0, updated_at = ? WHERE id = ?',
        [now, id]
    );
}

// Set primary bike
export async function setPrimaryBike(userId: string, bikeId: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
        'UPDATE bikes SET is_primary = 0, updated_at = ? WHERE user_id = ?',
        [new Date().toISOString(), userId]
    );
    await db.runAsync(
        'UPDATE bikes SET is_primary = 1, updated_at = ? WHERE id = ?',
        [new Date().toISOString(), bikeId]
    );
}

// Update odometer
export async function updateOdometer(id: string, newOdometer: number): Promise<Bike | null> {
    return updateBike(id, { currentOdometerKm: newOdometer });
}

// Log oil change
export async function logOilChange(id: string, odometerAtChange: number): Promise<Bike | null> {
    return updateBike(id, {
        lastOilChangeKm: odometerAtChange,
        currentOdometerKm: odometerAtChange
    });
}
