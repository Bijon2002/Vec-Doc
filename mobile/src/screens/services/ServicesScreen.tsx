import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, Alert, Image, ActivityIndicator } from 'react-native';
import { useNavigation, useTheme } from '@react-navigation/native';
import * as Location from 'expo-location';
import MapView, { Marker, Callout } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';

interface ServiceLocation {
    id: string;
    title: string;
    description: string;
    latitude: number;
    longitude: number;
    type: string;
}

const SERVICE_TYPES = [
    { id: 'all', title: 'All', icon: 'grid' },
    { id: 'petrol', title: 'Petrol', icon: 'water' }, // water drop looks like oil/fuel drop
    { id: 'mechanic', title: 'Mechanic', icon: 'construct' },
    { id: 'puncture', title: 'Puncture', icon: 'disc' }, // closest to tire
    { id: 'towing', title: 'Towing', icon: 'car' },
    { id: 'wash', title: 'Wash', icon: 'water-outline' },
];

export default function ServicesScreen() {
    const navigation = useNavigation();
    const { colors } = useTheme();
    const [location, setLocation] = useState<Location.LocationObject | null>(null);
    const [selectedType, setSelectedType] = useState('all');
    const [services, setServices] = useState<ServiceLocation[]>([]);
    const mapRef = useRef<MapView>(null);
    const [loading, setLoading] = useState(true);

    const handleTypeSelect = (type: string) => {
        setSelectedType(type);
        // calculated region to fit markers could go here, but for now just filter
        if (mapRef.current && location) {
            mapRef.current.animateToRegion({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
            }, 500);
        }
    };

    const ServiceButton = ({ title, icon, type, color }: { title: string, icon: any, type: string, color?: string }) => (
        <TouchableOpacity
            style={[styles.serviceButton, { backgroundColor: color || colors.card, borderColor: colors.border, borderWidth: color ? 0 : 1 }]}
            onPress={() => handleTypeSelect(type)}
        >
            <Ionicons name={icon} size={18} color={color ? '#fff' : colors.text} />
            <Text style={[styles.serviceTitle, { color: color ? '#fff' : colors.text }]}>{title}</Text>
        </TouchableOpacity>
    );

    // Dynamic colors for service buttons to look good in both themes
    // We keep specific colors for branding but ensure they work
    const petrolColor = colors.primary;
    const mechanicColor = '#4c6ef5'; // specific blue
    const towingColor = '#fa5252'; // red

    useEffect(() => {
        (async () => {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status === 'granted') {
                const loc = await Location.getCurrentPositionAsync({});
                setLocation(loc);
                generateMockServices(loc.coords.latitude, loc.coords.longitude);
            } else {
                Alert.alert('Permission denied', 'Permission to access location was denied');
            }
            setLoading(false);
        })();
    }, []);

    const generateMockServices = (lat: number, lng: number) => {
        const mockServices: ServiceLocation[] = [];
        const types = ['petrol', 'mechanic', 'puncture', 'towing', 'wash'];

        for (let i = 0; i < 20; i++) {
            const type = types[Math.floor(Math.random() * types.length)];
            // Random location within ~2km
            const latOffset = (Math.random() - 0.5) * 0.04;
            const lngOffset = (Math.random() - 0.5) * 0.04;

            mockServices.push({
                id: `service-${i}`,
                title: `${type.charAt(0).toUpperCase() + type.slice(1)} Service ${i + 1}`,
                description: 'Open now • 4.5 ★',
                latitude: lat + latOffset,
                longitude: lng + lngOffset,
                type: type,
            });
        }
        setServices(mockServices);
    };

    const filteredServices = selectedType === 'all'
        ? services
        : services.filter(s => s.type === selectedType);

    const getPinColor = (type: string) => {
        switch (type) {
            case 'petrol': return '#ffc107'; // amber
            case 'mechanic': return '#4c6ef5'; // blue
            case 'towing': return '#f03e3e'; // red
            default: return colors.primary;
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Map Section */}
            <View style={styles.mapContainer}>
                {loading ? (
                    <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
                        <ActivityIndicator size="large" color={colors.primary} />
                    </View>
                ) : location ? (
                    <MapView
                        ref={mapRef}
                        style={styles.map}
                        initialRegion={{
                            latitude: location.coords.latitude,
                            longitude: location.coords.longitude,
                            latitudeDelta: 0.05,
                            longitudeDelta: 0.05,
                        }}
                        showsUserLocation={true}
                        showsMyLocationButton={true}
                    >
                        {filteredServices.map(service => (
                            <Marker
                                key={service.id}
                                coordinate={{ latitude: service.latitude, longitude: service.longitude }}
                                title={service.title}
                                description={service.description}
                                pinColor={getPinColor(service.type)}
                            />
                        ))}
                    </MapView>
                ) : (
                    <View style={styles.errorContainer}>
                        <Text style={{ color: colors.text }}>Fetching location...</Text>
                    </View>
                )}
            </View>

            {/* Filter Section */}
            <View style={[styles.filterContainer, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
                    {SERVICE_TYPES.map(type => (
                        <TouchableOpacity
                            key={type.id}
                            style={[
                                styles.filterButton,
                                {
                                    backgroundColor: selectedType === type.id ? colors.primary : colors.background,
                                    borderColor: colors.border,
                                    borderWidth: selectedType === type.id ? 0 : 1
                                }
                            ]}
                            onPress={() => handleTypeSelect(type.id)}
                        >
                            <Ionicons
                                name={type.icon as any}
                                size={16}
                                color={selectedType === type.id ? '#fff' : colors.text}
                                style={{ marginRight: 6 }}
                            />
                            <Text style={[styles.filterText, { color: selectedType === type.id ? '#fff' : colors.text }]}>
                                {type.title}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* List / Promo Section */}
            <ScrollView style={styles.listContainer}>
                <View style={[styles.promoSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.promoTitle, { color: colors.text }]}>Need Parts?</Text>
                    <Text style={[styles.promoText, { color: colors.text, opacity: 0.7 }]}>Check out the marketplace for best prices.</Text>
                    <TouchableOpacity
                        style={[styles.promoButton, { backgroundColor: colors.primary }]}
                        onPress={() => (navigation as any).navigate('PartsMarketplace')}
                    >
                        <Text style={[styles.promoButtonText, { color: '#ffffff' }]}>Go to Marketplace ➔</Text>
                    </TouchableOpacity>
                </View>

                {/* Nearby List */}
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Nearest Locations</Text>
                {filteredServices.slice(0, 5).map(service => (
                    <TouchableOpacity
                        key={service.id}
                        style={[styles.serviceItem, { backgroundColor: colors.card, borderBottomColor: colors.border }]}
                        onPress={() => {
                            if (mapRef.current) {
                                mapRef.current.animateToRegion({
                                    latitude: service.latitude,
                                    longitude: service.longitude,
                                    latitudeDelta: 0.01,
                                    longitudeDelta: 0.01,
                                }, 500);
                            }
                        }}
                    >
                        <View style={[styles.iconBox, { backgroundColor: getPinColor(service.type) + '20' }]}>
                            <Ionicons name="location" size={20} color={getPinColor(service.type)} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.serviceName, { color: colors.text }]}>{service.title}</Text>
                            <Text style={[styles.serviceDesc, { color: colors.text, opacity: 0.6 }]}>{service.description}</Text>
                        </View>
                        <View style={[styles.distanceBadge, { backgroundColor: colors.border }]}>
                            <Text style={[styles.distanceText, { color: colors.text }]}>1.2 km</Text>
                        </View>
                    </TouchableOpacity>
                ))}
                <View style={{ height: 100 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    mapContainer: {
        height: '45%',
        width: '100%',
    },
    map: {
        width: '100%',
        height: '100%',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    filterContainer: {
        paddingVertical: 12,
        borderBottomWidth: 1,
        elevation: 2,
    },
    filterScroll: {
        paddingHorizontal: 16,
    },
    filterButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        marginRight: 8,
    },
    filterText: {
        fontWeight: '600',
        fontSize: 13,
    },
    listContainer: {
        flex: 1,
        padding: 16,
    },
    promoSection: {
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 24,
    },
    promoTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    promoText: {
        fontSize: 14,
        marginBottom: 12,
    },
    promoButton: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
        alignItems: 'center',
        alignSelf: 'flex-start',
    },
    promoButtonText: {
        fontWeight: 'bold',
        fontSize: 14,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 12,
    },
    serviceItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    iconBox: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    serviceName: {
        fontWeight: 'bold',
        fontSize: 16,
    },
    serviceDesc: {
        fontSize: 12,
        marginTop: 2,
    },
    distanceBadge: {
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 12,
    },
    distanceText: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    serviceButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 20,
        marginRight: 8,
        minWidth: 100,
        justifyContent: 'center',
    },
    serviceTitle: {
        fontWeight: '600',
        fontSize: 14,
        marginLeft: 8,
    },
});
