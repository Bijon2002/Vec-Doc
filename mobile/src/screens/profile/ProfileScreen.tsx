import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuthStore, useBikeStore } from '../../store';
import { authApi } from '../../api/client';
import { RootStackParamList } from '../../navigation';

type ProfileNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function ProfileScreen() {
    const navigation = useNavigation<ProfileNavigationProp>();
    const { user, logout, refreshToken } = useAuthStore();
    const { bikes } = useBikeStore();

    const handleLogout = async () => {
        Alert.alert(
            'Logout',
            'Are you sure you want to logout?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Logout',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            if (refreshToken) {
                                await authApi.logout(refreshToken);
                            }
                        } catch {
                            // Ignore logout API errors
                        }
                        logout();
                    },
                },
            ]
        );
    };

    return (
        <ScrollView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                        {user?.fullName?.charAt(0)?.toUpperCase() || '?'}
                    </Text>
                </View>
                <Text style={styles.userName}>{user?.fullName || 'Rider'}</Text>
                <Text style={styles.userEmail}>{user?.email}</Text>
            </View>

            {/* Stats */}
            <View style={styles.statsContainer}>
                <View style={styles.statCard}>
                    <Text style={styles.statValue}>{bikes.length}</Text>
                    <Text style={styles.statLabel}>Bikes</Text>
                </View>
                <View style={styles.statCard}>
                    <Text style={styles.statValue}>
                        {bikes.reduce((sum, b) => sum + b.currentOdometerKm, 0).toLocaleString()}
                    </Text>
                    <Text style={styles.statLabel}>Total km</Text>
                </View>
            </View>

            {/* Menu Items */}
            <View style={styles.menuSection}>
                <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => navigation.navigate('Settings')}
                >
                    <Text style={styles.menuIcon}>⚙️</Text>
                    <Text style={styles.menuText}>Settings</Text>
                    <Text style={styles.menuArrow}>›</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.menuItem}>
                    <Text style={styles.menuIcon}>🔔</Text>
                    <Text style={styles.menuText}>Notifications</Text>
                    <Text style={styles.menuArrow}>›</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.menuItem}>
                    <Text style={styles.menuIcon}>❓</Text>
                    <Text style={styles.menuText}>Help & Support</Text>
                    <Text style={styles.menuArrow}>›</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.menuItem}>
                    <Text style={styles.menuIcon}>📝</Text>
                    <Text style={styles.menuText}>Privacy Policy</Text>
                    <Text style={styles.menuArrow}>›</Text>
                </TouchableOpacity>
            </View>

            {/* Logout */}
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>

            <Text style={styles.version}>Vec-Doc v1.0.0</Text>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#1a1a2e',
    },
    header: {
        alignItems: 'center',
        paddingTop: 80,
        paddingBottom: 24,
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#4c6ef5',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    avatarText: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#ffffff',
    },
    userName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#ffffff',
    },
    userEmail: {
        fontSize: 14,
        color: '#868e96',
        marginTop: 4,
    },
    statsContainer: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        marginBottom: 24,
    },
    statCard: {
        flex: 1,
        backgroundColor: '#16213e',
        borderRadius: 16,
        padding: 20,
        marginHorizontal: 6,
        alignItems: 'center',
    },
    statValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#4c6ef5',
    },
    statLabel: {
        fontSize: 12,
        color: '#868e96',
        marginTop: 4,
    },
    menuSection: {
        backgroundColor: '#16213e',
        borderRadius: 16,
        marginHorizontal: 16,
        overflow: 'hidden',
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 18,
        borderBottomWidth: 1,
        borderBottomColor: '#2d3436',
    },
    menuIcon: {
        fontSize: 20,
        marginRight: 16,
    },
    menuText: {
        flex: 1,
        fontSize: 16,
        color: '#ffffff',
    },
    menuArrow: {
        fontSize: 20,
        color: '#868e96',
    },
    logoutButton: {
        backgroundColor: '#ff6b6b',
        borderRadius: 12,
        padding: 16,
        marginHorizontal: 16,
        marginTop: 24,
        alignItems: 'center',
    },
    logoutText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
    },
    version: {
        textAlign: 'center',
        color: '#868e96',
        fontSize: 12,
        marginTop: 24,
        marginBottom: 40,
    },
});
