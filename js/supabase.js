// ============================================================
// supabase.js - Supabase Client Initialization
// ============================================================

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// ===== YOUR SUPABASE CREDENTIALS =====
const SUPABASE_URL = 'https://cfcuzjywrwxzqeolrdvb.supabase.co';  // ← Fixed: Removed /rest/v1/
const SUPABASE_ANON_KEY = 'sb_publishable_ewxy4ua7ei185Qv-nMbV0Q_LiMuud_s';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
}

export async function isAuthenticated() {
    const { data: { session } } = await supabase.auth.getSession();
    return !!session;
}