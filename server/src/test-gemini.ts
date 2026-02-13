import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

async function listModels() {
    try {
        // There isn't a direct listModels in the client SDK like this usually, 
        // but we can try to hit a known model.
        console.log('Testing gemini-1.5-flash...');
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const result = await model.generateContent('Hi');
        console.log('Success with gemini-1.5-flash:', result.response.text());
    } catch (error: any) {
        console.error('Error with gemini-1.5-flash:', error.message);

        try {
            console.log('Testing gemini-pro...');
            const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
            const result = await model.generateContent('Hi');
            console.log('Success with gemini-pro:', result.response.text());
        } catch (error2: any) {
            console.error('Error with gemini-pro:', error2.message);

            try {
                console.log('Testing gemini-1.5-flash-latest...');
                const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });
                const result = await model.generateContent('Hi');
                console.log('Success with gemini-1.5-flash-latest:', result.response.text());
            } catch (error3: any) {
                console.error('Error with gemini-1.5-flash-latest:', error3.message);
            }
        }
    }
}

listModels();
