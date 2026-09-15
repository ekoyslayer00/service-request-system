import { supabase } from './supabase.js';
import { logAudit } from './auth.js';

export async function createBorrowingRequest(equipmentId, expectedReturnDate, purpose) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const { data: equipment } = await supabase
        .from('equipment')
        .select('status')
        .eq('id', equipmentId)
        .single();

    if (!equipment) throw new Error('Equipment not found');
    if (equipment.status !== 'Available') {
        throw new Error('BR-A4-01: Equipment is not available');
    }

    const { data, error } = await supabase
        .from('borrowing_transactions')
        .insert([{
            requester_id: session.user.id,
            equipment_id: equipmentId,
            expected_return_date: expectedReturnDate,
            purpose: purpose,
            status: 'Pending'
        }])
        .select()
        .single();

    if (error) throw error;

    await logAudit('REQUESTED', 'Borrowing', data.id,
        `Requested equipment #${equipmentId}`);

    return data;
}

export async function approveRequest(transactionId, userRole, userId, requesterId) {
    if (userRole !== 'admin') throw new Error('BR-A4-03: Only Admin can approve');
    if (userId === requesterId) throw new Error('BR-A4-02: Cannot approve own request');

    const { data, error } = await supabase
        .from('borrowing_transactions')
        .update({
            status: 'Approved',
            approved_by: userId,
            approved_at: new Date().toISOString()
        })
        .eq('id', transactionId)
        .select()
        .single();

    if (error) throw error;

    await logAudit('APPROVED', 'Borrowing', transactionId,
        `Approved borrowing request #${transactionId}`);

    return data;
}

export async function rejectRequest(transactionId, userRole, userId, reason) {
    if (userRole !== 'admin') throw new Error('BR-A4-03: Only Admin can reject');

    const { data, error } = await supabase
        .from('borrowing_transactions')
        .update({
            status: 'Rejected',
            approved_by: userId,
            approved_at: new Date().toISOString(),
            rejection_reason: reason
        })
        .eq('id', transactionId)
        .select()
        .single();

    if (error) throw error;

    await logAudit('REJECTED', 'Borrowing', transactionId, `Rejected: ${reason}`);

    return data;
}

export async function releaseEquipment(transactionId, userRole, userId) {
    const { data: tx } = await supabase
        .from('borrowing_transactions')
        .select('status, equipment_id')
        .eq('id', transactionId)
        .single();

    if (!tx) throw new Error('Transaction not found');
    if (tx.status !== 'Approved') throw new Error('BR-A4-04: Only Approved can be released');

    await supabase.from('borrowing_transactions')
        .update({
            status: 'Released',
            released_by: userId,
            released_at: new Date().toISOString()
        })
        .eq('id', transactionId);

    await supabase.from('equipment')
        .update({ status: 'Borrowed' })
        .eq('id', tx.equipment_id);

    await logAudit('RELEASED', 'Borrowing', transactionId, `Equipment released`);
}

export async function processReturn(transactionId, userId, isDamaged = false) {
    const { data: tx } = await supabase
        .from('borrowing_transactions')
        .select('status, equipment_id')
        .eq('id', transactionId)
        .single();

    if (!tx) throw new Error('Transaction not found');
    if (tx.status === 'Returned' || tx.status === 'Closed') {
        throw new Error('BR-A4-08: Already returned');
    }

    await supabase.from('borrowing_transactions')
        .update({
            status: 'Returned',
            returned_to: userId,
            returned_at: new Date().toISOString(),
            actual_return_date: new Date().toISOString().split('T')[0]
        })
        .eq('id', transactionId);

    await supabase.from('equipment')
        .update({ status: isDamaged ? 'Damaged' : 'Available' })
        .eq('id', tx.equipment_id);

    await logAudit('RETURNED', 'Borrowing', transactionId,
        isDamaged ? 'Returned (damaged)' : 'Returned');
}

export async function checkOverdue() {
    try {
        const today = new Date().toISOString().split('T')[0];
        const { data: overdue } = await supabase
            .from('borrowing_transactions')
            .select('id')
            .eq('status', 'Released')
            .lt('expected_return_date', today);

        if (overdue && overdue.length > 0) {
            await supabase.from('borrowing_transactions')
                .update({ status: 'Overdue' })
                .in('id', overdue.map(o => o.id));

            await logAudit('OVERDUE_CHECK', 'Borrowing', null,
                `${overdue.length} transaction(s) marked overdue`);
        }
    } catch (err) {
        console.warn('Overdue check failed:', err);
    }
}
