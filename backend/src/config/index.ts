import dotenv from 'dotenv';
dotenv.config();

export const config = {
    // Server
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3000', 10),

    // Database
    databaseUrl: process.env.DATABASE_URL!,

    // JWT
    jwt: {
        secret: process.env.JWT_SECRET!,
        refreshSecret: process.env.JWT_REFRESH_SECRET!,
        expiresIn: process.env.JWT_EXPIRES_IN || '15m',
        refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    },

    // File Storage
    storage: {
        type: process.env.STORAGE_TYPE || 'local',
        uploadDir: process.env.UPLOAD_DIR || './uploads',
        maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10), // 10MB
    },

    // AWS S3
    aws: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: process.env.AWS_REGION || 'ap-south-1',
        s3Bucket: process.env.AWS_S3_BUCKET,
    },

    // Firebase
    firebase: {
        serverKey: process.env.FCM_SERVER_KEY,
    },

    // Google Cloud
    google: {
        projectId: process.env.GOOGLE_PROJECT_ID,
        credentials: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    },

    // OpenAI
    openai: {
        apiKey: process.env.OPENAI_API_KEY,
    },

    // Rate Limiting
    rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
        max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
    },

    // Logging
    logLevel: process.env.LOG_LEVEL || 'debug',
};

// Validate required config
const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET', 'JWT_REFRESH_SECRET'];

export function validateConfig(): void {
    const missing = requiredEnvVars.filter((key) => !process.env[key]);
    if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
}
