import React, { useCallback, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Image,
    RefreshControl,
    Alert,
} from 'react-native';
import { useNavigation, useFocusEffect, useTheme } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuthStore, useBikeStore } from '../../store';
import { RootStackParamList } from '../../navigation';
import * as DocumentRepo from '../../database/documentRepository';
import * as BikeRepo from '../../database/bikeRepository';

type DocumentsNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function DocumentsScreen() {
    const navigation = useNavigation<DocumentsNavigationProp>();
    const { user } = useAuthStore();
    const { bikes, loadBikes } = useBikeStore();
    const { colors } = useTheme();

    const [documents, setDocuments] = useState<DocumentRepo.Document[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [bikesMap, setBikesMap] = useState<Record<string, string>>({});

    const loadData = async () => {
        if (!user?.id) return;

        try {
            // Load bikes to get names
            if (bikes.length === 0) {
                await loadBikes(user.id);
            }

            // Create map of bike IDs to names
            const map: Record<string, string> = {};
            bikes.forEach(b => {
                map[b.id] = b.nickname || `${b.brand} ${b.model}`;
            });
            setBikesMap(map);

            // Load all documents for all user's bikes
            let allDocs: DocumentRepo.Document[] = [];
            for (const bike of bikes) {
                const bikeDocs = await DocumentRepo.getDocumentsByBikeId(bike.id);
                allDocs = [...allDocs, ...bikeDocs];
            }

            // Sort by expiry date (soonest first)
            allDocs.sort((a, b) => {
                if (!a.expiryDate) return 1;
                if (!b.expiryDate) return -1;
                return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
            });

            setDocuments(allDocs);
        } catch (error) {
            console.error('Failed to load documents:', error);
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

    const handleDelete = async (id: string) => {
        Alert.alert(
            'Delete Document',
            'Are you sure you want to delete this document?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await DocumentRepo.deleteDocument(id);
                            loadData();
                        } catch (error) {
                            Alert.alert('Error', 'Failed to delete document');
                        }
                    }
                }
            ]
        );
    };

    const renderDocumentItem = ({ item }: { item: DocumentRepo.Document }) => {
        const bikeName = bikesMap[item.bikeId] || 'Unknown Bike';

        // Calculate days until expiry
        let daysUntilExpiry = null;
        let isExpired = false;
        let isExpiringSoon = false;

        if (item.expiryDate) {
            const today = new Date();
            const expiry = new Date(item.expiryDate);
            const diffTime = expiry.getTime() - today.getTime();
            daysUntilExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            isExpired = daysUntilExpiry < 0;
            isExpiringSoon = daysUntilExpiry <= 30 && !isExpired;
        }

        return (
            <TouchableOpacity
                style={[styles.docCard, { backgroundColor: colors.card }]}
                onLongPress={() => handleDelete(item.id)}
            >
                <View style={[styles.docIconContainer, { backgroundColor: colors.background }]}>
                    <Text style={styles.docIcon}>📄</Text>
                </View>

                <View style={styles.docContent}>
                    <Text style={[styles.docTitle, { color: colors.text }]}>{item.title}</Text>
                    <Text style={[styles.docSubtitle, { color: colors.text }]}>{bikeName} • {item.type}</Text>

                    {item.expiryDate && (
                        <View style={[
                            styles.expiryContainer,
                            isExpired && styles.expiredBadge,
                            isExpiringSoon && styles.expiringBadge
                        ]}>
                            <Text style={[
                                styles.expiryText,
                                (isExpired || isExpiringSoon) && styles.expiryTextUrgent
                            ]}>
                                {isExpired
                                    ? `Expired ${Math.abs(daysUntilExpiry!)} days ago`
                                    : `Expires in ${daysUntilExpiry} days`}
                            </Text>
                        </View>
                    )}
                </View>

                <Text style={[styles.moreIcon, { color: colors.text }]}>⋮</Text>
            </TouchableOpacity>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.header, { backgroundColor: colors.card }]}>
                <Text style={[styles.title, { color: colors.text }]}>Documents</Text>
                {/* We can only add documents if we have bikes */}
                {bikes.length > 0 && (
                    <TouchableOpacity
                        style={[styles.addButton, { backgroundColor: colors.primary }]}
                        onPress={() => navigation.navigate('AddDocument', { bikeId: bikes[0].id })}
                    >
                        <Text style={styles.addButtonText}>+ Add</Text>
                    </TouchableOpacity>
                )}
            </View>

            <FlatList
                data={documents}
                renderItem={renderDocumentItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyEmoji}>📄</Text>
                        <Text style={[styles.emptyTitle, { color: colors.text }]}>No documents yet</Text>
                        <Text style={[styles.emptySubtitle, { color: colors.text }]}>
                            {bikes.length === 0
                                ? "Add a bike first to track documents"
                                : "Keep track of insurance, license & registration"}
                        </Text>
                        {bikes.length > 0 && (
                            <TouchableOpacity
                                style={[styles.emptyButton, { backgroundColor: colors.primary }]}
                                onPress={() => navigation.navigate('AddDocument', { bikeId: bikes[0].id })}
                            >
                                <Text style={styles.emptyButtonText}>Add Document</Text>
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
    docCard: {
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
    },
    docIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    docIcon: {
        fontSize: 24,
    },
    docContent: {
        flex: 1,
    },
    docTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    docSubtitle: {
        fontSize: 12,
        opacity: 0.7,
        marginBottom: 8,
    },
    expiryContainer: {
        backgroundColor: 'rgba(81, 207, 102, 0.1)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        alignSelf: 'flex-start',
    },
    expiredBadge: {
        backgroundColor: 'rgba(255, 107, 107, 0.1)',
    },
    expiringBadge: {
        backgroundColor: 'rgba(252, 196, 25, 0.1)',
    },
    expiryText: {
        fontSize: 10,
        fontWeight: '600',
        color: '#51cf66',
    },
    expiryTextUrgent: {
        color: '#ff6b6b',
    },
    moreIcon: {
        fontSize: 20,
        opacity: 0.5,
        padding: 8,
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
