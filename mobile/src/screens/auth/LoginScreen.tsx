import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    ActivityIndicator,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { useNavigation, useTheme } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuthStore } from '../../store';
import { AuthStackParamList } from '../../navigation';

type LoginNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

export default function LoginScreen() {
    const navigation = useNavigation<LoginNavigationProp>();
    const { login, isLoading } = useAuthStore();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const validateEmail = (email: string) => {
        return /\S+@\S+\.\S+/.test(email);
    };
    
    const handleLogin = async () => {
        if (!email.trim() || !password.trim()) {
            Toast.show({
                type: 'error',
                text1: 'Validation Error',
                text2: 'Please enter both email and password'
            });
            return;
        }

        if (!validateEmail(email.trim())) {
            Toast.show({
                type: 'error',
                text1: 'Invalid Email',
                text2: 'Please enter a valid email address'
            });
            return;
        }

        setLoading(true);
        try {
            await login(email, password);
            Toast.show({
                type: 'success',
                text1: 'Success',
                text2: 'Logged in successfully!'
            });
            // Navigation is handled automatically by auth state change
        } catch (error: any) {
            Toast.show({
                type: 'error',
                text1: 'Login Failed',
                text2: error.message || 'Invalid email or password'
            });
        } finally {
            setLoading(false);
        }
    };

    const { colors } = useTheme(); // Note: must import useTheme

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={[styles.container, { backgroundColor: colors.background }]}
        >
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
            >
                {/* Logo Area */}
                <View style={styles.logoContainer}>
                    <Text style={styles.logoText}>🏍️</Text>
                    <Text style={[styles.appName, { color: colors.text }]}>Vec-Doc</Text>
                    <Text style={[styles.tagline, { color: colors.text, opacity: 0.7 }]}>Your bike's digital companion</Text>
                    <Text style={styles.localBadge}>📱 Works offline</Text>
                </View>

                {/* Login Form */}
                <View style={[styles.formContainer, { backgroundColor: colors.card }]}>
                    <Text style={[styles.title, { color: colors.text }]}>Welcome Back</Text>

                    <View style={styles.inputContainer}>
                        <Text style={[styles.label, { color: colors.text, opacity: 0.7 }]}>Email</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                            placeholder="Enter your email"
                            placeholderTextColor={colors.text + '80'}
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoComplete="email"
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={[styles.label, { color: colors.text, opacity: 0.7 }]}>Password</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                            placeholder="Enter your password"
                            placeholderTextColor={colors.text + '80'}
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                            autoComplete="password"
                        />
                    </View>

                    <TouchableOpacity
                        style={[styles.loginButton, { backgroundColor: colors.primary }, (loading || isLoading) && styles.loginButtonDisabled]}
                        onPress={handleLogin}
                        disabled={loading || isLoading}
                    >
                        {(loading || isLoading) ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.loginButtonText}>Sign In</Text>
                        )}
                    </TouchableOpacity>

                    {/* Divider */}
                    <View style={styles.divider}>
                        <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                        <Text style={[styles.dividerText, { color: colors.text, opacity: 0.5 }]}>OR</Text>
                        <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                    </View>

                    {/* Register Link */}
                    <View style={styles.registerContainer}>
                        <Text style={[styles.registerText, { color: colors.text, opacity: 0.7 }]}>Don't have an account? </Text>
                        <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                            <Text style={[styles.registerLink, { color: colors.primary }]}>Sign Up</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 24,
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 40,
    },
    logoText: {
        fontSize: 64,
        marginBottom: 8,
    },
    appName: {
        fontSize: 36,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    tagline: {
        fontSize: 14,
        marginTop: 4,
    },
    localBadge: {
        fontSize: 12,
        color: '#51cf66',
        marginTop: 8,
        backgroundColor: 'rgba(81, 207, 102, 0.1)',
        paddingVertical: 4,
        paddingHorizontal: 12,
        borderRadius: 12,
    },
    formContainer: {
        borderRadius: 20,
        padding: 24,
        elevation: 5,
        ...(Platform.OS === 'web' 
            ? { boxShadow: '0px 4px 6px rgba(0,0,0,0.1)' } 
            : {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 6,
            }
        ),
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 24,
        textAlign: 'center',
    },
    inputContainer: {
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 8,
    },
    input: {
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        borderWidth: 1,
    },
    loginButton: {
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        marginTop: 8,
        elevation: 5,
        ...(Platform.OS === 'web' 
            ? { boxShadow: '0px 4px 8px rgba(76, 110, 245, 0.3)' } 
            : {
                shadowColor: '#4c6ef5',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
            }
        ),
    },
    loginButtonDisabled: {
        opacity: 0.7,
    },
    loginButtonText: {
        color: '#ffffff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 24,
    },
    dividerLine: {
        flex: 1,
        height: 1,
    },
    dividerText: {
        paddingHorizontal: 16,
        fontSize: 14,
    },
    registerContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
    },
    registerText: {
        fontSize: 14,
    },
    registerLink: {
        fontSize: 14,
        fontWeight: '600',
    },
});
