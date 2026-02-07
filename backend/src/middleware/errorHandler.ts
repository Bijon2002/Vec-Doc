import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';

export class AppError extends Error {
    statusCode: number;
    isOperational: boolean;

    constructor(message: string, statusCode: number) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor);
    }
}

export class ValidationError extends AppError {
    errors: Record<string, string[]>;

    constructor(message: string, errors: Record<string, string[]>) {
        super(message, 400);
        this.errors = errors;
    }
}

export class UnauthorizedError extends AppError {
    constructor(message = 'Unauthorized') {
        super(message, 401);
    }
}

export class ForbiddenError extends AppError {
    constructor(message = 'Forbidden') {
        super(message, 403);
    }
}

export class NotFoundError extends AppError {
    constructor(message = 'Resource not found') {
        super(message, 404);
    }
}

export class ConflictError extends AppError {
    constructor(message = 'Resource already exists') {
        super(message, 409);
    }
}

export function errorHandler(
    err: Error,
    _req: Request,
    res: Response,
    _next: NextFunction
): void {
    // Log error
    logger.error(err.message, { stack: err.stack });

    // Handle known operational errors
    if (err instanceof AppError) {
        const response: Record<string, unknown> = {
            error: err.message,
        };

        if (err instanceof ValidationError) {
            response.validationErrors = err.errors;
        }

        res.status(err.statusCode).json(response);
        return;
    }

    // Handle Prisma errors
    if (err.name === 'PrismaClientKnownRequestError') {
        const prismaError = err as { code: string; meta?: { target?: string[] } };

        if (prismaError.code === 'P2002') {
            const field = prismaError.meta?.target?.[0] || 'field';
            res.status(409).json({
                error: `A record with this ${field} already exists`
            });
            return;
        }

        if (prismaError.code === 'P2025') {
            res.status(404).json({ error: 'Record not found' });
            return;
        }
    }

    // Handle JWT errors
    if (err.name === 'JsonWebTokenError') {
        res.status(401).json({ error: 'Invalid token' });
        return;
    }

    if (err.name === 'TokenExpiredError') {
        res.status(401).json({ error: 'Token expired' });
        return;
    }

    // Unknown error
    res.status(500).json({
        error: 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { details: err.message })
    });
}
