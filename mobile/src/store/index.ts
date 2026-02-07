import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as UserRepo from '../database/userRepository';
import * as BikeRepo from '../database/bikeRepository';

// Re-export types from repositories
export type { User } from '../database/userRepository';
export type { Bike } from '../database/bikeRepository';

// Auth State
interface AuthState {
    user: UserRepo.User | null;
    isAuthenticated: boolean;
    isLoading: boolean;

    // Actions
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string, fullName: string) => Promise<void>;
    logout: () => void;
    setUser: (user: UserRepo.User | null) => void;
    setLoading: (loading: boolean) => void;
    updateProfile: (updates: Partial<UserRepo.User>) => Promise<void>;

    // Auth tokens (for future sync/cloud features)
    accessToken: string | null;
    refreshToken: string | null;
    setTokens: (accessToken: string | null, refreshToken: string | null) => void;
}

export const useAuthStore = create<AuthState>()((set, get) => ({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    accessToken: null,
    refreshToken: null,

    login: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
            const user = await UserRepo.loginUser({ email, password });
            set({ user, isAuthenticated: true, isLoading: false });
            // Save user id to persist login
            await AsyncStorage.setItem('userId', user.id);
        } catch (error) {
            set({ isLoading: false });
            throw error;
        }
    },

    register: async (email: string, password: string, fullName: string) => {
        set({ isLoading: true });
        try {
            const user = await UserRepo.createUser({ email, password, fullName });
            set({ user, isAuthenticated: true, isLoading: false });
            // Save user id to persist login
            await AsyncStorage.setItem('userId', user.id);
        } catch (error) {
            set({ isLoading: false });
            throw error;
        }
    },

    logout: () => {
        AsyncStorage.removeItem('userId');
        set({ user: null, isAuthenticated: false, accessToken: null, refreshToken: null });
    },

    setUser: (user) => set({ user, isAuthenticated: !!user }),
    setLoading: (isLoading) => set({ isLoading }),
    setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),

    updateProfile: async (updates: Partial<UserRepo.User>) => {
        set({ isLoading: true });
        try {
            const currentUser = get().user;
            if (!currentUser) throw new Error('No user logged in');

            const updatedUser = await UserRepo.updateUser(currentUser.id, updates);
            if (updatedUser) {
                set({ user: updatedUser, isLoading: false });
            } else {
                set({ isLoading: false });
            }
        } catch (error) {
            set({ isLoading: false });
            throw error;
        }
    },
}));

// Initialize auth state from storage
export async function initializeAuth(): Promise<void> {
    try {
        const userId = await AsyncStorage.getItem('userId');
        if (userId) {
            const user = await UserRepo.getUserById(userId);
            if (user) {
                useAuthStore.setState({ user, isAuthenticated: true });
            }
        }
    } catch (error) {
        console.error('Failed to initialize auth:', error);
    }
}

// Bike store
interface BikeState {
    bikes: BikeRepo.Bike[];
    selectedBikeId: string | null;
    isLoading: boolean;

    // Computed
    selectedBike: () => BikeRepo.Bike | null;
    primaryBike: () => BikeRepo.Bike | null;

    // Actions
    loadBikes: (userId: string) => Promise<void>;
    addBike: (bike: Omit<BikeRepo.Bike, 'id' | 'createdAt' | 'updatedAt' | 'oilChangeStatus'> & { userId: string }) => Promise<BikeRepo.Bike>;
    updateBike: (bikeId: string, updates: Partial<BikeRepo.Bike>) => Promise<void>;
    deleteBike: (bikeId: string) => Promise<void>;
    setPrimaryBike: (bikeId: string) => Promise<void>;
    selectBike: (bikeId: string) => void;
    setLoading: (loading: boolean) => void;
}

