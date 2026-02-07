
import { useAppStore } from '../store';

// Configuration
const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

const HF_MODEL = 'mistralai/Mistral-7B-Instruct-v0.2'; // Good free tier model
const HF_BASE_URL = `https://api-inference.huggingface.co/models/${HF_MODEL}`;

export interface ChatMessage {
    role: 'user' | 'model';
    parts: (
        | { text: string }
        | { inlineData: { mimeType: string; data: string } }
    )[];
}

// Helper to format messages for Hugging Face (Mistral format)
const formatForHuggingFace = (messages: ChatMessage[]) => {
    // Mistral format: <s>[INST] Instruction [/INST] Model answer</s>[INST] Follow-up [/INST]
    let formatted = '<s>';
    messages.forEach(msg => {
        const textPart = msg.parts.find(p => 'text' in p) as { text: string } | undefined;
        const text = textPart?.text || '';
        if (msg.role === 'user') {
            formatted += `[INST] ${text} [/INST]`;
        } else {
            formatted += ` ${text}</s>`;
        }
    });
    return formatted;
};

// Helper to check if online services are configured
export const isOnlineServiceConfigured = () => {
    const { aiProvider, customAiUrl, huggingFaceApiKey } = useAppStore.getState();

    if (aiProvider === 'gemini') return !!GEMINI_API_KEY && GEMINI_API_KEY !== 'paste_your_key_here';
    if (aiProvider === 'huggingface') return !!huggingFaceApiKey;
    if (aiProvider === 'custom') return !!customAiUrl;

    return false; // Mock mode
};

export const sendMessageToAI = async (messages: ChatMessage[]) => {
    const { aiProvider, customAiUrl, huggingFaceApiKey } = useAppStore.getState();

    console.log(`Sending message via provider: ${aiProvider}`);

    try {
        // 1. Mock Mode
        if (aiProvider === 'mock') {
            return generateMockResponse(messages);
        }

        // 2. Custom Provider (Ollama/Local)
        if (aiProvider === 'custom' && customAiUrl) {
            return await sendToCustomProvider(customAiUrl, messages);
        }

        // 3. Hugging Face
        if (aiProvider === 'huggingface' && huggingFaceApiKey) {
            return await sendToHuggingFace(huggingFaceApiKey, messages);
        }

        // 4. Gemini (Default)
        if (aiProvider === 'gemini' && GEMINI_API_KEY && GEMINI_API_KEY !== 'paste_your_key_here') {
            return await sendToGemini(GEMINI_API_KEY, messages);
        }

        // Fallback if configured provider is missing credentials
        console.warn(`Provider ${aiProvider} not configured correctly. Falling back to Mock.`);
        return generateMockResponse(messages);

    } catch (error) {
        console.error('AI Service Error:', error);
        return `Error connecting to ${aiProvider}. \n\nVerify your settings or internet connection.\n\nFalling back to offline mode for now... \n\n` + generateMockResponse(messages);
    }
};

// --- Providers ---

const sendToGemini = async (apiKey: string, messages: ChatMessage[]) => {
    const response = await fetch(`${GEMINI_BASE_URL}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: messages }),
    });

    const data = await response.json();

    if (data.error) throw new Error(data.error.message || 'Gemini API Error');
    if (!data.candidates?.[0]?.content) throw new Error('Blocked or Empty Response from Gemini');

    return data.candidates[0].content.parts[0].text;
};

const sendToHuggingFace = async (apiKey: string, messages: ChatMessage[]) => {
    const prompt = formatForHuggingFace(messages);

    const response = await fetch(HF_BASE_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            inputs: prompt,
            parameters: {
                max_new_tokens: 500,
                return_full_text: false,
            }
        }),
    });

    const data = await response.json();

    if (data.error) throw new Error(data.error || 'Hugging Face API Error');

    // HF Inference API usually returns an array like [{ generated_text: "..." }]
    if (Array.isArray(data) && data[0]?.generated_text) {
        return data[0].generated_text.trim();
    }

    // Sometimes it might return just the object if not streaming?
    if (data.generated_text) return data.generated_text.trim();

    console.log('Unexpected HF Response:', data);
    return JSON.stringify(data);
};

const sendToCustomProvider = async (url: string, messages: ChatMessage[]) => {
    // Assume OpenAI compatible for broadest compatibility
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: 'llama3', // Default, user can ignore
            messages: messages.map(m => ({
                role: m.role === 'model' ? 'assistant' : 'user',
                content: (m.parts.find((p: any) => p.text) as any)?.text || '[Image]'
            })),
            stream: false
        })
    });

    if (!response.ok) throw new Error(`Custom API Status: ${response.status}`);
    const data = await response.json();

    if (data.choices?.[0]?.message?.content) return data.choices[0].message.content;
    if (data.response) return data.response; // Ollama 'generate' endpoint

    return JSON.stringify(data);
};

// --- Mock Fallback ---

function generateMockResponse(messages: ChatMessage[]): string {
    const lastUserMessage = (messages[messages.length - 1].parts.find(p => 'text' in p) as any)?.text || '';
    const lastUserImage = messages[messages.length - 1].parts.find(p => 'inlineData' in p);
    const lowerMsg = lastUserMessage.toLowerCase();

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
        return "Brake noise often means worn pads or dust. If it's a grinding sound, stop riding immediately and check your pads.";
    }

    if (lowerMsg.includes('chain')) {
        return "Clean and lube your chain every 500km. Check for about 20-30mm of slack at the midpoint.";
    }

    return "I'm currently in offline mode, so my knowledge is limited. \n\nI can help with general advice on:\n- Oil changes\n- Tires\n- Brakes\n- Chain maintenance\n\nPlease check your internet or API key settings to enable full AI features.";
}
