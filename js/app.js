// ============================================================
// app.js - Full CRUD + Search/Filter + Dashboard
// ============================================================

import { supabase } from './supabase.js';
import { checkSession, logout } from './auth.js';

// ===== DOM REFERENCES =====
const userEmailDisplay = document.getElementById('userEmailDisplay');
const logoutBtn = document.getElementById('logoutBtn');
const tableBody = document.getElementById('tableBody');
const totalCount = document.getElementById('totalCount');
const pendingCount = document.getElementById('pendingCount');
const inProgressCount = document.getElementById('inProgressCount');
const completedCount = document.getElementById('completedCount');

const modal = document.getElementById('requestModal');
const modalTitle = document.getElementById('modalTitle');
const closeModalBtn = document.getElementById('closeModalBtn');
const openNewBtn = document.getElementById('openNewRequestBtn');
const requestForm = document.getElementById('requestForm');
const editRequestId = document.getElementById('editRequestId');
const reqRequester = document.getElementById('reqRequester');
const reqDepartment = document.getElementById('reqDepartment');
const reqCategory = document.getElementById('reqCategory');
const reqPriority = document.getElementById('reqPriority');
const reqDescription = document.getElementById('reqDescription');
const reqStatus = document.getElementById('reqStatus');
const statusGroup = document.getElementById('statusGroup');

const searchInput = document.getElementById('searchInput');
const statusFilter = document.getElementById('statusFilter');
const priorityFilter = document.getElementById('priorityFilter');

// ===== STATE =====
let allRequests = [];
let currentUser = null;

// ===== INITIALIZATION =====
async function init() {
    const user = await checkSession();
    if (!user) return;
    
    currentUser = user;
    userEmailDisplay.textContent = user.email || 'User';
    
    await loadRequests();
    setupEventListeners();
}

// ===== LOAD REQUESTS =====
async function loadRequests() {
    try {
        const { data, error } = await supabase
            .from('service_requests')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        
        allRequests = data || [];
        renderTable(allRequests);
        updateMetrics(allRequests);
    } catch (err) {
        console.error('Load error:', err);
    }
}

