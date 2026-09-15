import { supabase } from './supabase.js';
import { checkSession, getCurrentUserWithRole, logout } from './auth.js';
import { NAVIGATION } from './roles.js';

let currentUser = null;

async function init() {
    const sessionUser = await checkSession();
    if (!sessionUser) return;

    currentUser = await getCurrentUserWithRole();
    if (!currentUser) {
        window.location.href = 'login.html';
        return;
    }

    document.getElementById('loading').style.display = 'none';
    document.getElementById('app').style.display = 'block';

    document.getElementById('welcomeName').textContent = currentUser.full_name || currentUser.email;
    document.getElementById('userInfo').textContent = currentUser.email;

    const roleBadge = document.getElementById('roleBadge');
    roleBadge.textContent = currentUser.role.toUpperCase();
    roleBadge.className = `badge role-${currentUser.role}`;

    renderNavigation(currentUser.role);
    await loadMetrics();

    document.getElementById('logoutBtn').addEventListener('click', logout);
}

function renderNavigation(role) {
    const nav = document.getElementById('mainNav');
    const links = NAVIGATION[role] || [];

    let html = links.map(link =>
        `<a href="${link.href}" class="nav-link">
            <span>${link.icon}</span> ${link.label}
        </a>`
    ).join('');

    html += `<a href="#" id="navLogout" class="nav-link nav-logout">
        <span>🚪</span> Logout
    </a>`;

    nav.innerHTML = html;

    document.getElementById('navLogout').addEventListener('click', (e) => {
        e.preventDefault();
        logout();
    });
}

async function loadMetrics() {
    try {
        const { data: equipment } = await supabase.from('equipment').select('status');

        if (equipment) {
            document.getElementById('totalEquipment').textContent = equipment.length;
            document.getElementById('availableEquipment').textContent =
                equipment.filter(e => e.status === 'Available').length;
            document.getElementById('borrowedEquipment').textContent =
                equipment.filter(e => e.status === 'Borrowed').length;
        }

        if (currentUser.role === 'admin' || currentUser.role === 'staff') {
            const { data: pending } = await supabase
                .from('borrowing_transactions')
                .select('id')
                .eq('status', 'Pending');
            document.getElementById('pendingApprovals').textContent = pending?.length || 0;
        } else {
            const { data: myPending } = await supabase
                .from('borrowing_transactions')
                .select('id')
                .eq('requester_id', currentUser.id)
                .eq('status', 'Pending');
            document.getElementById('pendingApprovals').textContent = myPending?.length || 0;
        }
    } catch (err) {
        console.error('Metrics error:', err);
    }
}

init();
