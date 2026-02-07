import React, { useCallback, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    RefreshControl,
} from 'react-native';
import { useNavigation, useFocusEffect, useTheme } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuthStore, useBikeStore } from '../../store';
import { RootStackParamList } from '../../navigation';
import * as MaintenanceRepo from '../../database/maintenanceRepository';

type MaintenanceNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function MaintenanceScreen() {
    const navigation = useNavigation<MaintenanceNavigationProp>();
    const { colors } = useTheme();
    const { user } = useAuthStore();
    const { bikes, loadBikes } = useBikeStore();

    const [maintenance, setMaintenance] = useState<MaintenanceRepo.MaintenanceRecord[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [bikesMap, setBikesMap] = useState<Record<string, string>>({});

    const loadData = async () => {
        if (!user?.id) return;

        try {
            if (bikes.length === 0) {
                await loadBikes(user.id);
            }

            const map: Record<string, string> = {};
            bikes.forEach(b => {
                map[b.id] = b.nickname || `${b.brand} ${b.model}`;
            });
            setBikesMap(map);

            // Load all maintenance records
            let allRecs: MaintenanceRepo.MaintenanceRecord[] = [];
            for (const bike of bikes) {
                const bikeRecs = await MaintenanceRepo.getMaintenanceByBikeId(bike.id);
                allRecs = [...allRecs, ...bikeRecs];
            }

            // Sort by date (newest first)
            allRecs.sort((a, b) =>
                new Date(b.serviceDate).getTime() - new Date(a.serviceDate).getTime()
            );

            setMaintenance(allRecs);
        } catch (error) {
            console.error('Failed to load maintenance:', error);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [user?.id, bikes.length])
    );

    const onRefresh = async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    };

    const renderItem = ({ item }: { item: MaintenanceRepo.MaintenanceRecord }) => {
        const bikeName = bikesMap[item.bikeId] || 'Unknown Bike';

        return (
            <View style={[styles.card, { backgroundColor: colors.card }]}>
                <View style={styles.cardHeader}>
                    <View style={[styles.iconContainer, { backgroundColor: colors.background }]}>
                        <Text style={styles.icon}>
                            {item.type === 'oil_change' ? '🛢️' :
                                item.type === 'service' ? '🔧' :
                                    item.type === 'repair' ? '🛠️' : '⚙️'}
                        </Text>
                    </View>
                    <View style={styles.cardContent}>
                        <Text style={[styles.cardTitle, { color: colors.text }]}>{item.title}</Text>
                        <Text style={[styles.cardSubtitle, { color: colors.text }]}>
                            {bikeName} • {new Date(item.serviceDate).toLocaleDateString()}
                        </Text>
                    </View>
                    {item.cost && (
                        <View style={[styles.costBadge, { backgroundColor: colors.card === '#f5f5f5' ? '#e6fcf5' : 'rgba(81, 207, 102, 0.1)' }]}>
                            <Text style={[styles.costText, { color: '#099268' }]}>₹{item.cost}</Text>
                        </View>
                    )}
                </View>

                <View style={[styles.details, { borderTopColor: colors.border }]}>
                    <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: colors.text }]}>Odometer:</Text>
                        <Text style={[styles.detailValue, { color: colors.text }]}>{item.odometerKm.toLocaleString()} km</Text>
                    </View>
                    {item.notes && (
                        <Text style={[styles.notes, { color: colors.text }]} numberOfLines={2}>{item.notes}</Text>
                    )}
                </View>
            </View>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.header}>
                <Text style={[styles.title, { color: colors.text }]}>Service History</Text>
                {bikes.length > 0 && (
                    <TouchableOpacity
                        style={[styles.addButton, { backgroundColor: colors.primary }]}
                        onPress={() => navigation.navigate('LogMaintenance', { bikeId: bikes[0].id })}
                    >
                        <Text style={[styles.addButtonText, { color: '#ffffff' }]}>+ Log</Text>
                    </TouchableOpacity>
                )}
            </View>

            <FlatList
                data={maintenance}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyEmoji}>🔧</Text>
                        <Text style={[styles.emptyTitle, { color: colors.text }]}>No service records</Text>
                        <Text style={[styles.emptySubtitle, { color: colors.text }]}>
                            {bikes.length === 0
                                ? "Add a bike first to log maintenance"
                                : "Keep track of your bike's service history"}
                        </Text>
                        {bikes.length > 0 && (
                            <TouchableOpacity
                                style={[styles.emptyButton, { backgroundColor: colors.primary }]}
                                onPress={() => navigation.navigate('LogMaintenance', { bikeId: bikes[0].id })}
                            >
                                <Text style={[styles.emptyButtonText, { color: '#ffffff' }]}>Log Service</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 24,
        paddingTop: 60,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
    },
    addButton: {
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    addButtonText: {
        color: '#ffffff',
        fontWeight: '600',
        fontSize: 14,
    },
    listContent: {
        padding: 16,
    },
    card: {
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    icon: {
        fontSize: 20,
    },
    cardContent: {
        flex: 1,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    cardSubtitle: {
        fontSize: 12,
        marginTop: 2,
    },
    costBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    costText: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    details: {
        borderTopWidth: 1,
        paddingTop: 12,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    detailLabel: {
        fontSize: 12,
    },
    detailValue: {
        fontSize: 12,
        fontWeight: '500',
    },
    notes: {
        fontSize: 12,
        marginTop: 4,
        fontStyle: 'italic',
    },
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyEmoji: {
        fontSize: 64,
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 14,
        marginBottom: 24,
        textAlign: 'center',
        paddingHorizontal: 32,
    },
    emptyButton: {
        borderRadius: 12,
        paddingHorizontal: 24,
        paddingVertical: 14,
    },
    emptyButtonText: {
        color: '#ffffff',
        fontWeight: '600',
        fontSize: 16,
    },
});
