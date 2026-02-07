import React from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useColorScheme } from 'react-native';
import { useAuthStore, useAppStore } from '../store';
import { Ionicons } from '@expo/vector-icons';

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

import RideTrackingScreen from '../screens/ride/RideTrackingScreen';
import ServicesScreen from '../screens/services/ServicesScreen';
import PartsMarketplaceScreen from '../screens/services/PartsMarketplaceScreen';
import PrivacyPolicyScreen from '../screens/profile/PrivacyPolicyScreen';
import HelpSupportScreen from '../screens/profile/HelpSupportScreen';
import NotificationsScreen from '../screens/notifications/NotificationsScreen';
import ChatScreen from '../screens/ai/ChatScreen';

// Type definitions
export type AuthStackParamList = {
    Login: undefined;
    Register: undefined;
    ForgotPassword: undefined;
};

export type MainTabParamList = {
    Home: undefined;
    Bikes: undefined;
    Chat: undefined;
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
    RideTracking: undefined;
    Services: undefined;
    PartsMarketplace: undefined;
    PrivacyPolicy: undefined;
    HelpSupport: undefined;
    Notifications: undefined;
    Chat: undefined;
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const MainTab = createBottomTabNavigator<MainTabParamList>();
const RootStack = createNativeStackNavigator<RootStackParamList>();

// Custom theme colors
const VecDocLightTheme = {
    ...DefaultTheme,
    colors: {
        ...DefaultTheme.colors,
        primary: '#1a237e', // Dark Navy Blue
        background: '#ffffff',
        card: '#f5f5f5',
        text: '#1a1a1a',
        border: '#e0e0e0',
        notification: '#c62828',
    },
};

const VecDocDarkTheme = {
    ...DarkTheme,
    colors: {
        ...DarkTheme.colors,
        primary: '#ffc107', // Amber/Gold
        background: '#0d1b2a', // Deep Navy
        card: '#1b263b', // Lighter Navy
        text: '#e0e1dd',
        border: '#415a77',
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
                tabBarIcon: ({ focused, color, size }) => {
                    let iconName: keyof typeof Ionicons.glyphMap;

                    if (route.name === 'Home') {
                        iconName = focused ? 'home' : 'home-outline';
                    } else if (route.name === 'Bikes') {
                        iconName = focused ? 'bicycle' : 'bicycle-outline';
                    } else if (route.name === 'Documents') {
                        iconName = focused ? 'document-text' : 'document-text-outline';
                    } else if (route.name === 'Maintenance') {
                        iconName = focused ? 'build' : 'build-outline';
                    } else if (route.name === 'Profile') {
                        iconName = focused ? 'person' : 'person-outline';
                    } else if (route.name === 'Chat') {
                        iconName = focused ? 'sparkles' : 'sparkles-outline';
                    } else {
                        iconName = 'alert-circle';
                    }

                    return <Ionicons name={iconName} size={size} color={color} />;
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
                name="Chat"
                component={ChatScreen}
                options={{ tabBarLabel: 'Assistant' }}
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
            <RootStack.Screen
                name="RideTracking"
                component={RideTrackingScreen}
                options={{ title: 'Ride Tracker', presentation: 'fullScreenModal', headerShown: false }}
            />
            <RootStack.Screen
                name="Services"
                component={ServicesScreen}
                options={{ title: 'Nearby Services' }}
            />
            <RootStack.Screen
                name="PartsMarketplace"
                component={PartsMarketplaceScreen}
                options={{ title: 'Parts Marketplace', headerShown: false }}
            />
            <RootStack.Screen
                name="PrivacyPolicy"
                component={PrivacyPolicyScreen}
                options={{ title: 'Privacy Policy' }}
            />
            <RootStack.Screen
                name="HelpSupport"
                component={HelpSupportScreen}
                options={{ title: 'Help & Support' }}
            />
            <RootStack.Screen
                name="Notifications"
                component={NotificationsScreen}
                options={{ title: 'Notifications' }}
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
