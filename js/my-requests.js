// ============================================================
// my-requests.js - My Requests + New Request Button
// ============================================================

import { supabase } from './supabase.js';
import { checkSession, getCurrentUserWithRole, logout } from './auth.js';
import { NAVIGATION } from './roles.js';
import { createBorrowingRequest } from './borrowing.js';

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
    await loadEquipmentOptions();
    await loadMyRequests();
    setupEvents();
}

function renderNav() {
    const nav = document.getElementById('mainNav');
    const links = NAVIGATION[currentUser.role] || [];
    nav.innerHTML = links.map(l =>
        `<a href="${l.href}" class="nav-link ${l.href === 'my-requests.html' ? 'active' : ''}">${l.icon} ${l.label}</a>`
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

async function loadMyRequests() {
    const { data, error } = await supabase
        .from('borrowing_transactions')
        .select(`
            *,
            equipment:equipment_id (asset_tag, name)
        `)
        .eq('requester_id', currentUser.id)
        .order('id', { ascending: false });

    if (error) {
        console.error(error);
        return;
    }

    const body = document.getElementById('myReqBody');
    if (!data || data.length === 0) {
        body.innerHTML = `<tr><td colspan="5" class="empty-row">You have no requests yet. Click "New Request" to start.</td></tr>`;
        return;
    }

    body.innerHTML = data.map(t => `
        <tr>
            <td>#${t.id}</td>
            <td>${t.equipment?.asset_tag || '—'} - ${t.equipment?.name || ''}</td>
            <td>${t.request_date ? new Date(t.request_date).toLocaleDateString() : '—'}</td>
            <td>${t.expected_return_date || '—'}</td>
            <td><span class="badge status-${t.status.toLowerCase()}">${t.status}</span></td>
        </tr>
    `).join('');
}

function setupEvents() {
    document.getElementById('logoutBtn').onclick = logout;

    // NEW REQUEST BUTTON
    const newBtn = document.getElementById('newRequestBtn');
    if (newBtn) {
        newBtn.onclick = async () => {
            document.getElementById('requestForm').reset();
            await loadEquipmentOptions(); // Refresh list
            document.getElementById('requestModal').style.display = 'flex';
        };
    }

    // Close modal
    const closeBtn = document.getElementById('closeRequestModal');
    if (closeBtn) {
        closeBtn.onclick = () => {
            document.getElementById('requestModal').style.display = 'none';
        };
    }

    // Close on outside click
    window.addEventListener('click', (e) => {
        const modal = document.getElementById('requestModal');
        if (e.target === modal) modal.style.display = 'none';
    });

    // Form submit
    const form = document.getElementById('requestForm');
    if (form) {
        form.onsubmit = async (e) => {
            e.preventDefault();
            const equipmentId = document.getElementById('reqEquipment').value;
            const returnDate = document.getElementById('reqReturnDate').value;
            const purpose = document.getElementById('reqPurpose').value;

            if (!equipmentId) {
                alert('❌ No equipment selected');
                return;
            }

            try {
                await createBorrowingRequest(equipmentId, returnDate, purpose);
                alert('✅ Request submitted!');
                document.getElementById('requestModal').style.display = 'none';
                await loadMyRequests();
            } catch (err) {
                alert('❌ ' + err.message);
            }
        };
    }
}

init();
