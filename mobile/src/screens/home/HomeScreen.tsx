import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuthStore, useBikeStore, Bike } from '../../store';
import { bikesApi, documentsApi, maintenanceApi } from '../../api/client';
import { RootStackParamList } from '../../navigation';

type HomeNavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface ExpiringDocument {
    id: string;
    title: string;
    documentType: string;
    daysUntilExpiry: number;
    bike: { nickname?: string; brand: string; model: string };
}

interface UpcomingMaintenance {
    bikeId: string;
    bikeName: string;
    maintenanceType: string;
    kmRemaining: number | null;
}

export default function HomeScreen() {
    const navigation = useNavigation<HomeNavigationProp>();
    const { user } = useAuthStore();
    const { bikes, setBikes, primaryBike } = useBikeStore();

    const [expiringDocs, setExpiringDocs] = useState<ExpiringDocument[]>([]);
    const [upcomingMaintenance, setUpcomingMaintenance] = useState<UpcomingMaintenance[]>([]);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const loadData = async () => {
        try {
            const [bikesRes, docsRes, maintRes] = await Promise.all([
                bikesApi.getAll(),
                documentsApi.getExpiring(30),
                maintenanceApi.getUpcoming(),
            ]);

            setBikes(bikesRes.data);
            setExpiringDocs(docsRes.data.slice(0, 3));
            setUpcomingMaintenance(maintRes.data.slice(0, 3));
        } catch (error) {
            console.error('Failed to load home data:', error);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

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

    return (
        <ScrollView
            style={styles.container}
            refreshControl={
                <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
            }
        >
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.greeting}>{getGreeting()} 👋</Text>
                    <Text style={styles.userName}>{user?.fullName?.split(' ')[0] || 'Rider'}</Text>
                </View>
                <View style={styles.bikeCount}>
                    <Text style={styles.bikeCountNumber}>{bikes.length}</Text>
                    <Text style={styles.bikeCountLabel}>Bikes</Text>
                </View>
            </View>

            {/* Primary Bike Card */}
            {primary && (
                <TouchableOpacity
                    style={styles.primaryBikeCard}
                    onPress={() => navigation.navigate('BikeDetail', { bikeId: primary.id })}
                >
                    <View style={styles.primaryBikeHeader}>
                        <Text style={styles.primaryBikeTitle}>
                            {primary.nickname || `${primary.brand} ${primary.model}`}
                        </Text>
                        <View style={styles.primaryBadge}>
                            <Text style={styles.primaryBadgeText}>PRIMARY</Text>
                        </View>
                    </View>

                    <View style={styles.oilStatusContainer}>
                        <View style={styles.oilStatusLeft}>
                            <Text style={styles.oilStatusLabel}>Oil Change</Text>
                            <Text style={[
                                styles.oilStatusValue,
                                primary.oilChangeStatus?.status === 'overdue' && styles.statusOverdue,
                                primary.oilChangeStatus?.status === 'due_soon' && styles.statusDueSoon,
                            ]}>
                                {primary.oilChangeStatus?.status === 'overdue'
                                    ? '⚠️ Overdue'
                                    : `${primary.oilChangeStatus?.kmRemaining || 0} km remaining`}
                            </Text>
                        </View>
                        <View style={styles.oilProgressContainer}>
                            <View style={styles.oilProgressBg}>
                                <View
                                    style={[
                                        styles.oilProgressFill,
                                        { width: `${Math.min(100, primary.oilChangeStatus?.percentageUsed || 0)}%` },
                                        primary.oilChangeStatus?.percentageUsed! > 90 && styles.progressDanger,
                                    ]}
                                />
                            </View>
                            <Text style={styles.oilProgressText}>
                                {Math.round(primary.oilChangeStatus?.percentageUsed || 0)}%
                            </Text>
                        </View>
                    </View>

                    <View style={styles.bikeStats}>
                        <View style={styles.bikeStat}>
                            <Text style={styles.bikeStatValue}>{primary.currentOdometerKm.toLocaleString()}</Text>
                            <Text style={styles.bikeStatLabel}>km</Text>
                        </View>
                        <View style={styles.bikeStat}>
                            <Text style={styles.bikeStatValue}>{primary.year}</Text>
                            <Text style={styles.bikeStatLabel}>Year</Text>
                        </View>
                        <View style={styles.bikeStat}>
                            <Text style={styles.bikeStatValue}>{primary.engineCapacityCc || '-'}</Text>
                            <Text style={styles.bikeStatLabel}>cc</Text>
                        </View>
                    </View>
                </TouchableOpacity>
            )}

            {/* Quick Actions */}
            <View style={styles.quickActions}>
                <TouchableOpacity
                    style={styles.quickActionButton}
                    onPress={() => navigation.navigate('AddBike')}
                >
                    <Text style={styles.quickActionIcon}>➕</Text>
                    <Text style={styles.quickActionText}>Add Bike</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.quickActionButton}
                    onPress={() => primary && navigation.navigate('LogMaintenance', { bikeId: primary.id })}
                >
                    <Text style={styles.quickActionIcon}>🔧</Text>
                    <Text style={styles.quickActionText}>Log Service</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.quickActionButton}
                    onPress={() => primary && navigation.navigate('AddDocument', { bikeId: primary.id })}
                >
                    <Text style={styles.quickActionIcon}>📄</Text>
                    <Text style={styles.quickActionText}>Add Doc</Text>
                </TouchableOpacity>
            </View>

            {/* Expiring Documents */}
            {expiringDocs.length > 0 && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>⏰ Expiring Soon</Text>
                    {expiringDocs.map((doc) => (
                        <View key={doc.id} style={styles.alertCard}>
                            <View style={styles.alertLeft}>
                                <Text style={styles.alertTitle}>{doc.title}</Text>
                                <Text style={styles.alertSubtitle}>
                                    {doc.bike.nickname || `${doc.bike.brand} ${doc.bike.model}`}
                                </Text>
                            </View>
                            <View style={[
                                styles.alertBadge,
                                doc.daysUntilExpiry <= 7 && styles.alertBadgeUrgent,
                            ]}>
                                <Text style={styles.alertBadgeText}>
                                    {doc.daysUntilExpiry <= 0
                                        ? 'Expired'
                                        : `${doc.daysUntilExpiry}d`}
                                </Text>
                            </View>
                        </View>
                    ))}
                </View>
            )}

            {/* Upcoming Maintenance */}
            {upcomingMaintenance.length > 0 && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>🔧 Upcoming Service</Text>
                    {upcomingMaintenance.map((maint, index) => (
                        <View key={index} style={styles.alertCard}>
                            <View style={styles.alertLeft}>
                                <Text style={styles.alertTitle}>
                                    {maint.maintenanceType.replace('_', ' ').toUpperCase()}
                                </Text>
                                <Text style={styles.alertSubtitle}>{maint.bikeName}</Text>
                            </View>
                            <View style={[
                                styles.alertBadge,
                                (maint.kmRemaining || 0) <= 250 && styles.alertBadgeUrgent,
                            ]}>
                                <Text style={styles.alertBadgeText}>
                                    {maint.kmRemaining !== null
                                        ? `${maint.kmRemaining} km`
                                        : '-'}
                                </Text>
                            </View>
                        </View>
                    ))}
                </View>
            )}

            <View style={styles.bottomPadding} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#1a1a2e',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 24,
        paddingTop: 60,
    },
    greeting: {
        fontSize: 14,
        color: '#868e96',
    },
    userName: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#ffffff',
        marginTop: 4,
    },
    bikeCount: {
        backgroundColor: '#16213e',
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
    },
    bikeCountNumber: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#4c6ef5',
    },
    bikeCountLabel: {
        fontSize: 12,
        color: '#868e96',
    },
    primaryBikeCard: {
        backgroundColor: '#16213e',
        borderRadius: 20,
        marginHorizontal: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: '#4c6ef5',
    },
    primaryBikeHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    primaryBikeTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#ffffff',
        flex: 1,
    },
    primaryBadge: {
        backgroundColor: '#4c6ef5',
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    primaryBadgeText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#ffffff',
    },
    oilStatusContainer: {
        marginBottom: 16,
    },
    oilStatusLeft: {
        marginBottom: 8,
    },
    oilStatusLabel: {
        fontSize: 12,
        color: '#868e96',
    },
    oilStatusValue: {
        fontSize: 16,
        fontWeight: '600',
        color: '#51cf66',
        marginTop: 2,
    },
    statusOverdue: {
        color: '#ff6b6b',
    },
    statusDueSoon: {
        color: '#fcc419',
    },
    oilProgressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    oilProgressBg: {
        flex: 1,
        height: 8,
        backgroundColor: '#0f0f23',
        borderRadius: 4,
        overflow: 'hidden',
    },
    oilProgressFill: {
        height: '100%',
        backgroundColor: '#51cf66',
        borderRadius: 4,
    },
    progressDanger: {
        backgroundColor: '#ff6b6b',
    },
    oilProgressText: {
        marginLeft: 12,
        fontSize: 14,
        fontWeight: '600',
        color: '#adb5bd',
        width: 40,
        textAlign: 'right',
    },
    bikeStats: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#2d3436',
    },
    bikeStat: {
        alignItems: 'center',
    },
    bikeStatValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#ffffff',
    },
    bikeStatLabel: {
        fontSize: 12,
        color: '#868e96',
        marginTop: 2,
    },
    quickActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 16,
        marginTop: 8,
    },
    quickActionButton: {
        flex: 1,
        backgroundColor: '#16213e',
        borderRadius: 16,
        padding: 16,
        marginHorizontal: 4,
        alignItems: 'center',
    },
    quickActionIcon: {
        fontSize: 24,
        marginBottom: 8,
    },
    quickActionText: {
        fontSize: 12,
        color: '#adb5bd',
        fontWeight: '500',
    },
    section: {
        padding: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#ffffff',
        marginBottom: 12,
    },
    alertCard: {
        backgroundColor: '#16213e',
        borderRadius: 12,
        padding: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    alertLeft: {
        flex: 1,
    },
    alertTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#ffffff',
    },
    alertSubtitle: {
        fontSize: 12,
        color: '#868e96',
        marginTop: 2,
    },
    alertBadge: {
        backgroundColor: '#fcc419',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 6,
        marginLeft: 12,
    },
    alertBadgeUrgent: {
        backgroundColor: '#ff6b6b',
    },
    alertBadgeText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#1a1a2e',
    },
    bottomPadding: {
        height: 100,
    },
});
