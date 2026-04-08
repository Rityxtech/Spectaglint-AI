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

            // Convert Markdown to Custom Terminal HTML
            let html = compiledAnswers.trim()
                .replace(/</g, '&lt;').replace(/>/g, '&gt;'); // sanitize

            // Headers
            html = html.replace(/^###\s+(.*$)/gm, '<div class="text-primary font-black tracking-[0.15em] text-[11px] md:text-[13px] border-b border-primary/20 pb-2 mt-6 mb-3 uppercase flex items-center gap-2"><span class="animate-pulse">▶</span> $1</div>');
            html = html.replace(/^##\s+(.*$)/gm, '<div class="text-primary/90 font-bold tracking-[0.1em] text-[11px] md:text-[12px] border-b border-outline-variant/10 pb-1 mt-5 mb-2 uppercase">$1</div>');
            html = html.replace(/^#\s+(.*$)/gm, '<div class="text-white font-black tracking-widest text-[12px] md:text-[14px] border-b border-white/20 pb-1 mt-6 mb-3 uppercase">$1</div>');

            // Bold
            html = html.replace(/\*\*(.*?)\*\*/g, '<span class="text-on-surface font-bold tracking-wide">$1</span>');

            // Inline Code
            html = html.replace(/`([^`]+)`/g, '<span class="bg-primary/10 text-primary px-1.5 py-0.5 rounded-[2px] font-mono text-[9px] mx-1">$1</span>');

            // Lists (+, -, *)
            html = html.replace(/^[\*\+\-]\s+(.*$)/gm, '<div class="flex items-start gap-2 my-2"><span class="text-primary/50 shrink-0 mt-[1px] text-[8px] leading-[14px]">◆</span><span class="text-on-surface-variant/90 leading-[1.6]">$1</span></div>');

            // Line Breaks / Plain text
            html = html.split('\n').map(line => {
                if (line.trim().startsWith('<div')) return line;
                if (line.trim() === '') return '<div class="h-2 md:h-3"></div>';
                return `<div class="text-on-surface-variant/70 my-1 leading-relaxed pl-1 md:pl-2 border-l border-outline-variant/10 ml-1">$1</div>`.replace('$1', line);
            }).join('');

            resultOutput = [{ type: 'AI_Q&A_DUMP', html }];

        } else {
            // Bulk Transcription Mode
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
