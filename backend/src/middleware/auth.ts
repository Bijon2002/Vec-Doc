import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { UnauthorizedError } from './errorHandler.js';
import { prisma } from '../utils/prisma.js';

export interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        email: string;
    };
}

export interface JwtPayload {
    userId: string;
    email: string;
}

export async function authenticate(
    req: AuthenticatedRequest,
    _res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new UnauthorizedError('No token provided');
        }

        const token = authHeader.split(' ')[1];

        const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;

        // Verify user still exists and is active
        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            select: { id: true, email: true, deletedAt: true },
        });

        if (!user || user.deletedAt) {
            throw new UnauthorizedError('User not found or deactivated');
        }

        req.user = {
            id: user.id,
            email: user.email,
        };

        next();
    } catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
            next(new UnauthorizedError('Invalid token'));
        } else if (error instanceof jwt.TokenExpiredError) {
            next(new UnauthorizedError('Token expired'));
        } else {
            next(error);
        }
    }
}

// Optional authentication - doesn't fail if no token
export async function optionalAuth(
    req: AuthenticatedRequest,
    _res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const authHeader = req.headers.authorization;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;

            const user = await prisma.user.findUnique({
                where: { id: decoded.userId },
                select: { id: true, email: true, deletedAt: true },
            });

            if (user && !user.deletedAt) {
                req.user = {
                    id: user.id,
                    email: user.email,
                };
            }
        }

        next();
    } catch {
        // Silently fail for optional auth
        next();
    }
}
