import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Switch,
    TouchableOpacity,
    Alert,
    ScrollView,
    ActivityIndicator,
    TextInput,
} from 'react-native';
import { useNavigation, useTheme } from '@react-navigation/native';
import * as Location from 'expo-location';
import { useAppStore } from '../../store';
import { NotificationService } from '../../services/notificationService';

export default function SettingsScreen() {
    const navigation = useNavigation();
    const { colors } = useTheme();
    const {
        theme, setTheme,
        notificationsEnabled, setNotificationsEnabled,
        homeLocation, setHomeLocation
    } = useAppStore();

    const [locationLoading, setLocationLoading] = useState(false);

    const toggleNotifications = async (value: boolean) => {
        if (value) {
            const permission = await NotificationService.registerForPushNotificationsAsync();
            if (permission) {
                setNotificationsEnabled(true);
                Alert.alert('Notifications Enabled', 'You will now receive reminders for documents and maintenance.');
            } else {
                Alert.alert('Permission Denied', 'Could not enable notifications. Please check your system settings.');
                setNotificationsEnabled(false);
            }
        } else {
            setNotificationsEnabled(false);
            await NotificationService.cancelAllNotifications();
        }
    };

    const handleSetHomeLocation = async () => {
        setLocationLoading(true);
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Permission to access location was denied');
                return;
            }

            const location = await Location.getCurrentPositionAsync({});
            setHomeLocation({
                lat: location.coords.latitude,
                lng: location.coords.longitude,
                address: `Lat: ${location.coords.latitude.toFixed(4)}, Lng: ${location.coords.longitude.toFixed(4)}`
            });
            Alert.alert('Success', 'Home location updated!');
        } catch (error) {
            Alert.alert('Error', 'Failed to get current location');
        } finally {
            setLocationLoading(false);
        }
    };

    const handleClearHomeLocation = () => {
        setHomeLocation(null);
    };

    return (
        <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.header, { backgroundColor: colors.card }]}>
                <Text style={[styles.title, { color: colors.text }]}>Settings</Text>
            </View>

            <View style={[styles.section, { borderBottomColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.primary }]}>Appearance</Text>
                <View style={styles.settingRow}>
                    <Text style={[styles.settingLabel, { color: colors.text }]}>Theme</Text>
                    <View style={[styles.themeSelector, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        {(['light', 'dark', 'system'] as const).map((t) => (
                            <TouchableOpacity
                                key={t}
                                style={[
                                    styles.themeButton,
                                    theme === t && styles.themeButtonActive,
                                    { backgroundColor: theme === t ? colors.primary : 'transparent' }
                                ]}
                                onPress={() => setTheme(t)}
                            >
                                <Text style={[
                                    styles.themeButtonText,
                                    theme === t ? styles.themeButtonTextActive : { color: colors.text },
                                    theme === t && { color: '#ffffff' }
                                ]}>
                                    {t.charAt(0).toUpperCase() + t.slice(1)}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </View>

            <View style={[styles.section, { borderBottomColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.primary }]}>Notifications</Text>
                <View style={styles.settingRow}>
                    <View>
                        <Text style={[styles.settingLabel, { color: colors.text }]}>Enable Reminders</Text>
                        <Text style={[styles.settingDescription, { color: colors.text }]}>
                            Get alerts for document expiry and service due
                        </Text>
                    </View>
                    <Switch
                        value={notificationsEnabled}
                        onValueChange={toggleNotifications}
                        trackColor={{ false: '#767577', true: colors.primary }}
                        thumbColor={notificationsEnabled ? '#ffffff' : '#f4f3f4'}
                    />
                </View>
            </View>

            <View style={[styles.section, { borderBottomColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.primary }]}>Location</Text>
                <View style={styles.locationContainer}>
                    <Text style={[styles.settingLabel, { color: colors.text }]}>Home Location</Text>
                    <Text style={[styles.settingDescription, { color: colors.text }]}>
                        Used to calculate distance from home
                    </Text>

                    {homeLocation ? (
                        <View style={[styles.locationCard, { backgroundColor: colors.primary + '20' }]}>
                            <Text style={styles.locationIcon}>📍</Text>
                            <Text style={[styles.locationText, { color: colors.text }]}>{homeLocation.address}</Text>
                            <TouchableOpacity
                                style={styles.clearButton}
                                onPress={handleClearHomeLocation}
                            >
                                <Text style={styles.clearButtonText}>✕</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <Text style={[styles.noLocationText, { color: colors.text }]}>No home location set</Text>
                    )}

                    <TouchableOpacity
                        style={[styles.setHomeButton, { backgroundColor: colors.card, borderColor: colors.primary }]}
                        onPress={handleSetHomeLocation}
                        disabled={locationLoading}
                    >
                        {locationLoading ? (
                            <ActivityIndicator color={colors.primary} size="small" />
                        ) : (
                            <Text style={[styles.setHomeButtonText, { color: colors.primary }]}>
                                {homeLocation ? 'Update Home Location' : 'Set Current Location as Home'}
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>

            <View style={[styles.section, { borderBottomColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.primary }]}>Support & Legal</Text>
                <TouchableOpacity style={styles.settingRow} onPress={() => (navigation as any).navigate('HelpSupport')}>
                    <Text style={[styles.settingLabel, { color: colors.text }]}>Help & Support</Text>
                    <Text style={[styles.settingDescription, { color: colors.text }]}>FAQ and Contact</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.settingRow} onPress={() => (navigation as any).navigate('PrivacyPolicy')}>
                    <Text style={[styles.settingLabel, { color: colors.text }]}>Privacy Policy</Text>
                    <Text style={[styles.settingDescription, { color: colors.text }]}>Read our terms</Text>
                </TouchableOpacity>
            </View>

            <View style={[styles.section, { borderBottomColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.primary }]}>AI Settings</Text>

                <View style={styles.settingRow}>
                    <Text style={[styles.settingLabel, { color: colors.text }]}>AI Provider</Text>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.providerSelector}>
                    {(['gemini', 'huggingface', 'custom', 'mock'] as const).map((p) => (
                        <TouchableOpacity
                            key={p}
                            style={[
                                styles.providerButton,
                                useAppStore.getState().aiProvider === p && styles.providerButtonActive,
                                {
                                    backgroundColor: useAppStore.getState().aiProvider === p ? colors.primary : colors.card,
                                    borderColor: colors.border
                                }
                            ]}
                            onPress={() => useAppStore.getState().setAiProvider(p)}
                        >
                            <Text style={[
                                styles.providerButtonText,
                                useAppStore.getState().aiProvider === p ? styles.providerButtonTextActive : { color: colors.text }
                            ]}>
                                {p === 'huggingface' ? 'Hugging Face' : p.charAt(0).toUpperCase() + p.slice(1)}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {useAppStore.getState().aiProvider === 'custom' && (
                    <View style={styles.configContainer}>
                        <Text style={[styles.subLabel, { color: colors.text }]}>Custom AI URL</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                            placeholder="http://192.168.1.5:11434/api/generate"
                            placeholderTextColor={colors.text + '80'}
                            value={useAppStore.getState().customAiUrl || ''}
                            onChangeText={(text) => useAppStore.getState().setCustomAiUrl(text || null)}
                            autoCapitalize="none"
                        />
                        <Text style={[styles.settingDescription, { color: colors.text }]}>e.g. for Ollama local server</Text>
                    </View>
                )}

                {useAppStore.getState().aiProvider === 'huggingface' && (
                    <View style={styles.configContainer}>
                        <Text style={[styles.subLabel, { color: colors.text }]}>Hugging Face API Key</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                            placeholder="hf_..."
                            placeholderTextColor={colors.text + '80'}
                            value={useAppStore.getState().huggingFaceApiKey || ''}
                            onChangeText={(text) => useAppStore.getState().setHuggingFaceApiKey(text || null)}
                            secureTextEntry
                            autoCapitalize="none"
                        />
                        <Text style={[styles.settingDescription, { color: colors.text }]}>Free tier available at sections.hf.co</Text>
                    </View>
                )}

                {useAppStore.getState().aiProvider === 'gemini' && (
                    <Text style={[styles.settingDescription, { color: colors.text, marginTop: 8 }]}>
                        Using embedded Gemini Flash API (Free Tier)
                    </Text>
                )}

                {useAppStore.getState().aiProvider === 'mock' && (
                    <Text style={[styles.settingDescription, { color: colors.text, marginTop: 8 }]}>
                        Using offline mock responses (No internet needed)
                    </Text>
                )}
            </View>

            <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.primary }]}>About</Text>
                <View style={styles.settingRow}>
                    <Text style={[styles.settingLabel, { color: colors.text }]}>Version</Text>
                    <Text style={[styles.versionText, { color: colors.text }]}>1.0.0 (Local-First)</Text>
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
        padding: 24,
        paddingTop: 60,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
    },
    section: {
        padding: 24,
        borderBottomWidth: 1,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 16,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    settingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    settingLabel: {
        fontSize: 16,
        fontWeight: '500',
    },
    settingDescription: {
        fontSize: 12,
        marginTop: 4,
        maxWidth: 250,
    },
    themeSelector: {
        flexDirection: 'row',
        borderRadius: 8,
        borderWidth: 1,
        padding: 2,
    },
    themeButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
    },
    themeButtonActive: {
        backgroundColor: '#4c6ef5',
    },
    themeButtonText: {
        fontSize: 12,
    },
    themeButtonTextActive: {
        color: '#ffffff',
        fontWeight: '600',
    },
    locationContainer: {
        marginTop: 8,
    },
    locationCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        marginTop: 12,
    },
    locationIcon: {
        fontSize: 18,
        marginRight: 12,
    },
    locationText: {
        flex: 1,
        fontSize: 14,
    },
    clearButton: {
        padding: 8,
    },
    clearButtonText: {
        color: '#adb5bd',
        fontSize: 14,
    },
    noLocationText: {
        fontStyle: 'italic',
        marginTop: 12,
        marginBottom: 4,
    },
    setHomeButton: {
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        marginTop: 16,
        borderWidth: 1,
        borderColor: '#4c6ef5',
    },
    setHomeButtonText: {
        color: '#4c6ef5',
        fontWeight: 'bold',
        fontSize: 14,
    },
    versionText: {
        fontSize: 14,
    },
    input: {
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        marginTop: 4,
    },
    providerSelector: {
        flexDirection: 'row',
        marginBottom: 16,
    },
    providerButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        marginRight: 8,
    },
    providerButtonActive: {
        borderWidth: 0,
    },
    providerButtonText: {
        fontSize: 14,
        fontWeight: '500',
    },
    providerButtonTextActive: {
        color: '#ffffff',
        fontWeight: 'bold',
    },
    configContainer: {
        marginTop: 8,
    },
    subLabel: {
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 4,
    },
});
