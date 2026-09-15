// ============================================================
// equipment.js - Equipment Management (Lab 4)
// ============================================================

import { supabase } from './supabase.js';
import { checkSession, getCurrentUserWithRole, logout, logAudit } from './auth.js';
import { NAVIGATION, can } from './roles.js';

let currentUser = null;
let allEquipment = [];

async function init() {
    const session = await checkSession();
    if (!session) return;

    currentUser = await getCurrentUserWithRole();
    if (!currentUser) return;

    // Show app
    document.getElementById('loading').style.display = 'none';
    document.getElementById('app').style.display = 'block';
    document.getElementById('userInfo').textContent = currentUser.email;

    const rb = document.getElementById('roleBadge');
    rb.textContent = currentUser.role.toUpperCase();
    rb.className = `badge role-${currentUser.role}`;

    // ⚠️ HIDE "Add Equipment" button for non-admin/staff
    const addBtn = document.getElementById('addEquipmentBtn');
    if (addBtn && !['admin', 'staff'].includes(currentUser.role)) {
        addBtn.style.display = 'none';
    }

    renderNav();
    await loadEquipment();
    setupEvents();
}

function renderNav() {
    const nav = document.getElementById('mainNav');
    const links = NAVIGATION[currentUser.role] || [];
    nav.innerHTML = links.map(l =>
        `<a href="${l.href}" class="nav-link ${l.href === 'equipment.html' ? 'active' : ''}">${l.icon} ${l.label}</a>`
    ).join('') + `<a href="#" id="navLogout" class="nav-link nav-logout">🚪 Logout</a>`;

    document.getElementById('navLogout').onclick = (e) => {
        e.preventDefault();
        logout();
    };
}

async function loadEquipment() {
    const { data, error } = await supabase
        .from('equipment')
        .select('*')
        .order('id', { ascending: false });

    if (error) {
        console.error(error);
        return;
    }
    allEquipment = data || [];
    renderTable();
}

function renderTable() {
    const body = document.getElementById('equipmentBody');
    if (allEquipment.length === 0) {
        body.innerHTML = `<tr><td colspan="6" class="empty-row">No equipment found</td></tr>`;
        return;
    }

    const canManage = can(currentUser.role, 'manageEquipment');
    const canDelete = currentUser.role === 'admin';
    const isRequester = currentUser.role === 'requester';

    body.innerHTML = allEquipment.map(e => {
        let actions = '';

        // Admin/Staff: Edit/Delete
        if (canManage) {
            actions += `<button class="btn btn-info btn-sm" onclick="editEq(${e.id})">✏️ Edit</button> `;
        }
        if (canDelete) {
            actions += `<button class="btn btn-danger btn-sm" onclick="deleteEq(${e.id})">🗑️ Delete</button>`;
        }

        // Requester: "Request" button for available equipment
        if (isRequester && e.status === 'Available') {
            actions += `<a href="my-requests.html" class="btn btn-success btn-sm">📤 Request</a>`;
        }

        // Requester view-only label
        if (isRequester && e.status !== 'Available') {
            actions += `<span style="color:#999;font-size:0.8rem;">👁️ View only</span>`;
        }

        // Fallback
        if (!actions) {
            actions = '<span style="color:#999;font-size:0.8rem;">👁️ View only</span>';
        }

        return `
            <tr>
                <td>#${e.id}</td>
                <td><strong>${e.asset_tag}</strong></td>
                <td>${e.name}</td>
                <td>${e.category || '—'}</td>
                <td><span class="badge eq-${e.status.toLowerCase()}">${e.status}</span></td>
                <td><div class="action-group">${actions}</div></td>
            </tr>
        `;
    }).join('');
}

window.editEq = (id) => {
    const e = allEquipment.find(x => x.id === id);
    if (!e) return;

    document.getElementById('modalTitle').textContent = 'Edit Equipment';
    document.getElementById('equipmentId').value = e.id;
    document.getElementById('eqAssetTag').value = e.asset_tag;
    document.getElementById('eqName').value = e.name;
    document.getElementById('eqCategory').value = e.category || '';
    document.getElementById('eqStatus').value = e.status;
    document.getElementById('eqDescription').value = e.description || '';
    document.getElementById('equipmentModal').style.display = 'flex';
};

window.deleteEq = async (id) => {
    if (!confirm('Delete this equipment?')) return;
    const { error } = await supabase.from('equipment').delete().eq('id', id);
    if (error) {
        alert(error.message);
        return;
    }
    await logAudit('DELETED', 'Equipment', id, `Deleted equipment #${id}`);
    await loadEquipment();
};

function setupEvents() {
    document.getElementById('logoutBtn').onclick = logout;

    const closeBtn = document.getElementById('closeModal');
    if (closeBtn) closeBtn.onclick = () =>
        document.getElementById('equipmentModal').style.display = 'none';

    const addBtn = document.getElementById('addEquipmentBtn');
    if (addBtn) {
        addBtn.onclick = () => {
            document.getElementById('modalTitle').textContent = 'Add Equipment';
            document.getElementById('equipmentForm').reset();
            document.getElementById('equipmentId').value = '';
            document.getElementById('equipmentModal').style.display = 'flex';
        };
    }

    document.getElementById('equipmentForm').onsubmit = async (e) => {
        e.preventDefault();
        const id = document.getElementById('equipmentId').value;
        const payload = {
            asset_tag: document.getElementById('eqAssetTag').value.trim(),
            name: document.getElementById('eqName').value.trim(),
            category: document.getElementById('eqCategory').value.trim(),
            status: document.getElementById('eqStatus').value,
            description: document.getElementById('eqDescription').value.trim()
        };

        let result;
        if (id) {
            result = await supabase.from('equipment').update(payload).eq('id', id);
            if (!result.error) await logAudit('UPDATED', 'Equipment', id, `Updated ${payload.asset_tag}`);
        } else {
            result = await supabase.from('equipment').insert([payload]);
            if (!result.error) await logAudit('CREATED', 'Equipment', null, `Created ${payload.asset_tag}`);
        }

        if (result.error) {
            alert(result.error.message);
            return;
        }

        document.getElementById('equipmentModal').style.display = 'none';
        await loadEquipment();
    };
}

init();
