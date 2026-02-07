import { getDatabase, generateId } from './database';

export interface Shop {
    id: string;
    name: string;
    type: 'mechanic' | 'petrol' | 'puncture' | 'spare_parts';
    latitude: number;
    longitude: number;
    address: string;
    phone: string;
    rating: number;
    is_verified: boolean;
}

export interface Part {
    id: string;
    name: string;
    category: string;
    description: string;
    image_uri?: string;
}

export interface ShopInventoryItem {
    id: string;
    shop_id: string;
    part_id: string;
    price: number;
    in_stock: boolean;
    shop_name?: string;
    shop_phone?: string;
    shop_address?: string;
}

// Seed data if empty
export async function seedDatabase() {
    const db = await getDatabase();

    // Check if shops exist
    const result = await db.getAllAsync('SELECT count(*) as count FROM shops');
    // @ts-ignore
    if (result[0].count > 0) return;

    console.log('Seeding mock data for Shops and Parts...');

    const shops: Omit<Shop, 'id'>[] = [
        { name: 'Speedy Fix Mechanics', type: 'mechanic', latitude: 12.9716, longitude: 77.5946, address: '123 Main St, City Center', phone: '9876543210', rating: 4.5, is_verified: true },
        { name: 'City Petrol Bunk', type: 'petrol', latitude: 12.9720, longitude: 77.5950, address: 'Near Bus Stand', phone: '080-12345678', rating: 4.0, is_verified: true },
        { name: 'Raju Puncture Shop', type: 'puncture', latitude: 12.9730, longitude: 77.5960, address: 'Corner St', phone: '9988776655', rating: 4.8, is_verified: false },
        { name: 'Genuine Spares World', type: 'spare_parts', latitude: 12.9740, longitude: 77.5970, address: 'Market Road', phone: '080-98765432', rating: 4.2, is_verified: true },
        { name: 'Bike Zone Service', type: 'mechanic', latitude: 12.9750, longitude: 77.5980, address: 'Ring Road', phone: '9123456780', rating: 3.9, is_verified: true },
    ];

    for (const shop of shops) {
        await db.runAsync(
            `INSERT INTO shops (id, name, type, latitude, longitude, address, phone, rating, is_verified) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [generateId(), shop.name, shop.type, shop.latitude, shop.longitude, shop.address, shop.phone, shop.rating, shop.is_verified ? 1 : 0]
        );
    }

    const parts: Omit<Part, 'id'>[] = [
        { name: 'Engine Oil (1L)', category: 'consumables', description: 'Synthetic 10W-40' },
        { name: 'Brake Pads (Front)', category: 'consumables', description: 'Ceramic brake pads' },
        { name: 'Air Filter', category: 'engine', description: 'High flow air filter' },
        { name: 'Chain Lube', category: 'consumables', description: 'Spray lubricant' },
        { name: 'Battery 12V', category: 'electrical', description: 'Maintenance free battery' },
        { name: 'Spark Plug', category: 'engine', description: 'Iridium spark plug' },
        { name: 'Headlight Bulb', category: 'electrical', description: 'LED H4 Bulb' },
    ];

    const partIds: string[] = [];
    for (const part of parts) {
        const id = generateId();
        partIds.push(id);
        await db.runAsync(
            `INSERT INTO parts (id, name, category, description) VALUES (?, ?, ?, ?)`,
            [id, part.name, part.category, part.description]
        );
    }

    // Link parts to shops (only mechanics and spare parts shops)
    const shopRows = await db.getAllAsync<Shop>('SELECT * FROM shops WHERE type IN ("mechanic", "spare_parts")');

    for (const shop of shopRows) {
        for (const partId of partIds) {
            // Random price between 100 and 2000
            const price = Math.floor(Math.random() * 1900) + 100;
            await db.runAsync(
                `INSERT INTO shop_inventory (id, shop_id, part_id, price, in_stock) VALUES (?, ?, ?, ?, ?)`,
                [generateId(), shop.id, partId, price, 1]
            );
        }
    }
}

export async function searchParts(query: string): Promise<Part[]> {
    const db = await getDatabase();
    return await db.getAllAsync<Part>(
        `SELECT * FROM parts WHERE name LIKE ?`,
        [`%${query}%`]
    );
}

export async function getPartInventory(partId: string): Promise<ShopInventoryItem[]> {
    const db = await getDatabase();
    return await db.getAllAsync<ShopInventoryItem>(
        `SELECT si.*, s.name as shop_name, s.phone as shop_phone, s.address as shop_address 
         FROM shop_inventory si 
         JOIN shops s ON si.shop_id = s.id 
         WHERE si.part_id = ? 
         ORDER BY si.price ASC`,
        [partId]
    );
}
