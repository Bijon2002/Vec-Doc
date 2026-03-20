import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
    Image,
    StatusBar,
    Platform,
    ImageBackground,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useTheme, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppStore, useAuthStore, useBikeStore, Bike } from '../../store';
import { RootStackParamList } from '../../navigation';
import { aiApi } from '../../api/client';
import * as BikeRepo from '../../database/bikeRepository';
import * as DocumentRepo from '../../database/documentRepository';
import * as MaintenanceRepo from '../../database/maintenanceRepository';

type HomeNavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface PetrolAlert {
    id: string;
    severity: 'high' | 'medium' | 'low';
    title: string;
    message: string;
}

export default function HomeScreen() {
    const navigation = useNavigation<HomeNavigationProp>();
    const { colors } = useTheme();
    const { user } = useAuthStore();
    const { bikes, loadBikes, primaryBike } = useBikeStore();

    const [expiringDocs, setExpiringDocs] = useState<DocumentRepo.Document[]>([]);
    const [recentMaintenance, setRecentMaintenance] = useState<MaintenanceRepo.MaintenanceRecord[]>([]);
    const [petrolAlerts, setPetrolAlerts] = useState<PetrolAlert[]>([]);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [bikesMap, setBikesMap] = useState<Record<string, Bike>>({});

    const loadData = async () => {
        if (!user) return;

        try {
            // Load bikes
            await loadBikes(user.id);

            // Load expiring documents
            const docs = await DocumentRepo.getExpiringDocuments(user.id, 30);
            setExpiringDocs(docs.slice(0, 3));

            // Load recent maintenance
            const maint = await MaintenanceRepo.getRecentMaintenance(user.id, 3);
            setRecentMaintenance(maint);

            // Load Petrol Alerts from AI
            try {
                const response = await aiApi.getPetrolAlerts();
                const alerts = response.data.alerts || [];
                
                // Add a dynamic global situation alert if requested by user
                // This is a mock "Global Insight" based on the user's specific request
                const globalAlert: PetrolAlert = {
                    id: 'global-1',
                    severity: 'high',
                    title: 'Global Supply Alert',
                    message: 'International tensions in oil-producing regions may impact fuel prices / supply. Consider saving fuel where possible.'
                };
                
                setPetrolAlerts([globalAlert, ...alerts]);
            } catch (e) {
                console.error('Failed to load petrol alerts');
                // Fallback to the global alert even if AI fails
                setPetrolAlerts([{
                    id: 'global-fallback',
                    severity: 'medium',
                    title: 'Supply Advisory',
                    message: 'Monitor local news for upcoming fuel quota changes.'
                }]);
            }

            // Create bikes map for quick lookup
            const allBikes = await BikeRepo.getBikesByUserId(user.id);
            const map: Record<string, Bike> = {};
            allBikes.forEach(b => { map[b.id] = b; });
            setBikesMap(map);
        } catch (error) {
            console.error('Failed to load home data:', error);
        }
    };

    // Load data when screen comes into focus
    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [user?.id])
    );

    const onRefresh = async () => {
        setIsRefreshing(true);
        await loadData();
        setIsRefreshing(false);
    };

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 17) return 'Good Afternoon';
        return 'Good Evening';
    };

    const primary = primaryBike();
    const getBikeName = (bikeId: string) => {
        const bike = bikesMap[bikeId];
        if (!bike) return 'Unknown Bike';
        return bike.nickname || `${bike.brand} ${bike.model}`;
    };

    const getAlertIcon = (severity: string) => {
        switch (severity) {
            case 'high': return 'alert-circle';
            case 'medium': return 'warning';
            default: return 'information-circle';
        }
    };

    const getAlertColor = (severity: string) => {
        switch (severity) {
            case 'high': return '#ff6b6b';
            case 'medium': return '#ffd43b';
            default: return '#4c6ef5';
        }
    };

    return (
        <ScrollView
            style={[styles.container, { backgroundColor: colors.background }]}
            refreshControl={
                <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.primary} />
            }
        >
            <StatusBar barStyle={colors.background === '#ffffff' ? 'dark-content' : 'light-content'} />

            {/* Header */}
            <ImageBackground 
                source={require('../../../assets/premium_bg.png')} 
                style={styles.headerBackground}
                imageStyle={styles.headerImage}
            >
                <View style={[styles.headerOverlay, { backgroundColor: colors.card + 'CC' }]}>
                    <View>
                        <Text style={[styles.greeting, { color: colors.text }]}>{getGreeting()}</Text>
                        <Text style={[styles.userName, { color: colors.primary }]}>{user?.fullName?.split(' ')[0] || 'Rider'}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <TouchableOpacity
                            style={{ marginRight: 16 }}
                            onPress={() => navigation.navigate('Notifications' as any)}
                        >
                            <Ionicons name="notifications-outline" size={24} color={colors.text} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => navigation.navigate('Profile' as any)}>
                            {user?.profileImageUri && !user.profileImageUri.startsWith('blob:') ? (
                                <Image source={{ uri: user.profileImageUri }} style={styles.avatarImage} />
                            ) : (
                                <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                                    <Text style={styles.avatarText}>
                                        {user?.fullName?.charAt(0)?.toUpperCase() || 'U'}
                                    </Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </ImageBackground>

            {/* Global Petrol Alerts Banner */}
            {petrolAlerts.length > 0 && (
                <View style={styles.alertCarousel}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} pagingEnabled>
                        {petrolAlerts.map(alert => (
                            <View key={alert.id} style={[styles.petrolAlertBanner, { backgroundColor: getAlertColor(alert.severity) + '15', borderColor: getAlertColor(alert.severity) }]}>
                                <View style={styles.alertHeaderRow}>
                                    <Ionicons name={getAlertIcon(alert.severity)} size={20} color={getAlertColor(alert.severity)} />
                                    <Text style={[styles.petrolAlertTitle, { color: getAlertColor(alert.severity) }]}>{alert.title}</Text>
                                </View>
                                <Text style={[styles.petrolAlertMessage, { color: colors.text }]}>{alert.message}</Text>
                                <View style={styles.aiBadge}>
                                    <Ionicons name="sparkles" size={10} color={getAlertColor(alert.severity)} />
                                    <Text style={[styles.aiBadgeText, { color: getAlertColor(alert.severity) }]}>AI INSIGHT</Text>
                                </View>
                            </View>
                        ))}
                    </ScrollView>
                </View>
            )}

            {/* Quick Actions Grid */}
            <View style={styles.sectionContainer}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Actions</Text>
                <View style={styles.actionGrid}>
                    <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: colors.card, borderColor: colors.border }]}
                        onPress={() => navigation.navigate('RideTracking')}
                    >
                        <Ionicons name="speedometer" size={32} color={colors.primary} style={{ marginBottom: 8 }} />
                        <Text style={[styles.actionText, { color: colors.text }]}>Start Ride</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: colors.card, borderColor: colors.border }]}
                        onPress={() => navigation.navigate('PetrolQR')}
                    >
                        <Ionicons name="qr-code" size={32} color="#2e7d32" style={{ marginBottom: 8 }} />
                        <Text style={[styles.actionText, { color: colors.text }]}>Fuel Pass</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: colors.card, borderColor: colors.border }]}
                        onPress={() => navigation.navigate('AddBike')}
                    >
                        <Ionicons name="add-circle" size={32} color={colors.primary} style={{ marginBottom: 8 }} />
                        <Text style={[styles.actionText, { color: colors.text }]}>Add Bike</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: colors.card, borderColor: colors.border }]}
                        onPress={() => navigation.navigate('PartsMarketplace' as any)}
                    >
                        <Ionicons name="cog" size={32} color={colors.primary} style={{ marginBottom: 8 }} />
                        <Text style={[styles.actionText, { color: colors.text }]}>Parts</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Expiring Docs Section */}
            {expiringDocs.length > 0 && (
                <View style={[styles.alertSection, { backgroundColor: colors.card }]}>
                    <View style={styles.sectionHeader}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Ionicons name="warning" size={20} color={colors.notification} style={{ marginRight: 8 }} />
                            <Text style={[styles.alertTitle, { color: colors.notification, marginBottom: 0 }]}>Expiring Soon</Text>
                        </View>
                    </View>
                    {expiringDocs.map(doc => (
                        <TouchableOpacity
                            key={doc.id}
                            style={styles.alertItem}
                            onPress={() => (navigation as any).navigate('Documents')}
                        >
                            <View style={styles.alertInfo}>
                                <Text style={[styles.alertText, { color: colors.text }]}>{doc.title}</Text>
                                <Text style={[styles.alertSubtext, { color: colors.text, opacity: 0.6 }]}>{getBikeName(doc.bikeId)}</Text>
                            </View>
                            <View style={[styles.daysTag, { backgroundColor: colors.notification }]}>
                                <Text style={styles.daysText}>{Math.ceil(doc.daysUntilExpiry)} days</Text>
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>
            )}

            {/* Primary Bike Status */}
            {primary ? (
                <View style={[styles.bikeCard, { backgroundColor: colors.card, borderColor: colors.primary }]}>
                    <View style={styles.bikeHeader}>
                        <View>
                            <Text style={[styles.bikeName, { color: colors.text }]}>{primary.nickname || primary.model}</Text>
                            <Text style={[styles.bikeModel, { color: colors.text, opacity: 0.6 }]}>{primary.brand} {primary.year}</Text>
                        </View>
                        <View style={[styles.activeTag, { backgroundColor: colors.primary }]}>
                            <Text style={styles.activeTagText}>PRIMARY</Text>
                        </View>
                    </View>

                    <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                            <Text style={[styles.statLabel, { color: colors.text, opacity: 0.6 }]}>Odometer</Text>
                            <Text style={[styles.statValue, { color: colors.text }]}>{primary.currentOdometerKm.toLocaleString()} km</Text>
                        </View>
                        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                        <View style={styles.statItem}>
                            <Text style={[styles.statLabel, { color: colors.text, opacity: 0.6 }]}>Oil Life</Text>
                            <Text style={[styles.statValue, { color: colors.text }]}>
                                {Math.max(0, primary.oilChangeIntervalKm - (primary.currentOdometerKm - primary.lastOilChangeKm))} km
                            </Text>
                        </View>
                    </View>

                    <TouchableOpacity
                        style={[styles.serviceButton, { backgroundColor: colors.primary }]}
                        onPress={() => navigation.navigate('LogMaintenance', { bikeId: primary.id })}
                    >
                        <Text style={styles.serviceButtonText}>Log Service</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <TouchableOpacity
                    style={[styles.emptyBikeCard, { borderColor: colors.border }]}
                    onPress={() => navigation.navigate('AddBike')}
                >
                    <Text style={[styles.emptyBikeText, { color: colors.text }]}>No bikes added yet</Text>
                    <Text style={[styles.addBikeLink, { color: colors.primary }]}>+ Add your first bike</Text>
                </TouchableOpacity>
            )}

            {/* Recent Maintenance */}
            <View style={styles.sectionContainer}>
                <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Activity</Text>
                </View>
                {recentMaintenance.length > 0 ? (
                    recentMaintenance.map(record => (
                        <View key={record.id} style={[styles.activityItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <View style={[styles.activityIconBg, { backgroundColor: colors.primary + '20' }]}>
                                <Ionicons name="build" size={20} color={colors.primary} />
                            </View>
                            <View style={styles.activityInfo}>
                                <Text style={[styles.activityTitle, { color: colors.text }]}>{record.title}</Text>
                                <Text style={[styles.activityDate, { color: colors.text, opacity: 0.6 }]}>{new Date(record.serviceDate).toLocaleDateString()}</Text>
                            </View>
                            <Text style={[styles.activityCost, { color: colors.text }]}>₹{record.cost}</Text>
                        </View>
                    ))
                ) : (
                    <Text style={[styles.noActivityText, { color: colors.text, opacity: 0.6 }]}>No recent maintenance records</Text>
                )}
            </View>

            {/* Offline Badge */}
            <View style={[styles.offlineBadge, { backgroundColor: colors.card }]}>
                <Ionicons name="cloud-offline-outline" size={16} color={colors.text} style={{ marginRight: 8 }} />
                <Text style={[styles.offlineBadgeText, { color: colors.text }]}>Data stored locally on your device</Text>
            </View>

            <View style={styles.bottomPadding} />
        </ScrollView >
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    headerBackground: {
        width: '100%',
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        overflow: 'hidden',
    },
    headerImage: {
        opacity: 0.6,
    },
    headerOverlay: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 24,
        paddingTop: 60,
        paddingBottom: 30,
    },
    greeting: {
        fontSize: 14,
        opacity: 0.8,
        fontWeight: '500',
        marginBottom: 4,
    },
    userName: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarImage: {
        width: 48,
        height: 48,
        borderRadius: 24,
    },
    avatarText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#ffffff',
    },
    sectionContainer: {
        padding: 24,
        paddingBottom: 0,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    actionGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 12,
    },
    actionButton: {
        width: '48%',
        padding: 16,
        borderRadius: 16,
        alignItems: 'center',
        borderWidth: 1,
        marginBottom: 12,
    },
    actionIcon: {
        fontSize: 28,
        marginBottom: 8,
    },
    actionText: {
        fontWeight: '600',
        fontSize: 14,
    },
    alertCarousel: {
        marginTop: 24,
        paddingHorizontal: 24,
    },
    petrolAlertBanner: {
        width: 300,
        marginRight: 16,
        padding: 16,
        borderRadius: 20,
        borderWidth: 1.5,
        position: 'relative',
        overflow: 'hidden',
    },
    alertHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    petrolAlertTitle: {
        fontSize: 15,
        fontWeight: 'bold',
        marginLeft: 8,
    },
    petrolAlertMessage: {
        fontSize: 13,
        lineHeight: 18,
        opacity: 0.9,
    },
    aiBadge: {
        position: 'absolute',
        top: 0,
        right: 0,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderBottomLeftRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.2)',
        flexDirection: 'row',
        alignItems: 'center',
    },
    aiBadgeText: {
        fontSize: 8,
        fontWeight: 'bold',
        marginLeft: 4,
    },
    alertSection: {
        margin: 24,
        marginBottom: 0,
        padding: 16,
        borderRadius: 16,
        borderLeftWidth: 4,
        borderLeftColor: '#c62828',
    },
    alertTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 12,
    },
    alertItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    alertInfo: {
        flex: 1,
    },
    alertText: {
        fontSize: 14,
        fontWeight: '600',
    },
    alertSubtext: {
        fontSize: 12,
    },
    daysTag: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    daysText: {
        color: '#ffffff',
        fontSize: 10,
        fontWeight: 'bold',
    },
    bikeCard: {
        margin: 24,
        padding: 20,
        borderRadius: 20,
        borderWidth: 1,
    },
    bikeHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 20,
    },
    bikeName: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    bikeModel: {
        fontSize: 14,
    },
    activeTag: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    activeTagText: {
        color: '#ffffff',
        fontSize: 10,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    statsRow: {
        flexDirection: 'row',
        marginBottom: 20,
    },
    statItem: {
        flex: 1,
    },
    statDivider: {
        width: 1,
        marginHorizontal: 16,
    },
    statLabel: {
        fontSize: 12,
        marginBottom: 4,
    },
    statValue: {
        fontSize: 16,
        fontWeight: 'bold',
        fontVariant: ['tabular-nums'],
    },
    serviceButton: {
        padding: 12,
        borderRadius: 12,
        alignItems: 'center',
    },
    serviceButtonText: {
        color: '#ffffff',
        fontWeight: '600',
    },
    emptyBikeCard: {
        margin: 24,
        padding: 32,
        borderRadius: 20,
        borderWidth: 2,
        borderStyle: 'dashed',
        alignItems: 'center',
    },
    emptyBikeText: {
        fontSize: 16,
        marginBottom: 8,
    },
    addBikeLink: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    activityItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        borderWidth: 1,
    },
    activityIconBg: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    activityIcon: {
        fontSize: 20,
    },
    activityInfo: {
        flex: 1,
    },
    activityTitle: {
        fontSize: 14,
        fontWeight: '600',
    },
    activityDate: {
        fontSize: 12,
    },
    activityCost: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    noActivityText: {
        textAlign: 'center',
        padding: 20,
        fontStyle: 'italic',
    },
    offlineBadge: {
        borderRadius: 12,
        marginHorizontal: 16,
        padding: 12,
        alignItems: 'center',
        marginTop: 20,
        flexDirection: 'row',
        justifyContent: 'center',
    },
    offlineBadgeText: {
        fontSize: 12,
    },
    bottomPadding: {
        height: 100,
    },
});
