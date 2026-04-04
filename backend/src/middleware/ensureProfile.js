const { query } = require('../lib/db');

/**
 * Ensures a profile + wallet + node_config row exists for the authenticated user.
 * Called automatically on every protected request — idempotent (safe to call repeatedly).
 * Replaces the Supabase on_auth_user_created trigger.
 */
const ensureProfile = async (req, res, next) => {
    const user = req.user;
    try {
        const { rows } = await query(
            'SELECT id FROM profiles WHERE id = $1',
            [user.id]
        );

        if (rows.length === 0) {
            // First time this user hits the API — bootstrap their records
            const username = user.user_metadata?.username || user.email.split('@')[0];

            await query(
                `INSERT INTO profiles (id, username) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`,
                [user.id, username]
            );

            await query(
                `INSERT INTO wallets (user_id, balance, lifetime_earned)
         VALUES ($1, 50, 50) ON CONFLICT (user_id) DO NOTHING`,
                [user.id]
            );

            await query(
                `INSERT INTO coin_transactions (user_id, type, amount, balance_after, description, status)
         VALUES ($1, 'bonus', 50, 50, 'WELCOME_PROTOCOL — 50 free coins granted', 'completed')
         ON CONFLICT DO NOTHING`,
                [user.id]
            );

            await query(
                `INSERT INTO node_config (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`,
                [user.id]
            );
        }

        next();
    } catch (err) {
        console.error('[ENSURE_PROFILE_ERROR]', err.message);
        next(); // Non-fatal — still proceed with the request
    }
};

module.exports = { ensureProfile };
