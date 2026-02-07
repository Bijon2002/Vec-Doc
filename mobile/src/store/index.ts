import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import * as SecureStore from 'expo-secure-store';

// Secure storage adapter for Zustand
const secureStorage = {
    getItem: async (name: string): Promise<string | null> => {
        return await SecureStore.getItemAsync(name);
    },
    setItem: async (name: string, value: string): Promise<void> => {
        await SecureStore.setItemAsync(name, value);
    },
    removeItem: async (name: string): Promise<void> => {
        await SecureStore.deleteItemAsync(name);
    },
};

export interface User {
    id: string;
    email: string;
    fullName: string;
    isVerified: boolean;
    profileImageUrl?: string;
}

export interface Bike {
    id: string;
    nickname?: string;
    brand: string;
    model: string;
    year: number;
    engineCapacityCc?: number;
    fuelType: string;
    registrationNumber?: string;
    oilChangeIntervalKm: number;
    lastOilChangeKm: number;
    currentOdometerKm: number;
    isPrimary: boolean;
    isActive: boolean;
    imageUrl?: string;
    oilChangeStatus?: {
        status: 'ok' | 'due_soon' | 'overdue';
        kmRemaining: number;
        percentageUsed: number;
    };
}

interface AuthState {
    accessToken: string | null;
    refreshToken: string | null;
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;

    // Actions
    setTokens: (accessToken: string, refreshToken: string) => void;
    setUser: (user: User) => void;
    logout: () => void;
    setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            accessToken: null,
            refreshToken: null,
            user: null,
            isAuthenticated: false,
            isLoading: true,

            setTokens: (accessToken, refreshToken) => set({
                accessToken,
                refreshToken,
                isAuthenticated: true,
            }),

            setUser: (user) => set({ user }),

            logout: () => set({
                accessToken: null,
                refreshToken: null,
                user: null,
                isAuthenticated: false,
            }),

            setLoading: (isLoading) => set({ isLoading }),
        }),
        {
            name: 'auth-storage',
            storage: createJSONStorage(() => secureStorage),
            partialize: (state) => ({
                accessToken: state.accessToken,
                refreshToken: state.refreshToken,
                user: state.user,
                isAuthenticated: state.isAuthenticated,
            }),
        }
    )
);

// Bike store
interface BikeState {
    bikes: Bike[];
    selectedBikeId: string | null;
    isLoading: boolean;

    // Computed
    selectedBike: () => Bike | null;
    primaryBike: () => Bike | null;

    // Actions
    setBikes: (bikes: Bike[]) => void;
    selectBike: (bikeId: string) => void;
    updateBike: (bikeId: string, updates: Partial<Bike>) => void;
    addBike: (bike: Bike) => void;
    removeBike: (bikeId: string) => void;
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

    setBikes: (bikes) => set({ bikes }),

    selectBike: (bikeId) => set({ selectedBikeId: bikeId }),

    updateBike: (bikeId, updates) => set((state) => ({
        bikes: state.bikes.map(b =>
            b.id === bikeId ? { ...b, ...updates } : b
        ),
    })),

    addBike: (bike) => set((state) => ({
        bikes: [...state.bikes, bike],
    })),

    removeBike: (bikeId) => set((state) => ({
        bikes: state.bikes.filter(b => b.id !== bikeId),
        selectedBikeId: state.selectedBikeId === bikeId ? null : state.selectedBikeId,
    })),

    setLoading: (isLoading) => set({ isLoading }),
}));

// App-wide UI state
interface AppState {
    isOnboarded: boolean;
    theme: 'light' | 'dark' | 'system';

    setOnboarded: (value: boolean) => void;
    setTheme: (theme: 'light' | 'dark' | 'system') => void;
}

export const useAppStore = create<AppState>()(
    persist(
        (set) => ({
            isOnboarded: false,
            theme: 'system',

            setOnboarded: (isOnboarded) => set({ isOnboarded }),
            setTheme: (theme) => set({ theme }),
        }),
        {
            name: 'app-storage',
            storage: createJSONStorage(() => secureStorage),
        }
    )
);
