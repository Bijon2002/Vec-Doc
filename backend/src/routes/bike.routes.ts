import { Router, Response, NextFunction } from 'express';
import { body, param, validationResult } from 'express-validator';
import { bikeService } from '../services/bike.service.js';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.js';
import { ValidationError } from '../middleware/errorHandler.js';
import { FuelType, VehicleType } from '@prisma/client';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Validation middleware
const validate = (req: any, _res: Response, next: NextFunction) => {
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

// POST /api/v1/bikes - Create new bike
router.post(
    '/',
    [
        body('brand').trim().notEmpty().withMessage('Brand is required'),
        body('model').trim().notEmpty().withMessage('Model is required'),
        body('year')
            .isInt({ min: 1900, max: new Date().getFullYear() + 1 })
            .withMessage('Valid year is required'),
        body('nickname').optional().trim().isLength({ max: 100 }),
        body('engineCapacityCc').optional().isInt({ min: 1 }),
        body('fuelType').optional().isIn(Object.values(FuelType)),
        body('vehicleType').optional().isIn(Object.values(VehicleType)),
        body('registrationNumber').optional().trim(),
        body('oilChangeIntervalKm').optional().isInt({ min: 500, max: 20000 }),
        body('currentOdometerKm').optional().isInt({ min: 0 }),
        body('isPrimary').optional().isBoolean(),
    ],
    validate,
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const bike = await bikeService.create(req.user!.id, req.body);
            res.status(201).json(bike);
        } catch (error) {
            next(error);
        }
    }
);

// GET /api/v1/bikes - List user's bikes
router.get('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const bikes = await bikeService.findAllByUser(req.user!.id);
        res.json(bikes);
    } catch (error) {
        next(error);
    }
});

// GET /api/v1/bikes/:id - Get bike details
router.get(
    '/:id',
    [param('id').isUUID().withMessage('Invalid bike ID')],
    validate,
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const bike = await bikeService.findById(req.params.id, req.user!.id);
            res.json(bike);
        } catch (error) {
            next(error);
        }
    }
);

// PUT /api/v1/bikes/:id - Update bike
router.put(
    '/:id',
    [
        param('id').isUUID().withMessage('Invalid bike ID'),
        body('brand').optional().trim().notEmpty(),
        body('model').optional().trim().notEmpty(),
        body('year').optional().isInt({ min: 1900, max: new Date().getFullYear() + 1 }),
        body('oilChangeIntervalKm').optional().isInt({ min: 500, max: 20000 }),
        body('currentOdometerKm').optional().isInt({ min: 0 }),
        body('isActive').optional().isBoolean(),
    ],
    validate,
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const bike = await bikeService.update(req.params.id, req.user!.id, req.body);
            res.json(bike);
        } catch (error) {
            next(error);
        }
    }
);

// DELETE /api/v1/bikes/:id - Remove bike (soft delete)
router.delete(
    '/:id',
    [param('id').isUUID().withMessage('Invalid bike ID')],
    validate,
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            await bikeService.delete(req.params.id, req.user!.id);
            res.json({ message: 'Bike removed successfully' });
        } catch (error) {
            next(error);
        }
    }
);

// PUT /api/v1/bikes/:id/set-primary - Set as primary bike
router.put(
    '/:id/set-primary',
    [param('id').isUUID().withMessage('Invalid bike ID')],
    validate,
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const bike = await bikeService.setPrimary(req.params.id, req.user!.id);
            res.json(bike);
        } catch (error) {
            next(error);
        }
    }
);

// PUT /api/v1/bikes/:id/odometer - Update odometer reading
router.put(
    '/:id/odometer',
    [
        param('id').isUUID().withMessage('Invalid bike ID'),
        body('odometer').isInt({ min: 0 }).withMessage('Valid odometer reading is required'),
    ],
    validate,
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const bike = await bikeService.updateOdometer(
                req.params.id,
                req.user!.id,
                req.body.odometer
            );
            res.json(bike);
        } catch (error) {
            next(error);
        }
    }
);

export default router;
