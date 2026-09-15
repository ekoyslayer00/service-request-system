import { supabase } from './supabase.js';
import { checkSession, getCurrentUserWithRole, logout } from './auth.js';
import { NAVIGATION } from './roles.js';
import { processReturn } from './borrowing.js';

let currentUser = null;
let returnableTx = [];

async function init() {
    const session = await checkSession();
    if (!session) return;

    currentUser = await getCurrentUserWithRole();
    if (!currentUser) return;

    if (!['admin', 'staff'].includes(currentUser.role)) {
        alert('❌ Access Denied: Staff/Admin only.');
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
    await loadReturns();

    document.getElementById('logoutBtn').onclick = logout;
}

function renderNav() {
    const nav = document.getElementById('mainNav');
    const links = NAVIGATION[currentUser.role] || [];
    nav.innerHTML = links.map(l =>
        `<a href="${l.href}" class="nav-link ${l.href === 'returns.html' ? 'active' : ''}">${l.icon} ${l.label}</a>`
    ).join('') + `<a href="#" id="navLogout" class="nav-link nav-logout">🚪 Logout</a>`;
    document.getElementById('navLogout').onclick = (e) => {
        e.preventDefault();
        logout();
    };
}

async function loadReturns() {
    const { data, error } = await supabase
        .from('borrowing_transactions')
        .select(`
            *,
            equipment:equipment_id (asset_tag, name),
            requester:requester_id (email)
        `)
        .in('status', ['Released', 'Overdue'])
        .order('released_at', { ascending: false });

    if (error) { console.error(error); return; }
    returnableTx = data || [];
    renderTable();
}

function renderTable() {
    const body = document.getElementById('returnsBody');

    if (returnableTx.length === 0) {
        body.innerHTML = `<tr><td colspan="7" class="empty-row">No equipment to return</td></tr>`;
        return;
    }

    body.innerHTML = returnableTx.map(t => {
        const releasedDate = t.released_at
            ? new Date(t.released_at).toLocaleDateString()
            : '—';
        const expectedDate = t.expected_return_date || '—';
        const isOverdue = t.status === 'Overdue';

        return `
            <tr>
                <td>#${t.id}</td>
                <td>${t.requester?.email || '—'}</td>
                <td>${t.equipment?.asset_tag || '—'} - ${t.equipment?.name || ''}</td>
                <td>${releasedDate}</td>
                <td style="${isOverdue ? 'color:#e74c3c;font-weight:bold;' : ''}">${expectedDate}</td>
                <td><span class="badge status-${t.status.toLowerCase()}">${t.status}</span></td>
                <td>
                    <div class="action-group">
                        <button class="btn btn-warning btn-sm" onclick="doReturn(${t.id}, false)">
                            📥 Return
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="doReturn(${t.id}, true)">
                            ⚠️ Return Damaged
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

window.doReturn = async (id, isDamaged) => {
    if (!confirm(isDamaged ? 'Mark as DAMAGED and return?' : 'Process return?')) return;

    try {
        await processReturn(id, currentUser.id, isDamaged);
        alert('✅ Return processed!');
        await loadReturns();
    } catch (err) {
        alert('❌ ' + err.message);
    }
};

init();