// ===== RENDER TABLE =====
function renderTable(requests) {
    const searchTerm = searchInput.value.toLowerCase();
    const statusVal = statusFilter.value;
    const priorityVal = priorityFilter.value;

    const filtered = requests.filter(r => {
        const matchSearch = (r.requester?.toLowerCase().includes(searchTerm) || 
                           r.description?.toLowerCase().includes(searchTerm));
        const matchStatus = statusVal ? r.status === statusVal : true;
        const matchPriority = priorityVal ? r.priority === priorityVal : true;
        return matchSearch && matchStatus && matchPriority;
    });

    if (filtered.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="8" class="empty-row">No requests found</td></tr>`;
        return;
    }

    let html = '';
    filtered.forEach(r => {
        const date = r.created_at ? new Date(r.created_at).toLocaleDateString() : '—';
        const statusClass = (r.status || 'pending').toLowerCase().replace(' ', '-');
        
        html += `<tr>
            <td>#${r.id}</td>
            <td>${escapeHtml(r.requester || '')}</td>
            <td>${escapeHtml(r.department || '')}</td>
            <td>${escapeHtml(r.category || '')}</td>
            <td><span class="badge priority-${(r.priority || 'low').toLowerCase()}">${escapeHtml(r.priority || 'Low')}</span></td>
            <td><span class="badge status-${statusClass}">${escapeHtml(r.status || 'Pending')}</span></td>
            <td>${date}</td>
            <td class="actions">
                <button class="btn-edit" data-id="${r.id}" title="Edit"><i class="fas fa-edit"></i></button>
                <button class="btn-delete" data-id="${r.id}" title="Delete"><i class="fas fa-trash-alt"></i></button>
            </td>
        </tr>`;
    });
    
    tableBody.innerHTML = html;

    document.querySelectorAll('.btn-edit').forEach(btn => 
        btn.addEventListener('click', () => openEdit(btn.dataset.id))
    );
    document.querySelectorAll('.btn-delete').forEach(btn => 
        btn.addEventListener('click', () => deleteRequest(btn.dataset.id))
    );
}

// ===== UPDATE METRICS =====
function updateMetrics(requests) {
    const total = requests.length;
    const pending = requests.filter(r => r.status === 'Pending').length;
    const inProg = requests.filter(r => r.status === 'In Progress').length;
    const completed = requests.filter(r => r.status === 'Completed').length;
    
    totalCount.textContent = total;
    pendingCount.textContent = pending;
    inProgressCount.textContent = inProg;
    completedCount.textContent = completed;
}

// ===== CREATE REQUEST =====
async function createRequest(data) {
    try {
        const payload = {
            ...data,
            status: 'Pending',
            user_id: currentUser.id
        };

        const { error } = await supabase
            .from('service_requests')
            .insert([payload]);

        if (error) throw error;
        
        await loadRequests();
        return true;
    } catch (err) {
        console.error('Create error:', err);
        alert('Error creating request: ' + err.message);
        return false;
    }
}

// ===== UPDATE REQUEST =====
async function updateRequest(id, data) {
    try {
        const { error } = await supabase
            .from('service_requests')
            .update(data)
            .eq('id', id);

        if (error) throw error;
        
        await loadRequests();
        return true;
    } catch (err) {
        console.error('Update error:', err);
        alert('Error updating request: ' + err.message);
        return false;
    }
}

// ===== DELETE REQUEST =====
async function deleteRequest(id) {
    if (!confirm('Delete this request permanently?')) return;

    try {
        const { error } = await supabase
            .from('service_requests')
            .delete()
            .eq('id', id);

        if (error) throw error;
        
        await loadRequests();
    } catch (err) {
        console.error('Delete error:', err);
        alert('Error deleting request: ' + err.message);
    }
}

// ===== OPEN MODAL =====
function openNew() {
    modalTitle.textContent = 'New Request';
    requestForm.reset();
    editRequestId.value = '';
    reqStatus.value = 'Pending';
    statusGroup.style.display = 'none';
    modal.style.display = 'flex';
}

async function openEdit(id) {
    const { data, error } = await supabase
        .from('service_requests')
        .select('*')
        .eq('id', id)
        .single();
        
    if (error || !data) {
        alert('Request not found');
        return;
    }
    
    modalTitle.textContent = 'Edit Request';
    editRequestId.value = data.id;
    reqRequester.value = data.requester || '';
    reqDepartment.value = data.department || '';
    reqCategory.value = data.category || '';
    reqPriority.value = data.priority || 'Low';
    reqDescription.value = data.description || '';
    reqStatus.value = data.status || 'Pending';
    statusGroup.style.display = 'block';
    modal.style.display = 'flex';
}

function closeModal() {
    modal.style.display = 'none';
    requestForm.reset();
}

// ===== EVENT LISTENERS =====
function setupEventListeners() {
    logoutBtn?.addEventListener('click', logout);
    openNewBtn?.addEventListener('click', openNew);
    closeModalBtn?.addEventListener('click', closeModal);
    window.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
    
    requestForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = editRequestId.value;
        const data = {
            requester: reqRequester.value.trim(),
            department: reqDepartment.value.trim(),
            category: reqCategory.value.trim(),
            priority: reqPriority.value,
            description: reqDescription.value.trim(),
        };
        
        if (id) {
            data.status = reqStatus.value;
            await updateRequest(id, data);
        } else {
            await createRequest(data);
        }
        closeModal();
    });

    searchInput?.addEventListener('input', () => renderTable(allRequests));
    statusFilter?.addEventListener('change', () => renderTable(allRequests));
    priorityFilter?.addEventListener('change', () => renderTable(allRequests));
}

// ===== UTILITY =====
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ===== START =====
init();