const Groq = require('groq-sdk');
const fs = require('fs');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const COST_PER_QUERY = 1; // coins

/**
 * Sends a question + system prompt to Groq and returns the answer.
 * @param {string} question - The detected question from the meeting
 * @param {string} systemPrompt - The user's trained persona prompt
 * @param {string} model - Groq model identifier
 * @returns {{ answer: string, responseTimeMs: number, model: string }}
 */
const getAIAnswer = async (question, systemPrompt, model = 'llama-3.1-8b-instant') => {
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

/**
 * Transcribes an audio payload directly using Groq Whisper.
 * @param {string} filePath - Path to the temporarily uploaded audio manifest
 * @returns {string} Raw transcribed text
 */
const transcribeAudio = async (filePath) => {
    const translation = await groq.audio.transcriptions.create({
        file: fs.createReadStream(filePath),
        model: "whisper-large-v3",
        response_format: "verbose_json"
    });
    return translation.text || "";
};

/**
 * Sweeps a bulk transcription block and extracts Q&A pairs via Groq LLM.
 * @param {string} transcriptText - Raw text block
 * @returns {string} Markdown formatted extraction
 */
const analyzeBulkTranscript = async (transcriptText) => {
    const completion = await groq.chat.completions.create({
        messages: [
            {
                role: 'system',
                content: 'Analyze the following meeting transcript. Extract the core technical problems raised and provide direct, actionable answers to them. Format as a clean markdown list using bullet points.'
            },
            {
                role: 'user',
                content: transcriptText
            }
        ],
        model: 'llama-3.1-8b-instant',
        temperature: 0.3,
        max_tokens: 2048,
        stream: false
    });

    return completion.choices[0]?.message?.content?.trim() || 'No clear questions or actionable contexts detected in timeline.';
};

module.exports = { getAIAnswer, COST_PER_QUERY, transcribeAudio, analyzeBulkTranscript };
