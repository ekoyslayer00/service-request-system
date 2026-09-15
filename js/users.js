import { supabase } from './supabase.js';
import { checkSession, getCurrentUserWithRole, logout, logAudit } from './auth.js';
import { NAVIGATION } from './roles.js';

let currentUser = null;

async function init() {
    const session = await checkSession();
    if (!session) return;
    currentUser = await getCurrentUserWithRole();
    if (!currentUser) return;

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
    await loadUsers();
}

function renderNav() {
    const nav = document.getElementById('mainNav');
    const links = NAVIGATION[currentUser.role] || [];
    nav.innerHTML = links.map(l =>
        `<a href="${l.href}" class="nav-link ${l.href === 'users.html' ? 'active' : ''}">${l.icon} ${l.label}</a>`
    ).join('') + `<a href="#" id="navLogout" class="nav-link nav-logout">🚪 Logout</a>`;
    document.getElementById('navLogout').onclick = (e) => { e.preventDefault(); logout(); };
}

async function loadUsers() {
    const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('email');

    if (error) { console.error(error); return; }

    const body = document.getElementById('usersBody');
    body.innerHTML = (data || []).map(u => `
        <tr>
            <td>${u.email}</td>
            <td>${u.full_name || '—'}</td>
            <td>
                <select onchange="changeRole('${u.id}', this.value)">
                    <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option>
                    <option value="staff" ${u.role === 'staff' ? 'selected' : ''}>Staff</option>
                    <option value="requester" ${u.role === 'requester' ? 'selected' : ''}>Requester</option>
                </select>
            </td>
            <td>
                <span class="badge role-${u.role}">${u.role.toUpperCase()}</span>
            </td>
        </tr>
    `).join('');

    document.getElementById('logoutBtn').onclick = logout;
}

window.changeRole = async (userId, newRole) => {
    const { error } = await supabase
        .from('user_profiles')
        .update({ role: newRole, updated_at: new Date().toISOString() })
        .eq('id', userId);

    if (error) { alert('❌ ' + error.message); return; }

    await logAudit('ROLE_CHANGED', 'Users', userId, `Changed role to ${newRole}`);
    alert('✅ Role updated!');
    await loadUsers();
};

init();
