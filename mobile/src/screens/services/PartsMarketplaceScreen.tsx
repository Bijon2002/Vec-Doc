import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, ScrollView, ActivityIndicator, Linking, Alert } from 'react-native';
import { useNavigation, useTheme } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ShopRepo from '../../database/shopRepository';

export default function PartsMarketplaceScreen() {
    const { colors } = useTheme();
    const [searchQuery, setSearchQuery] = useState('');
    const [parts, setParts] = useState<ShopRepo.Part[]>([]);
    const [selectedPart, setSelectedPart] = useState<ShopRepo.Part | null>(null);
    const [inventory, setInventory] = useState<ShopRepo.ShopInventoryItem[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Seed database on first load
        ShopRepo.seedDatabase();
    }, []);

    const handleSearch = async (text: string) => {
        setSearchQuery(text);
        if (text.length > 1) {
            const results = await ShopRepo.searchParts(text);
            setParts(results);
            setSelectedPart(null);
            setInventory([]);
        } else {
            setParts([]);
        }
    };

    const handleSelectPart = async (part: ShopRepo.Part) => {
        setSelectedPart(part);
        setLoading(true);
        try {
            const items = await ShopRepo.getPartInventory(part.id);
            setInventory(items);
        } finally {
            setLoading(false);
        }
    };

    const handleCallShop = (phone: string | undefined) => {
        if (phone) {
            Linking.openURL(`tel:${phone}`);
        } else {
            Alert.alert('Info', 'Phone number not available');
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
                <Text style={[styles.title, { color: colors.text }]}>Parts Marketplace</Text>
                <Text style={[styles.subtitle, { color: colors.text, opacity: 0.7 }]}>Find parts and compare prices</Text>

                <View style={[styles.searchContainer, { backgroundColor: colors.background, borderColor: colors.border, borderWidth: 1 }]}>
                    <Ionicons name="search" size={20} color={colors.text} style={{ marginRight: 8, opacity: 0.5 }} />
                    <TextInput
                        style={[styles.searchInput, { color: colors.text }]}
                        placeholder="Search for parts (e.g. 'Oil', 'Brake')"
                        value={searchQuery}
                        onChangeText={handleSearch}
                        placeholderTextColor={colors.text + '80'}
                    />
                </View>
            </View>

            <View style={styles.content}>
                {/* Parts List */}
                {!selectedPart && (
                    <FlatList
                        data={parts}
                        keyExtractor={item => item.id}
                        renderItem={({ item }) => (
                            <TouchableOpacity style={[styles.partItem, { backgroundColor: colors.card, shadowColor: colors.border }]} onPress={() => handleSelectPart(item)}>
                                <View style={[styles.partIconBg, { backgroundColor: colors.primary + '20' }]}>
                                    <Ionicons name="cog" size={24} color={colors.primary} />
                                </View>
                                <View style={styles.partInfo}>
                                    <Text style={[styles.partName, { color: colors.text }]}>{item.name}</Text>
                                    <Text style={[styles.partDesc, { color: colors.text, opacity: 0.6 }]}>{item.description}</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={20} color={colors.border} />
                            </TouchableOpacity>
                        )}
                        ListEmptyComponent={() => (
                            <View style={styles.emptyState}>
                                <Text style={[styles.emptyText, { color: colors.text, opacity: 0.5 }]}>
                                    {searchQuery.length > 1 ? 'No parts found' : 'Type to search for parts...'}
                                </Text>
                            </View>
                        )}
                    />
                )}

                {/* Inventory List (Shops) */}
                {selectedPart && (
                    <View style={styles.inventoryContainer}>
                        <View style={styles.selectedHeader}>
                            <TouchableOpacity onPress={() => setSelectedPart(null)} style={styles.backButton}>
                                <Ionicons name="arrow-back" size={24} color={colors.primary} />
                                <Text style={[styles.backButtonText, { color: colors.primary }]}>Back</Text>
                            </TouchableOpacity>
                            <Text style={[styles.selectedTitle, { color: colors.text }]}>{selectedPart.name}</Text>
                        </View>

                        {loading ? (
                            <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 20 }} />
                        ) : (
                            <FlatList
                                data={inventory}
                                keyExtractor={item => item.id}
                                renderItem={({ item }) => (
                                    <View style={[styles.shopCard, { backgroundColor: colors.card, borderLeftColor: colors.primary }]}>
                                        <View style={styles.shopInfo}>
                                            <Text style={[styles.shopName, { color: colors.text }]}>{item.shop_name}</Text>
                                            <Text style={[styles.shopAddress, { color: colors.text, opacity: 0.7 }]}>{item.shop_address}</Text>
                                            <Text style={[styles.price, { color: '#2e7d32' }]}>₹{item.price}</Text>
                                        </View>
                                        <TouchableOpacity
                                            style={[styles.callButton, { backgroundColor: '#e8f5e9' }]}
                                            onPress={() => handleCallShop(item.shop_phone)}
                                        >
                                            <Ionicons name="call" size={16} color="#2e7d32" style={{ marginRight: 4 }} />
                                            <Text style={[styles.callButtonText, { color: '#2e7d32' }]}>Call</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                                ListEmptyComponent={() => (
                                    <View style={styles.emptyState}>
                                        <Text style={[styles.emptyText, { color: colors.text, opacity: 0.5 }]}>No shops nearby have this part in stock.</Text>
                                    </View>
                                )}
                            />
                        )}
                    </View>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        padding: 24,
        paddingTop: 60,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 14,
        marginBottom: 20,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 48,
    },
    searchIcon: {
        fontSize: 16,
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        height: 48,
        fontSize: 16,
    },
    content: {
        flex: 1,
        padding: 16,
    },
    partItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    partIconBg: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    partIcon: {
        fontSize: 20,
    },
    partInfo: {
        flex: 1,
    },
    partName: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    partDesc: {
        fontSize: 12,
        marginTop: 2,
    },
    chevron: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 40,
    },
    emptyText: {
        fontSize: 16,
    },
    inventoryContainer: {
        flex: 1,
    },
    selectedHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    backButton: {
        marginRight: 16,
        padding: 8,
    },
    backButtonText: {
        fontWeight: 'bold',
    },
    selectedTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    shopCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
        borderLeftWidth: 4,
    },
    shopInfo: {
        flex: 1,
    },
    shopName: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    shopAddress: {
        fontSize: 12,
        marginVertical: 4,
    },
    price: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    callButton: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
    },
    callButtonText: {
        fontWeight: 'bold',
    },
});
