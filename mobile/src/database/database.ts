import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
    if (db) return db;

    db = await SQLite.openDatabaseAsync('vecdoc.db');
    await initializeDatabase(db);
    return db;
}

async function initializeDatabase(database: SQLite.SQLiteDatabase): Promise<void> {
    // Create tables
    await database.execAsync(`
        PRAGMA journal_mode = WAL;
        
        -- Users table for local auth
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            full_name TEXT NOT NULL,
            phone TEXT,
            profile_image_uri TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
        
        -- Bikes table
        CREATE TABLE IF NOT EXISTS bikes (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            nickname TEXT,
            brand TEXT NOT NULL,
            model TEXT NOT NULL,
            year INTEGER NOT NULL,
            engine_capacity_cc INTEGER,
            fuel_type TEXT DEFAULT 'petrol',
            registration_number TEXT,
            chassis_number TEXT,
            engine_number TEXT,
            color TEXT,
            purchase_date TEXT,
            image_uri TEXT,
            oil_change_interval_km INTEGER DEFAULT 3000,
            last_oil_change_km INTEGER DEFAULT 0,
            current_odometer_km INTEGER DEFAULT 0,
            is_primary INTEGER DEFAULT 0,
            is_active INTEGER DEFAULT 1,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );
        
        -- Documents table
        CREATE TABLE IF NOT EXISTS documents (
            id TEXT PRIMARY KEY,
            bike_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            type TEXT NOT NULL,
            title TEXT NOT NULL,
            document_number TEXT,
            issue_date TEXT,
            expiry_date TEXT,
            issuing_authority TEXT,
            file_uri TEXT,
            notes TEXT,
            is_active INTEGER DEFAULT 1,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (bike_id) REFERENCES bikes(id),
            FOREIGN KEY (user_id) REFERENCES users(id)
        );
        
        -- Maintenance records table
        CREATE TABLE IF NOT EXISTS maintenance_records (
            id TEXT PRIMARY KEY,
            bike_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            type TEXT NOT NULL,
            title TEXT NOT NULL,
            description TEXT,
            odometer_km INTEGER,
            cost REAL,
            service_provider TEXT,
            service_date TEXT NOT NULL,
            next_service_date TEXT,
            next_service_km INTEGER,
            parts_replaced TEXT,
            receipt_uri TEXT,
            notes TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (bike_id) REFERENCES bikes(id),
            FOREIGN KEY (user_id) REFERENCES users(id)
        );
        
        -- Settings table
        CREATE TABLE IF NOT EXISTS settings (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            key TEXT NOT NULL,
            value TEXT,
            UNIQUE(user_id, key),
            FOREIGN KEY (user_id) REFERENCES users(id)
        );
        
        -- Create indexes for faster queries
        CREATE INDEX IF NOT EXISTS idx_bikes_user ON bikes(user_id);
        CREATE INDEX IF NOT EXISTS idx_documents_bike ON documents(bike_id);
        CREATE INDEX IF NOT EXISTS idx_documents_user ON documents(user_id);
        CREATE INDEX IF NOT EXISTS idx_maintenance_bike ON maintenance_records(bike_id);
        CREATE INDEX IF NOT EXISTS idx_maintenance_user ON maintenance_records(user_id);

        -- Shops table (Mock data for MVP)
        CREATE TABLE IF NOT EXISTS shops (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            type TEXT NOT NULL, -- mechanic, petrol, puncture, spare_parts
            latitude REAL,
            longitude REAL,
            address TEXT,
            phone TEXT,
            rating REAL,
            is_verified INTEGER DEFAULT 0
        );

        -- Parts table
        CREATE TABLE IF NOT EXISTS parts (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            category TEXT, -- engine, body, electrical, consumables
            description TEXT,
            image_uri TEXT
        );

        -- Shop Inventory (Price mapping)
        CREATE TABLE IF NOT EXISTS shop_inventory (
            id TEXT PRIMARY KEY,
            shop_id TEXT NOT NULL,
            part_id TEXT NOT NULL,
            price REAL NOT NULL,
            in_stock INTEGER DEFAULT 1,
            FOREIGN KEY (shop_id) REFERENCES shops(id),
            FOREIGN KEY (part_id) REFERENCES parts(id)
        );

        -- Notifications table
        CREATE TABLE IF NOT EXISTS notifications (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            message TEXT,
            date TEXT NOT NULL,
            type TEXT NOT NULL,
            is_read INTEGER DEFAULT 0,
            bike_id TEXT
        );
    `);
}

// Generate UUID
export function generateId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Close database connection
export async function closeDatabase(): Promise<void> {
    if (db) {
        await db.closeAsync();
        db = null;
    }
}
