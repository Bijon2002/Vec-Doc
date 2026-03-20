import axios from 'axios';

const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY;
const NVIDIA_API_BASE_URL = process.env.NVIDIA_API_BASE_URL || 'https://integrate.api.nvidia.com/v1';

export interface OCRExtractionResult {
    title?: string;
    expiryDate?: Date;
    issueDate?: Date;
    rawText: string;
}

export interface PIIScanResult {
    hasPII: boolean;
    entities: { type: string; text: string }[];
}

class AiService {
    private getClient() {
        const apiKey = process.env.NVIDIA_API_KEY;
        const baseUrl = process.env.NVIDIA_API_BASE_URL || 'https://integrate.api.nvidia.com/v1';
        
        return axios.create({
            baseURL: baseUrl,
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
        });
    }

    /**
     * Extracts structured data from a document image using NVIDIA NIM OCR.
     */
    async extractDocumentData(fileUrl: string): Promise<OCRExtractionResult> {
        try {
            const response = await this.getClient().post('/chat/completions', {
                model: 'nvidia/nemotron-parse', // Confirmed in catalog
                messages: [
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'text',
                                text: 'Extract the document title, issue date, and expiry date. Provide JSON output with keys: title, issueDate, expiryDate.',
                            },
                            {
                                type: 'image_url',
                                image_url: { url: fileUrl },
                            },
                        ],
                    },
                ],
                response_format: { type: 'json_object' },
            });

            const content = JSON.parse(response.data.choices[0].message.content);
            
            return {
                title: content.title || undefined,
                issueDate: content.issueDate ? new Date(content.issueDate) : undefined,
                expiryDate: content.expiryDate ? new Date(content.expiryDate) : undefined,
                rawText: response.data.choices[0].message.content,
            };
        } catch (error) {
            console.error('AI OCR Error:', error);
            return { rawText: '' };
        }
    }

    /**
     * Scans text or document content for PII (Personally Identifiable Information).
     */
    async scanForPII(text: string): Promise<PIIScanResult> {
        try {
            const response = await this.getClient().post('/chat/completions', {
                model: 'nvidia/gliner-pii',
                messages: [
                    {
                        role: 'user',
                        content: `Detect PII in the following text. Return a JSON object with 'hasPII' (boolean) and 'entities' (array of {type, text}).\n\nText: ${text}`,
                    },
                ],
                response_format: { type: 'json_object' },
            });

            const content = JSON.parse(response.data.choices[0].message.content);
            return {
                hasPII: content.hasPII || false,
                entities: content.entities || [],
            };
        } catch (error) {
            console.error('PII Scan Error:', error);
            return { hasPII: false, entities: [] };
        }
    }

    /**
     * Generates a voice (audio) from text using Magpie TTS.
     * Returns a base64 encoded audio string or a URL.
     */
    async generateVoice(text: string): Promise<string> {
        try {
            const response = await this.getClient().post('/audio/speech', {
                model: 'nvidia/magpie-tts-flow',
                input: text,
                voice: 'neutral',
                response_format: 'mp3',
            }, {
                responseType: 'arraybuffer',
            });

            return Buffer.from(response.data, 'binary').toString('base64');
        } catch (error) {
            console.error('TTS Error:', error);
            return '';
        }
    }

    /**
     * Identifies a bike part from an image using a high-capacity VLM.
     */
    async identifyBikePart(imageUrl: string): Promise<string> {
        try {
            const response = await this.getClient().post('/chat/completions', {
                model: 'mistralai/mistral-large-3-675b-instruct-2512', // Canonical ID
                messages: [
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'text',
                                text: 'Identify the motorcycle part in this image and describe its function concisely.',
                            },
                            {
                                type: 'image_url',
                                image_url: { url: imageUrl },
                            },
                        ],
                    },
                ],
            });

            return response.data.choices[0].message.content;
        } catch (error) {
            console.error('AI Part ID Error:', error);
            return 'Could not identify part.';
        }
    }

    /**
     * Generates a response for a maintenance query using the latest Free Endpoint models.
     */
    async chatWithMaintenanceGuide(query: string, context: string): Promise<string> {
        try {
            const response = await this.getClient().post('/chat/completions', {
                model: 'mistralai/mistral-large-3-675b-instruct-2512', // Canonical ID
                messages: [
                    {
                        role: 'system',
                        content: `You are 'Vec-Doc', an expert motorcycle mechanic. Use the provided context to answer accurately. If you don't know, suggest seeing a professional.\n\nContext: ${context}`,
                    },
                    {
                        role: 'user',
                        content: query,
                    },
                ],
            });

            return response.data.choices[0].message.content;
        } catch (error) {
            console.error('AI Chat Error:', error);
            return 'Sorry, I am unable to process your request at the moment.';
        }
    }

    /**
     * Generates embeddings for RAG using the latest Nemoretriever model.
     */
    async generateEmbeddings(text: string): Promise<number[]> {
        try {
            const response = await this.getClient().post('/embeddings', {
                model: 'meta/llama-3_2-nemoretriever-300m-embed-v1', // UPGRADED
                input: text,
                encoding_format: 'float',
            });
            return response.data.data[0].embedding;
        } catch (error) {
            console.error('Embedding Error:', error);
            return [];
        }
    }

    /**
     * Get global petrol alerts based on the current world situation.
     */
    async getPetrolAlerts() {
        const client = await this.getClient();
        
        const prompt = `
            You are a global energy and security analyst for Vec-Doc, a bike maintenance app.
            Based on the current geopolitical situation in March 2026 (Conflict in the Middle East, Strait of Hormuz closure, Qatar energy disruptions),
            generate 3-4 concise, high-impact alerts for bikers.
            
            Focus on:
            1. Oil price surges and fuel shortages in Asia (especially Sri Lanka).
            2. Advice on fuel conservation (e.g., lower speeds, tire pressure).
            3. Warnings about global war escalation affecting supply chains.
            
            Return the response as a JSON array of objects with 'id', 'severity' (high/medium/low), 'title', and 'message'.
        `;

        try {
            const response = await client.post('/chat/completions', {
                model: 'mistralai/mistral-large-3-675b-instruct-2512',
                messages: [{ role: 'user', content: prompt }],
                response_format: { type: 'json_object' }
            });

            const content = response.data.choices[0].message.content;
            const parsed = JSON.parse(content);
            return parsed.alerts || parsed;
        } catch (error) {
            console.error('Failed to get petrol alerts:', error);
            // Fallback alerts if AI fails
            return [
                {
                    id: '1',
                    severity: 'high',
                    title: 'Global Fuel Crisis',
                    message: 'Strait of Hormuz remains closed. Expect severe fuel rationing in Sri Lanka and price surges.'
                },
                {
                    id: '2',
                    severity: 'medium',
                    title: 'Fuel Conservation Tip',
                    message: 'Maintain optimal tire pressure and avoid aggressive acceleration to save up to 15% fuel.'
                }
            ];
        }
    }
}

export const aiService = new AiService();
