import { supabase } from './supabase.js';
import { checkSession, getCurrentUserWithRole, logout } from './auth.js';
import { NAVIGATION } from './roles.js';

let currentUser = null;

async function init() {
    const session = await checkSession();
    if (!session) return;
    currentUser = await getCurrentUserWithRole();
    if (!currentUser) return;

    // BLOCK non-admin
    if (currentUser.role !== 'admin') {
        alert('❌ Access Denied: Admin only');
        window.location.href = 'index.html';
        return;
    }

    document.getElementById('loading').style.display = 'none';
    document.getElementById('app').style.display = 'block';
    document.getElementById('userInfo').textContent = currentUser.email;
    const rb = document.getElementById('roleBadge');
    rb.textContent = currentUser.role.toUpperCase();
    rb.className = `badge role-${currentUser.role}`;

    renderNav();
    await loadLogs();
}

function renderNav() {
    const nav = document.getElementById('mainNav');
    const links = NAVIGATION[currentUser.role] || [];
    nav.innerHTML = links.map(l =>
        `<a href="${l.href}" class="nav-link ${l.href === 'audit-logs.html' ? 'active' : ''}">${l.icon} ${l.label}</a>`
    ).join('') + `<a href="#" id="navLogout" class="nav-link nav-logout">🚪 Logout</a>`;
    document.getElementById('navLogout').onclick = (e) => { e.preventDefault(); logout(); };
}

async function loadLogs() {
    const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

    if (error) { console.error(error); return; }

    const body = document.getElementById('auditBody');
    if (!data || data.length === 0) {
        body.innerHTML = `<tr><td colspan="7" class="empty-row">No audit logs yet</td></tr>`;
        return;
    }

    body.innerHTML = data.map(l => `
        <tr>
            <td>#${l.id}</td>
            <td>${l.user_email || '—'}</td>
            <td><strong>${l.action}</strong></td>
            <td>${l.module}</td>
            <td>${l.record_id || '—'}</td>
            <td>${l.description || '—'}</td>
            <td>${new Date(l.created_at).toLocaleString()}</td>
        </tr>
    `).join('');

    document.getElementById('logoutBtn').onclick = logout;
}

init();
