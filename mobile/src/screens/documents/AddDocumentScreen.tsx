import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Image,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, useTheme, RouteProp } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { RootStackParamList } from '../../navigation';
import { useAuthStore, useBikeStore } from '../../store';
import * as DocumentRepo from '../../database/documentRepository';
import { NotificationService } from '../../services/notificationService';

type AddDocumentRouteProp = RouteProp<RootStackParamList, 'AddDocument'>;

export default function AddDocumentScreen() {
    const navigation = useNavigation();
    const route = useRoute<AddDocumentRouteProp>();
    const { bikeId } = route.params;
    const { user } = useAuthStore();
    const { bikes } = useBikeStore();

    const [title, setTitle] = useState('');
    const [type, setType] = useState<DocumentRepo.Document['type']>('insurance');
    const [expiryDate, setExpiryDate] = useState('');
    const [imageUri, setImageUri] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const bike = bikes.find(b => b.id === bikeId);

    const pickImage = async () => {
        // Request permissions
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

    const takePhoto = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission needed', 'Please grant permission to use the camera');
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8,
        });

        if (!result.canceled) {
            setImageUri(result.assets[0].uri);
        }
    };

    const handleSave = async () => {
        if (!title.trim()) {
            Alert.alert('Error', 'Please enter a document title');
            return;
        }

        if (!imageUri) {
            Alert.alert('Error', 'Please attach a document image');
            return;
        }

        setLoading(true);
        try {
            await DocumentRepo.createDocument({
                bikeId,
                userId: user?.id || '',
                title: title.trim(),
                type,
                expiryDate: expiryDate ? new Date(expiryDate).toISOString() : undefined,
                fileUri: imageUri, // The repo handles copying this file
            });

            if (expiryDate) {
                await NotificationService.scheduleDocumentExpiryReminder(title.trim(), expiryDate);
            }

            Alert.alert('Success', 'Document added and reminder set!', [
                { text: 'OK', onPress: () => navigation.goBack() }
            ]);
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to save document');
        } finally {
            setLoading(false);
        }
    };

    const setExpiryInDays = (days: number) => {
        const date = new Date();
        date.setDate(date.getDate() + days);
        setExpiryDate(date.toISOString().split('T')[0]);
    };

    const { colors } = useTheme();

    return (
        <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.content}>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Add Document</Text>
                <Text style={[styles.headerSubtitle, { color: colors.text }]}>
                    For {bike?.nickname || `${bike?.brand} ${bike?.model}`}
                </Text>

                <View style={styles.form}>
                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: colors.text }]}>Title</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                            placeholder="e.g., Insurance Policy"
                            placeholderTextColor="#868e96"
                            value={title}
                            onChangeText={setTitle}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: colors.text }]}>Type</Text>
                        <View style={styles.typeContainer}>
                            {[
                                { val: 'insurance', label: 'Insurance' },
                                { val: 'rc', label: 'RC' },
                                { val: 'puc', label: 'PUC' },
                                { val: 'license', label: 'License' },
                                { val: 'other', label: 'Other' }
                            ].map((item) => (
                                <TouchableOpacity
                                    key={item.val}
                                    style={[
                                        styles.typeButton,
                                        { backgroundColor: colors.card, borderColor: colors.border },
                                        type === item.val && styles.typeButtonActive
                                    ]}
                                    onPress={() => setType(item.val as any)}
                                >
                                    <Text style={[
                                        styles.typeText,
                                        { color: colors.text },
                                        type === item.val && styles.typeTextActive
                                    ]}>{item.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: colors.text }]}>Expiry Date</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                            placeholder="YYYY-MM-DD"
                            placeholderTextColor="#868e96"
                            value={expiryDate}
                            onChangeText={setExpiryDate}
                        />
                        <View style={styles.quickDateContainer}>
                            <TouchableOpacity style={[styles.quickDateButton, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => setExpiryInDays(180)}>
                                <Text style={[styles.quickDateText, { color: colors.text }]}>6 Months</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.quickDateButton, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => setExpiryInDays(365)}>
                                <Text style={[styles.quickDateText, { color: colors.text }]}>1 Year</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.quickDateButton, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => setExpiryInDays(365 * 5)}>
                                <Text style={[styles.quickDateText, { color: colors.text }]}>5 Years</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: colors.text }]}>Document Image</Text>

                        {imageUri ? (
                            <View style={styles.imagePreviewContainer}>
                                <Image source={{ uri: imageUri }} style={styles.imagePreview} />
                                <TouchableOpacity
                                    style={styles.removeImageButton}
                                    onPress={() => setImageUri(null)}
                                >
                                    <Text style={styles.removeImageText}>✕</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <View style={styles.imageButtonsContainer}>
                                <TouchableOpacity style={[styles.imageButton, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={takePhoto}>
                                    <Text style={styles.imageButtonIcon}>📸</Text>
                                    <Text style={[styles.imageButtonText, { color: colors.text }]}>Take Photo</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.imageButton, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={pickImage}>
                                    <Text style={styles.imageButtonIcon}>🖼️</Text>
                                    <Text style={[styles.imageButtonText, { color: colors.text }]}>Gallery</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>

                    <TouchableOpacity
                        style={[styles.saveButton, { backgroundColor: colors.primary }, loading && styles.disabledButton]}
                        onPress={handleSave}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.saveButtonText}>Save Document</Text>
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
    quickDateContainer: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 8,
    },
    quickDateButton: {
        backgroundColor: '#16213e',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#2d3436',
    },
    quickDateText: {
        color: '#adb5bd',
        fontSize: 12,
    },
    imageButtonsContainer: {
        flexDirection: 'row',
        gap: 16,
    },
    imageButton: {
        flex: 1,
        aspectRatio: 1.5,
        backgroundColor: '#16213e',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#2d3436',
        borderStyle: 'dashed',
    },
    imageButtonIcon: {
        fontSize: 32,
        marginBottom: 8,
    },
    imageButtonText: {
        color: '#adb5bd',
        fontSize: 14,
    },
    imagePreviewContainer: {
        position: 'relative',
        borderRadius: 12,
        overflow: 'hidden',
    },
    imagePreview: {
        width: '100%',
        aspectRatio: 1.5,
        backgroundColor: '#000',
    },
    removeImageButton: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: 'rgba(0,0,0,0.6)',
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    removeImageText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
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
