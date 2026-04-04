require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const { standard } = require('./middleware/rateLimit');
const { authenticate } = require('./middleware/auth');
const { ensureProfile } = require('./middleware/ensureProfile');

const app = express();
const PORT = process.env.PORT || 3000;
const path = require('path');

// ── Serve Static Uploads ──────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ── Security Headers ──────────────────────────────────────
app.use(helmet());

// ── CORS ─────────────────────────────────────────────────
const ALLOWED_ORIGINS = [
    process.env.FRONTEND_URL,           // Vercel prod URL
    'http://localhost:5173',            // Vite dev
    'http://localhost:3000',
    'http://localhost:3001',            // Web app localhost
].filter(Boolean);

app.use(cors({
    origin: (origin, cb) => {
        // Allow extension and our trusted origins
        if (!origin || origin.startsWith('chrome-extension://') || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
        cb(new Error(`CORS_BLOCKED: ${origin}`));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// ── Body Parsers ──────────────────────────────────────────
// NOTE: Stripe webhook route needs raw body — mounted separately in wallet.js
app.use((req, res, next) => {
    if (req.originalUrl === '/wallet/webhook') return next();
    express.json({ limit: '100kb' })(req, res, next);
});

// ── Health Check (public) ─────────────────────────────────
app.get('/health', (req, res) => {
    res.json({
        status: 'ONLINE',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        node: process.env.NODE_ENV || 'development'
    });
});

// ── DB Debug Check (public) ───────────────────────────────
// Visit this purely to confirm if the tables were built on Railway.
app.get('/test-db', async (req, res) => {
    const { pool } = require('./lib/db');
    try {
        const result = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        `);
        res.json({
            status: 'success',
            message: 'Database connection is alive.',
            tablesFound: result.rows.map(r => r.table_name)
        });
    } catch (err) {
        res.status(500).json({ error: 'DB_ERROR', message: err.message, stack: err.stack });
    }
});

// ── Stripe Webhook (public, raw body) ────────────────────
const walletRouter = require('./routes/wallet');
app.use('/wallet/webhook', express.raw({ type: 'application/json' }), walletRouter);

// ── Global Rate Limit ─────────────────────────────────────
app.use(standard);

// ── Auth Guard (all routes below require valid JWT) ───────
app.use(authenticate);

// ── Bootstrap Profile (auto-creates DB records on first hit)
app.use(ensureProfile);

// ── Protected Routes ──────────────────────────────────────
const { aiEndpoint } = require('./middleware/rateLimit');

app.use('/meetings', require('./routes/meetings'));
app.use('/transcripts', require('./routes/transcripts'));
app.use('/ai', aiEndpoint, require('./routes/ai'));
app.use('/wallet', walletRouter);
app.use('/config', require('./routes/config'));
app.use('/live', require('./routes/live')); // SSE & Audio Uploads

// ── 404 Handler ───────────────────────────────────────────
app.use((req, res) => {
    res.status(404).json({ error: 'ENDPOINT_NOT_FOUND', path: req.path });
});

// ── Global Error Handler ──────────────────────────────────
app.use((err, req, res, next) => {
    console.error(`[${new Date().toISOString()}] ERROR:`, err.message);
    res.status(500).json({ error: 'INTERNAL_SERVER_ERROR', message: err.message });
});

// ── Start Server ──────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`[OBSIDIAN_TRANS API] NODE_ACTIVE on port ${PORT} — ENV: ${process.env.NODE_ENV}`);
});

module.exports = app;
