import { Router, Response, NextFunction } from 'express';
import { body, param, validationResult } from 'express-validator';
import { aiService } from '../services/ai.service.js';
import { documentService } from '../services/document.service.js';
import { authenticate, optionalAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { ValidationError } from '../middleware/errorHandler.js';

const router = Router();

router.use(optionalAuth);

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

/**
 * POST /api/v1/ai/parts/identify
 * Identify a bike part from an image URL.
 */
router.post(
    '/parts/identify',
    [body('imageUrl').isURL().withMessage('Valid image URL is required')],
    validate,
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const result = await aiService.identifyBikePart(req.body.imageUrl);
            res.json({ identification: result });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * POST /api/v1/ai/maintenance/chat
 * Chat with the maintenance assistant.
 */
router.post(
    '/maintenance/chat',
    [
        body('query').notEmpty().withMessage('Query is required'),
        body('context').optional().isString(),
    ],
    validate,
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const context = req.body.context || 'General bike maintenance';
            const response = await aiService.chatWithMaintenanceGuide(req.body.query, context);
            res.json({ response });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * POST /api/v1/ai/documents/:id/ocr
 * Manually trigger OCR for a document.
 */
router.post(
    '/documents/:id/ocr',
    [param('id').isUUID().withMessage('Invalid document ID')],
    validate,
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const document = await documentService.autoFillFromOCR(req.params.id, req.user!.id);
            res.json(document);
        } catch (error) {
            next(error);
        }
    }
);

/**
 * POST /api/v1/ai/voice/generate
 * Generate audio (mp3 base64) from text.
 */
router.post(
    '/voice/generate',
    [body('text').notEmpty().withMessage('Text is required')],
    validate,
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const base64Audio = await aiService.generateVoice(req.body.text);
            res.json({ audio: base64Audio });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * GET /api/v1/ai/petrol-alerts
 * Get global petrol alerts.
 */
router.get(
    '/petrol-alerts',
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const alerts = await aiService.getPetrolAlerts();
            res.json({ alerts });
        } catch (error) {
            next(error);
        }
    }
);

export default router;
