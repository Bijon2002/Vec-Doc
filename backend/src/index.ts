import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import { config, validateConfig } from './config/index.js';
import { logger } from './utils/logger.js';
import { prisma } from './utils/prisma.js';
import { errorHandler } from './middleware/errorHandler.js';

// Routes
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import bikeRoutes from './routes/bike.routes.js';
import documentRoutes from './routes/document.routes.js';
import maintenanceRoutes from './routes/maintenance.routes.js';
import notificationRoutes from './routes/notification.routes.js';

// Validate config before starting
validateConfig();

const app: Application = express();

// Security middleware
app.use(helmet());
app.use(cors({
    origin: config.nodeEnv === 'production'
        ? ['https://vecdoc.app']
        : ['http://localhost:3000', 'http://localhost:8081'],
    credentials: true,
}));

// Rate limiting
app.use(rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.max,
    message: { error: 'Too many requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check
app.get('/health', (_req: Request, res: Response) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/bikes', bikeRoutes);
app.use('/api/v1/documents', documentRoutes);
app.use('/api/v1/maintenance', maintenanceRoutes);
app.use('/api/v1/notifications', notificationRoutes);

// 404 handler
app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use(errorHandler);

// Graceful shutdown
async function gracefulShutdown(): Promise<void> {
    logger.info('Shutting down gracefully...');
    await prisma.$disconnect();
    process.exit(0);
}

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Start server
const PORT = config.port;

app.listen(PORT, () => {
    logger.info(`🚀 Vec-Doc API running on port ${PORT}`);
    logger.info(`📝 Environment: ${config.nodeEnv}`);
});

export default app;
