const { supabase } = require('../lib/supabase');

/**
 * Verifies the Supabase JWT from the Authorization header.
 * Attaches the authenticated user to req.user.
 */
const authenticate = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    let token;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
    } else if (req.query.token) {
        token = req.query.token;
    }

    if (!token) {
        return res.status(401).json({ error: 'MISSING_AUTHORIZATION_TOKEN' });
    }

    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
        console.error('[Auth Error]', error);
        return res.status(401).json({ error: 'INVALID_OR_EXPIRED_TOKEN', details: error?.message });
    }

    if (!user.email_confirmed_at) {
        return res.status(403).json({ error: 'EMAIL_NOT_VERIFIED' });
    }

    req.user = user;
    next();
};

module.exports = { authenticate };
