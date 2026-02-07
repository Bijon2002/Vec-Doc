import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useBikeStore } from '../../store';
import { bikesApi, getErrorMessage } from '../../api/client';

export default function AddBikeScreen() {
    const navigation = useNavigation();
    const { addBike } = useBikeStore();

    const [brand, setBrand] = useState('');
    const [model, setModel] = useState('');
    const [year, setYear] = useState('');
    const [nickname, setNickname] = useState('');
    const [engineCc, setEngineCc] = useState('');
    const [registration, setRegistration] = useState('');
    const [odometer, setOdometer] = useState('');
    const [oilInterval, setOilInterval] = useState('2500');
    const [isLoading, setIsLoading] = useState(false);

    const handleSave = async () => {
        if (!brand.trim() || !model.trim() || !year.trim()) {
            Alert.alert('Error', 'Please fill in brand, model, and year');
            return;
        }

        setIsLoading(true);
        try {
            const response = await bikesApi.create({
                brand: brand.trim(),
                model: model.trim(),
                year: parseInt(year),
                nickname: nickname.trim() || undefined,
                engineCapacityCc: engineCc ? parseInt(engineCc) : undefined,
                registrationNumber: registration.trim() || undefined,
                currentOdometerKm: odometer ? parseInt(odometer) : 0,
                oilChangeIntervalKm: parseInt(oilInterval) || 2500,
            });

            addBike(response.data);
            Alert.alert('Success', 'Bike added successfully!', [
                { text: 'OK', onPress: () => navigation.goBack() }
            ]);
        } catch (error) {
            Alert.alert('Error', getErrorMessage(error));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Basic Info</Text>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Brand *</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g., Royal Enfield, Honda"
                        placeholderTextColor="#868e96"
                        value={brand}
                        onChangeText={setBrand}
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Model *</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g., Classic 350, Activa"
                        placeholderTextColor="#868e96"
                        value={model}
                        onChangeText={setModel}
                    />
                </View>

                <View style={styles.row}>
                    <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                        <Text style={styles.label}>Year *</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="2023"
                            placeholderTextColor="#868e96"
                            value={year}
                            onChangeText={setYear}
                            keyboardType="numeric"
                            maxLength={4}
                        />
                    </View>
                    <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                        <Text style={styles.label}>Engine (cc)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="350"
                            placeholderTextColor="#868e96"
                            value={engineCc}
                            onChangeText={setEngineCc}
                            keyboardType="numeric"
                        />
                    </View>
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Nickname (optional)</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g., My Bullet, Daily Rider"
                        placeholderTextColor="#868e96"
                        value={nickname}
                        onChangeText={setNickname}
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Registration Number</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g., MH12AB1234"
                        placeholderTextColor="#868e96"
                        value={registration}
                        onChangeText={setRegistration}
                        autoCapitalize="characters"
                    />
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Maintenance Settings</Text>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Current Odometer (km)</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="0"
                        placeholderTextColor="#868e96"
                        value={odometer}
                        onChangeText={setOdometer}
                        keyboardType="numeric"
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Oil Change Interval (km)</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="2500"
                        placeholderTextColor="#868e96"
                        value={oilInterval}
                        onChangeText={setOilInterval}
                        keyboardType="numeric"
                    />
                    <Text style={styles.hint}>Recommended: 2500-3000 km</Text>
                </View>
            </View>

            <TouchableOpacity
                style={[styles.saveButton, isLoading && styles.saveButtonDisabled]}
                onPress={handleSave}
                disabled={isLoading}
            >
                {isLoading ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text style={styles.saveButtonText}>Add Bike</Text>
                )}
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#1a1a2e',
    },
    content: {
        padding: 16,
        paddingBottom: 40,
    },
    section: {
        backgroundColor: '#16213e',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#ffffff',
        marginBottom: 20,
    },
    inputGroup: {
        marginBottom: 16,
    },
    row: {
        flexDirection: 'row',
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        color: '#adb5bd',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#0f0f23',
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        color: '#ffffff',
        borderWidth: 1,
        borderColor: '#2d3436',
    },
    hint: {
        fontSize: 12,
        color: '#868e96',
        marginTop: 6,
    },
    saveButton: {
        backgroundColor: '#4c6ef5',
        borderRadius: 12,
        padding: 18,
        alignItems: 'center',
        marginTop: 8,
    },
    saveButtonDisabled: {
        opacity: 0.7,
    },
    saveButtonText: {
        color: '#ffffff',
        fontSize: 18,
        fontWeight: 'bold',
    },
});
