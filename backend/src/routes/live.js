const express = require('express');
const router = express.Router();
const multer = require('multer');
const { query } = require('../lib/db');
const { addClient, broadcast } = require('../lib/LiveStream');

// Setup multer for memory storage (we just pipe binary to Groq)
const upload = multer({ storage: multer.memoryStorage() });

// Per-user in-memory state. Persists across SSE reconnects within a single process instance.
// TTL cleanup runs every 10 min to evict sessions idle for more than 4 hours.
const userState = new Map();
const STALE_THRESHOLD_MS = 90_000;   // 90s without heartbeat → extension considered offline
const STATE_TTL_MS = 4 * 60 * 60_000; // 4 hours idle → evict from memory

setInterval(() => {
    const cutoff = Date.now() - STATE_TTL_MS;
    userState.forEach((state, userId) => {
        const lastActivity = state.extensionLastSeen || 0;
        if (lastActivity < cutoff) {
            userState.delete(userId);
        }
    });
}, 10 * 60_000); // run every 10 minutes

function getUserState(userId) {
    if (!userState.has(userId)) {
        userState.set(userId, {
            speechContext: [],
            pendingBuffer: '',
            lastTranscript: '',
            processedSentences: new Set(),
            lastNormalized: '',
            extensionStatus: 'STOPPED',
            extensionLastSeen: null
        });
    }
    return userState.get(userId);
}

function pushContext(state, text) {
    state.speechContext.push(text);
    if (state.speechContext.length > 5) state.speechContext.shift();
}

/**
 * Helper to push an HTML log string identical to what the frontend expects
 */
function pushLog(userId, htmlContent) {
    broadcast(userId, 'LIVE_LOG', { html: htmlContent });
}

// GET /live/stream — SSE channel per authenticated user
router.get('/stream', (req, res) => {
    const userId = req.user.id;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    res.write(`data: ${JSON.stringify({ type: 'CONNECTED', message: 'SSE Stream Ready' })}\n\n`);

    // Re-hydrate current extension status without creating ghost state.
    // If there's no entry yet, the extension has never connected — send STOPPED.
    const existingState = userState.get(userId);
    let currentStatus = 'STOPPED';
    if (existingState) {
        const isStale = existingState.extensionLastSeen &&
            (Date.now() - existingState.extensionLastSeen > STALE_THRESHOLD_MS);
        if (isStale && existingState.extensionStatus === 'LIVE') {
            existingState.extensionStatus = 'STOPPED';
        }
        currentStatus = existingState.extensionStatus;
    }
    res.write(`data: ${JSON.stringify({ type: 'EXTENSION_STATUS', status: currentStatus })}\n\n`);

    addClient(userId, res);
});

// GET /live/extension-status — REST poll for extension link state
router.get('/extension-status', (req, res) => {
    const existing = userState.get(req.user.id);
    if (!existing) return res.json({ status: 'STOPPED', linked: false, lastSeen: null });

    const isStale = existing.extensionLastSeen &&
        (Date.now() - existing.extensionLastSeen > STALE_THRESHOLD_MS);
    const effectiveStatus = (isStale && existing.extensionStatus === 'LIVE') ? 'STOPPED' : existing.extensionStatus;

    res.json({
        status: effectiveStatus,
        linked: existing.extensionLastSeen !== null,
        lastSeen: existing.extensionLastSeen
    });
});

/**
 * POST /live/heartbeat
 * Called every 30s by the background.js service worker to confirm the extension is alive.
 * Keeps extensionLastSeen fresh — backend uses this to auto-degrade stale sessions.
 */
router.post('/heartbeat', (req, res) => {
    const state = getUserState(req.user.id);
    state.extensionLastSeen = Date.now();
    // If the extension reports it's live, keep status synced
    if (req.body?.status) state.extensionStatus = req.body.status;
    res.json({ ok: true, serverTime: Date.now() });
});

/**
 * POST /live/audio
 * Called repeatedly by Extension with 4s audio chunks.
 */
