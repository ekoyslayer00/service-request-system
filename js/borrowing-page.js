import { supabase } from './supabase.js';
import { checkSession, getCurrentUserWithRole, logout } from './auth.js';
import { NAVIGATION } from './roles.js';
import {
    createBorrowingRequest,
    approveRequest,
    rejectRequest,
    releaseEquipment,
    processReturn
} from './borrowing.js';

let currentUser = null;
let allTx = [];

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
    await loadEquipmentOptions();
    await loadTransactions();
    setupEvents();
}

function renderNav() {
    const nav = document.getElementById('mainNav');
    const links = NAVIGATION[currentUser.role] || [];
    nav.innerHTML = links.map(l =>
        `<a href="${l.href}" class="nav-link ${l.href === 'borrowing.html' ? 'active' : ''}">${l.icon} ${l.label}</a>`
    ).join('') + `<a href="#" id="navLogout" class="nav-link nav-logout">🚪 Logout</a>`;
    document.getElementById('navLogout').onclick = (e) => {
        e.preventDefault();
        logout();
    };
}

async function loadEquipmentOptions() {
    const { data } = await supabase
        .from('equipment')
        .select('id, asset_tag, name, status')
        .eq('status', 'Available');

    const sel = document.getElementById('reqEquipment');
    if (sel) {
        sel.innerHTML = (data || []).length
            ? data.map(e => `<option value="${e.id}">${e.asset_tag} - ${e.name}</option>`).join('')
            : '<option value="">No equipment available</option>';
    }
}

async function loadTransactions() {
    let query = supabase.from('borrowing_transactions').select(`
        *,
        equipment:equipment_id (asset_tag, name),
        requester:requester_id (email)
    `).order('id', { ascending: false });

    if (currentUser.role === 'requester') {
        query = query.eq('requester_id', currentUser.id);
    }

    const { data, error } = await query;
    if (error) { console.error(error); return; }
    allTx = data || [];
    renderTable();
}

function renderTable() {
    const body = document.getElementById('borrowBody');
    const filterEl = document.getElementById('statusFilter');
    const filter = filterEl ? filterEl.value : '';
    const filtered = filter ? allTx.filter(t => t.status === filter) : allTx;

    if (filtered.length === 0) {
        body.innerHTML = `<tr><td colspan="6" class="empty-row">No requests found</td></tr>`;
        return;
    }

    const isAdmin = currentUser.role === 'admin';
    const isStaff = currentUser.role === 'staff';

    body.innerHTML = filtered.map(t => {
        let actions = '';
        if (isAdmin && t.status === 'Pending') {
            actions += `<button class="btn btn-success btn-sm" onclick="doApprove(${t.id})">✅ Approve</button> `;
            actions += `<button class="btn btn-danger btn-sm" onclick="doReject(${t.id})">❌ Reject</button>`;
        }
        if ((isAdmin || isStaff) && t.status === 'Approved') {
            actions += `<button class="btn btn-info btn-sm" onclick="doRelease(${t.id})">📤 Release</button>`;
        }
        if ((isAdmin || isStaff) && (t.status === 'Released' || t.status === 'Overdue')) {
            actions += `<button class="btn btn-warning btn-sm" onclick="doReturn(${t.id}, false)">📥 Return</button> `;
            actions += `<button class="btn btn-danger btn-sm" onclick="doReturn(${t.id}, true)">⚠️ Damaged</button>`;
        }
        if (!actions) actions = '<span style="color:#999;font-size:0.8rem;">—</span>';

        return `
            <tr>
                <td>#${t.id}</td>
                <td>${t.requester?.email || '—'}</td>
                <td>${t.equipment?.asset_tag || '—'} - ${t.equipment?.name || ''}</td>
                <td>${t.expected_return_date || '—'}</td>
                <td><span class="badge status-${t.status.toLowerCase()}">${t.status}</span></td>
                <td><div class="action-group">${actions}</div></td>
            </tr>
        `;
    }).join('');
}

window.doApprove = async (id) => {
    const tx = allTx.find(t => t.id === id);
    try {
        await approveRequest(id, currentUser.role, currentUser.id, tx.requester_id);
        alert('✅ Approved!');
        await loadTransactions();
    } catch (err) { alert('❌ ' + err.message); }
};

window.doReject = async (id) => {
    const reason = prompt('Rejection reason:');
    if (!reason) return;
    try {
        await rejectRequest(id, currentUser.role, currentUser.id, reason);
        alert('✅ Rejected');
        await loadTransactions();
    } catch (err) { alert('❌ ' + err.message); }
};

window.doRelease = async (id) => {
    try {
        await releaseEquipment(id, currentUser.role, currentUser.id);
        alert('✅ Released!');
        await loadTransactions();
    } catch (err) { alert('❌ ' + err.message); }
};

window.doReturn = async (id, isDamaged) => {
    try {
        await processReturn(id, currentUser.id, isDamaged);
        alert('✅ Returned!');
        await loadTransactions();
    } catch (err) { alert('❌ ' + err.message); }
};

function setupEvents() {
    document.getElementById('logoutBtn').onclick = logout;

    const filterEl = document.getElementById('statusFilter');
    if (filterEl) filterEl.onchange = renderTable;

    const closeBtn = document.getElementById('closeRequestModal');
    if (closeBtn) closeBtn.onclick = () =>
        document.getElementById('requestModal').style.display = 'none';

    const newBtn = document.getElementById('newRequestBtn');
    if (newBtn) newBtn.onclick = () => {
        document.getElementById('requestForm').reset();
        document.getElementById('requestModal').style.display = 'flex';
    };

    const form = document.getElementById('requestForm');
    if (form) form.onsubmit = async (e) => {
        e.preventDefault();
        const equipmentId = document.getElementById('reqEquipment').value;
        const returnDate = document.getElementById('reqReturnDate').value;
        const purpose = document.getElementById('reqPurpose').value;

        if (!equipmentId) { alert('No equipment selected'); return; }

        try {
            await createBorrowingRequest(equipmentId, returnDate, purpose);
            alert('✅ Request submitted!');
            document.getElementById('requestModal').style.display = 'none';
            await loadTransactions();
        } catch (err) { alert('❌ ' + err.message); }
    };
}

init();
