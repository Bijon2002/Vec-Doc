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
    ImageBackground,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { useTheme } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore, useBikeStore, useAppStore } from '../../store';
import { ChatMessage } from '../../ai/aiService';
import * as ImagePicker from 'expo-image-picker';
import { aiApi } from '../../api/client';
import { Audio } from 'expo-av';

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
    const { aiProvider } = useAppStore();

    const isOnline = true; // Forcing true as we now use our backend proxy

    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            text: `Hello ${user?.fullName?.split(' ')[0] || 'Rider'}! I'm your Vec-Doc assistant.\n\nI can help you with maintenance advice, diagnosing issues, or finding parts for your ${primaryBike()?.model || 'bike'}.\n\n⚠️ **Global Update**: I can now also provide real-time alerts on the global petrol situation and help you save fuel during this crisis.`,
            sender: 'ai',
            timestamp: new Date(),
        }
    ]);
    const [inputText, setInputText] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [isPlaying, setIsPlaying] = useState<string | null>(null);
    const flatListRef = useRef<FlatList>(null);
    const soundRef = useRef<Audio.Sound | null>(null);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [imageBase64, setImageBase64] = useState<string | null>(null);

    const pickImage = async () => {
        // Request permissions
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Toast.show({
                type: 'error',
                text1: 'Permission Denied',
                text2: 'Sorry, we need camera roll permissions to make this work!'
            });
            return;
        }

        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: 'images',
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

            // Use our new backend AI API
            const response = await aiApi.chat(userText, bikeContext);
            const responseText = response.data.response;

            const aiResponse: Message = {
                id: (Date.now() + 1).toString(),
                text: responseText,
                sender: 'ai',
                timestamp: new Date(),
            };
            setMessages(prev => [...prev, aiResponse]);
        } catch (error) {
            console.error('Chat Error:', error);
            const errorResponse: Message = {
                id: (Date.now() + 1).toString(),
                text: "Sorry, I'm having trouble connecting to my service right now.",
                sender: 'ai',
                timestamp: new Date(),
            };
            setMessages(prev => [...prev, errorResponse]);
        } finally {
            setIsTyping(false);
        }
    };

    const playVoice = async (text: string, messageId: string) => {
        try {
            if (isPlaying === messageId) {
                await soundRef.current?.stopAsync();
                setIsPlaying(null);
                return;
            }

            setIsPlaying(messageId);
            const response = await aiApi.generateVoice(text);
            const base64 = response.data.audio;

            if (!base64) throw new Error('No audio generated');

            // Cleanup previous sound
            if (soundRef.current) {
                await soundRef.current.unloadAsync();
            }

            const { sound } = await Audio.Sound.createAsync(
                { uri: `data:audio/mp3;base64,${base64}` },
                { shouldPlay: true }
            );
            
            soundRef.current = sound;
            
            sound.setOnPlaybackStatusUpdate((status) => {
                if (status.isLoaded && status.didJustFinish) {
                    setIsPlaying(null);
                }
            });
        } catch (error) {
            console.error('Voice Play Error:', error);
            setIsPlaying(null);
            Toast.show({
                type: 'error',
                text1: 'Audio Error',
                text2: 'Could not play voice response.'
            });
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
                        : [styles.aiBubble, { backgroundColor: colors.card + 'E6', borderColor: colors.border, borderWidth: 1 }]
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
                    <View style={styles.bubbleFooter}>
                        <Text style={[
                            styles.timestamp,
                            isUser ? { color: 'rgba(255,255,255,0.7)' } : { color: colors.text, opacity: 0.5 }
                        ]}>
                            {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                        {!isUser && (
                            <TouchableOpacity 
                                onPress={() => playVoice(item.text, item.id)}
                                style={styles.voiceButton}
                            >
                                <Ionicons 
                                    name={isPlaying === item.id ? "stop-circle-outline" : "volume-medium-outline"} 
                                    size={18} 
                                    color={colors.primary} 
                                />
                            </TouchableOpacity>
                        )}
                    </View>
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
            <ImageBackground 
                source={require('../../../assets/premium_bg.png')} 
                style={styles.chatBackground}
                imageStyle={styles.chatBackgroundImage}
            >
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    renderItem={renderMessage}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                />
            </ImageBackground>

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
        ...(Platform.OS === 'web' 
            ? { boxShadow: '0px 2px 2px rgba(0,0,0,0.05)' } 
            : {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 2,
            }
        ),
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
    chatBackground: {
        flex: 1,
    },
    chatBackgroundImage: {
        opacity: 0.15,
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
    },
    bubbleFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 4,
    },
    voiceButton: {
        marginLeft: 8,
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
