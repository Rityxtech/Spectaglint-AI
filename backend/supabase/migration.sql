-- ============================================================
-- OBSIDIAN_TRANS — Supabase PostgreSQL Migration
-- Run this in: Supabase Dashboard > SQL Editor
-- ============================================================

-- ── ENUMS ──────────────────────────────────────────────────
CREATE TYPE coin_tx_type AS ENUM ('purchase', 'deduction', 'bonus', 'refund', 'adjustment');
CREATE TYPE coin_tx_status AS ENUM ('pending', 'completed', 'failed', 'reversed');
CREATE TYPE meeting_platform AS ENUM ('google_meet', 'zoom', 'teams', 'webex', 'other');
CREATE TYPE meeting_status AS ENUM ('active', 'completed', 'archived');

-- ── TABLE: profiles ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id                  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username            TEXT UNIQUE NOT NULL,
  avatar_url          TEXT,
  telegram_chat_id    TEXT,
  telegram_bot_token  TEXT,
  preferred_lang      TEXT DEFAULT 'en',
  active_node_region  TEXT DEFAULT 'AUTO',
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ── TABLE: wallets ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wallets (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  balance          INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
  lifetime_earned  INTEGER NOT NULL DEFAULT 0,
  lifetime_spent   INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ── TABLE: coin_transactions ───────────────────────────────
CREATE TABLE IF NOT EXISTS coin_transactions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type          coin_tx_type NOT NULL,
  amount        INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  description   TEXT,
  reference_id  TEXT,
  status        coin_tx_status DEFAULT 'completed',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── TABLE: meetings ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS meetings (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title             TEXT NOT NULL DEFAULT 'Untitled Meeting',
  platform          meeting_platform DEFAULT 'other',
  participant_count INTEGER DEFAULT 0,
  duration_seconds  INTEGER DEFAULT 0,
  status            meeting_status DEFAULT 'active',
  started_at        TIMESTAMPTZ DEFAULT NOW(),
  ended_at          TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ── TABLE: transcripts ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS transcripts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id       UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  speaker_label    TEXT DEFAULT 'UNKNOWN',
  content          TEXT NOT NULL,
  timestamp_offset INTEGER DEFAULT 0,
  is_question      BOOLEAN DEFAULT FALSE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ── TABLE: ai_responses ────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_responses (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id       UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  transcript_id    UUID REFERENCES transcripts(id) ON DELETE SET NULL,
  user_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  question         TEXT NOT NULL,
  answer           TEXT NOT NULL,
  confidence_score DECIMAL(5,2) DEFAULT 0.00,
  coins_deducted   INTEGER NOT NULL DEFAULT 1,
  model_used       TEXT DEFAULT 'llama3-8b-8192',
  response_time_ms INTEGER,
  delivered_via    TEXT DEFAULT 'web',
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ── TABLE: node_config ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS node_config (
  id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                    UUID UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  system_prompt              TEXT DEFAULT 'Answer concisely and accurately.',
  modifier_direct_only       BOOLEAN DEFAULT TRUE,
  modifier_translate_spanish BOOLEAN DEFAULT FALSE,
  modifier_detect_jargon     BOOLEAN DEFAULT TRUE,
  inference_model            TEXT DEFAULT 'llama3-8b-8192',
  created_at                 TIMESTAMPTZ DEFAULT NOW(),
  updated_at                 TIMESTAMPTZ DEFAULT NOW()
);

-- ── INDEXES for performance ────────────────────────────────
CREATE INDEX idx_coin_tx_user    ON coin_transactions(user_id, created_at DESC);
CREATE INDEX idx_meetings_user   ON meetings(user_id, created_at DESC);
CREATE INDEX idx_transcripts_mtg ON transcripts(meeting_id, timestamp_offset);
CREATE INDEX idx_ai_resp_meeting ON ai_responses(meeting_id, created_at DESC);
CREATE INDEX idx_ai_resp_user    ON ai_responses(user_id, created_at DESC);

-- ── TRIGGER: removed (handled by ensureProfile.js middleware in Railway API) ──

-- ── FUNCTION: atomic coin deduction ───────────────────────
CREATE OR REPLACE FUNCTION deduct_coins(
  p_user_id    UUID,
  p_amount     INTEGER,
  p_description TEXT,
  p_reference_id TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_balance     INTEGER;
  v_new_balance INTEGER;
BEGIN
  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Amount must be positive');
  END IF;

  -- Pessimistic lock on the wallet row
  SELECT balance INTO v_balance
  FROM wallets
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF v_balance IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Wallet not found');
  END IF;

  IF v_balance < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient coins', 'balance', v_balance);
  END IF;

  v_new_balance := v_balance - p_amount;

  UPDATE wallets
  SET balance = v_new_balance,
      lifetime_spent = lifetime_spent + p_amount,
      updated_at = NOW()
  WHERE user_id = p_user_id;

  INSERT INTO coin_transactions (user_id, type, amount, balance_after, description, reference_id)
  VALUES (p_user_id, 'deduction', -p_amount, v_new_balance, p_description, p_reference_id);

  RETURN jsonb_build_object('success', true, 'new_balance', v_new_balance, 'deducted', p_amount);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── FUNCTION: credit coins (purchases/refunds) ─────────────
CREATE OR REPLACE FUNCTION credit_coins(
  p_user_id     UUID,
  p_amount      INTEGER,
  p_type        coin_tx_type,
  p_description TEXT,
  p_reference_id TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_new_balance INTEGER;
BEGIN
  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Amount must be positive');
  END IF;

  UPDATE wallets
  SET balance = balance + p_amount,
      lifetime_earned = lifetime_earned + p_amount,
      updated_at = NOW()
  WHERE user_id = p_user_id
  RETURNING balance INTO v_new_balance;

  IF v_new_balance IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Wallet not found');
  END IF;

  INSERT INTO coin_transactions (user_id, type, amount, balance_after, description, reference_id)
  VALUES (p_user_id, p_type, p_amount, v_new_balance, p_description, p_reference_id);

  RETURN jsonb_build_object('success', true, 'new_balance', v_new_balance, 'credited', p_amount);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── ROW LEVEL SECURITY ─────────────────────────────────────
ALTER TABLE profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets           ENABLE ROW LEVEL SECURITY;
ALTER TABLE coin_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings          ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcripts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_responses      ENABLE ROW LEVEL SECURITY;
ALTER TABLE node_config       ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "profiles_self"     ON profiles FOR ALL      USING (auth.uid() = id);
-- wallets (read-only; mutations only via privileged functions)
CREATE POLICY "wallets_read_self" ON wallets  FOR SELECT   USING (auth.uid() = user_id);
-- coin_transactions (immutable ledger; append via functions only)
CREATE POLICY "tx_read_self"      ON coin_transactions FOR SELECT USING (auth.uid() = user_id);
-- meetings
CREATE POLICY "meetings_self"     ON meetings FOR ALL      USING (auth.uid() = user_id);
-- transcripts
CREATE POLICY "transcripts_self"  ON transcripts FOR ALL   USING (auth.uid() = user_id);
-- ai_responses
CREATE POLICY "ai_resp_self"      ON ai_responses FOR ALL  USING (auth.uid() = user_id);
-- node_config
CREATE POLICY "config_self"       ON node_config FOR ALL   USING (auth.uid() = user_id);