router.post('/audio', upload.single('file'), async (req, res) => {
    const userId = req.user.id;
    const audioBuffer = req.file?.buffer;

    if (!audioBuffer) return res.status(400).json({ error: 'No audio provided' });

    // Instantly return 202 to free the client (processing handled async)
    res.status(202).json({ status: 'processing' });

    const state = getUserState(userId);

    try {
        // Fetch User Keys from DB
        const { rows } = await query('SELECT telegram_bot_token, telegram_chat_id FROM profiles WHERE id = $1', [userId]);
        const keys = rows[0] || {};

        // Ensure GROQ Key from environment
        const groqKey = process.env.GROQ_API_KEY;
        if (!groqKey) throw new Error('Backend missing GROQ_API_KEY');

        // ── STEP 1: Groq Whisper ──
        const formData = new FormData();
        formData.append('file', new Blob([audioBuffer], { type: 'audio/webm' }), 'chunk.webm');
        formData.append('model', 'whisper-large-v3');
        formData.append('response_format', 'text');

        const whisperRes = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${groqKey}` },
            body: formData,
            signal: AbortSignal.timeout(15000)
        });

        if (!whisperRes.ok) {
            const err = await whisperRes.text();
            throw new Error(`Whisper Error: ${whisperRes.status} -- ${err}`);
        }

        const raw = (await whisperRes.text()).trim();

        // Hallucination Filter
        const WHISPER_HALLUCINATIONS = new Set([
            '', 'silence', 'silence.', '...', 'you', 'the', 'a', 'i',
            'hmm', 'hm', 'um', 'uh', 'oh', 'ah', 'okay', 'ok',
            'thanks', 'thank you', 'bye', 'yes', 'no'
        ]);
        const wordCount = raw.split(/\s+/).filter(Boolean).length;
        if (!raw || WHISPER_HALLUCINATIONS.has(raw.toLowerCase()) || wordCount < 3) return;

        const combined = state.pendingBuffer ? `${state.pendingBuffer} ${raw}` : raw;

        // ── Duplicate Detection ──
        const normalized = combined.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
        if (state.processedSentences.has(normalized) || normalized === state.lastNormalized) return;

        // ── Absolute Strict Lock ──
        // Llama responses take ~3s, causing identical overlapping audio clips to slip past 
        // older checks. We use a tight historical hash set to kill duplicates instantly.
        const hash = combined.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (!state.sentenceHashes) state.sentenceHashes = new Set();

        if (state.sentenceHashes.has(hash)) return;
        state.sentenceHashes.add(hash);

        // Keep memory footprint lightweight
        if (state.sentenceHashes.size > 20) {
            const iterator = state.sentenceHashes.values();
            state.sentenceHashes.delete(iterator.next().value);
        }

        const priorContext = state.speechContext.slice(-3).join(' ');

        // ── STEP 2: Groq Llama Question Detection ──
        const systemPrompt = `You are a real-time AI Meeting Assistant processing live audio chunks.
Audio is split every few seconds, so a chunk may be an INCOMPLETE fragment of a longer sentence.

Your job — in order:
1. Decide if the text CONTAINS a COMPLETE thought/sentence.
   A text is only INCOMPLETE if it abruptly cuts off mid-thought:
   - "how do you differentiate between JavaScript?" -> INCOMPLETE (DO NOT ANSWER)
   - "what is the difference between React and" -> INCOMPLETE
   - "And how do you differentiate between JavaScript and Nest.js frameworks?" -> COMPLETE
   
2. If INCOMPLETE → set isComplete: false, isQuestion: false, answer: null.
3. If COMPLETE → determine if it contains an EXPLICIT, ACTIONABLE question.
   - Ignore rhetorical questions or general meeting chatter.
   - If it is a direct question, answer it professionally in 2 sentences.

Always reply with ONLY this exact JSON:
{
  "isComplete": true or false,
  "isQuestion": true or false,
  "answer": "your professional 2-sentence answer, or null"
}`;

        const userContent = priorContext
            ? `[Prior speech context]: "${priorContext}"\n[Current text]: "${combined}"`
            : combined;

        const llamaRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
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
            signal: AbortSignal.timeout(10000)
        });

        if (!llamaRes.ok) throw new Error('Llama Error');

        const json = await llamaRes.json();
        const parsed = JSON.parse(json.choices[0].message.content);

        // -- Incomplete fragment --
        if (!parsed.isComplete) {
            if (combined.split(/\s+/).length > 40) {
                state.pendingBuffer = ''; // Flush blocked buffer
            } else {
                state.pendingBuffer = combined;
                pushLog(userId, `<span style="color:#475569; font-size:11px;">⏳ Buffering: "${combined}"</span>`);
            }
            return;
        }

        // -- Complete Sentence --
        state.pendingBuffer = '';
        pushContext(state, combined);

        if (combined === state.lastTranscript) return;
        state.lastTranscript = combined;
        state.processedSentences.add(normalized);
        state.lastNormalized = normalized;

        // Broadcast Heard statement
        pushLog(userId, `<div style="margin-top:12px; margin-bottom:6px;"><span style="color:#10b981; font-weight:900; letter-spacing:0.1em; text-transform:uppercase;">🎤 Heard:</span> <span style="color:#8eff71; font-weight:bold; padding-left:4px;">"${combined}"</span></div>`);

        if (parsed.isQuestion && parsed.answer) {
            // Find or create "Extension Session - YYYY-MM-DD"
            const today = new Date().toISOString().slice(0, 10);
            const title = `Live AI Stream — ${today}`;
            const { rows: existing } = await query(
                `SELECT id FROM meetings WHERE user_id = $1 AND title = $2 LIMIT 1`,
                [userId, title]
            );

            let meetingId;
            if (existing.length > 0) {
                meetingId = existing[0].id;
            } else {
                const { rows: created } = await query(
                    `INSERT INTO meetings (user_id, title) VALUES ($1, $2) RETURNING id`,
                    [userId, title]
                );
                meetingId = created[0].id;
            }

            // Save Response
            const { rows: aiRows } = await query(
                `INSERT INTO ai_responses (meeting_id, user_id, question, answer)
                 VALUES ($1, $2, $3, $4) RETURNING id, created_at`,
                [meetingId, userId, combined, parsed.answer]
            );

            // Broadcast structured response
            broadcast(userId, 'EXTENSION_AI_RESPONSE', {
                payload: {
                    id: aiRows[0].id,
                    question: combined,
                    answer: parsed.answer,
                    created_at: aiRows[0].created_at
                }
            });

            // Telegram logic
            const GLOBAL_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
            if (GLOBAL_BOT_TOKEN && keys.telegram_chat_id) {
                fetch(`https://api.telegram.org/bot${GLOBAL_BOT_TOKEN}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: keys.telegram_chat_id,
                        text: `❓ Detected: _${combined}_\n\n💡 AI Reply: *${parsed.answer}*`
                    })
                }).then(r => {
                    if (r.ok) pushLog(userId, `<span style="color:#10b981; font-size:11px; font-weight:bold; margin-top:4px; display:inline-block;">✈ Telegram Delivery Confirmed ✅</span>`);
                }).catch(() => null);
            }

            pushLog(userId, `<span style="color:#3b82f6; font-weight:bold;">💡 AI Answer:</span> <span style="color:#e2e8f0">${parsed.answer}</span> <br/>`);
        }

    } catch (err) {
        console.error('[Pipeline Error]', err);
        pushLog(userId, `<span style="color:#ef4444; font-size:11px;">⚠️ Pipeline Error: ${err.message}</span>`);
    }
});

/**
 * POST /live/session
 * Signals extension started or stopped to broadcast status
 */
router.post('/session', (req, res) => {
    const { status } = req.body; // 'LIVE' | 'STOPPED'
    const state = getUserState(req.user.id);

    // ── Persist status so SSE reconnects can re-hydrate it ──
    state.extensionStatus = status;
    state.extensionLastSeen = Date.now();

    if (status === 'LIVE') {
        state.speechContext = [];
        state.pendingBuffer = '';
        state.lastTranscript = '';
        state.sentenceHashes = new Set();
        state.processedSentences = new Set();
        state.lastNormalized = '';
        pushLog(req.user.id, `<span style="color:#10b981; font-weight:bold;">▶ Session Started</span><br/><span style="color:#64748b; font-size:11px;">Awaiting audio chunks...</span>`);
    } else {
        pushLog(req.user.id, `<span style="color:#ef4444; font-weight:bold;">⏸ Session Stopped</span>`);
    }

    broadcast(req.user.id, 'EXTENSION_STATUS', { status });
    res.json({ success: true });
});

module.exports = router;
