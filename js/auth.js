import { supabase } from './supabase.js';

// ===== LOGIN FORM =====
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');

loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (loginError) loginError.textContent = '';

    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value.trim();

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
        if (loginError) loginError.textContent = 'Invalid email or password.';
        return;
    }

    await logAudit('LOGIN', 'Auth', data.user.id, `${data.user.email} logged in`);
    window.location.href = 'index.html';
});

// ===== CHECK SESSION =====
export async function checkSession() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.href = 'login.html';
        return null;
    }
    return session.user;
}

// ===== GET CURRENT USER WITH ROLE =====
export async function getCurrentUserWithRole() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

    return {
        id: session.user.id,
        email: session.user.email,
        role: profile?.role || 'requester',
        full_name: profile?.full_name || session.user.email
    };
}

// ===== LOGOUT =====
export async function logout() {
    try {
        await logAudit('LOGOUT', 'Auth', null, 'User logged out');
    } catch (e) { /* ignore */ }
    await supabase.auth.signOut();
    window.location.href = 'login.html';
}

// ===== AUDIT HELPER =====
export async function logAudit(action, module, recordId, description) {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        await supabase.from('audit_logs').insert([{
            user_id: session.user.id,
            user_email: session.user.email,
            action: action,
            module: module,
            record_id: recordId ? String(recordId) : null,
            description: description
        }]);
    } catch (e) {
        console.warn('Audit log failed:', e);
    }
}

// ===== AUTO-REDIRECT IF ALREADY LOGGED IN =====
if (window.location.pathname.includes('login.html')) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) window.location.href = 'index.html';
}
