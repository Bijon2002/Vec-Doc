import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY;
const NVIDIA_API_BASE_URL = process.env.NVIDIA_API_BASE_URL || 'https://integrate.api.nvidia.com/v1';

async function testChat() {
    console.log('Testing NVIDIA NIM Chat...');
    console.log('Base URL:', NVIDIA_API_BASE_URL);
    console.log('Key length:', NVIDIA_API_KEY?.length);

    try {
        const response = await axios.post(`${NVIDIA_API_BASE_URL}/chat/completions`, {
            model: 'mistralai/mistral-large-3-675b-instruct-2512',
            messages: [
                { role: 'user', content: 'Hello' }
            ],
        }, {
            headers: {
                'Authorization': `Bearer ${NVIDIA_API_KEY}`,
                'Content-Type': 'application/json',
            }
        });

        console.log('Response:', response.data.choices[0].message.content);
    } catch (error) {
        if (error.response) {
            console.error('Error status:', error.response.status);
            console.error('Error data:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error('Error message:', error.message);
        }
    }
}

testChat();
