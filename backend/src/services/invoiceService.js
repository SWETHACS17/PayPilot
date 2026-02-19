const { supabase } = require('./supabaseClient');

/**
 * Create a new invoice in Supabase
 */
const createInvoice = async (data) => {
    const { data: invoice, error } = await supabase
        .from('invoices')
        .insert({
            customer_name: data.customerName,
            amount: parseFloat(data.amount),
            description: data.description || '',
            due_date: data.dueDate ? new Date(data.dueDate).toISOString() : null,
            status: 'PENDING',
            user_phone: data.userPhone || null
        })
        .select()
        .single();

    if (error) {
        console.error('Error creating invoice:', error);
        throw new Error(`Failed to create invoice: ${error.message}`);
    }

    return invoice;
};

/**
 * Get a single invoice by ID
 */
const getInvoice = async (id) => {
    const { data: invoice, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        console.error('Error fetching invoice:', error);
        throw new Error(`Failed to fetch invoice: ${error.message}`);
    }

    return invoice;
};

/**
 * Get all invoices (optionally filtered by status)
 */
const getInvoices = async (filters = {}) => {
    let query = supabase.from('invoices').select('*');

    if (filters.status) {
        query = query.eq('status', filters.status);
    }
    if (filters.userPhone) {
        query = query.eq('user_phone', filters.userPhone);
    }

    query = query.order('created_at', { ascending: false });

    const { data: invoices, error } = await query;

    if (error) {
        console.error('Error fetching invoices:', error);
        throw new Error(`Failed to fetch invoices: ${error.message}`);
    }

    return invoices;
};

/**
 * Update invoice status
 */
const updateInvoiceStatus = async (id, status) => {
    const { data: invoice, error } = await supabase
        .from('invoices')
        .update({
            status,
            updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('Error updating invoice:', error);
        throw new Error(`Failed to update invoice: ${error.message}`);
    }

    return invoice;
};

/**
 * Mark an invoice as paid
 */
const markInvoiceAsPaid = async (id) => {
    return await updateInvoiceStatus(id, 'PAID');
};

/**
 * Get overdue invoices (status = PENDING and due_date < now)
 */
const getOverdueInvoices = async () => {
    const now = new Date().toISOString();

    const { data: invoices, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('status', 'PENDING')
        .lt('due_date', now);

    if (error) {
        console.error('Error fetching overdue invoices:', error);
        throw new Error(`Failed to fetch overdue invoices: ${error.message}`);
    }

    return invoices;
};

/**
 * Get invoices that are due soon (within the next N days)
 */
const getUpcomingDueInvoices = async (daysAhead = 2) => {
    const now = new Date();
    const future = new Date();
    future.setDate(future.getDate() + daysAhead);

    const { data: invoices, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('status', 'PENDING')
        .gte('due_date', now.toISOString())
        .lte('due_date', future.toISOString());

    if (error) {
        console.error('Error fetching upcoming invoices:', error);
        throw new Error(`Failed to fetch upcoming invoices: ${error.message}`);
    }

    return invoices;
};

module.exports = {
    createInvoice,
    getInvoice,
    getInvoices,
    updateInvoiceStatus,
    markInvoiceAsPaid,
    getOverdueInvoices,
    getUpcomingDueInvoices
};
