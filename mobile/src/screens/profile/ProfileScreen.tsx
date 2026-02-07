import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    Image,
} from 'react-native';
import { useNavigation, useTheme } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore, useBikeStore } from '../../store';
import { RootStackParamList } from '../../navigation';

type ProfileNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function ProfileScreen() {
    const navigation = useNavigation<ProfileNavigationProp>();
    const { colors } = useTheme();
    const { user, logout, updateProfile } = useAuthStore();
    const { bikes } = useBikeStore();

    const handleLogout = async () => {
        Alert.alert(
            'Logout',
            'Are you sure you want to logout? Your data will remain on this device.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Logout',
                    style: 'destructive',
                    onPress: () => {
                        logout();
                    },
                },
            ]
        );
    };

    const handleUpdateProfileImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission needed', 'Please grant permission to access your photos');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
        });

        if (!result.canceled) {
            try {
                await updateProfile({ profileImageUri: result.assets[0].uri });
            } catch (error) {
                Alert.alert('Error', 'Failed to update profile image');
            }
        }
    };

    return (
        <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: colors.card }]}>
                <TouchableOpacity onPress={handleUpdateProfileImage} style={styles.avatarContainer}>
                    {user?.profileImageUri ? (
                        <Image source={{ uri: user.profileImageUri }} style={[styles.avatarImage, { borderColor: colors.background }]} />
                    ) : (
                        <View style={[styles.avatar, { backgroundColor: colors.primary, borderColor: colors.background }]}>
                            <Text style={styles.avatarText}>
                                {user?.fullName?.charAt(0)?.toUpperCase() || '?'}
                            </Text>
                        </View>
                    )}
                    <View style={[styles.editBadge, { backgroundColor: colors.notification, borderColor: colors.background }]}>
                        <Text style={styles.editBadgeText}>📷</Text>
                    </View>
                </TouchableOpacity>
                <Text style={[styles.userName, { color: colors.text }]}>{user?.fullName || 'Rider'}</Text>
                <Text style={[styles.userEmail, { color: colors.text, opacity: 0.7 }]}>{user?.email}</Text>
                <View style={[styles.localBadge, { backgroundColor: colors.card === '#f5f5f5' ? '#e6fcf5' : 'rgba(81, 207, 102, 0.1)' }]}>
                    <Text style={[styles.localBadgeText, { color: '#099268' }]}>📱 Local Account</Text>
                </View>
            </View>

            {/* Stats */}
            <View style={styles.statsContainer}>
                <View style={[styles.statCard, { backgroundColor: colors.card }]}>
                    <Text style={[styles.statValue, { color: colors.primary }]}>{bikes.length}</Text>
                    <Text style={[styles.statLabel, { color: colors.text, opacity: 0.6 }]}>Bikes</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: colors.card }]}>
                    <Text style={[styles.statValue, { color: colors.primary }]}>
                        {bikes.reduce((sum, b) => sum + b.currentOdometerKm, 0).toLocaleString()}
                    </Text>
                    <Text style={[styles.statLabel, { color: colors.text, opacity: 0.6 }]}>Total km</Text>
                </View>
            </View>

            {/* Menu Items */}
            <View style={[styles.menuSection, { backgroundColor: colors.card }]}>
                <TouchableOpacity
                    style={[styles.menuItem, { borderBottomColor: colors.border }]}
                    onPress={() => navigation.navigate('Settings')}
                >
                    <Text style={styles.menuIcon}>⚙️</Text>
                    <Text style={[styles.menuText, { color: colors.text }]}>Settings</Text>
                    <Text style={[styles.menuArrow, { color: colors.text, opacity: 0.3 }]}>›</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.menuItem, { borderBottomColor: colors.border }]}>
                    <Text style={styles.menuIcon}>🔔</Text>
                    <Text style={[styles.menuText, { color: colors.text }]}>Notifications</Text>
                    <Text style={[styles.menuArrow, { color: colors.text, opacity: 0.3 }]}>›</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.menuItem, { borderBottomColor: colors.border }]}>
                    <Text style={styles.menuIcon}>❓</Text>
                    <Text style={[styles.menuText, { color: colors.text }]}>Help & Support</Text>
                    <Text style={[styles.menuArrow, { color: colors.text, opacity: 0.3 }]}>›</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.menuItem, { borderBottomColor: 'transparent' }]}>
                    <Text style={styles.menuIcon}>📝</Text>
                    <Text style={[styles.menuText, { color: colors.text }]}>Privacy Policy</Text>
                    <Text style={[styles.menuArrow, { color: colors.text, opacity: 0.3 }]}>›</Text>
                </TouchableOpacity>
            </View>

            {/* Logout */}
            <TouchableOpacity style={[styles.logoutButton, { backgroundColor: colors.notification }]} onPress={handleLogout}>
                <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>

            <Text style={[styles.version, { color: colors.text, opacity: 0.5 }]}>Vec-Doc v1.0.0 (Local-First)</Text>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        alignItems: 'center',
        paddingTop: 60,
        paddingBottom: 30,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
    },
    avatarContainer: {
        position: 'relative',
        marginBottom: 16,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 4,
    },
    avatarImage: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 4,
    },
    avatarText: {
        fontSize: 40,
        fontWeight: 'bold',
        color: '#ffffff',
    },
    editBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
    },
    editBadgeText: {
        fontSize: 16,
    },
    userName: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    userEmail: {
        fontSize: 14,
        marginTop: 4,
    },
    localBadge: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        marginTop: 12,
    },
    localBadgeText: {
        color: '#51cf66',
        fontSize: 12,
        fontWeight: '600',
    },
    statsContainer: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        marginBottom: 24,
    },
    statCard: {
        flex: 1,
        borderRadius: 16,
        padding: 20,
        marginHorizontal: 6,
        alignItems: 'center',
    },
    statValue: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    statLabel: {
        fontSize: 12,
        marginTop: 4,
    },
    menuSection: {
        borderRadius: 16,
        marginHorizontal: 16,
        overflow: 'hidden',
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 18,
        borderBottomWidth: 1,
    },
    menuIcon: {
        fontSize: 20,
        marginRight: 16,
    },
    menuText: {
        flex: 1,
        fontSize: 16,
    },
    menuArrow: {
        fontSize: 20,
    },
    logoutButton: {
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
        fontSize: 12,
        marginTop: 24,
        marginBottom: 40,
    },
});
