import cron from 'node-cron';
import { prisma } from '../utils/prisma.js';
import { logger } from '../utils/logger.js';
import { AlertStatus, NotificationStatus, NotificationPriority } from '@prisma/client';

// Process pending document alerts every 5 minutes
export function startAlertProcessor(): void {
    cron.schedule('*/5 * * * *', async () => {
        try {
            await processDocumentAlerts();
        } catch (error) {
            logger.error('Error processing document alerts:', error);
        }
    });

    // Also run on startup
    processDocumentAlerts().catch((error) => {
        logger.error('Initial alert processing failed:', error);
    });

    logger.info('Alert processor started');
}

async function processDocumentAlerts(): Promise<void> {
    const now = new Date();

    // Find pending alerts that are due
    const pendingAlerts = await prisma.documentAlert.findMany({
        where: {
            status: AlertStatus.PENDING,
            scheduledAt: { lte: now },
        },
        include: {
            document: {
                include: {
                    bike: { select: { nickname: true, brand: true, model: true } },
                },
            },
        },
        take: 100,
    });

    logger.info(`Processing ${pendingAlerts.length} pending alerts`);

    for (const alert of pendingAlerts) {
        try {
            // Get user settings
            const settings = await prisma.notificationSettings.findUnique({
                where: { userId: alert.userId },
            });

            if (!settings?.documentAlerts) {
                // User disabled document alerts
                await prisma.documentAlert.update({
                    where: { id: alert.id },
                    data: { status: AlertStatus.ACKNOWLEDGED },
                });
                continue;
            }

            // Check quiet hours
            if (settings.quietHoursStart && settings.quietHoursEnd) {
                const currentHour = now.getHours();
                const currentMinute = now.getMinutes();
                const [startHour, startMinute] = settings.quietHoursStart.split(':').map(Number);
                const [endHour, endMinute] = settings.quietHoursEnd.split(':').map(Number);

                const currentTime = currentHour * 60 + currentMinute;
                const startTime = startHour * 60 + startMinute;
                const endTime = endHour * 60 + endMinute;

                // Handle overnight quiet hours
                const isQuietTime = startTime <= endTime
                    ? currentTime >= startTime && currentTime <= endTime
                    : currentTime >= startTime || currentTime <= endTime;

                if (isQuietTime) {
                    // Schedule for after quiet hours
                    const nextTime = new Date();
                    nextTime.setHours(endHour, endMinute + 1, 0, 0);
                    if (nextTime <= now) {
                        nextTime.setDate(nextTime.getDate() + 1);
                    }

                    await prisma.documentAlert.update({
                        where: { id: alert.id },
                        data: { scheduledAt: nextTime },
                    });
                    continue;
                }
            }

            // Create notification
            const bikeName = alert.document.bike.nickname ||
                `${alert.document.bike.brand} ${alert.document.bike.model}`;

            const { title, body, priority } = getAlertContent(
                alert.alertType,
                alert.document.title,
                bikeName,
                alert.document.expiryDate!
            );

            await prisma.notificationQueue.create({
                data: {
                    userId: alert.userId,
                    title,
                    body,
                    category: 'document',
                    priority,
                    data: {
                        type: 'document_expiry',
                        documentId: alert.documentId,
                        bikeId: alert.document.bikeId,
                        alertType: alert.alertType,
                    },
                    status: NotificationStatus.PENDING,
                },
            });

            // Mark alert as sent
            await prisma.documentAlert.update({
                where: { id: alert.id },
                data: { status: AlertStatus.SENT, sentAt: now },
            });

            logger.info(`Alert sent: ${alert.id} for document ${alert.documentId}`);

        } catch (error) {
            logger.error(`Failed to process alert ${alert.id}:`, error);

            // Update retry count
            const newRetryCount = alert.retryCount + 1;

            if (newRetryCount >= 3) {
                await prisma.documentAlert.update({
                    where: { id: alert.id },
                    data: {
                        status: AlertStatus.FAILED,
                        retryCount: newRetryCount,
                        lastError: String(error),
                    },
                });
            } else {
                // Exponential backoff: 5min, 25min, 125min
                const delayMinutes = Math.pow(5, newRetryCount);
                const nextAttempt = new Date(now.getTime() + delayMinutes * 60 * 1000);

                await prisma.documentAlert.update({
                    where: { id: alert.id },
                    data: {
                        scheduledAt: nextAttempt,
                        retryCount: newRetryCount,
                        lastError: String(error),
                    },
                });
            }
        }
    }
}

function getAlertContent(
    alertType: string,
    documentTitle: string,
    bikeName: string,
    expiryDate: Date
): { title: string; body: string; priority: NotificationPriority } {
    const formattedDate = expiryDate.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });

    switch (alertType) {
        case '30_day':
            return {
                title: '📄 Document Expiring Soon',
                body: `${documentTitle} for ${bikeName} expires on ${formattedDate} (30 days)`,
                priority: NotificationPriority.LOW,
            };
        case '7_day':
            return {
                title: '⚠️ Document Expires in 1 Week',
                body: `${documentTitle} for ${bikeName} expires on ${formattedDate}. Renew soon!`,
                priority: NotificationPriority.NORMAL,
            };
        case '1_day':
            return {
                title: '🚨 Document Expires Tomorrow!',
                body: `${documentTitle} for ${bikeName} expires tomorrow. Renew immediately!`,
                priority: NotificationPriority.HIGH,
            };
        case 'expired':
            return {
                title: '❌ Document Expired!',
                body: `${documentTitle} for ${bikeName} has expired. Renew now to avoid penalties.`,
                priority: NotificationPriority.CRITICAL,
            };
        default:
            return {
                title: 'Document Alert',
                body: `${documentTitle} for ${bikeName}`,
                priority: NotificationPriority.NORMAL,
            };
    }
}

export { processDocumentAlerts };
