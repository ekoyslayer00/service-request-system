import { supabase } from './supabase.js';
import { checkSession, getCurrentUserWithRole, logout, logAudit } from './auth.js';
import { NAVIGATION } from './roles.js';

let currentUser = null;

async function init() {
    const session = await checkSession();
    if (!session) return;
    currentUser = await getCurrentUserWithRole();
    if (!currentUser) return;

    if (!['admin', 'staff'].includes(currentUser.role)) {
        alert('❌ Access Denied');
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
    await loadEquipmentDropdown();
    await loadMaintenance();
    setupEvents();
}

function renderNav() {
    const nav = document.getElementById('mainNav');
    const links = NAVIGATION[currentUser.role] || [];
    nav.innerHTML = links.map(l =>
        `<a href="${l.href}" class="nav-link ${l.href === 'maintenance.html' ? 'active' : ''}">${l.icon} ${l.label}</a>`
    ).join('') + `<a href="#" id="navLogout" class="nav-link nav-logout">🚪 Logout</a>`;
    document.getElementById('navLogout').onclick = (e) => { e.preventDefault(); logout(); };
}

async function loadEquipmentDropdown() {
    const { data } = await supabase.from('equipment').select('id, asset_tag, name');
    document.getElementById('maintEquipment').innerHTML =
        (data || []).map(e => `<option value="${e.id}">${e.asset_tag} - ${e.name}</option>`).join('');
}

async function loadMaintenance() {
    const { data, error } = await supabase
        .from('maintenance_records')
        .select(`*, equipment:equipment_id (asset_tag, name)`)
        .order('id', { ascending: false });

    if (error) { console.error(error); return; }

    const body = document.getElementById('maintBody');
    if (!data || data.length === 0) {
        body.innerHTML = `<tr><td colspan="5" class="empty-row">No maintenance records</td></tr>`;
        return;
    }

    body.innerHTML = data.map(m => `
        <tr>
            <td>#${m.id}</td>
            <td>${m.equipment?.asset_tag || '—'} - ${m.equipment?.name || ''}</td>
            <td>${m.description}</td>
            <td><span class="badge status-${m.status.toLowerCase().replace(' ', '-')}">${m.status}</span></td>
            <td>${new Date(m.created_at).toLocaleDateString()}</td>
        </tr>
    `).join('');
}

function setupEvents() {
    document.getElementById('logoutBtn').onclick = logout;
    document.getElementById('closeMaintModal').onclick = () =>
        document.getElementById('maintModal').style.display = 'none';

    document.getElementById('addMaintBtn').onclick = () => {
        document.getElementById('maintForm').reset();
        document.getElementById('maintModal').style.display = 'flex';
    };

    document.getElementById('maintForm').onsubmit = async (e) => {
        e.preventDefault();
        const payload = {
            equipment_id: document.getElementById('maintEquipment').value,
            description: document.getElementById('maintDescription').value,
            status: document.getElementById('maintStatus').value,
            reported_by: currentUser.id
        };

        const { error } = await supabase.from('maintenance_records').insert([payload]);
        if (error) { alert('❌ ' + error.message); return; }

        // Set equipment to Maintenance if pending
        if (payload.status === 'Pending' || payload.status === 'In Progress') {
            await supabase.from('equipment').update({ status: 'Maintenance' }).eq('id', payload.equipment_id);
        }

        await logAudit('MAINTENANCE', 'Maintenance', null, payload.description);
        document.getElementById('maintModal').style.display = 'none';
        await loadMaintenance();
    };
}

init();
