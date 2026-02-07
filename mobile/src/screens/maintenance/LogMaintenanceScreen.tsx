import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Alert,
    ActivityIndicator,
    Switch,
} from 'react-native';
import { useNavigation, useRoute, useTheme, RouteProp } from '@react-navigation/native';
import * as Location from 'expo-location';
import { RootStackParamList } from '../../navigation';
import { useBikeStore } from '../../store';
import * as MaintenanceRepo from '../../database/maintenanceRepository';
import * as BikeRepo from '../../database/bikeRepository';
import { NotificationService } from '../../services/notificationService';

type LogMaintenanceRouteProp = RouteProp<RootStackParamList, 'LogMaintenance'>;

export default function LogMaintenanceScreen() {
    const navigation = useNavigation();
    const route = useRoute<LogMaintenanceRouteProp>();
    const { bikeId } = route.params;
    const { bikes, updateBike } = useBikeStore();
    const { colors } = useTheme();

    const [type, setType] = useState('oil_change');
    const [title, setTitle] = useState('');
    const [odometer, setOdometer] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]); // YYYY-MM-DD
    const [cost, setCost] = useState('');
    const [notes, setNotes] = useState('');
    const [location, setLocation] = useState<{ lat: number, lng: number } | null>(null);
    const [locationLoading, setLocationLoading] = useState(false);
    const [loading, setLoading] = useState(false);

    const bike = bikes.find(b => b.id === bikeId);

    const handleGetLocation = async () => {
        setLocationLoading(true);
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Permission to access location was denied');
                return;
            }

            const currentLoc = await Location.getCurrentPositionAsync({});
            setLocation({
                lat: currentLoc.coords.latitude,
                lng: currentLoc.coords.longitude
            });
            Alert.alert('Success', 'Location tagged successfully!');
        } catch (error) {
            Alert.alert('Error', 'Failed to get location');
        } finally {
            setLocationLoading(false);
        }
    };

    const handleSave = async () => {
        if (!title.trim()) {
            Alert.alert('Error', 'Please enter a title (e.g., 2nd Service)');
            return;
        }

        if (!odometer) {
            Alert.alert('Error', 'Please enter current odometer reading');
            return;
        }

        setLoading(true);
        try {
            const odometerVal = parseInt(odometer);

            // 1. Add maintenance record
            await MaintenanceRepo.createMaintenance({
                bikeId,
                userId: bike!.userId,
                type: type as any,
                title: title.trim(),
                description: title.trim(), // keeping same for now
                serviceDate: new Date(date).toISOString(),
                odometerKm: odometerVal,
                cost: cost ? parseFloat(cost) : undefined,
                notes: notes.trim() || undefined,
                serviceProvider: location ? `Lat: ${location.lat.toFixed(4)}, Lng: ${location.lng.toFixed(4)}` : undefined,
                // We could store location in notes or a specific field if schema supported it
            });

            // 2. Update bike odometer if new reading is higher
            if (bike && odometerVal > bike.currentOdometerKm) {
                const updatedBike = await BikeRepo.updateBike(bikeId, {
                    currentOdometerKm: odometerVal,
                    // If it's an oil change, update last oil change km
                    lastOilChangeKm: type === 'oil_change' ? odometerVal : undefined
                });
                if (updatedBike) {
                    updateBike(updatedBike.id, updatedBike);
                }
            } else if (bike && type === 'oil_change') {
                // Even if odometer didn't increase (weird but possible), update last oil change
                const updatedBike = await BikeRepo.updateBike(bikeId, {
                    lastOilChangeKm: odometerVal
                });
                if (updatedBike) {
                    updateBike(updatedBike.id, updatedBike);
                }
                const bikes = useBikeStore.getState().bikes;
                const updatedBikes = bikes.map(b => b.id === bikeId ? updatedBike : b);
                useBikeStore.setState({ bikes: updatedBikes });
            }


            // Schedule next reminder
            if (bike) {
                await NotificationService.scheduleMaintenanceReminder(bike.nickname || 'Bike', date);
            }

            Alert.alert('Success', 'Maintenance logged and reminder set!', [
                { text: 'OK', onPress: () => navigation.goBack() }
            ]);
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to save log');
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.content}>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Log Service</Text>
                <Text style={[styles.headerSubtitle, { color: colors.text }]}>
                    For {bike?.nickname || `${bike?.brand} ${bike?.model}`}
                </Text>

                <View style={styles.form}>
                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: colors.text }]}>Service Type</Text>
                        <View style={styles.typeContainer}>
                            {[
                                { id: 'oil_change', label: 'Oil Change' },
                                { id: 'service', label: 'General Service' },
                                { id: 'repair', label: 'Repair' },
                                { id: 'modification', label: 'Mod' }
                            ].map((t) => (
                                <TouchableOpacity
                                    key={t.id}
                                    style={[
                                        styles.typeButton,
                                        { backgroundColor: colors.card, borderColor: colors.border },
                                        type === t.id && styles.typeButtonActive
                                    ]}
                                    onPress={() => setType(t.id)}
                                >
                                    <Text style={[
                                        styles.typeText,
                                        { color: colors.text },
                                        type === t.id && styles.typeTextActive
                                    ]}>{t.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: colors.text }]}>Title</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                            placeholder="e.g., 2nd Free Service, Oil Top-up"
                            placeholderTextColor="#868e96"
                            value={title}
                            onChangeText={setTitle}
                        />
                    </View>

                    <View style={styles.row}>
                        <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                            <Text style={[styles.label, { color: colors.text }]}>Odometer (km)</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                                placeholder={bike?.currentOdometerKm.toString()}
                                placeholderTextColor="#868e96"
                                value={odometer}
                                onChangeText={setOdometer}
                                keyboardType="numeric"
                            />
                        </View>
                        <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                            <Text style={[styles.label, { color: colors.text }]}>Cost (₹)</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                                placeholder="0"
                                placeholderTextColor="#868e96"
                                value={cost}
                                onChangeText={setCost}
                                keyboardType="numeric"
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: colors.text }]}>Date</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                            placeholder="YYYY-MM-DD"
                            placeholderTextColor="#868e96"
                            value={date}
                            onChangeText={setDate}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: colors.text }]}>Notes</Text>
                        <TextInput
                            style={[styles.input, styles.textArea, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                            placeholder="Parts changed, mechanic notes..."
                            placeholderTextColor="#868e96"
                            value={notes}
                            onChangeText={setNotes}
                            multiline
                            numberOfLines={3}
                            textAlignVertical="top"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: colors.text }]}>Location</Text>
                        <TouchableOpacity
                            style={[styles.locationButton, { backgroundColor: colors.card, borderColor: colors.border }, location && styles.locationButtonActive]}
                            onPress={handleGetLocation}
                            disabled={locationLoading}
                        >
                            {locationLoading ? (
                                <ActivityIndicator color="#fff" size="small" />
                            ) : (
                                <>
                                    <Text style={styles.locationIcon}>📍</Text>
                                    <Text style={[styles.locationText, { color: colors.text }]}>
                                        {location
                                            ? `Tagged: ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`
                                            : 'Tag Current Location'}
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        style={[styles.saveButton, { backgroundColor: colors.primary }, loading && styles.disabledButton]}
                        onPress={handleSave}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.saveButtonText}>Save Log</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#1a1a2e',
    },
    content: {
        padding: 24,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#ffffff',
        marginBottom: 8,
    },
    headerSubtitle: {
        fontSize: 16,
        color: '#868e96',
        marginBottom: 24,
    },
    form: {
        gap: 24,
    },
    inputGroup: {
        gap: 8,
    },
    row: {
        flexDirection: 'row',
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        color: '#adb5bd',
    },
    input: {
        backgroundColor: '#16213e',
        borderRadius: 12,
        padding: 16,
        color: '#ffffff',
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#2d3436',
    },
    textArea: {
        minHeight: 100,
    },
    typeContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    typeButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#16213e',
        borderWidth: 1,
        borderColor: '#2d3436',
    },
    typeButtonActive: {
        backgroundColor: '#4c6ef5',
        borderColor: '#4c6ef5',
    },
    typeText: {
        color: '#adb5bd',
        fontSize: 14,
    },
    typeTextActive: {
        color: '#ffffff',
        fontWeight: '600',
    },
    locationButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#16213e',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#2d3436',
        borderStyle: 'dashed',
    },
    locationButtonActive: {
        backgroundColor: 'rgba(76, 110, 245, 0.1)',
        borderColor: '#4c6ef5',
        borderStyle: 'solid',
    },
    locationIcon: {
        fontSize: 18,
        marginRight: 8,
    },
    locationText: {
        color: '#adb5bd',
        fontSize: 14,
    },
    saveButton: {
        backgroundColor: '#4c6ef5',
        padding: 18,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 16,
    },
    disabledButton: {
        opacity: 0.7,
    },
    saveButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
