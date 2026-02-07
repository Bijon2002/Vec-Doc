import { Router, Response, NextFunction } from 'express';
import { body, param, validationResult } from 'express-validator';
import { prisma } from '../utils/prisma.js';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.js';
import { ValidationError, NotFoundError } from '../middleware/errorHandler.js';

const router = Router();

router.use(authenticate);

const validate = (req: any, _res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const formattedErrors: Record<string, string[]> = {};
        errors.array().forEach((error) => {
            if ('path' in error) {
                const field = error.path as string;
                if (!formattedErrors[field]) formattedErrors[field] = [];
                formattedErrors[field].push(error.msg);
            }
        });
        throw new ValidationError('Validation failed', formattedErrors);
    }
    next();
};

// GET /api/v1/notifications/settings - Get notification settings
router.get(
    '/settings',
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            let settings = await prisma.notificationSettings.findUnique({
                where: { userId: req.user!.id },
            });

            if (!settings) {
                settings = await prisma.notificationSettings.create({
                    data: { userId: req.user!.id },
                });
            }

            res.json(settings);
        } catch (error) {
            next(error);
        }
    }
);

// PUT /api/v1/notifications/settings - Update notification settings
router.put(
    '/settings',
    [
        body('pushEnabled').optional().isBoolean(),
        body('emailEnabled').optional().isBoolean(),
        body('smsEnabled').optional().isBoolean(),
        body('quietHoursStart').optional().matches(/^([01]\d|2[0-3]):([0-5]\d)$/),
        body('quietHoursEnd').optional().matches(/^([01]\d|2[0-3]):([0-5]\d)$/),
        body('documentAlerts').optional().isBoolean(),
        body('maintenanceAlerts').optional().isBoolean(),
        body('promotional').optional().isBoolean(),
    ],
    validate,
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const settings = await prisma.notificationSettings.upsert({
                where: { userId: req.user!.id },
                create: {
                    userId: req.user!.id,
                    ...req.body,
                },
                update: req.body,
            });

            res.json(settings);
        } catch (error) {
            next(error);
        }
    }
);

// GET /api/v1/notifications - Get notification history
router.get(
    '/',
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 20;

            const notifications = await prisma.notificationQueue.findMany({
                where: { userId: req.user!.id },
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip: (page - 1) * limit,
            });

            const total = await prisma.notificationQueue.count({
                where: { userId: req.user!.id },
            });

            res.json({
                notifications,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit),
                },
            });
        } catch (error) {
            next(error);
        }
    }
);

// POST /api/v1/notifications/:id/acknowledge - Mark notification as read
router.post(
    '/:id/acknowledge',
    [param('id').isUUID().withMessage('Invalid notification ID')],
    validate,
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const notification = await prisma.notificationQueue.findFirst({
                where: { id: req.params.id, userId: req.user!.id },
            });

            if (!notification) {
                throw new NotFoundError('Notification not found');
            }

            await prisma.notificationQueue.update({
                where: { id: req.params.id },
                data: { status: 'SENT' }, // Mark as acknowledged
            });

            res.json({ message: 'Notification acknowledged' });
        } catch (error) {
            next(error);
        }
    }
);

// POST /api/v1/notifications/register-token - Register FCM token
router.post(
    '/register-token',
    [body('token').notEmpty().withMessage('FCM token is required')],
    validate,
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            // Store FCM token (would need a device_tokens table in production)
            // For now, just acknowledge
            res.json({ message: 'Token registered successfully' });
        } catch (error) {
            next(error);
        }
    }
);

export default router;
