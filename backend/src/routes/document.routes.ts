import { Router, Response, NextFunction } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { documentService } from '../services/document.service.js';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.js';
import { ValidationError } from '../middleware/errorHandler.js';
import { DocumentType } from '@prisma/client';

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

// GET /api/v1/documents/expiring - Get all expiring documents
router.get(
    '/expiring',
    [query('days').optional().isInt({ min: 1, max: 365 })],
    validate,
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const days = parseInt(req.query.days as string) || 30;
            const documents = await documentService.findExpiringDocuments(req.user!.id, days);
            res.json(documents);
        } catch (error) {
            next(error);
        }
    }
);

// POST /api/v1/documents/bike/:bikeId - Create document for bike
router.post(
    '/bike/:bikeId',
    [
        param('bikeId').isUUID().withMessage('Invalid bike ID'),
        body('documentType').isIn(Object.values(DocumentType)).withMessage('Invalid document type'),
        body('title').trim().notEmpty().withMessage('Title is required'),
        body('description').optional().trim(),
        body('issueDate').optional().isISO8601().withMessage('Invalid issue date'),
        body('expiryDate').optional().isISO8601().withMessage('Invalid expiry date'),
        body('fileUrl').optional().isURL(),
    ],
    validate,
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const document = await documentService.create(
                req.params.bikeId,
                req.user!.id,
                req.body
            );
            res.status(201).json(document);
        } catch (error) {
            next(error);
        }
    }
);

// GET /api/v1/documents/bike/:bikeId - Get all documents for a bike
router.get(
    '/bike/:bikeId',
    [param('bikeId').isUUID().withMessage('Invalid bike ID')],
    validate,
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const documents = await documentService.findByBike(req.params.bikeId, req.user!.id);
            res.json(documents);
        } catch (error) {
            next(error);
        }
    }
);

// GET /api/v1/documents/:id - Get document details
router.get(
    '/:id',
    [param('id').isUUID().withMessage('Invalid document ID')],
    validate,
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const document = await documentService.findById(req.params.id, req.user!.id);
            res.json(document);
        } catch (error) {
            next(error);
        }
    }
);

// PUT /api/v1/documents/:id - Update document
router.put(
    '/:id',
    [
        param('id').isUUID().withMessage('Invalid document ID'),
        body('documentType').optional().isIn(Object.values(DocumentType)),
        body('title').optional().trim().notEmpty(),
        body('expiryDate').optional().isISO8601(),
    ],
    validate,
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const document = await documentService.update(req.params.id, req.user!.id, req.body);
            res.json(document);
        } catch (error) {
            next(error);
        }
    }
);

// DELETE /api/v1/documents/:id - Delete document
router.delete(
    '/:id',
    [param('id').isUUID().withMessage('Invalid document ID')],
    validate,
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            await documentService.delete(req.params.id, req.user!.id);
            res.json({ message: 'Document deleted successfully' });
        } catch (error) {
            next(error);
        }
    }
);

export default router;
