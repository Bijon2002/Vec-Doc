import React from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useColorScheme } from 'react-native';
import { useAuthStore, useAppStore } from '../store';

// Screens (will be created)
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import HomeScreen from '../screens/home/HomeScreen';
import BikesScreen from '../screens/bikes/BikesScreen';
import BikeDetailScreen from '../screens/bikes/BikeDetailScreen';
import AddBikeScreen from '../screens/bikes/AddBikeScreen';
import DocumentsScreen from '../screens/documents/DocumentsScreen';
import AddDocumentScreen from '../screens/documents/AddDocumentScreen';
import MaintenanceScreen from '../screens/maintenance/MaintenanceScreen';
import LogMaintenanceScreen from '../screens/maintenance/LogMaintenanceScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import SettingsScreen from '../screens/profile/SettingsScreen';

// Type definitions
export type AuthStackParamList = {
    Login: undefined;
    Register: undefined;
    ForgotPassword: undefined;
};

export type MainTabParamList = {
    Home: undefined;
    Bikes: undefined;
    Documents: undefined;
    Maintenance: undefined;
    Profile: undefined;
};

export type RootStackParamList = {
    Main: undefined;
    BikeDetail: { bikeId: string };
    AddBike: undefined;
    AddDocument: { bikeId: string };
    LogMaintenance: { bikeId: string };
    Settings: undefined;
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const MainTab = createBottomTabNavigator<MainTabParamList>();
const RootStack = createNativeStackNavigator<RootStackParamList>();

// Custom theme colors
const VecDocLightTheme = {
    ...DefaultTheme,
    colors: {
        ...DefaultTheme.colors,
        primary: '#4c6ef5',
        background: '#f8f9fa',
        card: '#ffffff',
        text: '#212529',
        border: '#dee2e6',
        notification: '#ff6b6b',
    },
};

const VecDocDarkTheme = {
    ...DarkTheme,
    colors: {
        ...DarkTheme.colors,
        primary: '#748ffc',
        background: '#1a1a2e',
        card: '#16213e',
        text: '#f8f9fa',
        border: '#2d3436',
        notification: '#ff6b6b',
    },
};

// Tab icons (using text for now, replace with icon library)
const TabIcon = ({ name, focused }: { name: string; focused: boolean }) => {
    const icons: Record<string, string> = {
        Home: '🏠',
        Bikes: '🏍️',
        Documents: '📄',
        Maintenance: '🔧',
        Profile: '👤',
    };
    return (
        <React.Fragment>
            {/* In production, use a proper icon library */}
        </React.Fragment>
    );
};

function AuthNavigator() {
    return (
        <AuthStack.Navigator
            screenOptions={{
                headerShown: false,
                animation: 'slide_from_right',
            }}
        >
            <AuthStack.Screen name="Login" component={LoginScreen} />
            <AuthStack.Screen name="Register" component={RegisterScreen} />
        </AuthStack.Navigator>
    );
}

function MainTabNavigator() {
    return (
        <MainTab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarActiveTintColor: '#4c6ef5',
                tabBarInactiveTintColor: '#868e96',
                tabBarStyle: {
                    paddingTop: 8,
                    paddingBottom: 8,
                    height: 60,
                },
                tabBarLabelStyle: {
                    fontSize: 12,
                    fontWeight: '500',
                },
            })}
        >
            <MainTab.Screen
                name="Home"
                component={HomeScreen}
                options={{ tabBarLabel: 'Home' }}
            />
            <MainTab.Screen
                name="Bikes"
                component={BikesScreen}
                options={{ tabBarLabel: 'My Bikes' }}
            />
            <MainTab.Screen
                name="Documents"
                component={DocumentsScreen}
                options={{ tabBarLabel: 'Documents' }}
            />
            <MainTab.Screen
                name="Maintenance"
                component={MaintenanceScreen}
                options={{ tabBarLabel: 'Service' }}
            />
            <MainTab.Screen
                name="Profile"
                component={ProfileScreen}
                options={{ tabBarLabel: 'Profile' }}
            />
        </MainTab.Navigator>
    );
}

function RootNavigator() {
    return (
        <RootStack.Navigator
            screenOptions={{
                headerShown: true,
                headerBackTitleVisible: false,
                headerTintColor: '#4c6ef5',
                headerStyle: {
                    backgroundColor: 'transparent',
                },
            }}
        >
            <RootStack.Screen
                name="Main"
                component={MainTabNavigator}
                options={{ headerShown: false }}
            />
            <RootStack.Screen
                name="BikeDetail"
                component={BikeDetailScreen}
                options={{ title: 'Bike Details' }}
            />
            <RootStack.Screen
                name="AddBike"
                component={AddBikeScreen}
                options={{ title: 'Add New Bike', presentation: 'modal' }}
            />
            <RootStack.Screen
                name="AddDocument"
                component={AddDocumentScreen}
                options={{ title: 'Add Document', presentation: 'modal' }}
            />
            <RootStack.Screen
                name="LogMaintenance"
                component={LogMaintenanceScreen}
                options={{ title: 'Log Service', presentation: 'modal' }}
            />
            <RootStack.Screen
                name="Settings"
                component={SettingsScreen}
                options={{ title: 'Settings' }}
            />
        </RootStack.Navigator>
    );
}

export default function Navigation() {
    const systemColorScheme = useColorScheme();
    const { theme } = useAppStore();
    const { isAuthenticated, isLoading } = useAuthStore();

    const appliedTheme = theme === 'system' ? systemColorScheme : theme;

    if (isLoading) {
        return null; // Or a splash screen
    }

    return (
        <NavigationContainer
            theme={appliedTheme === 'dark' ? VecDocDarkTheme : VecDocLightTheme}
        >
            {isAuthenticated ? <RootNavigator /> : <AuthNavigator />}
        </NavigationContainer>
    );
}
