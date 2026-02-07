import { useAppStore } from '../store';

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

export interface ChatMessage {
    role: 'user' | 'model';
    parts: (
        | { text: string }
        | { inlineData: { mimeType: string; data: string } }
    )[];
}

export const isGeminiConfigured = () => {
    return !!GEMINI_API_KEY && GEMINI_API_KEY !== 'paste_your_key_here';
};

export const sendMessageToGemini = async (messages: ChatMessage[]) => {
    const customAiUrl = useAppStore.getState().customAiUrl;

    // 1. Check for Custom/Local URL override
    if (customAiUrl) {
        console.log('Using Custom AI URL:', customAiUrl);
        try {
            // Assume OpenAI-compatible format or adjust as needed. 
            // For simplicity, we'll try to send a similar payload or standard OpenAI chat completion if it looks like one.
            // If the user is using Ollama, they likely need the /api/generate or /v1/chat/completions endpoint.
            // We'll assume the user provides the FULL endpoint URL.

            const response = await fetch(customAiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'llama3', // Default attempt, user might need to config this too but start simple
                    messages: messages.map(m => ({
                        role: m.role === 'model' ? 'assistant' : 'user',
                        content: (m.parts.find((p: any) => p.text) as any)?.text || '[Image]' // Simplify multiparts for basic local LLMs for now
                    })),
                    stream: false
                })
            });

            if (!response.ok) throw new Error(`Custom API Status: ${response.status}`);

            const data = await response.json();
            // Handle OpenAI style response
            if (data.choices && data.choices[0] && data.choices[0].message) {
                return data.choices[0].message.content;
            }
            // Handle Ollama /api/generate style
            if (data.response) {
                return data.response;
            }

            return JSON.stringify(data); // Fallback

        } catch (e) {
            console.error('Custom AI URL failed:', e);
            return `Custom AI Error: ${e instanceof Error ? e.message : 'Unknown error'}. Switching to Offline Mode... \n\n` + generateMockResponse(messages);
        }
    }

    // 2. Mock Mode / Gemini Check
    if (!GEMINI_API_KEY || GEMINI_API_KEY === 'paste_your_key_here') {
        console.log('Gemini API Key missing - Using Mock AI Mode');
        return generateMockResponse(messages);
    }

    try {
        const API_URL = `${BASE_URL}?key=${GEMINI_API_KEY}`;
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: messages,
            }),
        });

        const data = await response.json();

        if (data.error) {
            console.warn('Gemini API Error (Falling back to mock):', data.error);
            return generateMockResponse(messages);
        }

        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
            console.warn('Gemini blocked response (Falling back to mock)');
            return generateMockResponse(messages);
        }

        return data.candidates[0].content.parts[0].text;
    } catch (error) {
        console.error('Network Error (Falling back to mock):', error);
        return generateMockResponse(messages);
    }
};

// Simple Mock AI for demo purposes
function generateMockResponse(messages: ChatMessage[]): string {
    const textPart = messages[messages.length - 1].parts.find(p => 'text' in p) as { text: string } | undefined;
    const lastUserMessage = textPart?.text || '';
    const lastUserImage = messages[messages.length - 1].parts.find(p => 'inlineData' in p);
    const lowerMsg = lastUserMessage.toLowerCase();

    // Simulate "thinking" delay
    // Note: Since this is async in the main function, we don't need to delay here, 
    // but the UI shows a loader which is nice.

    if (lastUserImage) {
        return "I see you've sent a photo! detailed analysis requires the full online AI, but based on visual checks:\n\n1. Check for visible wear or rust.\n2. Ensure all bolts are tight.\n3. If this is a tire, check the tread depth.\n\nLooks like a standard component. Is there a specific issue you are facing with it?";
    }

    if (lowerMsg.includes('hello') || lowerMsg.includes('hi ')) {
        return "Hello! I'm running in offline demo mode. How can I help with your bike today?";
    }

    if (lowerMsg.includes('oil') || lowerMsg.includes('service')) {
        return "For oil changes, it's generally recommended every 3000-5000km. Check your oil level via the dipstick or sight glass. Make sure the engine is warm but stopped.";
    }

    if (lowerMsg.includes('tire') || lowerMsg.includes('pressure')) {
        return "Tire pressure is critical. For most street bikes, 29-32 PSI front and 32-36 PSI rear is standard, but ALWAYS check your swingarm sticker for the exact specs.";
    }

    if (lowerMsg.includes('brake') || lowerMsg.includes('noise')) {
        return "Brake noise often means worn pads or dust. usage. If it's a grinding sound, stop riding immediately and check your pads.";
    }

    if (lowerMsg.includes('chain')) {
        return "Clean and lube your chain every 500km. Check for about 20-30mm of slack at the midpoint.";
    }

    return "I'm currently in offline mode, so my knowledge is limited. \n\nI can help with general advice on:\n- Oil changes\n- Tires\n- Brakes\n- Chain maintenance\n\nPlease check your internet or API key for full AI features.";
}
