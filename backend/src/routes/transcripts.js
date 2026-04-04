const express = require('express');
const router = express.Router();
const { query } = require('../lib/db');

// POST /transcripts
router.post('/', async (req, res) => {
    const { meetingId, segments } = req.body;

    if (!meetingId) return res.status(400).json({ error: 'MEETING_ID_REQUIRED' });
    if (!Array.isArray(segments) || segments.length === 0) return res.status(400).json({ error: 'SEGMENTS_ARRAY_REQUIRED' });

    try {
        const { rows: meetingRows } = await query('SELECT id FROM meetings WHERE id = $1 AND user_id = $2', [meetingId, req.user.id]);
        if (meetingRows.length === 0) return res.status(404).json({ error: 'MEETING_NOT_FOUND' });

        // Prepare bulk insert
        const insertValues = [];
        const params = [];

        segments.forEach((seg, i) => {
            const pIndex = i * 6;
            insertValues.push(`($${pIndex + 1}, $${pIndex + 2}, $${pIndex + 3}, $${pIndex + 4}, $${pIndex + 5}, $${pIndex + 6})`);
            params.push(
                meetingId,
                req.user.id,
                seg.speaker || 'UNKNOWN',
                seg.content?.slice(0, 5000) || '',
                seg.offset || 0,
                Boolean(seg.isQuestion)
            );
        });

        const { rows } = await query(
            `INSERT INTO transcripts (meeting_id, user_id, speaker_label, content, timestamp_offset, is_question)
       VALUES ${insertValues.join(', ')}
       RETURNING id, speaker_label, content, timestamp_offset, is_question`,
            params
        );

        res.status(201).json({ inserted: rows.length, segments: rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /transcripts/:meetingId
router.get('/:meetingId', async (req, res) => {
    try {
        const { rows: meetingRows } = await query('SELECT id FROM meetings WHERE id = $1 AND user_id = $2', [req.params.meetingId, req.user.id]);
        if (meetingRows.length === 0) return res.status(404).json({ error: 'MEETING_NOT_FOUND' });

        const { rows } = await query(
            `SELECT id, speaker_label, content, timestamp_offset, is_question, created_at 
       FROM transcripts WHERE meeting_id = $1 ORDER BY timestamp_offset ASC`,
            [req.params.meetingId]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
