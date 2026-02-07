import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    FlatList,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    Image,
    Alert
} from 'react-native';
import { useTheme } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore, useBikeStore, useAppStore } from '../../store';
import { sendMessageToAI, ChatMessage, isOnlineServiceConfigured } from '../../ai/aiService';
import * as ImagePicker from 'expo-image-picker';

interface Message {
    id: string;
    text: string;
    imageUri?: string;
    sender: 'user' | 'ai';
    timestamp: Date;
}

export default function ChatScreen() {
    const { colors } = useTheme();
    const { user } = useAuthStore();
    const { primaryBike } = useBikeStore();
    const { aiProvider, customAiUrl } = useAppStore();

    const isOnline = isOnlineServiceConfigured();

    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            text: isOnline
                ? `Hello ${user?.fullName?.split(' ')[0] || 'Rider'}! I'm your Vec-Doc assistant.\n\nI can help you with maintenance advice, diagnosing issues, or finding parts for your ${primaryBike()?.model || 'bike'}.`
                : `Hello ${user?.fullName?.split(' ')[0] || 'Rider'}! I'm in ${aiProvider === 'mock' ? 'Offline' : aiProvider} Mode.\n\nI can help with general maintenance tips (Oil, Tires, Chain, Brakes) without an internet connection.`,
            sender: 'ai',
            timestamp: new Date(),
        }
    ]);
    const [inputText, setInputText] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const flatListRef = useRef<FlatList>(null);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [imageBase64, setImageBase64] = useState<string | null>(null);

    const pickImage = async () => {
        // Request permissions
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission needed', 'Sorry, we need camera roll permissions to make this work!');
            return;
        }

        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.5,
            base64: true,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            setSelectedImage(result.assets[0].uri);
            setImageBase64(result.assets[0].base64 || null);
        }
    };

    const handleSend = async () => {
        if (!inputText.trim() && !selectedImage) return;

        const userText = inputText.trim();
        const userMessage: Message = {
            id: Date.now().toString(),
            text: userText,
            imageUri: selectedImage || undefined,
            sender: 'user',
            timestamp: new Date(),
        };

        setMessages(prev => [...prev, userMessage]);
        setInputText('');
        setSelectedImage(null);
        const currentBase64 = imageBase64;
        setImageBase64(null);
        setIsTyping(true);

        try {
            // Construct context from bike profile
            const bike = primaryBike();
            const bikeContext = bike
                ? `The user is riding a ${bike.year} ${bike.brand} ${bike.model}. Mileage: ${bike.currentOdometerKm}km.`
                : "The user has not selected a primary bike yet.";

            // Prepare messages for AI
            const userParts: any[] = [];
            if (userText) userParts.push({ text: userText });
            if (currentBase64) {
                userParts.push({
                    inlineData: {
                        mimeType: 'image/jpeg',
                        data: currentBase64
                    }
                });
            }

            // System prompt
            const apiMessages: ChatMessage[] = [
                {
                    role: 'user',
                    parts: [{ text: `System Context: You are 'Vec-Doc', an expert motorcycle mechanic assistant. ${bikeContext} Answer questions concisely and provide practical maintenance advice. If an image is provided, analyze the part or issue visible in it. Do not hallucinate.` }]
                },
                ...messages.map(m => ({
                    role: m.sender === 'user' ? 'user' : 'model',
                    parts: [{ text: m.text }]
                } as ChatMessage)),
                {
                    role: 'user',
                    parts: userParts
                }
            ];

            const responseText = await sendMessageToAI(apiMessages);

            const aiResponse: Message = {
                id: (Date.now() + 1).toString(),
                text: responseText,
                sender: 'ai',
                timestamp: new Date(),
            };
            setMessages(prev => [...prev, aiResponse]);
        } catch (error) {
            const errorResponse: Message = {
                id: (Date.now() + 1).toString(),
                text: "Sorry, I'm having trouble determining that right now.",
                sender: 'ai',
                timestamp: new Date(),
            };
            setMessages(prev => [...prev, errorResponse]);
        } finally {
            setIsTyping(false);
        }
    };

    useEffect(() => {
        // Scroll to bottom when messages change
        setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
    }, [messages]);

    const renderMessage = ({ item }: { item: Message }) => {
        const isUser = item.sender === 'user';
        return (
            <View style={[
                styles.messageContainer,
                isUser ? styles.userMessageContainer : styles.aiMessageContainer
            ]}>
                {!isUser && (
                    <View style={[styles.avatarContainer, { backgroundColor: colors.primary }]}>
                        <Ionicons name={isOnline ? "sparkles-outline" : "hardware-chip-outline"} size={16} color="#fff" />
                    </View>
                )}
                <View style={[
                    styles.bubble,
                    isUser
                        ? [styles.userBubble, { backgroundColor: colors.primary }]
                        : [styles.aiBubble, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]
                ]}>
                    {item.imageUri && (
                        <Image
                            source={{ uri: item.imageUri }}
                            style={{ width: 200, height: 200, borderRadius: 8, marginBottom: 8 }}
                        />
                    )}
                    {item.text ? (
                        <Text style={[
                            styles.messageText,
                            isUser ? { color: '#ffffff' } : { color: colors.text }
                        ]}>
                            {item.text}
                        </Text>
                    ) : null}
                    <Text style={[
                        styles.timestamp,
                        isUser ? { color: 'rgba(255,255,255,0.7)' } : { color: colors.text, opacity: 0.5 }
                    ]}>
                        {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                </View>
            </View>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
                <View style={styles.headerContent}>
                    <View style={[styles.headerIconContainer, { backgroundColor: colors.primary + '20' }]}>
                        <Ionicons name={isOnline ? "happy" : "construct"} size={24} color={colors.primary} />
                    </View>
                    <View>
                        <Text style={[styles.headerTitle, { color: colors.text }]}>Assistant</Text>
                        <Text style={[styles.headerSubtitle, { color: colors.text, opacity: 0.7 }]}>
                            {isTyping ? 'Thinking...' : (isOnline ? `Online (${aiProvider})` : 'Offline Mode')}
                        </Text>
                    </View>
                </View>
            </View>

            {/* Chat Area */}
            <FlatList
                ref={flatListRef}
                data={messages}
                renderItem={renderMessage}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
            />

            {/* Input Area */}
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
            >
                {selectedImage && (
                    <View style={[styles.previewContainer, { backgroundColor: colors.card }]}>
                        <Image source={{ uri: selectedImage }} style={styles.previewImage} />
                        <TouchableOpacity
                            style={styles.removePreview}
                            onPress={() => { setSelectedImage(null); setImageBase64(null); }}
                        >
                            <Ionicons name="close-circle" size={24} color={colors.notification} />
                        </TouchableOpacity>
                    </View>
                )}
                <View style={[styles.inputContainer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
                    <TouchableOpacity style={styles.attachButton} onPress={pickImage}>
                        <Ionicons name="camera-outline" size={24} color={colors.primary} />
                    </TouchableOpacity>

                    <View style={[styles.textInputWrapper, { backgroundColor: colors.background }]}>
                        <TextInput
                            style={[styles.textInput, { color: colors.text }]}
                            placeholder="Ask or send a photo..."
                            placeholderTextColor={colors.text + '80'}
                            value={inputText}
                            onChangeText={setInputText}
                            multiline
                        />
                    </View>

                    <TouchableOpacity
                        style={[
                            styles.sendButton,
                            { backgroundColor: (inputText.trim() || selectedImage) ? colors.primary : colors.border }
                        ]}
                        onPress={handleSend}
                        disabled={!inputText.trim() && !selectedImage}
                    >
                        <Ionicons name="arrow-up" size={24} color="#ffffff" />
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingTop: 60,
        paddingBottom: 16,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    headerSubtitle: {
        fontSize: 12,
    },
    listContent: {
        padding: 20,
        paddingBottom: 10,
    },
    messageContainer: {
        marginBottom: 16,
        flexDirection: 'row',
        alignItems: 'flex-end',
    },
    userMessageContainer: {
        justifyContent: 'flex-end',
    },
    aiMessageContainer: {
        justifyContent: 'flex-start',
    },
    avatarContainer: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8,
        marginBottom: 4,
    },
    bubble: {
        maxWidth: '80%',
        padding: 12,
        borderRadius: 20,
    },
    userBubble: {
        borderBottomRightRadius: 4,
    },
    aiBubble: {
        borderBottomLeftRadius: 4,
    },
    messageText: {
        fontSize: 15,
        lineHeight: 22,
    },
    timestamp: {
        fontSize: 10,
        alignSelf: 'flex-end',
        marginTop: 4,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        padding: 12,
        borderTopWidth: 1,
    },
    attachButton: {
        padding: 10,
        marginRight: 8,
    },
    textInputWrapper: {
        flex: 1,
        borderRadius: 24,
        minHeight: 48,
        maxHeight: 120,
        justifyContent: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    textInput: {
        fontSize: 16,
    },
    sendButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 8,
    },
    previewContainer: {
        padding: 10,
        flexDirection: 'row',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#eee',
    },
    previewImage: {
        width: 60,
        height: 60,
        borderRadius: 8,
    },
    removePreview: {
        marginLeft: 10,
    },
});
