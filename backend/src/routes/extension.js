const express = require('express');
const router = express.Router();
const { query } = require('../lib/db');
const path = require('path');
const fs = require('fs');

const { authenticate } = require('../middleware/auth');

/**
 * POST /extension/push
 * Called by the Chrome extension after every AI answer.
 * Auto-creates (or reuses today's) "Extension Session" meeting so mobile can poll results.
 * Requires valid Supabase JWT.
 */
router.post('/push', authenticate, async (req, res) => {
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

// Serve extension ZIP file for download
router.get('/download', (req, res) => {
  const extensionPath = path.join(__dirname, '../../../spectaglint-extension.zip');

  // Check if extension file exists
  if (!fs.existsSync(extensionPath)) {
    return res.status(404).json({
      error: 'EXTENSION_NOT_BUILT',
      message: 'Extension package not found. Please run the build script first.'
    });
  }

  // Set headers for file download
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', 'attachment; filename="spectaglint-extension.zip"');

  // Stream the file
  const fileStream = fs.createReadStream(extensionPath);
  fileStream.pipe(res);

  fileStream.on('error', (err) => {
    console.error('Error streaming extension file:', err);
    res.status(500).json({ error: 'FILE_STREAM_ERROR' });
  });
});

// Get extension installation instructions
router.get('/install-info', (req, res) => {
  res.json({
    downloadUrl: `${req.protocol}://${req.get('host')}/extension/download`,
    instructions: [
      '1. Download the extension ZIP file',
      '2. Extract the ZIP file to a folder',
      '3. Open Chrome and go to chrome://extensions/',
      '4. Enable "Developer mode" (top right toggle)',
      '5. Click "Load unpacked" button',
      '6. Select the extracted spectaglint-extension folder',
      '7. The extension should now be installed and active'
    ],
    version: '1.0.0',
    name: 'Spectaglint AI Companion'
  });
});

module.exports = router;
