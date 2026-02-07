import { Router, Response, NextFunction } from 'express';
import { body } from 'express-validator';
import { prisma } from '../utils/prisma.js';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.js';
import { NotFoundError } from '../middleware/errorHandler.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /api/v1/users/me
router.get('/me', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user!.id },
            select: {
                id: true,
                email: true,
                phone: true,
                fullName: true,
                profileImageUrl: true,
                isVerified: true,
                preferredLanguage: true,
                notificationPreferences: true,
                createdAt: true,
                _count: {
                    select: { bikes: { where: { deletedAt: null } } },
                },
            },
        });

        if (!user) {
            throw new NotFoundError('User not found');
        }

        res.json({
            ...user,
            bikesCount: user._count.bikes,
            _count: undefined,
        });
    } catch (error) {
        next(error);
    }
});

// PUT /api/v1/users/me
router.put(
    '/me',
    [
        body('fullName').optional().trim().isLength({ min: 2, max: 100 }),
        body('phone').optional().isMobilePhone('any'),
        body('preferredLanguage').optional().isIn(['en', 'hi', 'ta', 'te', 'kn', 'mr']),
        body('notificationPreferences').optional().isObject(),
    ],
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const { fullName, phone, preferredLanguage, notificationPreferences } = req.body;

            const user = await prisma.user.update({
                where: { id: req.user!.id },
                data: {
                    ...(fullName && { fullName }),
                    ...(phone && { phone }),
                    ...(preferredLanguage && { preferredLanguage }),
                    ...(notificationPreferences && { notificationPreferences }),
                },
                select: {
                    id: true,
                    email: true,
                    phone: true,
                    fullName: true,
                    profileImageUrl: true,
                    isVerified: true,
                    preferredLanguage: true,
                    notificationPreferences: true,
                    updatedAt: true,
                },
            });

            res.json(user);
        } catch (error) {
            next(error);
        }
    }
);

// DELETE /api/v1/users/me (Soft delete)
router.delete('/me', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        await prisma.user.update({
            where: { id: req.user!.id },
            data: { deletedAt: new Date() },
        });

        // Invalidate all refresh tokens
        await prisma.refreshToken.deleteMany({
            where: { userId: req.user!.id },
        });

        res.json({ message: 'Account deactivated successfully' });
    } catch (error) {
        next(error);
    }
});

export default router;
