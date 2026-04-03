import OpenAI from 'openai';

let openaiClient: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
    const apiKey = process.env.OPENAI_API_KEY?.trim();

    if (!apiKey) {
        throw new Error('Missing OPENAI_API_KEY');
    }

    if (!openaiClient) {
        openaiClient = new OpenAI({ apiKey });
    }

    return openaiClient;
}