import { Router, Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { authService } from '../services/auth.service.js';
import { ValidationError } from '../middleware/errorHandler.js';

const router = Router();

// Validation middleware
const validate = (req: Request, _res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const formattedErrors: Record<string, string[]> = {};
        errors.array().forEach((error) => {
            if ('path' in error) {
                const field = error.path as string;
                if (!formattedErrors[field]) {
                    formattedErrors[field] = [];
                }
                formattedErrors[field].push(error.msg);
            }
        });
        throw new ValidationError('Validation failed', formattedErrors);
    }
    next();
};

// POST /api/v1/auth/register
router.post(
    '/register',
    [
        body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
        body('phone').optional().isMobilePhone('any').withMessage('Valid phone number is required'),
        body('password')
            .isLength({ min: 8 })
            .withMessage('Password must be at least 8 characters')
            .matches(/[A-Z]/)
            .withMessage('Password must contain an uppercase letter')
            .matches(/[a-z]/)
            .withMessage('Password must contain a lowercase letter')
            .matches(/[0-9]/)
            .withMessage('Password must contain a number'),
        body('fullName')
            .trim()
            .isLength({ min: 2, max: 100 })
            .withMessage('Full name must be 2-100 characters'),
    ],
    validate,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const result = await authService.register(req.body);
            res.status(201).json(result);
        } catch (error) {
            next(error);
        }
    }
);

// POST /api/v1/auth/login
router.post(
    '/login',
    [
        body('email').optional().isEmail().normalizeEmail(),
        body('phone').optional().isMobilePhone('any'),
        body('password').notEmpty().withMessage('Password is required'),
    ],
    validate,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const result = await authService.login(req.body);
            res.json(result);
        } catch (error) {
            next(error);
        }
    }
);

// POST /api/v1/auth/refresh
router.post(
    '/refresh',
    [body('refreshToken').notEmpty().withMessage('Refresh token is required')],
    validate,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const result = await authService.refreshToken(req.body.refreshToken);
            res.json(result);
        } catch (error) {
            next(error);
        }
    }
);

// POST /api/v1/auth/logout
router.post(
    '/logout',
    [body('refreshToken').notEmpty().withMessage('Refresh token is required')],
    validate,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            await authService.logout(req.body.refreshToken);
            res.json({ message: 'Logged out successfully' });
        } catch (error) {
            next(error);
        }
    }
);

// POST /api/v1/auth/forgot-password
router.post(
    '/forgot-password',
    [body('email').isEmail().normalizeEmail().withMessage('Valid email is required')],
    validate,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const result = await authService.forgotPassword(req.body.email);
            res.json(result);
        } catch (error) {
            next(error);
        }
    }
);

// POST /api/v1/auth/reset-password
router.post(
    '/reset-password',
    [
        body('token').notEmpty().withMessage('Reset token is required'),
        body('password')
            .isLength({ min: 8 })
            .withMessage('Password must be at least 8 characters'),
    ],
    validate,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const result = await authService.resetPassword(req.body.token, req.body.password);
            res.json(result);
        } catch (error) {
            next(error);
        }
    }
);

export default router;
