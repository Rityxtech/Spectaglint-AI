const express = require('express');
const router = express.Router();
const { query } = require('../lib/db');

/**
 * POST /extension/push
 * Called by the Chrome extension after every AI answer.
 * Auto-creates (or reuses today's) "Extension Session" meeting so mobile can poll results.
 * Requires valid Supabase JWT (same auth as all other routes).
 */
router.post('/push', async (req, res) => {
    const { question, answer, model = 'whisper-groq', responseTimeMs = 0 } = req.body;

    if (!question || !answer) {
        return res.status(400).json({ error: 'QUESTION_AND_ANSWER_REQUIRED' });
    }

    try {
        // Find or create today's "Extension Session" meeting for this user
        const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
        const title = `Extension Session — ${today}`;

        const { rows: existing } = await query(
            `SELECT id FROM meetings WHERE user_id = $1 AND title = $2 AND status = 'active' LIMIT 1`,
            [req.user.id, title]
        );

        let meetingId;
        if (existing.length > 0) {
            meetingId = existing[0].id;
        } else {
            const { rows: created } = await query(
                `INSERT INTO meetings (user_id, title, platform, status)
                 VALUES ($1, $2, 'other', 'active')
                 RETURNING id`,
                [req.user.id, title]
            );
            meetingId = created[0].id;
        }

        // Save the AI response to the database
        const confidence = 92.0;
        const { rows } = await query(
            `INSERT INTO ai_responses
               (meeting_id, user_id, question, answer, confidence_score, coins_deducted, model_used, response_time_ms, delivered_via)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'extension')
             RETURNING id, created_at`,
            [meetingId, req.user.id, question.trim(), answer.trim(), confidence, 0, model, responseTimeMs]
        );

        res.status(201).json({ id: rows[0].id, created_at: rows[0].created_at });

    } catch (err) {
        console.error('[Extension Push] Error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
