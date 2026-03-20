import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    ScrollView,
    Platform,
} from 'react-native';
import { useTheme } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useAppStore } from '../../store';

export default function PetrolQRScreen() {
    const { colors } = useTheme();
    const { petrolQrUri, setPetrolQrUri } = useAppStore();

    const handlePickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Toast.show({
                type: 'error',
                text1: 'Permission Denied',
                text2: 'Please grant permission to access your gallery'
            });
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            quality: 1,
        });

        if (!result.canceled) {
            setPetrolQrUri(result.assets[0].uri);
            Toast.show({
                type: 'success',
                text1: 'QR Code Saved',
                text2: 'Your Petrol QR code is now stored locally.'
            });
        }
    };

    const handleClear = () => {
        setPetrolQrUri(null);
        Toast.show({
            type: 'info',
            text1: 'Cleared',
            text2: 'QR code removed from local storage.'
        });
    };

    return (
        <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.header, { backgroundColor: colors.primary }]}>
                <Ionicons name="qr-code" size={60} color="#ffffff" style={styles.headerIcon} />
                <Text style={styles.title}>Fuel Pass (SL)</Text>
                <Text style={styles.subtitle}>Store and access your petrol QR code instantly</Text>
            </View>

            <View style={styles.content}>
                {petrolQrUri ? (
                    <View style={[styles.qrContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <Image source={{ uri: petrolQrUri }} style={styles.qrImage} resizeMode="contain" />
                        <View style={styles.infoBox}>
                            <Ionicons name="information-circle" size={20} color={colors.primary} />
                            <Text style={[styles.infoText, { color: colors.text }]}>
                                Present this QR at the fuel station. Keep your brightness high.
                            </Text>
                        </View>
                        <TouchableOpacity style={[styles.changeButton, { borderColor: colors.primary }]} onPress={handlePickImage}>
                            <Text style={[styles.changeButtonText, { color: colors.primary }]}>Change QR Code</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.clearButton} onPress={handleClear}>
                            <Text style={styles.clearButtonText}>Remove</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={[styles.emptyContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <Ionicons name="image-outline" size={80} color={colors.text + '40'} />
                        <Text style={[styles.emptyTitle, { color: colors.text }]}>No QR Code Yet</Text>
                        <Text style={[styles.emptyDesc, { color: colors.text + '80' }]}>
                            Take a screenshot of your National Fuel Pass and upload it here for quick access.
                        </Text>
                        <TouchableOpacity style={[styles.uploadButton, { backgroundColor: colors.primary }]} onPress={handlePickImage}>
                            <Ionicons name="cloud-upload-outline" size={24} color="#ffffff" style={{ marginRight: 8 }} />
                            <Text style={styles.uploadButtonText}>Upload QR Code</Text>
                        </TouchableOpacity>
                    </View>
                )}

                <View style={[styles.safetyNote, { backgroundColor: colors.primary + '10' }]}>
                    <Ionicons name="shield-checkmark" size={24} color={colors.primary} />
                    <View style={styles.safetyTextContainer}>
                        <Text style={[styles.safetyTitle, { color: colors.primary }]}>Privacy First</Text>
                        <Text style={[styles.safetyDesc, { color: colors.text + 'CC' }]}>
                            Your QR code is stored only on this device and is never uploaded to our servers.
                        </Text>
                    </View>
                </View>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        padding: 40,
        alignItems: 'center',
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
    },
    headerIcon: {
        marginBottom: 16,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#ffffff',
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.8)',
        textAlign: 'center',
        marginTop: 8,
    },
    content: {
        padding: 20,
        marginTop: -20,
    },
    qrContainer: {
        borderRadius: 24,
        padding: 20,
        alignItems: 'center',
        borderWidth: 1,
        elevation: 4,
        ...(Platform.OS === 'web' ? { boxShadow: '0px 10px 30px rgba(0,0,0,0.1)' } : {}),
    },
    qrImage: {
        width: '100%',
        height: 300,
        borderRadius: 12,
        backgroundColor: '#ffffff',
    },
    infoBox: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 20,
        paddingHorizontal: 12,
    },
    infoText: {
        fontSize: 13,
        marginLeft: 8,
        flex: 1,
        lineHeight: 18,
    },
    changeButton: {
        marginTop: 24,
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 12,
        borderWidth: 2,
    },
    changeButtonText: {
        fontWeight: 'bold',
        fontSize: 16,
    },
    clearButton: {
        marginTop: 16,
    },
    clearButtonText: {
        color: '#ff6b6b',
        fontSize: 14,
    },
    emptyContainer: {
        borderRadius: 24,
        padding: 40,
        alignItems: 'center',
        borderWidth: 1,
        borderStyle: 'dashed',
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginTop: 16,
    },
    emptyDesc: {
        fontSize: 14,
        textAlign: 'center',
        marginTop: 8,
        lineHeight: 20,
        marginBottom: 24,
    },
    uploadButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 28,
        borderRadius: 16,
    },
    uploadButtonText: {
        color: '#ffffff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    safetyNote: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 30,
        padding: 20,
        borderRadius: 16,
    },
    safetyTextContainer: {
        marginLeft: 16,
        flex: 1,
    },
    safetyTitle: {
        fontWeight: 'bold',
        fontSize: 16,
    },
    safetyDesc: {
        fontSize: 12,
        marginTop: 2,
    },
});
