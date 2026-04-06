const express = require('express');
const router = express.Router();
const { query } = require('../lib/db');

// GET /meetings
router.get('/', async (req, res) => {
    const { page = 1, limit = 20, status } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let baseQuery = `SELECT m.*, COUNT(a.id)::int AS response_count
    FROM meetings m
    LEFT JOIN ai_responses a ON a.meeting_id = m.id
    WHERE m.user_id = $1`;
    const params = [req.user.id];

    if (status) { baseQuery += ` AND m.status = $${params.length + 1}`; params.push(status); }
    baseQuery += ` GROUP BY m.id ORDER BY m.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit), offset);

    const countParams = [req.user.id];
    let countQuery = `SELECT COUNT(*) FROM meetings WHERE user_id = $1`;
    if (status) { countQuery += ` AND status = $2`; countParams.push(status); }

    const [{ rows: meetings }, { rows: countRows }] = await Promise.all([
        query(baseQuery, params),
        query(countQuery, countParams)
    ]);

    res.json({ meetings, total: parseInt(countRows[0].count), page: parseInt(page), limit: parseInt(limit) });
});

// GET /meetings/stats
router.get('/stats', async (req, res) => {
    const { rows: [{ count }] } = await query('SELECT COUNT(*) FROM meetings WHERE user_id = $1', [req.user.id]);
    res.json({ total_meetings: parseInt(count) });
});

// GET /meetings/:id
router.get('/:id', async (req, res) => {
    const { rows: [meeting] } = await query(
        `SELECT * FROM meetings WHERE id = $1 AND user_id = $2`,
        [req.params.id, req.user.id]
    );
    if (!meeting) return res.status(404).json({ error: 'MEETING_NOT_FOUND' });

    const [{ rows: transcripts }, { rows: aiResponses }] = await Promise.all([
        query(`SELECT id, speaker_label, content, timestamp_offset, is_question, created_at FROM transcripts WHERE meeting_id = $1 ORDER BY timestamp_offset ASC`, [req.params.id]),
        query(`SELECT id, question, answer, confidence_score, coins_deducted, model_used, response_time_ms, created_at FROM ai_responses WHERE meeting_id = $1 ORDER BY created_at ASC`, [req.params.id])
    ]);

    res.json({ ...meeting, transcripts, ai_responses: aiResponses });
});

// POST /meetings
router.post('/', async (req, res) => {
    const { title, platform } = req.body;
    const { rows: [meeting] } = await query(
        `INSERT INTO meetings (user_id, title, platform, status)
     VALUES ($1, $2, $3, 'active') RETURNING *`,
        [req.user.id, title || 'Untitled Meeting', platform || 'other']
    );
    res.status(201).json(meeting);
});

// PATCH /meetings/:id
router.patch('/:id', async (req, res) => {
    const { status, duration_seconds, participant_count, title } = req.body;
    const fields = []; const params = [];

    if (title) { params.push(title); fields.push(`title = $${params.length}`); }
    if (status) { params.push(status); fields.push(`status = $${params.length}`); }
    if (status === 'completed') { params.push(new Date()); fields.push(`ended_at = $${params.length}`); }
    if (duration_seconds !== undefined) { params.push(duration_seconds); fields.push(`duration_seconds = $${params.length}`); }
    if (participant_count !== undefined) { params.push(participant_count); fields.push(`participant_count = $${params.length}`); }

    if (fields.length === 0) return res.status(400).json({ error: 'NO_FIELDS_TO_UPDATE' });
    fields.push(`updated_at = NOW()`);
    params.push(req.params.id, req.user.id);

    const { rows: [meeting] } = await query(
        `UPDATE meetings SET ${fields.join(', ')} WHERE id = $${params.length - 1} AND user_id = $${params.length} RETURNING *`,
        params
    );
    if (!meeting) return res.status(404).json({ error: 'MEETING_NOT_FOUND' });
    res.json(meeting);
});

// DELETE /meetings/:id (soft delete = archive)
router.delete('/:id', async (req, res) => {
    await query(`UPDATE meetings SET status = 'archived' WHERE id = $1 AND user_id = $2`, [req.params.id, req.user.id]);
    res.json({ success: true });
});

module.exports = router;
