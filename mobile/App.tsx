import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Navigation from './src/navigation';
import { initializeAuth } from './src/store';
import { NotificationService } from './src/services/notificationService';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes
            gcTime: 30 * 60 * 1000, // 30 minutes
            retry: 2,
        },
    },
});

export default function App() {
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        async function prepare() {
            try {
                // Initialize auth from local storage
                await initializeAuth();

                // Initialize notifications
                await NotificationService.registerForPushNotificationsAsync();
            } catch (e) {
                console.warn('Failed to initialize app:', e);
            } finally {
                setIsReady(true);
            }
        }
        prepare();
    }, []);

    if (!isReady) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4c6ef5" />
            </View>
        );
    }

    return (
        <QueryClientProvider client={queryClient}>
            <StatusBar style="light" />
            <Navigation />
        </QueryClientProvider>
    );
}

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#1a1a2e',
    },
});
