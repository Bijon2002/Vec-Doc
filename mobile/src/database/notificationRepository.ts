import { getDatabase, generateId } from './database';

export interface Notification {
    id: string;
    title: string;
    message: string;
    date: string;
    type: 'maintenance' | 'document' | 'system';
    read: boolean;
    bike_id?: string;
}

export async function addNotification(
    title: string,
    message: string,
    type: 'maintenance' | 'document' | 'system',
    bikeId?: string
): Promise<void> {
    const db = await getDatabase();
    const id = generateId();
    const date = new Date().toISOString();

    await db.runAsync(
        `INSERT INTO notifications (id, title, message, date, type, is_read, bike_id)
         VALUES (?, ?, ?, ?, ?, 0, ?)`,
        [id, title, message, date, type, bikeId || null]
    );
}

export async function getUnreadNotifications(): Promise<Notification[]> {
    const db = await getDatabase();
    // For now, let's get all notifications, sorted by date
    const rows = await db.getAllAsync('SELECT * FROM notifications ORDER BY date DESC');

    return rows.map((row: any) => ({
        id: row.id,
        title: row.title,
        message: row.message,
        date: row.date,
        type: row.type,
        read: row.is_read === 1,
        bike_id: row.bike_id || undefined
    }));
}

export async function markAsRead(id: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('UPDATE notifications SET is_read = 1 WHERE id = ?', [id]);
}

export async function markAllAsRead(): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('UPDATE notifications SET is_read = 1');
}
