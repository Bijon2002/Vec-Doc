import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure notification behavior
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

export const NotificationService = {
    // Request permissions
    registerForPushNotificationsAsync: async () => {
        let token;

        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('default', {
                name: 'default',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#FF231F7C',
            });
        }

        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        if (finalStatus !== 'granted') {
            return null;
        }

        // verification only
        // token = (await Notifications.getExpoPushTokenAsync()).data;

        return true;
    },

    // Schedule a notification
    scheduleNotification: async (title: string, body: string, trigger: any) => {
        try {
            await Notifications.scheduleNotificationAsync({
                content: {
                    title,
                    body,
                    sound: true,
                },
                trigger: trigger as any,
            });
            return true;
        } catch (error) {
            console.error('Error scheduling notification:', error);
            return false;
        }
    },

    // Schedule document expiry reminder
    scheduleDocumentExpiryReminder: async (docTitle: string, expiryDate: string) => {
        const expiry = new Date(expiryDate);
        // Schedule 7 days before
        const triggerDate = new Date(expiry);
        triggerDate.setDate(triggerDate.getDate() - 7);

        if (triggerDate > new Date()) {
            await NotificationService.scheduleNotification(
                'Document Expiring Soon',
                `Your ${docTitle} is expiring in 7 days. Renew it now!`,
                triggerDate
            );
        }

        // Schedule 1 day before
        const triggerDate1Day = new Date(expiry);
        triggerDate1Day.setDate(triggerDate1Day.getDate() - 1);

        if (triggerDate1Day > new Date()) {
            await NotificationService.scheduleNotification(
                'Document Expiring Tomorrow',
                `Your ${docTitle} expires tomorrow!`,
                triggerDate1Day
            );
        }
    },

    // Schedule maintenance reminder (time based)
    scheduleMaintenanceReminder: async (bikeName: string, serviceDate: string) => {
        const service = new Date(serviceDate);
        // Reminder in 3 months (approx 90 days)
        const triggerDate = new Date(service);
        triggerDate.setDate(triggerDate.getDate() + 90);

        if (triggerDate > new Date()) {
            await NotificationService.scheduleNotification(
                'Maintenance Due?',
                `It's been 3 months since your last service for ${bikeName}. Check if it's due!`,
                triggerDate
            );
        }
    },

    cancelAllNotifications: async () => {
        await Notifications.cancelAllScheduledNotificationsAsync();
    }
};
