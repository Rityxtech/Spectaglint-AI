require('dotenv').config();
const { Pool } = require('pg');

// Railway provides DATABASE_URL automatically when you attach a Postgres plugin.
// Locally, set it in your .env file.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
  // Removed strict ssl config — Railway's internal connection handles this automatically,
  // whereas forcing it can cause silent socket disconnects.
});

pool.on('error', (err) => {
  console.error('[DB] Unexpected pool error:', err.message);
});

/**
 * Universal query wrapper — mirrors the pg interface used throughout the routes.
 * Returns { rows: [...] }
 */
const query = async (text, params = []) => {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return { rows: result.rows };
  } catch (err) {
    console.error('[DB Query Error]', err.message, '\nSQL:', text);
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Returns a pooled client for manual transaction control (BEGIN/COMMIT/ROLLBACK).
 * Caller MUST call client.release() when done.
 */
const getClient = async () => {
  const client = await pool.connect();
  return {
    query: async (text, params = []) => {
      const result = await client.query(text, params);
      return { rows: result.rows };
    },
    release: () => client.release()
  };
};

/**
 * Initialize required tables if they don't exist.
 * Called once on startup.
 */
const initSchema = async () => {
  await pool.query(`
        CREATE TABLE IF NOT EXISTS profiles (
            id UUID PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            avatar_url TEXT,
            telegram_chat_id TEXT,
            telegram_bot_token TEXT,
            preferred_lang TEXT DEFAULT 'en',
            active_node_region TEXT DEFAULT 'AUTO',
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS wallets (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
            balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
            lifetime_earned INTEGER NOT NULL DEFAULT 0,
            lifetime_spent INTEGER NOT NULL DEFAULT 0,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS coin_transactions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
            type TEXT NOT NULL,
            amount INTEGER NOT NULL,
            balance_after INTEGER NOT NULL,
            description TEXT,
            reference_id TEXT,
            status TEXT DEFAULT 'completed',
            created_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS meetings (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
            title TEXT NOT NULL DEFAULT 'Untitled Meeting',
            platform TEXT DEFAULT 'other',
            participant_count INTEGER DEFAULT 0,
            duration_seconds INTEGER DEFAULT 0,
            status TEXT DEFAULT 'active',
            started_at TIMESTAMPTZ DEFAULT NOW(),
            ended_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS transcripts (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
            user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
            speaker_label TEXT DEFAULT 'UNKNOWN',
            content TEXT NOT NULL,
            timestamp_offset INTEGER DEFAULT 0,
            is_question BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS ai_responses (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
            transcript_id UUID REFERENCES transcripts(id) ON DELETE SET NULL,
            user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
            question TEXT NOT NULL,
            answer TEXT NOT NULL,
            confidence_score REAL DEFAULT 0.00,
            coins_deducted INTEGER NOT NULL DEFAULT 1,
            model_used TEXT DEFAULT 'llama-3.1-8b-instant',
            response_time_ms INTEGER,
            delivered_via TEXT DEFAULT 'web',
            created_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS node_config (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
            system_prompt TEXT DEFAULT 'Answer concisely and accurately.',
            modifier_direct_only BOOLEAN DEFAULT TRUE,
            modifier_translate_spanish BOOLEAN DEFAULT FALSE,
            modifier_detect_jargon BOOLEAN DEFAULT TRUE,
            inference_model TEXT DEFAULT 'llama-3.1-8b-instant',
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
    `);
  console.log('[DB] Schema initialized.');
};

// Run schema init at startup only if DATABASE_URL is provided
if (process.env.DATABASE_URL) {
  initSchema().catch(err => {
    let errMsg = err.message;
    if (!errMsg) errMsg = JSON.stringify(err, Object.getOwnPropertyNames(err));
    console.error('====================================================');
    console.error('[DB FATAL] Schema init failed:');
    console.error(errMsg);
    console.error('====================================================');
  });
} else {
  console.error('====================================================');
  console.error('[DB FATAL] DATABASE_URL is missing!');
  console.error('[DB FATAL] Please add a PostgreSQL plugin in Railway.');
  console.error('====================================================');
}

module.exports = { query, getClient, pool };
