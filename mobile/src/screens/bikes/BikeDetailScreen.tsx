import React, { useCallback, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    Share,
    Image,
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect, RouteProp, useTheme } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useBikeStore, Bike } from '../../store';
import { RootStackParamList } from '../../navigation';
import * as DocumentRepo from '../../database/documentRepository';
import * as MaintenanceRepo from '../../database/maintenanceRepository';
import * as BikeRepo from '../../database/bikeRepository';

type BikeDetailNavigationProp = NativeStackNavigationProp<RootStackParamList>;
type BikeDetailRouteProp = RouteProp<RootStackParamList, 'BikeDetail'>;

export default function BikeDetailScreen() {
    const navigation = useNavigation<BikeDetailNavigationProp>();
    const route = useRoute<BikeDetailRouteProp>();
    const { bikeId } = route.params;
    const { bikes, updateBike, deleteBike, setPrimaryBike } = useBikeStore();

    const [recentDocs, setRecentDocs] = useState<DocumentRepo.Document[]>([]);
    const [recentMaint, setRecentMaint] = useState<MaintenanceRepo.MaintenanceRecord[]>([]);

    const bike = bikes.find(b => b.id === bikeId);

    const loadData = async () => {
        if (!bike) return;

        try {
            // Load documents
            const docs = await DocumentRepo.getDocumentsByBikeId(bike.id);
            setRecentDocs(docs.slice(0, 3));

            // Load maintenance
            const maint = await MaintenanceRepo.getMaintenanceByBikeId(bike.id);
            setRecentMaint(maint.slice(0, 3));

            // Refresh bike data
            const refreshedBike = await BikeRepo.getBikeById(bike.id);
            if (refreshedBike) {
                updateBike(bike.id, refreshedBike);
            }
        } catch (error) {
            console.error('Failed to load bike detail data:', error);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [bikeId])
    );

    if (!bike) {
        return (
            <View style={styles.container}>
                <Text style={styles.errorText}>Bike not found</Text>
            </View>
        );
    }

    const handleDelete = () => {
        Alert.alert(
            'Delete Bike',
            'Are you sure you want to delete this bike? This will also delete all associated documents and maintenance logs.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await BikeRepo.deleteBike(bike.id);
                            deleteBike(bike.id);
                            navigation.goBack();
                        } catch (error) {
                            Alert.alert('Error', 'Failed to delete bike');
                        }
                    }
                }
            ]
        );
    };

    const handleMakePrimary = async () => {
        try {
            await BikeRepo.setPrimaryBike(bike.userId, bike.id);
            setPrimaryBike(bike.id);
            Alert.alert('Success', 'Set as primary bike');
        } catch (error) {
            Alert.alert('Error', 'Failed to update primary bike');
        }
    };

    const handleShare = async () => {
        try {
            const message = `Check out my bike: ${bike.brand} ${bike.model} (${bike.year})\nOdometer: ${bike.currentOdometerKm} km`;
            await Share.share({
                message,
            });
        } catch (error) {
            // Ignore
        }
    };

    const { colors } = useTheme();

    return (
        <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header / Banner */}
            <View style={[styles.header, { backgroundColor: colors.card }]}>
                <View style={styles.headerTop}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Text style={[styles.backButton, { color: colors.text }]}>←</Text>
                    </TouchableOpacity>
                    <View style={styles.headerActions}>
                        <TouchableOpacity onPress={handleShare} style={styles.headerIcon}>
                            <Text style={styles.iconText}>🔗</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleDelete} style={styles.headerIcon}>
                            <Text style={styles.iconText}>🗑️</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.bikeInfo}>
                    <Text style={styles.emoji}>🏍️</Text>
                    <Text style={[styles.bikeName, { color: colors.text }]}>
                        {bike.nickname || `${bike.brand} ${bike.model}`}
                    </Text>
                    <Text style={[styles.bikeDetail, { color: colors.text, opacity: 0.7 }]}>
                        {bike.brand} {bike.model} • {bike.year}
                    </Text>

                    {!bike.isPrimary && (
                        <TouchableOpacity
                            style={[
                                styles.makePrimaryButton,
                                { backgroundColor: colors.primary + '20' } // Assumes hex
                            ]}
                            onPress={handleMakePrimary}
                        >
                            <Text style={[styles.makePrimaryText, { color: colors.primary }]}>Make Primary</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Stats Grid */}
            <View style={styles.statsGrid}>
                <View style={[styles.statItem, { backgroundColor: colors.card }]}>
                    <Text style={[styles.statLabel, { color: colors.text, opacity: 0.6 }]}>Odometer</Text>
                    <Text style={[styles.statValue, { color: colors.text }]}>{bike.currentOdometerKm.toLocaleString()}</Text>
                    <Text style={[styles.statUnit, { color: colors.text, opacity: 0.5 }]}>km</Text>
                </View>
                <View style={[styles.statItem, { backgroundColor: colors.card }]}>
                    <Text style={[styles.statLabel, { color: colors.text, opacity: 0.6 }]}>Engine</Text>
                    <Text style={[styles.statValue, { color: colors.text }]}>{bike.engineCapacityCc || '-'}</Text>
                    <Text style={[styles.statUnit, { color: colors.text, opacity: 0.5 }]}>cc</Text>
                </View>
                <View style={[styles.statItem, { backgroundColor: colors.card }]}>
                    <Text style={[styles.statLabel, { color: colors.text, opacity: 0.6 }]}>Oil Life</Text>
                    <Text style={[
                        styles.statValue,
                        { color: colors.text },
                        bike.oilChangeStatus?.status === 'overdue' && styles.textDanger
                    ]}>
                        {Math.round(100 - (bike.oilChangeStatus?.percentageUsed || 0))}%
                    </Text>
                    <Text style={[styles.statUnit, { color: colors.text, opacity: 0.5 }]}>remaining</Text>
                </View>
            </View>

            {/* Registration */}
            <View style={[styles.section, { borderBottomColor: colors.border }]}>
                <Text style={[styles.sectionLabel, { color: colors.text, opacity: 0.6 }]}>REGISTRATION</Text>
                <Text style={[styles.registrationText, { color: colors.text }]}>
                    {bike.registrationNumber || 'No registration number added'}
                </Text>
            </View>

            {/* Maintenance Section */}
            <View style={[styles.section, { borderBottomColor: colors.border }]}>
                <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Maintenance</Text>
                    <TouchableOpacity onPress={() => navigation.navigate('LogMaintenance', { bikeId: bike.id })}>
                        <Text style={[styles.seeAllText, { color: colors.primary }]}>+ Log</Text>
                    </TouchableOpacity>
                </View>

                {recentMaint.length > 0 ? (
                    recentMaint.map(item => (
                        <View key={item.id} style={[styles.listItem, { borderBottomColor: colors.border }]}>
                            <Text style={styles.listIcon}>🔧</Text>
                            <View style={styles.listContent}>
                                <Text style={[styles.listTitle, { color: colors.text }]}>{item.title}</Text>
                                <Text style={[styles.listSubtitle, { color: colors.text, opacity: 0.6 }]}>
                                    {new Date(item.serviceDate).toLocaleDateString()} • {item.odometerKm} km
                                </Text>
                            </View>
                            {item.cost && <Text style={[styles.listAmount, { color: '#51cf66' }]}>₹{item.cost}</Text>}
                        </View>
                    ))
                ) : (
                    <Text style={[styles.emptyText, { color: colors.text, opacity: 0.6 }]}>No service history yet</Text>
                )}
            </View>

            {/* Documents Section */}
            <View style={[styles.section, { borderBottomColor: colors.border }]}>
                <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Documents</Text>
                    <TouchableOpacity onPress={() => navigation.navigate('AddDocument', { bikeId: bike.id })}>
                        <Text style={[styles.seeAllText, { color: colors.primary }]}>+ Add</Text>
                    </TouchableOpacity>
                </View>

                {recentDocs.length > 0 ? (
                    recentDocs.map(item => (
                        <View key={item.id} style={[styles.listItem, { borderBottomColor: colors.border }]}>
                            <Text style={styles.listIcon}>📄</Text>
                            <View style={styles.listContent}>
                                <Text style={[styles.listTitle, { color: colors.text }]}>{item.title}</Text>
                                <Text style={[styles.listSubtitle, { color: colors.text, opacity: 0.6 }]}>
                                    {item.type} • {item.expiryDate ? `Expires: ${new Date(item.expiryDate).toLocaleDateString()}` : 'No expiry'}
                                </Text>
                            </View>
                        </View>
                    ))
                ) : (
                    <Text style={[styles.emptyText, { color: colors.text, opacity: 0.6 }]}>No documents added</Text>
                )}
            </View>
            <View style={styles.bottomPadding} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    bikeImage: {
        width: '100%',
        height: 250,
        resizeMode: 'cover',
    },
    errorText: {
        fontSize: 18,
        textAlign: 'center',
        marginTop: 100,
    },
    header: {
        padding: 24,
        paddingTop: 60,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    backButton: {
        fontSize: 24,
    },
    headerActions: {
        flexDirection: 'row',
    },
    headerIcon: {
        marginLeft: 16,
    },
    iconText: {
        fontSize: 20,
    },
    bikeInfo: {
        alignItems: 'center',
    },
    emoji: {
        fontSize: 64,
        marginBottom: 16,
    },
    bikeName: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    bikeDetail: {
        fontSize: 14,
        marginBottom: 16,
    },
    makePrimaryButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    makePrimaryText: {
        fontSize: 12,
        fontWeight: '600',
    },
    statsGrid: {
        flexDirection: 'row',
        padding: 16,
        gap: 12,
    },
    statItem: {
        flex: 1,
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
    },
    statLabel: {
        fontSize: 12,
        marginBottom: 4,
    },
    statValue: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    statUnit: {
        fontSize: 10,
    },
    textDanger: {
        color: '#ff6b6b',
    },
    section: {
        padding: 24,
        borderBottomWidth: 1,
    },
    sectionLabel: {
        fontSize: 12,
        fontWeight: 'bold',
        marginBottom: 8,
        letterSpacing: 1,
    },
    registrationText: {
        fontSize: 18,
        fontFamily: 'monospace',
        letterSpacing: 2,
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
    seeAllText: {
        fontSize: 14,
        fontWeight: '600',
    },
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    listIcon: {
        fontSize: 20,
        marginRight: 16,
    },
    listContent: {
        flex: 1,
    },
    listTitle: {
        fontSize: 16,
        fontWeight: '600',
    },
    listSubtitle: {
        fontSize: 12,
        marginTop: 2,
    },
    listAmount: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    emptyText: {
        fontStyle: 'italic',
        textAlign: 'center',
        padding: 16,
    },
    bottomPadding: {
        height: 60,
    },
});
