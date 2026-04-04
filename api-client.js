// Real-Time Streaming Pipeline — Groq Whisper + Llama

// ─── Rolling speech context (last N complete utterances for LLM memory) ────────
const _speechContext = [];
const MAX_CONTEXT_TURNS = 5;

function pushContext(text) {
    _speechContext.push(text);
    if (_speechContext.length > MAX_CONTEXT_TURNS) _speechContext.shift();
}
function getContext() {
    return _speechContext.slice(-3).join(' ');
}

// ─── Sentence accumulation buffer ─────────────────────────────────────────────
// Holds incomplete fragment(s) until a full sentence arrives in the next chunk.
let _pendingBuffer = '';
const MAX_BUFFER_WORDS = 80; // safety cap — flush if buffer gets too long

export function resetContext() {
    _speechContext.length = 0;
    _pendingBuffer = '';
}

// ============================================================
// ⚠️  HARDCODED FOR DEBUG — REVERT BEFORE PRODUCTION DEPLOY
// Replace HARDCODED_TEST_KEY with your new key from console.groq.com/keys
// ============================================================
const HARDCODED_TEST_KEY = 'REPLACE_WITH_YOUR_NEW_KEY';

async function getKeys() {
    const result = await chrome.storage.local.get(['groqKey', 'telegramToken', 'telegramChatId']);
    // Use hardcoded key if set, otherwise fall back to stored key
    const groqKey = HARDCODED_TEST_KEY !== 'REPLACE_WITH_YOUR_NEW_KEY'
        ? HARDCODED_TEST_KEY
        : result.groqKey;
    if (!groqKey) throw new Error("Groq API key missing");
    console.log('[Debug] Using Groq key prefix:', groqKey.substring(0, 10) + '...');
    return { ...result, groqKey };
}

function getGroqUrl(endpoint) {
    const baseUrl = `https://api.groq.com/openai/v1/${endpoint}`;
    return `https://cors.eu.org/${baseUrl}`;
}

