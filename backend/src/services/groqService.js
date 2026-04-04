const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const COST_PER_QUERY = 1; // coins

/**
 * Sends a question + system prompt to Groq and returns the answer.
 * @param {string} question - The detected question from the meeting
 * @param {string} systemPrompt - The user's trained persona prompt
 * @param {string} model - Groq model identifier
 * @returns {{ answer: string, responseTimeMs: number, model: string }}
 */
const getAIAnswer = async (question, systemPrompt, model = 'llama3-8b-8192') => {
    const start = Date.now();

    const completion = await groq.chat.completions.create({
        messages: [
            {
                role: 'system',
                content: systemPrompt || 'Answer concisely, accurately, and in under 3 sentences.'
            },
            {
                role: 'user',
                content: question
            }
        ],
        model,
        temperature: 0.6,
        max_tokens: 256,
        top_p: 0.9,
        stream: false
    });

    const answer = completion.choices[0]?.message?.content?.trim() || '';
    const responseTimeMs = Date.now() - start;

    return { answer, responseTimeMs, model };
};

module.exports = { getAIAnswer, COST_PER_QUERY };
