// ============================================================
// request-history.js - Requester Request History
// ============================================================

import { supabase } from './supabase.js';
import { checkSession, getCurrentUserWithRole, logout } from './auth.js';
import { NAVIGATION } from './roles.js';

let currentUser = null;
let allHistory = [];

async function init() {
    const session = await checkSession();
    if (!session) return;

    currentUser = await getCurrentUserWithRole();
    if (!currentUser) return;

    document.getElementById('loading').style.display = 'none';
    document.getElementById('app').style.display = 'block';
    document.getElementById('userInfo').textContent = currentUser.email;

    const rb = document.getElementById('roleBadge');
    rb.textContent = currentUser.role.toUpperCase();
    rb.className = `badge role-${currentUser.role}`;

    renderNav();
    await loadHistory();

    document.getElementById('logoutBtn').onclick = logout;
    document.getElementById('historyFilter').onchange = renderTable;
}

function renderNav() {
    const nav = document.getElementById('mainNav');
    const links = NAVIGATION[currentUser.role] || [];
    nav.innerHTML = links.map(l =>
        `<a href="${l.href}" class="nav-link ${l.href === 'request-history.html' ? 'active' : ''}">${l.icon} ${l.label}</a>`
    ).join('') + `<a href="#" id="navLogout" class="nav-link nav-logout">🚪 Logout</a>`;
    document.getElementById('navLogout').onclick = (e) => {
        e.preventDefault();
        logout();
    };
}

async function loadHistory() {
    const { data, error } = await supabase
        .from('borrowing_transactions')
        .select(`
            *,
            equipment:equipment_id (asset_tag, name)
        `)
        .eq('requester_id', currentUser.id)
        .in('status', ['Returned', 'Closed', 'Rejected'])
        .order('id', { ascending: false });

    if (error) { console.error(error); return; }
    allHistory = data || [];
    renderTable();
}

function renderTable() {
    const body = document.getElementById('historyBody');
    const filter = document.getElementById('historyFilter').value;
    const filtered = filter ? allHistory.filter(h => h.status === filter) : allHistory;

    if (filtered.length === 0) {
        body.innerHTML = `<tr><td colspan="5" class="empty-row">No history yet</td></tr>`;
        return;
    }

    body.innerHTML = filtered.map(t => {
        const reqDate = t.request_date
            ? new Date(t.request_date).toLocaleDateString()
            : '—';
        const retDate = t.actual_return_date || '—';

        return `
            <tr>
                <td>#${t.id}</td>
                <td>${t.equipment?.asset_tag || '—'} - ${t.equipment?.name || ''}</td>
                <td>${reqDate}</td>
                <td>${retDate}</td>
                <td><span class="badge status-${t.status.toLowerCase()}">${t.status}</span></td>
            </tr>
        `;
    }).join('');
}

init();
