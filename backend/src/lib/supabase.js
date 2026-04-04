require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Supabase is used ONLY for Auth (JWT verification, email OTP)
// All data operations go to Railway PostgreSQL via src/lib/db.js
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY  // anon key is sufficient for auth.getUser()
);

module.exports = { supabase };
