export const ROLES = {
    ADMIN: 'admin',
    STAFF: 'staff',
    REQUESTER: 'requester'
};

export const PERMISSIONS = {
    admin: {
        manageUsers: true,
        manageEquipment: true,
        approveBorrowing: true,
        rejectBorrowing: true,
        releaseEquipment: true,
        processReturn: true,
        manageMaintenance: true,
        viewReports: true,
        viewAuditLogs: true,
        createBorrowing: true,
        viewOwnRequests: true
    },
    staff: {
        manageUsers: false,
        manageEquipment: true,
        approveBorrowing: false,
        rejectBorrowing: false,
        releaseEquipment: true,
        processReturn: true,
        manageMaintenance: true,
        viewReports: false,
        viewAuditLogs: false,
        createBorrowing: true,
        viewOwnRequests: true
    },
    requester: {
        manageUsers: false,
        manageEquipment: false,
        approveBorrowing: false,
        rejectBorrowing: false,
        releaseEquipment: false,
        processReturn: false,
        manageMaintenance: false,
        viewReports: false,
        viewAuditLogs: false,
        createBorrowing: true,
        viewOwnRequests: true
    }
};

export function can(role, permission) {
    return PERMISSIONS[role]?.[permission] || false;
}

export function requirePermission(role, permission) {
    if (!can(role, permission)) {
        alert('❌ Access Denied: You do not have permission for this action.');
        window.location.href = 'index.html';
        return false;
    }
    return true;
}

export const NAVIGATION = {
    admin: [
        { label: 'Dashboard', icon: '📊', href: 'index.html' },
        { label: 'Users', icon: '👥', href: 'users.html' },
        { label: 'Equipment', icon: '📦', href: 'equipment.html' },
        { label: 'Borrowing', icon: '📋', href: 'borrowing.html' },
        { label: 'Maintenance', icon: '🔧', href: 'maintenance.html' },
        { label: 'Audit Logs', icon: '📜', href: 'audit-logs.html' }
    ],
    staff: [
        { label: 'Dashboard', icon: '📊', href: 'index.html' },
        { label: 'Equipment', icon: '📦', href: 'equipment.html' },
        { label: 'Borrowing', icon: '📋', href: 'borrowing.html' },
        { label: 'Maintenance', icon: '🔧', href: 'maintenance.html' }
    ],
    requester: [
        { label: 'Dashboard', icon: '📊', href: 'index.html' },
        { label: 'Available Equipment', icon: '📦', href: 'equipment.html' },
        { label: 'My Requests', icon: '📋', href: 'my-requests.html' }
    ]
};
