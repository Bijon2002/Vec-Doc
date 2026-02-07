import { getDatabase, generateId } from './database';

export interface MaintenanceRecord {
    id: string;
    bikeId: string;
    userId: string;
    type: 'oil_change' | 'service' | 'repair' | 'tire' | 'brake' | 'chain' | 'battery' | 'other';
    title: string;
    description?: string;
    odometerKm?: number;
    cost?: number;
    serviceProvider?: string;
    serviceDate: string;
    nextServiceDate?: string;
    nextServiceKm?: number;
    partsReplaced?: string;
    receiptUri?: string;
    notes?: string;
    createdAt: string;
    updatedAt: string;
}

interface CreateMaintenanceDTO {
    bikeId: string;
    userId: string;
    type: MaintenanceRecord['type'];
    title: string;
    description?: string;
    odometerKm?: number;
    cost?: number;
    serviceProvider?: string;
    serviceDate: string;
    nextServiceDate?: string;
    nextServiceKm?: number;
    partsReplaced?: string;
    receiptUri?: string;
    notes?: string;
}

function mapRowToMaintenance(row: any): MaintenanceRecord {
    return {
        id: row.id,
        bikeId: row.bike_id,
        userId: row.user_id,
        type: row.type,
        title: row.title,
        description: row.description || undefined,
        odometerKm: row.odometer_km || undefined,
        cost: row.cost || undefined,
        serviceProvider: row.service_provider || undefined,
        serviceDate: row.service_date,
        nextServiceDate: row.next_service_date || undefined,
        nextServiceKm: row.next_service_km || undefined,
        partsReplaced: row.parts_replaced || undefined,
        receiptUri: row.receipt_uri || undefined,
        notes: row.notes || undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

// Get all maintenance for user
export async function getMaintenanceByUserId(userId: string): Promise<MaintenanceRecord[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync(
        'SELECT * FROM maintenance_records WHERE user_id = ? ORDER BY service_date DESC',
        [userId]
    );
    return rows.map(mapRowToMaintenance);
}

// Get maintenance for a bike
export async function getMaintenanceByBikeId(bikeId: string): Promise<MaintenanceRecord[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync(
        'SELECT * FROM maintenance_records WHERE bike_id = ? ORDER BY service_date DESC',
        [bikeId]
    );
    return rows.map(mapRowToMaintenance);
}

// Get single maintenance record
export async function getMaintenanceById(id: string): Promise<MaintenanceRecord | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync('SELECT * FROM maintenance_records WHERE id = ?', [id]);
    if (!row) return null;
    return mapRowToMaintenance(row);
}

// Create maintenance record
export async function createMaintenance(dto: CreateMaintenanceDTO): Promise<MaintenanceRecord> {
    const db = await getDatabase();
    const id = generateId();
    const now = new Date().toISOString();

    await db.runAsync(
        `INSERT INTO maintenance_records (
            id, bike_id, user_id, type, title, description,
            odometer_km, cost, service_provider, service_date,
            next_service_date, next_service_km, parts_replaced,
            receipt_uri, notes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            id, dto.bikeId, dto.userId, dto.type, dto.title,
            dto.description || null, dto.odometerKm || null, dto.cost || null,
            dto.serviceProvider || null, dto.serviceDate,
            dto.nextServiceDate || null, dto.nextServiceKm || null,
            dto.partsReplaced || null, dto.receiptUri || null,
            dto.notes || null, now, now
        ]
    );

    // If this is an oil change, update the bike's last oil change km
    if (dto.type === 'oil_change' && dto.odometerKm) {
        await db.runAsync(
            'UPDATE bikes SET last_oil_change_km = ?, current_odometer_km = ?, updated_at = ? WHERE id = ?',
            [dto.odometerKm, dto.odometerKm, now, dto.bikeId]
        );
    }

    return getMaintenanceById(id) as Promise<MaintenanceRecord>;
}

// Update maintenance record
export async function updateMaintenance(id: string, updates: Partial<Omit<MaintenanceRecord, 'id' | 'bikeId' | 'userId' | 'createdAt' | 'updatedAt'>>): Promise<MaintenanceRecord | null> {
    const db = await getDatabase();
    const now = new Date().toISOString();

    const fields: string[] = ['updated_at = ?'];
    const values: any[] = [now];

    const fieldMap: Record<string, string> = {
        type: 'type',
        title: 'title',
        description: 'description',
        odometerKm: 'odometer_km',
        cost: 'cost',
        serviceProvider: 'service_provider',
        serviceDate: 'service_date',
        nextServiceDate: 'next_service_date',
        nextServiceKm: 'next_service_km',
        partsReplaced: 'parts_replaced',
        receiptUri: 'receipt_uri',
        notes: 'notes',
    };

    for (const [key, dbField] of Object.entries(fieldMap)) {
        if (key in updates) {
            fields.push(`${dbField} = ?`);
            values.push((updates as any)[key] ?? null);
        }
    }

    values.push(id);

    await db.runAsync(
        `UPDATE maintenance_records SET ${fields.join(', ')} WHERE id = ?`,
        values
    );

    return getMaintenanceById(id);
}

// Delete maintenance record
export async function deleteMaintenance(id: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM maintenance_records WHERE id = ?', [id]);
}

// Get recent maintenance
export async function getRecentMaintenance(userId: string, limit: number = 10): Promise<MaintenanceRecord[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync(
        'SELECT * FROM maintenance_records WHERE user_id = ? ORDER BY service_date DESC LIMIT ?',
        [userId, limit]
    );
    return rows.map(mapRowToMaintenance);
}

// Get total maintenance cost for a bike
export async function getTotalMaintenanceCost(bikeId: string): Promise<number> {
    const db = await getDatabase();
    const result = await db.getFirstAsync<{ total: number }>(
        'SELECT SUM(cost) as total FROM maintenance_records WHERE bike_id = ?',
        [bikeId]
    );
    return result?.total || 0;
}
