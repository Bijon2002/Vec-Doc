import axios from 'axios';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY;
const NVIDIA_API_BASE_URL = process.env.NVIDIA_API_BASE_URL || 'https://integrate.api.nvidia.com/v1';

async function listModels() {
    console.log('Listing NVIDIA NIM Models...');
    try {
        const response = await axios.get(`${NVIDIA_API_BASE_URL}/models`, {
            headers: {
                'Authorization': `Bearer ${NVIDIA_API_KEY}`,
            }
        });

        const models = response.data.data.map(m => m.id);
        console.log(`Found ${models.length} models.`);
        fs.writeFileSync('models.json', JSON.stringify(models, null, 2));
    } catch (error) {
        console.error('Error:', error.response?.data || error.message);
    }
}

listModels();
