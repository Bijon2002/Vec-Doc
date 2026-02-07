import { getDatabase, generateId } from './database';

export interface Document {
    id: string;
    bikeId: string;
    userId: string;
    type: 'rc' | 'insurance' | 'puc' | 'license' | 'permit' | 'other';
    title: string;
    documentNumber?: string;
    issueDate?: string;
    expiryDate?: string;
    issuingAuthority?: string;
    fileUri?: string;
    notes?: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    daysUntilExpiry?: number;
    isExpired?: boolean;
    isExpiringSoon?: boolean;
}

interface CreateDocumentDTO {
    bikeId: string;
    userId: string;
    type: Document['type'];
    title: string;
    documentNumber?: string;
    issueDate?: string;
    expiryDate?: string;
    issuingAuthority?: string;
    fileUri?: string;
    notes?: string;
}

function calculateExpiryStatus(doc: Document): Document {
    if (!doc.expiryDate) return doc;

    const today = new Date();
    const expiry = new Date(doc.expiryDate);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return {
        ...doc,
        daysUntilExpiry: diffDays,
        isExpired: diffDays < 0,
        isExpiringSoon: diffDays >= 0 && diffDays <= 30,
    };
}

function mapRowToDocument(row: any): Document {
    const doc: Document = {
        id: row.id,
        bikeId: row.bike_id,
        userId: row.user_id,
        type: row.type,
        title: row.title,
        documentNumber: row.document_number || undefined,
        issueDate: row.issue_date || undefined,
        expiryDate: row.expiry_date || undefined,
        issuingAuthority: row.issuing_authority || undefined,
        fileUri: row.file_uri || undefined,
        notes: row.notes || undefined,
        isActive: row.is_active === 1,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
    return calculateExpiryStatus(doc);
}

// Get all documents for user
export async function getDocumentsByUserId(userId: string): Promise<Document[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync(
        'SELECT * FROM documents WHERE user_id = ? AND is_active = 1 ORDER BY expiry_date ASC',
        [userId]
    );
    return rows.map(mapRowToDocument);
}

// Get documents for a bike
export async function getDocumentsByBikeId(bikeId: string): Promise<Document[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync(
        'SELECT * FROM documents WHERE bike_id = ? AND is_active = 1 ORDER BY expiry_date ASC',
        [bikeId]
    );
    return rows.map(mapRowToDocument);
}

// Get single document
export async function getDocumentById(id: string): Promise<Document | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync('SELECT * FROM documents WHERE id = ?', [id]);
    if (!row) return null;
    return mapRowToDocument(row);
}

// Create document
export async function createDocument(dto: CreateDocumentDTO): Promise<Document> {
    const db = await getDatabase();
    const id = generateId();
    const now = new Date().toISOString();

    await db.runAsync(
        `INSERT INTO documents (
            id, bike_id, user_id, type, title, document_number,
            issue_date, expiry_date, issuing_authority, file_uri,
            notes, is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
        [
            id, dto.bikeId, dto.userId, dto.type, dto.title,
            dto.documentNumber || null, dto.issueDate || null,
            dto.expiryDate || null, dto.issuingAuthority || null,
            dto.fileUri || null, dto.notes || null, now, now
        ]
    );

    return getDocumentById(id) as Promise<Document>;
}

// Update document
export async function updateDocument(id: string, updates: Partial<Omit<Document, 'id' | 'bikeId' | 'userId' | 'createdAt' | 'updatedAt'>>): Promise<Document | null> {
    const db = await getDatabase();
    const now = new Date().toISOString();

    const fields: string[] = ['updated_at = ?'];
    const values: any[] = [now];

    const fieldMap: Record<string, string> = {
        type: 'type',
        title: 'title',
        documentNumber: 'document_number',
        issueDate: 'issue_date',
        expiryDate: 'expiry_date',
        issuingAuthority: 'issuing_authority',
        fileUri: 'file_uri',
        notes: 'notes',
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
        `UPDATE documents SET ${fields.join(', ')} WHERE id = ?`,
        values
    );

    return getDocumentById(id);
}

// Delete document (soft delete)
export async function deleteDocument(id: string): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
        'UPDATE documents SET is_active = 0, updated_at = ? WHERE id = ?',
        [now, id]
    );
}

// Get expiring documents
export async function getExpiringDocuments(userId: string, daysAhead: number = 30): Promise<Document[]> {
    const db = await getDatabase();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    const rows = await db.getAllAsync(
        `SELECT * FROM documents 
         WHERE user_id = ? AND is_active = 1 AND expiry_date IS NOT NULL 
         AND expiry_date <= ? ORDER BY expiry_date ASC`,
        [userId, futureDate.toISOString()]
    );
    return rows.map(mapRowToDocument);
}