export const useBikeStore = create<BikeState>((set, get) => ({
    bikes: [],
    selectedBikeId: null,
    isLoading: false,

    selectedBike: () => {
        const { bikes, selectedBikeId } = get();
        return bikes.find(b => b.id === selectedBikeId) || null;
    },

    primaryBike: () => {
        const { bikes } = get();
        return bikes.find(b => b.isPrimary) || bikes[0] || null;
    },

    loadBikes: async (userId: string) => {
        set({ isLoading: true });
        try {
            const bikes = await BikeRepo.getBikesByUserId(userId);
            set({ bikes, isLoading: false });
        } catch (error) {
            set({ isLoading: false });
            throw error;
        }
    },

    addBike: async (bikeData) => {
        set({ isLoading: true });
        try {
            const bike = await BikeRepo.createBike(bikeData);
            set(state => ({ bikes: [...state.bikes, bike], isLoading: false }));
            return bike;
        } catch (error) {
            set({ isLoading: false });
            throw error;
        }
    },

    updateBike: async (bikeId: string, updates: Partial<BikeRepo.Bike>) => {
        try {
            await BikeRepo.updateBike(bikeId, updates);
            const updatedBike = await BikeRepo.getBikeById(bikeId);
            if (updatedBike) {
                set(state => ({
                    bikes: state.bikes.map(b => b.id === bikeId ? updatedBike : b)
                }));
            }
        } catch (error) {
            throw error;
        }
    },

    deleteBike: async (bikeId: string) => {
        try {
            await BikeRepo.deleteBike(bikeId);
            set(state => ({
                bikes: state.bikes.filter(b => b.id !== bikeId),
                selectedBikeId: state.selectedBikeId === bikeId ? null : state.selectedBikeId,
            }));
        } catch (error) {
            throw error;
        }
    },

    setPrimaryBike: async (bikeId: string) => {
        const { bikes } = get();
        await Promise.all(
            bikes.map(b =>
                b.id === bikeId
                    ? Promise.resolve() // Handled by setPrimaryBike call logic elsewhere or below? 
                    : Promise.resolve()
            )
        );
        // Wait, the repo logic handles database update?
        // Repo.setPrimaryBike handles setting one to true and others to false?
        // Let's assume Repo handles DB side. We need to update local state.

        // Actually, we should call Repo first to be safe.
        // But the caller (BikeDetailScreen) calls BikeRepo.setPrimaryBike!
        // So here we might just update local state.
        // But to be consistent with other actions, the store should probably wrap the repo call.
        // However, BikeDetailScreen calls `await BikeRepo.setPrimaryBike(bike.userId, bike.id);`
        // AND THEN calls `setPrimaryBike(bike.id)`. 
        // So this store action just needs to update the state.

        set(state => ({
            bikes: state.bikes.map(b => ({
                ...b,
                isPrimary: b.id === bikeId
            }))
        }));
    },

    selectBike: (bikeId) => set({ selectedBikeId: bikeId }),
    setLoading: (isLoading) => set({ isLoading }),
}));

// App-wide UI state
interface AppState {
    isOnboarded: boolean;
    theme: 'light' | 'dark' | 'system';

    homeLocation: { lat: number; lng: number; address?: string } | null;
    notificationsEnabled: boolean;
    customAiUrl: string | null;
    aiProvider: 'gemini' | 'huggingface' | 'custom' | 'mock';
    huggingFaceApiKey: string | null;

    setOnboarded: (value: boolean) => void;
    setTheme: (theme: 'light' | 'dark' | 'system') => void;
    setHomeLocation: (homeLocation: { lat: number; lng: number; address?: string } | null) => void;
    setNotificationsEnabled: (enabled: boolean) => void;
    setCustomAiUrl: (url: string | null) => void;
    setAiProvider: (provider: 'gemini' | 'huggingface' | 'custom' | 'mock') => void;
    setHuggingFaceApiKey: (key: string | null) => void;
}

export const useAppStore = create<AppState>()(
    persist(
        (set) => ({
            isOnboarded: false,
            theme: 'system',
            homeLocation: null,
            notificationsEnabled: true,
            customAiUrl: null,
            aiProvider: 'gemini', // Default to Gemini (or mock if no key)
            huggingFaceApiKey: null,

            setOnboarded: (isOnboarded) => set({ isOnboarded }),
            setTheme: (theme) => set({ theme }),
            setHomeLocation: (homeLocation) => set({ homeLocation }),
            setNotificationsEnabled: (notificationsEnabled) => set({ notificationsEnabled }),
            setCustomAiUrl: (customAiUrl) => set({ customAiUrl }),
            setAiProvider: (aiProvider) => set({ aiProvider }),
            setHuggingFaceApiKey: (huggingFaceApiKey) => set({ huggingFaceApiKey }),
        }),
        {
            name: 'app-storage',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);
