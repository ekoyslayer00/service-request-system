import { supabase } from './supabase.js';
import { checkSession, getCurrentUserWithRole, logout } from './auth.js';
import { NAVIGATION } from './roles.js';

let currentUser = null;

async function init() {
    const session = await checkSession();
    if (!session) return;

    currentUser = await getCurrentUserWithRole();
    if (!currentUser) return;

    // Block non-admin
    if (currentUser.role !== 'admin') {
        alert('❌ Access Denied: Reports is Admin only.');
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
    await loadReports();

    document.getElementById('logoutBtn').onclick = logout;
}

function renderNav() {
    const nav = document.getElementById('mainNav');
    const links = NAVIGATION[currentUser.role] || [];
    nav.innerHTML = links.map(l =>
        `<a href="${l.href}" class="nav-link ${l.href === 'reports.html' ? 'active' : ''}">${l.icon} ${l.label}</a>`
    ).join('') + `<a href="#" id="navLogout" class="nav-link nav-logout">🚪 Logout</a>`;
    document.getElementById('navLogout').onclick = (e) => {
        e.preventDefault();
        logout();
    };
}

async function loadReports() {
    // Equipment stats
    const { data: equipment } = await supabase.from('equipment').select('status');
    if (equipment) {
        document.getElementById('rptTotal').textContent = equipment.length;
        document.getElementById('rptAvailable').textContent =
            equipment.filter(e => e.status === 'Available').length;
        document.getElementById('rptBorrowed').textContent =
            equipment.filter(e => e.status === 'Borrowed').length;
        document.getElementById('rptMaintenance').textContent =
            equipment.filter(e => e.status === 'Maintenance').length;

        // Equipment by status table
        const statusCounts = {};
        equipment.forEach(e => {
            statusCounts[e.status] = (statusCounts[e.status] || 0) + 1;
        });

        const total = equipment.length || 1;
        const statusBody = document.getElementById('equipmentStatusBody');
        statusBody.innerHTML = Object.entries(statusCounts).map(([status, count]) => `
            <tr>
                <td><span class="badge eq-${status.toLowerCase()}">${status}</span></td>
                <td><strong>${count}</strong></td>
                <td>${((count / total) * 100).toFixed(1)}%</td>
            </tr>
        `).join('') || '<tr><td colspan="3" class="empty-row">No data</td></tr>';
    }

    // Borrowing stats
    const { data: borrowing } = await supabase.from('borrowing_transactions').select('status');
    if (borrowing) {
        document.getElementById('rptTotalReq').textContent = borrowing.length;
        document.getElementById('rptPending').textContent =
            borrowing.filter(b => b.status === 'Pending').length;
        document.getElementById('rptApproved').textContent =
            borrowing.filter(b => b.status === 'Approved' || b.status === 'Released').length;
        document.getElementById('rptCompleted').textContent =
            borrowing.filter(b => b.status === 'Returned' || b.status === 'Closed').length;
    }

    // Recent activity
    const { data: logs } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

    const activityBody = document.getElementById('recentActivityBody');
    activityBody.innerHTML = (logs && logs.length > 0)
        ? logs.map(l => `
            <tr>
                <td>${l.user_email || '—'}</td>
                <td><strong>${l.action}</strong></td>
                <td>${l.module}</td>
                <td>${l.description || '—'}</td>
                <td>${new Date(l.created_at).toLocaleString()}</td>
            </tr>
        `).join('')
        : '<tr><td colspan="5" class="empty-row">No activity yet</td></tr>';
}

init();
