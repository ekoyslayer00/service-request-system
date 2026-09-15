import { supabase } from './supabase.js';
import { checkSession, getCurrentUserWithRole, logout } from './auth.js';
import { NAVIGATION } from './roles.js';

let currentUser = null;

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
    await loadMyRequests();
}

function renderNav() {
    const nav = document.getElementById('mainNav');
    const links = NAVIGATION[currentUser.role] || [];
    nav.innerHTML = links.map(l =>
        `<a href="${l.href}" class="nav-link ${l.href === 'my-requests.html' ? 'active' : ''}">${l.icon} ${l.label}</a>`
    ).join('') + `<a href="#" id="navLogout" class="nav-link nav-logout">🚪 Logout</a>`;
    document.getElementById('navLogout').onclick = (e) => { e.preventDefault(); logout(); };
}

async function loadMyRequests() {
    const { data, error } = await supabase
        .from('borrowing_transactions')
        .select(`
            *,
            equipment:equipment_id (asset_tag, name)
        `)
        .eq('requester_id', currentUser.id)
        .order('id', { ascending: false });

    if (error) { console.error(error); return; }

    const body = document.getElementById('myReqBody');
    if (!data || data.length === 0) {
        body.innerHTML = `<tr><td colspan="5" class="empty-row">You have no requests yet</td></tr>`;
        return;
    }

    body.innerHTML = data.map(t => `
        <tr>
            <td>#${t.id}</td>
            <td>${t.equipment?.asset_tag || '—'} - ${t.equipment?.name || ''}</td>
            <td>${new Date(t.request_date).toLocaleDateString()}</td>
            <td>${t.expected_return_date || '—'}</td>
            <td><span class="badge status-${t.status.toLowerCase()}">${t.status}</span></td>
        </tr>
    `).join('');

    document.getElementById('logoutBtn').onclick = logout;
}

init();
