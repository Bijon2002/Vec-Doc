import { Router, Response, NextFunction } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { maintenanceService } from '../services/maintenance.service.js';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.js';
import { ValidationError } from '../middleware/errorHandler.js';

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

// GET /api/v1/maintenance/upcoming - Get upcoming maintenance for all bikes
router.get(
    '/upcoming',
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const upcoming = await maintenanceService.getUpcoming(req.user!.id);
            res.json(upcoming);
        } catch (error) {
            next(error);
        }
    }
);

// POST /api/v1/maintenance/bike/:bikeId - Log maintenance
router.post(
    '/bike/:bikeId',
    [
        param('bikeId').isUUID().withMessage('Invalid bike ID'),
        body('maintenanceType').trim().notEmpty().withMessage('Maintenance type is required'),
        body('odometerAtMaintenance').isInt({ min: 0 }).withMessage('Valid odometer is required'),
        body('costAmount').optional().isFloat({ min: 0 }),
        body('costCurrency').optional().isIn(['INR', 'USD', 'EUR']),
        body('serviceCenterName').optional().trim(),
        body('partsUsed').optional().isArray(),
        body('performedAt').optional().isISO8601(),
    ],
    validate,
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const record = await maintenanceService.create(
                req.params.bikeId,
                req.user!.id,
                req.body
            );
            res.status(201).json(record);
        } catch (error) {
            next(error);
        }
    }
);

// GET /api/v1/maintenance/bike/:bikeId - Get maintenance history
router.get(
    '/bike/:bikeId',
    [
        param('bikeId').isUUID().withMessage('Invalid bike ID'),
        query('type').optional().trim(),
    ],
    validate,
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const records = await maintenanceService.findByBike(
                req.params.bikeId,
                req.user!.id,
                req.query.type as string
            );
            res.json(records);
        } catch (error) {
            next(error);
        }
    }
);

// GET /api/v1/maintenance/:id - Get maintenance record
router.get(
    '/:id',
    [param('id').isUUID().withMessage('Invalid record ID')],
    validate,
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const record = await maintenanceService.findById(req.params.id, req.user!.id);
            res.json(record);
        } catch (error) {
            next(error);
        }
    }
);

// PUT /api/v1/maintenance/schedule/:bikeId - Update maintenance schedule
router.put(
    '/schedule/:bikeId',
    [
        param('bikeId').isUUID().withMessage('Invalid bike ID'),
        body('maintenanceType').trim().notEmpty().withMessage('Maintenance type is required'),
        body('intervalKm').optional().isInt({ min: 100 }),
        body('intervalDays').optional().isInt({ min: 1 }),
        body('isEnabled').optional().isBoolean(),
    ],
    validate,
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            await maintenanceService.updateSchedule(
                req.params.bikeId,
                req.user!.id,
                req.body.maintenanceType,
                req.body.intervalKm,
                req.body.intervalDays,
                req.body.isEnabled
            );
            res.json({ message: 'Schedule updated successfully' });
        } catch (error) {
            next(error);
        }
    }
);

export default router;
