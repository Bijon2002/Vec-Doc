import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Navigation from './src/navigation';

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
    return (
        <QueryClientProvider client={queryClient}>
            <StatusBar style="light" />
            <Navigation />
        </QueryClientProvider>
    );
}
