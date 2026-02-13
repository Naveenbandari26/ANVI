import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

async function listModels() {
    try {
        console.log('Testing gemini-1.5-flash with v1...');
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' }, { apiVersion: 'v1' });
        const result = await model.generateContent('Hi');
        console.log('Success with gemini-1.5-flash (v1):', result.response.text());
    } catch (error: any) {
        console.error('Error with gemini-1.5-flash (v1):', error.message);

        try {
            console.log('Testing gemini-1.5-pro with v1...');
            const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' }, { apiVersion: 'v1' });
            const result = await model.generateContent('Hi');
            console.log('Success with gemini-1.5-pro (v1):', result.response.text());
        } catch (error2: any) {
            console.error('Error with gemini-1.5-pro (v1):', error2.message);
        }
    }
}

listModels();
