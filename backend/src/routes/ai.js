const express = require('express');
const router = express.Router();
const { query } = require('../lib/db');
const { getAIAnswer, COST_PER_QUERY } = require('../services/groqService');
const { deductCoins, creditCoins } = require('../services/coinService');

// POST /ai/respond
router.post('/respond', async (req, res) => {
    const { question, meetingId, transcriptId } = req.body;

    if (!question || typeof question !== 'string' || question.trim().length < 3) return res.status(400).json({ error: 'INVALID_QUESTION' });
    if (!meetingId) return res.status(400).json({ error: 'MEETING_ID_REQUIRED' });

    try {
        // 1. Verify meeting
        const { rows: meetingRows } = await query('SELECT id FROM meetings WHERE id = $1 AND user_id = $2', [meetingId, req.user.id]);
        if (meetingRows.length === 0) return res.status(404).json({ error: 'MEETING_NOT_FOUND' });

        // 2. Fetch config
        const { rows: configRows } = await query('SELECT system_prompt, inference_model FROM node_config WHERE user_id = $1', [req.user.id]);
        const config = configRows[0];

        // 3. Atomically deduct coins BEFORE calling Groq
        await deductCoins(req.user.id, COST_PER_QUERY, `AI_QUERY — meeting:${meetingId}`, meetingId);

        // 4. Call Groq
        const systemPrompt = config?.system_prompt || 'Answer concisely and accurately in under 3 sentences.';
        const model = config?.inference_model || 'llama3-8b-8192';
        const { answer, responseTimeMs } = await getAIAnswer(question, systemPrompt, model);

        // 5. Compute confidence
        const confidence = Math.min(99.9, Math.max(70, 100 - (responseTimeMs / 100)));

        // 6. Persist AI response
        const { rows: aiRows } = await query(
            `INSERT INTO ai_responses (meeting_id, transcript_id, user_id, question, answer, confidence_score, coins_deducted, model_used, response_time_ms, delivered_via)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'web') RETURNING id`,
            [meetingId, transcriptId || null, req.user.id, question.trim(), answer, parseFloat(confidence.toFixed(2)), COST_PER_QUERY, model, responseTimeMs]
        );

        res.json({
            id: aiRows[0]?.id,
            answer,
            question: question.trim(),
            confidence_score: parseFloat(confidence.toFixed(2)),
            coins_deducted: COST_PER_QUERY,
            response_time_ms: responseTimeMs,
            model_used: model
        });

    } catch (err) {
        if (err.message?.includes('GROQ') || err.message?.includes('groq')) {
            try {
                await creditCoins(req.user.id, COST_PER_QUERY, 'refund', 'AI_INFERENCE_FAILED — auto-refund');
            } catch (e) {
                console.error('REFUND_FAILED:', e.message);
            }
        }
        const status = err.message?.includes('INSUFFICIENT_COINS') ? 402 : 500;
        res.status(status).json({ error: err.message });
    }
});

// GET /ai/responses
router.get('/responses', async (req, res) => {
    const { meetingId, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let baseQuery = `
    SELECT a.id, a.question, a.answer, a.confidence_score, a.coins_deducted, a.model_used, a.response_time_ms, a.created_at,
           json_build_object('id', m.id, 'title', m.title, 'platform', m.platform) as meeting
    FROM ai_responses a
    JOIN meetings m ON a.meeting_id = m.id
    WHERE a.user_id = $1
  `;
    const params = [req.user.id];

    if (meetingId) {
        params.push(meetingId);
        baseQuery += ` AND a.meeting_id = $${params.length}`;
    }

    baseQuery += ` ORDER BY a.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit), offset);

    const countParams = [req.user.id];
    let countQuery = `SELECT COUNT(*) FROM ai_responses WHERE user_id = $1`;
    if (meetingId) { countQuery += ` AND meeting_id = $2`; countParams.push(meetingId); }

    try {
        const [{ rows: responses }, { rows: countRows }] = await Promise.all([
            query(baseQuery, params),
            query(countQuery, countParams)
        ]);
        res.json({ responses, total: parseInt(countRows[0].count), page: parseInt(page), limit: parseInt(limit) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
