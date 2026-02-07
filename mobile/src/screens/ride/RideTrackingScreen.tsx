import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    Vibration,
} from 'react-native';
import { useNavigation, useTheme } from '@react-navigation/native';
import * as Location from 'expo-location';
import { useBikeStore, useAppStore } from '../../store';
import * as BikeRepo from '../../database/bikeRepository';

// Component to calculate distance between two coordinates (Haversine formula)
const getDistanceFromLatLonInKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    var R = 6371; // Radius of the earth in km
    var dLat = deg2rad(lat2 - lat1);
    var dLon = deg2rad(lon2 - lon1);
    var a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = R * c; // Distance in km
    return d;
}

const deg2rad = (deg: number) => {
    return deg * (Math.PI / 180);
}

export default function RideTrackingScreen() {
    const navigation = useNavigation();
    const { colors } = useTheme(); // Import this
    const { bikes, updateBike, primaryBike } = useBikeStore();
    const { homeLocation } = useAppStore();

    const [isTracking, setIsTracking] = useState(false);
    const [distance, setDistance] = useState(0); // in km
    const [duration, setDuration] = useState(0); // in seconds
    const [currentSpeed, setCurrentSpeed] = useState(0); // in km/h
    const [selectedBikeId, setSelectedBikeId] = useState<string | null>(null);
    const [locationSubscription, setLocationSubscription] = useState<Location.LocationSubscription | null>(null);
    const [lastLocation, setLastLocation] = useState<Location.LocationObject | null>(null);

    const timerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        // cleanup on unmount
        return () => {
            stopTracking();
        };
    }, []);

    // Select primary bike by default
    useEffect(() => {
        const primary = primaryBike();
        if (primary) {
            setSelectedBikeId(primary.id);
        } else if (bikes.length > 0) {
            setSelectedBikeId(bikes[0].id);
        }
    }, [bikes]);

    const startTracking = async () => {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'Need location permission to track ride');
            return;
        }

        setIsTracking(true);
        setDistance(0);
        setDuration(0);
        setCurrentSpeed(0);
        setLastLocation(null);

        // Start timer
        timerRef.current = setInterval(() => {
            setDuration(prev => prev + 1);
        }, 1000);

        // Start location watch
        const subscription = await Location.watchPositionAsync(
            {
                accuracy: Location.Accuracy.High,
                timeInterval: 1000,
                distanceInterval: 5,
            },
            (location) => {
                setCurrentSpeed(location.coords.speed && location.coords.speed > 0 ? location.coords.speed * 3.6 : 0); // m/s to km/h

                setLastLocation(prevLast => {
                    if (prevLast) {
                        const dist = getDistanceFromLatLonInKm(
                            prevLast.coords.latitude,
                            prevLast.coords.longitude,
                            location.coords.latitude,
                            location.coords.longitude
                        );
                        // Filter out noise (e.g. huge jumps or tiny jitter)
                        if (dist > 0.005 && dist < 1.0) { // > 5 meters, < 1km per update (supersonic?)
                            setDistance(prevDist => prevDist + dist);
                        }
                    }
                    return location;
                });
            }
        );
        setLocationSubscription(subscription);
        Vibration.vibrate(200);
    };

    const stopTracking = () => {
        if (locationSubscription) {
            locationSubscription.remove();
            setLocationSubscription(null);
        }
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
        setIsTracking(false);
        setCurrentSpeed(0);
    };

    const handleFinishRide = () => {
        stopTracking();
        Vibration.vibrate(500);

        if (distance < 0.1) {
            Alert.alert('Ride too short', 'Distance tracked is negligible. Discarding ride.');
            return;
        }

        Alert.alert(
            'Ride Finished',
            `Distance: ${distance.toFixed(2)} km\nDuration: ${formatDuration(duration)}\n\nUpdate bike odometer?`,
            [
                { text: 'Discard', style: 'cancel' },
                {
                    text: 'Update Odometer',
                    onPress: async () => {
                        if (selectedBikeId) {
                            const bike = bikes.find(b => b.id === selectedBikeId);
                            if (bike) {
                                const newOdometer = Math.round(bike.currentOdometerKm + distance);
                                await BikeRepo.updateBike(selectedBikeId, {
                                    currentOdometerKm: newOdometer
                                });
                                updateBike(bike.id, { currentOdometerKm: newOdometer });
                                Alert.alert('Success', 'Bike odometer updated!');
                                navigation.goBack();
                            }
                        } else {
                            Alert.alert('Error', 'No bike selected');
                        }
                    }
                }
            ]
        );
    };

    const formatDuration = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h > 0 ? `${h}h ` : ''}${m}m ${s}s`;
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.header, { backgroundColor: colors.card }]}>
                <Text style={[styles.title, { color: colors.text }]}>Ride Tracker</Text>
                {/* Bike Selector */}
                {bikes.length > 0 && (
                    <View style={styles.bikeSelector}>
                        <Text style={[styles.bikeLabel, { color: colors.text, opacity: 0.7 }]}>Bike:</Text>
                        <View style={styles.bikeBadges}>
                            {bikes.map(b => (
                                <TouchableOpacity
                                    key={b.id}
                                    style={[
                                        styles.bikeBadge,
                                        { backgroundColor: colors.background, borderColor: colors.border },
                                        selectedBikeId === b.id && { backgroundColor: colors.primary, borderColor: colors.primary }
                                    ]}
                                    onPress={() => !isTracking && setSelectedBikeId(b.id)}
                                    disabled={isTracking}
                                >
                                    <Text style={[
                                        styles.bikeBadgeText,
                                        { color: colors.text },
                                        selectedBikeId === b.id && styles.bikeBadgeTextActive
                                    ]}>
                                        {b.nickname || b.model}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                )}
            </View>

            <View style={styles.statsContainer}>
                <View style={styles.mainStat}>
                    <Text style={[styles.mainStatValue, { color: colors.text }]}>{distance.toFixed(2)}</Text>
                    <Text style={[styles.mainStatLabel, { color: colors.primary }]}>KILOMETERS</Text>
                </View>

                <View style={styles.rowStats}>
                    <View style={styles.statBox}>
                        <Text style={[styles.statValue, { color: colors.text }]}>{formatDuration(duration)}</Text>
                        <Text style={[styles.statLabel, { color: colors.text, opacity: 0.7 }]}>DURATION</Text>
                    </View>
                    <View style={styles.statBox}>
                        <Text style={[styles.statValue, { color: colors.text }]}>{Math.round(currentSpeed)}</Text>
                        <Text style={[styles.statLabel, { color: colors.text, opacity: 0.7 }]}>KM/H</Text>
                    </View>
                </View>
            </View>

            <View style={styles.controls}>
                {!isTracking ? (
                    <TouchableOpacity style={[styles.startButton, { backgroundColor: colors.primary + '33' }]} onPress={startTracking}>
                        <View style={[styles.startButtonInner, { backgroundColor: colors.primary, shadowColor: colors.primary }]}>
                            <Text style={styles.startButtonText}>START RIDE</Text>
                        </View>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity style={[styles.stopButton, { backgroundColor: colors.notification + '33' }]} onPress={handleFinishRide}>
                        <View style={[styles.stopButtonInner, { backgroundColor: colors.notification, shadowColor: colors.notification }]}>
                            <Text style={styles.stopButtonText}>FINISH RIDE</Text>
                        </View>
                    </TouchableOpacity>
                )}
            </View>

            {/* Home Location Info */}
            {homeLocation && (
                <View style={styles.locationInfo}>
                    <Text style={[styles.locationText, { color: colors.text, opacity: 0.5 }]}>
                        Home Base Set: {homeLocation.lat.toFixed(2)}, {homeLocation.lng.toFixed(2)}
                    </Text>
                </View>
            )}
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
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    bikeSelector: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    bikeLabel: {
        marginRight: 12,
    },
    bikeBadges: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    bikeBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        borderWidth: 1,
    },
    bikeBadgeActive: {
        // Handled inline or via specific theme color
    },
    bikeBadgeText: {
        fontSize: 12,
    },
    bikeBadgeTextActive: {
        color: '#ffffff',
        fontWeight: '600',
    },
    statsContainer: {
        flex: 1,
        justifyContent: 'center',
        padding: 24,
    },
    mainStat: {
        alignItems: 'center',
        marginBottom: 60,
    },
    mainStatValue: {
        fontSize: 80,
        fontWeight: 'bold',
        fontVariant: ['tabular-nums'],
    },
    mainStatLabel: {
        fontSize: 16,
        letterSpacing: 2,
        fontWeight: 'bold',
    },
    rowStats: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    statBox: {
        alignItems: 'center',
    },
    statValue: {
        fontSize: 32,
        fontWeight: 'bold',
        marginBottom: 4,
        fontVariant: ['tabular-nums'],
    },
    statLabel: {
        fontSize: 12,
        letterSpacing: 1,
    },
    controls: {
        padding: 40,
        alignItems: 'center',
    },
    startButton: {
        width: 200,
        height: 200,
        borderRadius: 100,
        justifyContent: 'center',
        alignItems: 'center',
    },
    startButtonInner: {
        width: 160,
        height: 160,
        borderRadius: 80,
        justifyContent: 'center',
        alignItems: 'center',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 10,
    },
    startButtonText: {
        color: '#ffffff',
        fontSize: 20,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    stopButton: {
        width: 200,
        height: 200,
        borderRadius: 100,
        justifyContent: 'center',
        alignItems: 'center',
    },
    stopButtonInner: {
        width: 160,
        height: 160,
        borderRadius: 80,
        justifyContent: 'center',
        alignItems: 'center',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 10,
    },
    stopButtonText: {
        color: '#ffffff',
        fontSize: 20,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    locationInfo: {
        alignItems: 'center',
        paddingBottom: 20,
    },
    locationText: {
        fontSize: 12,
    },
});
