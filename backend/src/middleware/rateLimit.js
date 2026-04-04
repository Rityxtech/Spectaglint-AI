const rateLimit = require('express-rate-limit');

const standard = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.user?.id || req.ip,
    message: { error: 'RATE_LIMIT_EXCEEDED — slow down, operator' }
});

// Stricter limit for AI endpoint (costs coins)
const aiEndpoint = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.user?.id || req.ip,
    message: { error: 'AI_RATE_LIMIT_EXCEEDED — max 10 requests/min' }
});

module.exports = { standard, aiEndpoint };
