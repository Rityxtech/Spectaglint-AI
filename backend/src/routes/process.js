const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { authenticate } = require('../middleware/auth');
const { transcribeAudio, analyzeBulkTranscript } = require('../services/groqService');

const os = require('os');

// Configure Multer to save temporarily to OS temp directory
const uploadDir = path.join(os.tmpdir(), 'spectaglint-uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({
    storage,
    limits: { fileSize: 25 * 1024 * 1024 } // 25MB max limit mandated by Groq Whisper
});

/**
 * POST /process/audio
 * Accepts a multipart/form-data with { audioFile: File, mode: string }
 * Routes to Whisper and if necessary, LLaMA3
 */
router.post('/audio', authenticate, upload.single('audioFile'), async (req, res) => {
    const file = req.file;
    const mode = req.body.mode || 'FILE_TRANSCRIPTION';

    if (!file) {
        return res.status(400).json({ error: 'AUDIO_MISSING', message: 'No audio file provided.' });
    }

    try {
        // Step 1: Base Transcription through Groq Whisper-large-v3
        let rawTranscript = await transcribeAudio(file.path);

        if (!rawTranscript || rawTranscript.trim().length === 0) {
            throw new Error("Transcribed text is empty. No vocals detected.");
        }

        // Step 2: Extract Q&A if in File Answers mode
        let resultOutput = [];
        if (mode === 'FILE_ANSWERS') {
            const compiledAnswers = await analyzeBulkTranscript(rawTranscript);
            resultOutput = [
                { type: 'AI_Q&A_DUMP', html: compiledAnswers.replace(/\n/g, '<br/>') }
            ];
        } else {
            // Bulk Transcription Mode just ships raw chunks. Let's slice it pseudo-reasonably by sentences to make UI look like terminal logs.
            const chunks = rawTranscript.split('. ').filter(c => c.length > 2);
            resultOutput = chunks.map(chunk => ({
                type: 'RAW_TRANSCRIPT_CHUNK',
                html: chunk + '.'
            }));
        }

        // Delete temporary buffer on disk safely
        fs.unlinkSync(file.path);

        res.json({ success: true, blocks: resultOutput });

    } catch (error) {
        console.error('[Process Route]', error);
        if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path); // cleanup
        }
        res.status(500).json({ error: 'PROCESS_ERROR', message: error.message });
    }
});

module.exports = router;
