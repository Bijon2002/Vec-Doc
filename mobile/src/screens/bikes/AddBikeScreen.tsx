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
    Image,
} from 'react-native';
import { useNavigation, useTheme } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore, useBikeStore } from '../../store';

export default function AddBikeScreen() {
    const navigation = useNavigation();
    const { user } = useAuthStore();
    const { addBike } = useBikeStore();

    const [brand, setBrand] = useState('');
    const [model, setModel] = useState('');
    const [year, setYear] = useState('');
    const [nickname, setNickname] = useState('');
    const [engineCc, setEngineCc] = useState('');
    const [registration, setRegistration] = useState('');
    const [odometer, setOdometer] = useState('');
    const [oilInterval, setOilInterval] = useState('2500');
    const [imageUri, setImageUri] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission needed', 'Please grant permission to access your photos');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8,
        });

        if (!result.canceled) {
            setImageUri(result.assets[0].uri);
        }
    };

    const handleSave = async () => {
        if (!brand.trim() || !model.trim() || !year.trim()) {
            Alert.alert('Error', 'Please fill in brand, model, and year');
            return;
        }

        if (!user) {
            Alert.alert('Error', 'Please login first');
            return;
        }

        setIsLoading(true);
        try {
            await addBike({
                userId: user.id,
                brand: brand.trim(),
                model: model.trim(),
                year: parseInt(year),
                nickname: nickname.trim() || undefined,
                engineCapacityCc: engineCc ? parseInt(engineCc) : undefined,
                registrationNumber: registration.trim() || undefined,
                currentOdometerKm: odometer ? parseInt(odometer) : 0,
                oilChangeIntervalKm: parseInt(oilInterval) || 2500,
                lastOilChangeKm: odometer ? parseInt(odometer) : 0,
                imageUri: imageUri || undefined,
                fuelType: 'petrol',
                isPrimary: false,
                isActive: true,
            });

            Alert.alert('Success', 'Bike added successfully!', [
                { text: 'OK', onPress: () => navigation.goBack() }
            ]);
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to add bike');
        } finally {
            setIsLoading(false);
        }
    };

    const { colors } = useTheme();

    return (
        <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
            <TouchableOpacity
                style={[styles.imagePicker, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={pickImage}
            >
                {imageUri ? (
                    <Image source={{ uri: imageUri }} style={styles.bikeImage} />
                ) : (
                    <View style={styles.placeholderImage}>
                        <Text style={[styles.placeholderText, { color: colors.text, opacity: 0.5 }]}>+ Add Bike Photo</Text>
                    </View>
                )}
            </TouchableOpacity>

            <View style={[styles.section, { backgroundColor: colors.card }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Basic Info</Text>

                <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: colors.text }]}>Brand *</Text>
                    <TextInput
                        style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                        placeholder="e.g., Royal Enfield, Honda"
                        placeholderTextColor={colors.text + '80'}
                        value={brand}
                        onChangeText={setBrand}
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: colors.text }]}>Model *</Text>
                    <TextInput
                        style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                        placeholder="e.g., Classic 350, Activa"
                        placeholderTextColor={colors.text + '80'}
                        value={model}
                        onChangeText={setModel}
                    />
                </View>

                <View style={styles.row}>
                    <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                        <Text style={[styles.label, { color: colors.text }]}>Year *</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                            placeholder="2023"
                            placeholderTextColor={colors.text + '80'}
                            value={year}
                            onChangeText={setYear}
                            keyboardType="numeric"
                            maxLength={4}
                        />
                    </View>
                    <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                        <Text style={[styles.label, { color: colors.text }]}>Engine (cc)</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                            placeholder="350"
                            placeholderTextColor={colors.text + '80'}
                            value={engineCc}
                            onChangeText={setEngineCc}
                            keyboardType="numeric"
                        />
                    </View>
                </View>

                <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: colors.text }]}>Nickname (optional)</Text>
                    <TextInput
                        style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                        placeholder="e.g., My Bullet, Daily Rider"
                        placeholderTextColor={colors.text + '80'}
                        value={nickname}
                        onChangeText={setNickname}
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: colors.text }]}>Registration Number</Text>
                    <TextInput
                        style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                        placeholder="e.g., MH12AB1234"
                        placeholderTextColor={colors.text + '80'}
                        value={registration}
                        onChangeText={setRegistration}
                        autoCapitalize="characters"
                    />
                </View>
            </View>

            <View style={[styles.section, { backgroundColor: colors.card }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Maintenance Settings</Text>

                <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: colors.text }]}>Current Odometer (km)</Text>
                    <TextInput
                        style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                        placeholder="0"
                        placeholderTextColor={colors.text + '80'}
                        value={odometer}
                        onChangeText={setOdometer}
                        keyboardType="numeric"
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: colors.text }]}>Oil Change Interval (km)</Text>
                    <TextInput
                        style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                        placeholder="2500"
                        placeholderTextColor={colors.text + '80'}
                        value={oilInterval}
                        onChangeText={setOilInterval}
                        keyboardType="numeric"
                    />
                    <Text style={[styles.hint, { color: colors.text, opacity: 0.6 }]}>Recommended: 2500-3000 km</Text>
                </View>
            </View>

            <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: colors.primary }, isLoading && styles.saveButtonDisabled]}
                onPress={handleSave}
                disabled={isLoading}
            >
                {isLoading ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text style={styles.saveButtonText}>Add Bike</Text>
                )}
            </TouchableOpacity>

            <Text style={styles.localNote}>📱 Data saved locally on your device</Text>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        padding: 16,
        paddingBottom: 40,
    },
    section: {
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    inputGroup: {
        marginBottom: 16,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
    },
    input: {
        borderWidth: 1,
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
    },
    imagePicker: {
        height: 200,
        borderRadius: 12,
        marginBottom: 24,
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderStyle: 'dashed',
    },
    bikeImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    placeholderImage: {
        alignItems: 'center',
    },
    placeholderText: {
        marginTop: 8,
        fontSize: 16,
        fontWeight: '600',
    },
    hint: {
        fontSize: 12,
        marginTop: 6,
    },
    saveButton: {
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
    localNote: {
        fontSize: 12,
        color: '#51cf66',
        textAlign: 'center',
        marginTop: 16,
    },
});
