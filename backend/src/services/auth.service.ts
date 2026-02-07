import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../utils/prisma.js';
import { config } from '../config/index.js';
import {
    ConflictError,
    UnauthorizedError,
    NotFoundError
} from '../middleware/errorHandler.js';

export interface RegisterDTO {
    email: string;
    phone?: string;
    password: string;
    fullName: string;
}

export interface LoginDTO {
    email?: string;
    phone?: string;
    password: string;
}

export interface TokenPair {
    accessToken: string;
    refreshToken: string;
}

export interface AuthResponse {
    id: string;
    email: string;
    fullName: string;
    isVerified: boolean;
    accessToken: string;
    refreshToken: string;
}

class AuthService {
    private readonly SALT_ROUNDS = 12;

    async register(dto: RegisterDTO): Promise<AuthResponse> {
        // Check if email already exists
        const existingUser = await prisma.user.findFirst({
            where: {
                OR: [
                    { email: dto.email },
                    ...(dto.phone ? [{ phone: dto.phone }] : []),
                ],
                deletedAt: null,
            },
        });

        if (existingUser) {
            if (existingUser.email === dto.email) {
                throw new ConflictError('Email already registered');
            }
            throw new ConflictError('Phone number already registered');
        }

        // Hash password
        const passwordHash = await bcrypt.hash(dto.password, this.SALT_ROUNDS);

        // Create user
        const user = await prisma.user.create({
            data: {
                email: dto.email,
                phone: dto.phone,
                passwordHash,
                fullName: dto.fullName,
            },
            select: {
                id: true,
                email: true,
                fullName: true,
                isVerified: true,
            },
        });

        // Generate tokens
        const tokens = await this.generateTokens(user.id, user.email);

        // Create notification settings
        await prisma.notificationSettings.create({
            data: { userId: user.id },
        });

        return {
            ...user,
            ...tokens,
        };
    }

    async login(dto: LoginDTO): Promise<AuthResponse> {
        if (!dto.email && !dto.phone) {
            throw new UnauthorizedError('Email or phone is required');
        }

        const user = await prisma.user.findFirst({
            where: {
                OR: [
                    ...(dto.email ? [{ email: dto.email }] : []),
                    ...(dto.phone ? [{ phone: dto.phone }] : []),
                ],
                deletedAt: null,
            },
            select: {
                id: true,
                email: true,
                fullName: true,
                isVerified: true,
                passwordHash: true,
            },
        });

        if (!user) {
            throw new UnauthorizedError('Invalid credentials');
        }

        const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
        if (!isPasswordValid) {
            throw new UnauthorizedError('Invalid credentials');
        }

        const tokens = await this.generateTokens(user.id, user.email);

        return {
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            isVerified: user.isVerified,
            ...tokens,
        };
    }

    async refreshToken(refreshToken: string): Promise<TokenPair> {
        // Find the refresh token
        const storedToken = await prisma.refreshToken.findUnique({
            where: { token: refreshToken },
            include: { user: { select: { id: true, email: true, deletedAt: true } } },
        });

        if (!storedToken || storedToken.expiresAt < new Date()) {
            throw new UnauthorizedError('Invalid or expired refresh token');
        }

        if (storedToken.user.deletedAt) {
            throw new UnauthorizedError('User account is deactivated');
        }

        // Delete old refresh token
        await prisma.refreshToken.delete({ where: { id: storedToken.id } });

        // Generate new tokens
        return this.generateTokens(storedToken.user.id, storedToken.user.email);
    }

    async logout(refreshToken: string): Promise<void> {
        await prisma.refreshToken.deleteMany({
            where: { token: refreshToken },
        });
    }

    async forgotPassword(email: string): Promise<{ message: string }> {
        const user = await prisma.user.findUnique({
            where: { email },
            select: { id: true, email: true },
        });

        // Always return success to prevent email enumeration
        if (!user) {
            return { message: 'If the email exists, a reset link will be sent' };
        }

        // TODO: Generate reset token and send email
        // For now, just return success message

        return { message: 'If the email exists, a reset link will be sent' };
    }

    async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
        // TODO: Verify reset token and update password
        // This is a placeholder implementation

        throw new NotFoundError('Password reset not implemented yet');
    }

    private async generateTokens(userId: string, email: string): Promise<TokenPair> {
        const accessToken = jwt.sign(
            { userId, email },
            config.jwt.secret,
            { expiresIn: config.jwt.expiresIn }
        );

        const refreshToken = uuidv4();
        const refreshExpiresAt = this.parseExpiry(config.jwt.refreshExpiresIn);

        // Store refresh token
        await prisma.refreshToken.create({
            data: {
                token: refreshToken,
                userId,
                expiresAt: refreshExpiresAt,
            },
        });

        return { accessToken, refreshToken };
    }

    private parseExpiry(expiry: string): Date {
        const now = new Date();
        const value = parseInt(expiry);
        const unit = expiry.slice(-1);

        switch (unit) {
            case 'm':
                return new Date(now.getTime() + value * 60 * 1000);
            case 'h':
                return new Date(now.getTime() + value * 60 * 60 * 1000);
            case 'd':
                return new Date(now.getTime() + value * 24 * 60 * 60 * 1000);
            default:
                return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // Default 7 days
        }
    }
}

export const authService = new AuthService();
