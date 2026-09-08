// ============================================================
// auth.js - Authentication Functions
// ============================================================

import { supabase } from './supabase.js';

const loginPage = document.getElementById('loginPage');
const loginForm = document.getElementById('loginForm');
const loginEmail = document.getElementById('loginEmail');
const loginPassword = document.getElementById('loginPassword');
const loginError = document.getElementById('loginError');

// ===== LOGIN =====
loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.textContent = '';

    const email = loginEmail.value.trim();
    const password = loginPassword.value.trim();

    if (!email || !password) {
        loginError.textContent = 'Please fill in all fields.';
        return;
    }

    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            loginError.textContent = 'Invalid email or password.';
            return;
        }

        window.location.href = 'index.html';
    } catch (err) {
        loginError.textContent = 'An unexpected error occurred.';
    }
});

// ===== CHECK SESSION =====
export async function checkSession() {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            window.location.href = 'login.html';
            return null;
        }
        return session.user;
    } catch (err) {
        console.error('Session check error:', err);
        window.location.href = 'login.html';
        return null;
    }
}

// ===== LOGOUT =====
export async function logout() {
    await supabase.auth.signOut();
    window.location.href = 'login.html';
}

// ===== AUTO-REDIRECT: If already logged in, go to dashboard =====
if (window.location.pathname.includes('login.html')) {
    supabase.auth.getSession()
        .then(({ data: { session } }) => {
            if (session) window.location.href = 'index.html';
        })
        .catch((err) => console.error('Auto-redirect session check error:', err));
}
