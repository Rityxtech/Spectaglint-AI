const express = require('express');
const router = express.Router();
const { query } = require('../lib/db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ── FILE UPLOAD SETUP ─────────────────────────────────────
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dest = path.join(__dirname, '../../uploads');
        if (!fs.existsSync(dest)) fs.mkdirSync(dest);
        cb(null, dest);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `resume_${req.user.id}_${Date.now()}${ext}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype !== 'application/pdf') {
            return cb(new Error('LIMIT_FILE_TYPE: ONLY_PDF_ACCEPTED'));
        }
        cb(null, true);
    }
});

// POST /config/profile/resume
router.post('/profile/resume', upload.single('resume'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'NO_FILE_UPLOADED' });

    const resume_url = `/uploads/${req.file.filename}`;
    await query('UPDATE profiles SET resume_url = $1 WHERE id = $2', [resume_url, req.user.id]);

    res.json({ resume_url });
});

// GET /config
router.get('/', async (req, res) => {
    const { rows } = await query('SELECT * FROM node_config WHERE user_id = $1', [req.user.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'CONFIG_NOT_FOUND' });
    res.json(rows[0]);
});

// PUT /config
router.put('/', async (req, res) => {
    const { system_prompt, modifier_direct_only, modifier_translate_spanish, modifier_detect_jargon, inference_model } = req.body;
    const ALLOWED_MODELS = ['llama-3.1-8b-instant', 'llama-3.3-70b-versatile', 'mixtral-8x7b-32768'];

    if (inference_model && !ALLOWED_MODELS.includes(inference_model)) {
        return res.status(400).json({ error: 'INVALID_MODEL', allowed: ALLOWED_MODELS });
    }

    const fields = []; const params = [];
    if (system_prompt !== undefined) { params.push(system_prompt.slice(0, 2000)); fields.push(`system_prompt = $${params.length}`); }
    if (modifier_direct_only !== undefined) { params.push(Boolean(modifier_direct_only)); fields.push(`modifier_direct_only = $${params.length}`); }
    if (modifier_translate_spanish !== undefined) { params.push(Boolean(modifier_translate_spanish)); fields.push(`modifier_translate_spanish = $${params.length}`); }
    if (modifier_detect_jargon !== undefined) { params.push(Boolean(modifier_detect_jargon)); fields.push(`modifier_detect_jargon = $${params.length}`); }
    if (inference_model) { params.push(inference_model); fields.push(`inference_model = $${params.length}`); }

    if (fields.length === 0) return res.status(400).json({ error: 'NO_FIELDS' });

    fields.push(`updated_at = NOW()`);
    params.push(req.user.id);

    const { rows } = await query(
        `UPDATE node_config SET ${fields.join(', ')} WHERE user_id = $${params.length} RETURNING *`,
        params
    );
    res.json(rows[0]);
});

// GET /config/profile
router.get('/profile', async (req, res) => {
    const { rows } = await query(
        'SELECT username, full_name, avatar_url, telegram_chat_id, telegram_bot_token, preferred_lang, bio, skills, experience, projects, resume_url, social_links, active_node_region, created_at FROM profiles WHERE id = $1',
        [req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'PROFILE_NOT_FOUND' });

    const profile = rows[0];
    if (profile.telegram_bot_token) {
        profile.telegram_bot_token = '••••••••' + profile.telegram_bot_token.slice(-4);
    }
    res.json(profile);
});

// PUT /config/profile
router.put('/profile', async (req, res) => {
    const {
        username, avatar_url, telegram_chat_id, telegram_bot_token,
        preferred_lang, full_name, bio, skills, experience, projects, social_links
    } = req.body;
    const fields = []; const params = [];

    if (username) {
        if (!/^.{3,50}$/.test(username)) return res.status(400).json({ error: 'INVALID_USERNAME' });
        params.push(username.trim()); fields.push(`username = $${params.length}`);
    }
    if (avatar_url !== undefined) { params.push(avatar_url); fields.push(`avatar_url = $${params.length}`); }
    if (telegram_chat_id !== undefined) { params.push(telegram_chat_id); fields.push(`telegram_chat_id = $${params.length}`); }
    if (telegram_bot_token !== undefined && !telegram_bot_token.startsWith('••••••••')) { params.push(telegram_bot_token); fields.push(`telegram_bot_token = $${params.length}`); }
    if (preferred_lang !== undefined) { params.push(preferred_lang); fields.push(`preferred_lang = $${params.length}`); }
    if (full_name !== undefined) { params.push(full_name); fields.push(`full_name = $${params.length}`); }
    if (bio !== undefined) { params.push(bio); fields.push(`bio = $${params.length}`); }
    if (skills !== undefined) { params.push(JSON.stringify(skills)); fields.push(`skills = $${params.length}`); }
    if (experience !== undefined) { params.push(JSON.stringify(experience)); fields.push(`experience = $${params.length}`); }
    if (projects !== undefined) { params.push(JSON.stringify(projects)); fields.push(`projects = $${params.length}`); }
    if (social_links !== undefined) { params.push(JSON.stringify(social_links)); fields.push(`social_links = $${params.length}`); }

    if (fields.length === 0) return res.status(400).json({ error: 'NO_FIELDS' });
    fields.push(`updated_at = NOW()`);
    params.push(req.user.id);

    try {
        const { rows } = await query(
            `UPDATE profiles SET ${fields.join(', ')} WHERE id = $${params.length} RETURNING *`,
            params
        );
        res.json(rows[0]);
    } catch (err) {
        if (err.code === '23505') return res.status(409).json({ error: 'USERNAME_ALREADY_TAKEN' });
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
