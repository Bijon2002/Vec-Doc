import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useBikeStore, Bike } from '../../store';
import { bikesApi } from '../../api/client';
import { RootStackParamList } from '../../navigation';

type BikesNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function BikesScreen() {
    const navigation = useNavigation<BikesNavigationProp>();
    const { bikes, setBikes, setLoading, isLoading } = useBikeStore();
    const [refreshing, setRefreshing] = useState(false);

    const loadBikes = async () => {
        try {
            const response = await bikesApi.getAll();
            setBikes(response.data);
        } catch (error) {
            console.error('Failed to load bikes:', error);
        }
    };

    useEffect(() => {
        loadBikes();
    }, []);

    const onRefresh = async () => {
        setRefreshing(true);
        await loadBikes();
        setRefreshing(false);
    };

    const getStatusColor = (status?: string) => {
        switch (status) {
            case 'overdue': return '#ff6b6b';
            case 'due_soon': return '#fcc419';
            default: return '#51cf66';
        }
    };

    const renderBikeCard = ({ item }: { item: Bike }) => (
        <TouchableOpacity
            style={styles.bikeCard}
            onPress={() => navigation.navigate('BikeDetail', { bikeId: item.id })}
        >
            <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                    <Text style={styles.bikeEmoji}>🏍️</Text>
                    <View>
                        <Text style={styles.bikeName}>
                            {item.nickname || `${item.brand} ${item.model}`}
                        </Text>
                        <Text style={styles.bikeSubtitle}>
                            {item.brand} {item.model} • {item.year}
                        </Text>
                    </View>
                </View>
                {item.isPrimary && (
                    <View style={styles.primaryBadge}>
                        <Text style={styles.primaryText}>★</Text>
                    </View>
                )}
            </View>

            <View style={styles.cardStats}>
                <View style={styles.stat}>
                    <Text style={styles.statValue}>{item.currentOdometerKm.toLocaleString()}</Text>
                    <Text style={styles.statLabel}>km</Text>
                </View>
                <View style={styles.stat}>
                    <Text style={styles.statValue}>{item.engineCapacityCc || '-'}</Text>
                    <Text style={styles.statLabel}>cc</Text>
                </View>
                <View style={styles.stat}>
                    <View style={[
                        styles.statusDot,
                        { backgroundColor: getStatusColor(item.oilChangeStatus?.status) }
                    ]} />
                    <Text style={styles.statLabel}>Oil</Text>
                </View>
            </View>

            {item.oilChangeStatus && (
                <View style={styles.oilInfo}>
                    <View style={styles.progressBar}>
                        <View
                            style={[
                                styles.progressFill,
                                {
                                    width: `${Math.min(100, item.oilChangeStatus.percentageUsed)}%`,
                                    backgroundColor: getStatusColor(item.oilChangeStatus.status),
                                }
                            ]}
                        />
                    </View>
                    <Text style={styles.oilText}>
                        {item.oilChangeStatus.kmRemaining} km until oil change
                    </Text>
                </View>
            )}
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>My Bikes</Text>
                <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => navigation.navigate('AddBike')}
                >
                    <Text style={styles.addButtonText}>+ Add</Text>
                </TouchableOpacity>
            </View>

            {/* Bikes List */}
            <FlatList
                data={bikes}
                renderItem={renderBikeCard}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyEmoji}>🏍️</Text>
                        <Text style={styles.emptyTitle}>No bikes yet</Text>
                        <Text style={styles.emptySubtitle}>
                            Add your first bike to start tracking
                        </Text>
                        <TouchableOpacity
                            style={styles.emptyButton}
                            onPress={() => navigation.navigate('AddBike')}
                        >
                            <Text style={styles.emptyButtonText}>Add Your Bike</Text>
                        </TouchableOpacity>
                    </View>
                }
            />
        </View>
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
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#ffffff',
    },
    addButton: {
        backgroundColor: '#4c6ef5',
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
        paddingBottom: 100,
    },
    bikeCard: {
        backgroundColor: '#16213e',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    cardHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    bikeEmoji: {
        fontSize: 36,
        marginRight: 12,
    },
    bikeName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#ffffff',
    },
    bikeSubtitle: {
        fontSize: 12,
        color: '#868e96',
        marginTop: 2,
    },
    primaryBadge: {
        backgroundColor: '#fcc419',
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    primaryText: {
        color: '#1a1a2e',
        fontSize: 14,
        fontWeight: 'bold',
    },
    cardStats: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 12,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: '#2d3436',
    },
    stat: {
        alignItems: 'center',
        flexDirection: 'row',
    },
    statValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#ffffff',
        marginRight: 4,
    },
    statLabel: {
        fontSize: 12,
        color: '#868e96',
    },
    statusDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginRight: 6,
    },
    oilInfo: {
        marginTop: 12,
    },
    progressBar: {
        height: 6,
        backgroundColor: '#0f0f23',
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 3,
    },
    oilText: {
        fontSize: 12,
        color: '#868e96',
        marginTop: 6,
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
        color: '#ffffff',
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 14,
        color: '#868e96',
        marginBottom: 24,
    },
    emptyButton: {
        backgroundColor: '#4c6ef5',
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
