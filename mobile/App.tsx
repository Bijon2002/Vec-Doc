import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet, Text, Platform } from 'react-native';
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
    const [initError, setInitError] = useState<string | null>(null);

    useEffect(() => {
        async function prepare() {
            try {
                console.log('App: Initializing storage and auth...');
                // Initialize auth from local storage
                await initializeAuth();

                if (Platform.OS !== 'web') {
                    console.log('App: Initializing notifications...');
                    // Initialize notifications
                    await NotificationService.registerForPushNotificationsAsync();
                }
            } catch (e: any) {
                console.warn('Failed to initialize app:', e);
                setInitError(e.message || 'Unknown error during initialization');
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
                <Text style={{ color: 'white', marginTop: 10 }}>Initializing Vec-Doc...</Text>
            </View>
        );
    }

    if (initError) {
        // We show the app anyway, as some features might work even if init failed (like offline mode)
        console.log('App: Proceeding with initialization error:', initError);
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