export async function processPipelineV2(audioBlob) {
    const { groqKey } = await getKeys();

    // STEP 1: Transcription (Groq Whisper-Large-V3)
    const formData = new FormData();
    formData.append('file', audioBlob, 'chunk.webm');
    formData.append('model', 'whisper-large-v3');
    formData.append('response_format', 'text');

    const transcriptionUrl = getGroqUrl('audio/transcriptions');
    const transcriptionRes = await fetch(transcriptionUrl, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${groqKey}` },
        body: formData,
        signal: AbortSignal.timeout(15000) // Prevent hanging if network drops
    });

    if (!transcriptionRes.ok) {
        const errBody = await transcriptionRes.text().catch(() => '(unreadable)');
        console.error('[Groq Whisper] Error body:', errBody);
        throw new Error(`Groq Whisper Authentication Error: ${transcriptionRes.status} — ${errBody}`);
    }
    const transcript = await transcriptionRes.text();
    const raw = transcript.trim();

    // ─── Noise / hallucination filter ───────────────────────────────────────────────
    // Whisper commonly hallucinates these on near-silent audio chunks.
    // Also reject anything under 3 words — never a complete or meaningful fragment.
    const WHISPER_HALLUCINATIONS = new Set([
        '', 'silence', 'silence.', '...', 'you', 'the', 'a', 'i',
        'hmm', 'hm', 'um', 'uh', 'oh', 'ah', 'okay', 'ok',
        'thanks', 'thank you', 'bye', 'yes', 'no'
    ]);
    const wordCount = raw.split(/\s+/).filter(Boolean).length;

    if (!raw || WHISPER_HALLUCINATIONS.has(raw.toLowerCase()) || wordCount < 3) {
        return { transcript: 'SILENCE_DETECTED', isQuestion: false, answer: null };
    }

    // ─── Merge with pending buffer ────────────────────────────────────────────────
    const rawTranscript = raw;
    const combined = _pendingBuffer ? `${_pendingBuffer} ${rawTranscript}` : rawTranscript;

    // Deduplicate — if the same combined text was already buffered, skip it silently
    if (combined === _pendingBuffer) {
        return { transcript: 'SILENCE_DETECTED', isQuestion: false, answer: null };
    }

    // Update rolling context with combined text
    const priorContext = getContext();

    // STEP 2: Question Detection & Completeness Check (Groq Llama 3)
    // The model must tell us if the sentence is COMPLETE before answering.
    // Incomplete fragments (e.g. "and how do you differentiate between JavaScript")
    // get buffered and merged with the next arriving chunk.
    const systemPrompt = `You are a real-time AI Meeting Assistant processing live audio chunks.
Audio is split every few seconds, so a chunk may be an INCOMPLETE fragment of a longer sentence.

Your job — in order:
1. Decide if the text CONTAINS a COMPLETE thought/sentence.
   Spoken audio is messy. If there is a fully formed question ANYWHERE in the text, treat the text as COMPLETE.
   A text is only INCOMPLETE if it abruptly cuts off mid-thought:
   - Ends without a necessary conclusion or object.
   - Contains comparative setups missing the second half (e.g., "differentiate between X", "X compared to" without the "and Y" part).
   
   Examples of INCOMPLETE fragments (DO NOT ANSWER): 
   - "how do you differentiate between JavaScript?"
   - "what is the difference between React and"
   
   Examples of COMPLETE sentences (ANSWER THESE): 
   - "And how do you differentiate between JavaScript and Nest.js frameworks?"
   - "So what is React?"
   - "I was wondering, how do you differentiate between JavaScript and Nest JS frameworks What is HTML" (Contains complete questions, so it is COMPLETE)

2. If INCOMPLETE → set isComplete: false, isQuestion: false, answer: null.
   Do NOT attempt to answer incomplete fragments.

3. If COMPLETE → determine if it contains an EXPLICIT, ACTIONABLE question.
   - ONLY answer if someone is directly asking for information, explanation, or help.
   - Ignore rhetorical questions (e.g., "Right?", "You know what I mean?").
   - Ignore general meeting chatter or statements of fact.
   - If it is not a direct question requiring an answer, set isQuestion: false, answer: null.
   - If it IS a direct question, set isQuestion: true, and answer it professionally in 2 sentences.

Always reply with ONLY this exact JSON (no other text):
{
  "isComplete": true or false,
  "isQuestion": true or false,
  "answer": "your professional 2-sentence answer, or null"
}`;

    const userContent = priorContext
        ? `[Prior speech context]: "${priorContext}"\n[Current text]: "${combined}"`
        : combined;

    const completionUrl = getGroqUrl('chat/completions');
    const completionRes = await fetch(completionUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${groqKey}`
        },
        body: JSON.stringify({
            model: "llama-3.1-8b-instant",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userContent }
            ],
            response_format: { type: "json_object" },
            temperature: 0.1,
            max_tokens: 256
        }),
        signal: AbortSignal.timeout(10000) // Prevent hanging if network drops
    });

    if (!completionRes.ok) {
        const errBody = await completionRes.text().catch(() => '(unreadable)');
        console.error('[Groq Llama] Error body:', errBody);
        throw new Error(`Groq Llama API Error: ${completionRes.status} — ${errBody}`);
    }

    const data = await completionRes.json();

    try {
        const parsed = JSON.parse(data.choices[0].message.content);

        if (!parsed.isComplete) {
            // Fragment — buffer it and wait for the next chunk to complete the thought.
            // Cap buffer length to avoid runaway accumulation (max 40 words now).
            const wordCount = combined.split(/\s+/).length;
            if (wordCount > 40) {
                // If the buffer gets too large, force clear it so we don't get permanently stuck
                console.log('[Buffer] Buffer exceeded 40 words. Dropping stuck fragment:', combined);
                _pendingBuffer = '';
                return { transcript: rawTranscript, isQuestion: false, answer: null, isIncomplete: false };
            }
            _pendingBuffer = combined;
            console.log('[Buffer] Holding incomplete fragment:', _pendingBuffer);
            return { transcript: rawTranscript, isQuestion: false, answer: null, isIncomplete: true };
        }

        // Complete sentence — clear buffer, push to context, return result
        _pendingBuffer = '';
        pushContext(combined);

        return {
            transcript: combined,           // show the full merged sentence in the log
            isQuestion: parsed.isQuestion || false,
            answer: parsed.answer || null
        };

    } catch (e) {
        _pendingBuffer = ''; // clear on parse error to avoid stale state
        return { transcript: rawTranscript, isQuestion: false, answer: null };
    }
}

export async function generateSummary(fullTranscript) {
    const { groqKey } = await getKeys();

    const completionUrl = getGroqUrl('chat/completions');
    const completionRes = await fetch(completionUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${groqKey}`
        },
        body: JSON.stringify({
            model: "llama-3.1-8b-instant",
            messages: [
                { role: "system", content: "Summarize the following meeting transcript into extremely brief structural bullet points." },
                { role: "user", content: fullTranscript }
            ],
            temperature: 0.2
        })
    });

    if (!completionRes.ok) throw new Error("Groq Summary generation failed");
    const data = await completionRes.json();
    return data.choices[0].message.content;
}

export async function sendTelegramMessage(messageText) {
    const { telegramToken, telegramChatId } = await getKeys();
    if (!telegramToken || !telegramChatId) return;

    const res = await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: telegramChatId, text: messageText })
    });
}
