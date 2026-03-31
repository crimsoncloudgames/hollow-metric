import OpenAI from 'openai';

// This looks for the key in your .env.local file
const apiKey = process.env.OPENAI_API_KEY;

export const openai = new OpenAI({
    // Using a placeholder so the app doesn't crash without a key
    apiKey: apiKey || 'empty_placeholder',
});