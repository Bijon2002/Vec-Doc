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
import { useAuthStore, useBikeStore, Bike } from '../../store';
import { RootStackParamList } from '../../navigation';

type BikesNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function BikesScreen() {
    const navigation = useNavigation<BikesNavigationProp>();
    const { user } = useAuthStore();
    const { bikes, loadBikes, isLoading } = useBikeStore();
    const [refreshing, setRefreshing] = useState(false);

    // Load bikes when screen comes into focus
    useFocusEffect(
        useCallback(() => {
            if (user?.id) {
                loadBikes(user.id);
            }
        }, [user?.id])
    );

    const onRefresh = async () => {
        if (!user?.id) return;
        setRefreshing(true);
        await loadBikes(user.id);
        setRefreshing(false);
    };

    const getStatusColor = (status?: string) => {
        switch (status) {
            case 'overdue': return '#ff6b6b';
            case 'due_soon': return '#fcc419';
            default: return '#51cf66';
        }
    };

    const { colors } = useTheme();

    const renderBikeCard = ({ item }: { item: Bike }) => (
        <TouchableOpacity
            style={[styles.bikeCard, { backgroundColor: colors.card }]}
            onPress={() => navigation.navigate('BikeDetail', { bikeId: item.id })}
        >
            <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                    <Text style={styles.bikeEmoji}>🏍️</Text>
                    <View>
                        <Text style={[styles.bikeName, { color: colors.text }]}>
                            {item.nickname || `${item.brand} ${item.model}`}
                        </Text>
                        <Text style={[styles.bikeSubtitle, { color: colors.text }]}>
                            {item.brand} {item.model} • {item.year}
                        </Text>
                    </View>
                </View>
                {item.isPrimary && (
                    <View style={[styles.primaryBadge, { backgroundColor: colors.primary }]}>
                        <Text style={[styles.primaryText, { color: '#fff' }]}>★</Text>
                    </View>
                )}
            </View>

            <View style={[styles.cardStats, { borderColor: colors.border }]}>
                <View style={styles.stat}>
                    <Text style={[styles.statValue, { color: colors.text }]}>{item.currentOdometerKm.toLocaleString()}</Text>
                    <Text style={[styles.statLabel, { color: colors.text }]}>km</Text>
                </View>
                <View style={styles.stat}>
                    <Text style={[styles.statValue, { color: colors.text }]}>{item.engineCapacityCc || '-'}</Text>
                    <Text style={[styles.statLabel, { color: colors.text }]}>cc</Text>
                </View>
                <View style={styles.stat}>
                    <View style={[
                        styles.statusDot,
                        { backgroundColor: getStatusColor(item.oilChangeStatus?.status) }
                    ]} />
                    <Text style={[styles.statLabel, { color: colors.text }]}>Oil</Text>
                </View>
            </View>

            {item.oilChangeStatus && (
                <View style={styles.oilInfo}>
                    <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
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
                    <Text style={[styles.oilText, { color: colors.text }]}>
                        {item.oilChangeStatus.kmRemaining} km until oil change
                    </Text>
                </View>
            )}
        </TouchableOpacity>
    );

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={[styles.title, { color: colors.text }]}>My Bikes</Text>
                <TouchableOpacity
                    style={[styles.addButton, { backgroundColor: colors.primary }]}
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
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyEmoji}>🏍️</Text>
                        <Text style={[styles.emptyTitle, { color: colors.text }]}>No bikes yet</Text>
                        <Text style={[styles.emptySubtitle, { color: colors.text }]}>
                            Add your first bike to start tracking
                        </Text>
                        <TouchableOpacity
                            style={[styles.emptyButton, { backgroundColor: colors.primary }]}
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
        paddingBottom: 100,
    },
    bikeCard: {
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
    },
    bikeSubtitle: {
        fontSize: 12,
        opacity: 0.7,
        marginTop: 2,
    },
    primaryBadge: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    primaryText: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    cardStats: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 12,
        borderTopWidth: 1,
        borderBottomWidth: 1,
    },
    stat: {
        alignItems: 'center',
        flexDirection: 'row',
    },
    statValue: {
        fontSize: 16,
        fontWeight: 'bold',
        marginRight: 4,
    },
    statLabel: {
        fontSize: 12,
        opacity: 0.7,
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
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 3,
    },
    oilText: {
        fontSize: 12,
        opacity: 0.7,
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
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 14,
        opacity: 0.7,
        marginBottom: 24,
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
