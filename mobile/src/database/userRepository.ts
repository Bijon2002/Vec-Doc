import { getDatabase, generateId } from './database';
import * as Crypto from 'expo-crypto';

export interface User {
    id: string;
    email: string;
    fullName: string;
    phone?: string;
    profileImageUri?: string;
    createdAt: string;
    updatedAt: string;
}

interface CreateUserDTO {
    email: string;
    password: string;
    fullName: string;
    phone?: string;
}

interface LoginDTO {
    email: string;
    password: string;
}

// Hash password using SHA256
async function hashPassword(password: string): Promise<string> {
    const digest = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        password
    );
    return digest;
}

// Create new user (register)
export async function createUser(dto: CreateUserDTO): Promise<User> {
    const db = await getDatabase();

    // Check if email already exists
    const existing = await db.getFirstAsync<{ id: string }>(
        'SELECT id FROM users WHERE email = ?',
        [dto.email.toLowerCase()]
    );

    if (existing) {
        throw new Error('Email already registered');
    }

    const id = generateId();
    const passwordHash = await hashPassword(dto.password);
    const now = new Date().toISOString();

    await db.runAsync(
        `INSERT INTO users (id, email, password_hash, full_name, phone, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, dto.email.toLowerCase(), passwordHash, dto.fullName, dto.phone || null, now, now]
    );

    return {
        id,
        email: dto.email.toLowerCase(),
        fullName: dto.fullName,
        phone: dto.phone,
        createdAt: now,
        updatedAt: now,
    };
}

// Login user
export async function loginUser(dto: LoginDTO): Promise<User> {
    const db = await getDatabase();
    const passwordHash = await hashPassword(dto.password);

    const user = await db.getFirstAsync<{
        id: string;
        email: string;
        password_hash: string;
        full_name: string;
        phone: string | null;
        profile_image_uri: string | null;
        created_at: string;
        updated_at: string;
    }>(
        'SELECT * FROM users WHERE email = ?',
        [dto.email.toLowerCase()]
    );

    if (!user) {
        throw new Error('Invalid email or password');
    }

    if (user.password_hash !== passwordHash) {
        throw new Error('Invalid email or password');
    }

    return {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        phone: user.phone || undefined,
        profileImageUri: user.profile_image_uri || undefined,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
    };
}

// Get user by ID
export async function getUserById(id: string): Promise<User | null> {
    const db = await getDatabase();

    const user = await db.getFirstAsync<{
        id: string;
        email: string;
        full_name: string;
        phone: string | null;
        profile_image_uri: string | null;
        created_at: string;
        updated_at: string;
    }>(
        'SELECT id, email, full_name, phone, profile_image_uri, created_at, updated_at FROM users WHERE id = ?',
        [id]
    );

    if (!user) return null;

    return {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        phone: user.phone || undefined,
        profileImageUri: user.profile_image_uri || undefined,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
    };
}

// Update user profile
export async function updateUser(id: string, updates: Partial<Pick<User, 'fullName' | 'phone' | 'profileImageUri'>>): Promise<User | null> {
    const db = await getDatabase();
    const now = new Date().toISOString();

    const fields: string[] = ['updated_at = ?'];
    const values: any[] = [now];

    if (updates.fullName !== undefined) {
        fields.push('full_name = ?');
        values.push(updates.fullName);
    }
    if (updates.phone !== undefined) {
        fields.push('phone = ?');
        values.push(updates.phone);
    }
    if (updates.profileImageUri !== undefined) {
        fields.push('profile_image_uri = ?');
        values.push(updates.profileImageUri);
    }

    values.push(id);

    await db.runAsync(
        `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
        values
    );

    return getUserById(id);
}

// Change password
export async function changePassword(id: string, oldPassword: string, newPassword: string): Promise<boolean> {
    const db = await getDatabase();
    const oldHash = await hashPassword(oldPassword);

    const user = await db.getFirstAsync<{ password_hash: string }>(
        'SELECT password_hash FROM users WHERE id = ?',
        [id]
    );

    if (!user || user.password_hash !== oldHash) {
        throw new Error('Current password is incorrect');
    }

    const newHash = await hashPassword(newPassword);
    const now = new Date().toISOString();

    await db.runAsync(
        'UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?',
        [newHash, now, id]
    );

    return true;
}
