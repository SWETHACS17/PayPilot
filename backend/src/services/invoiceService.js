const Invoice = require('../models/Invoice');

const createInvoice = async (data) => {
    try {
        const invoice = new Invoice({
            customerName: data.customerName,
            amount: parseFloat(data.amount),
            description: data.description,
            dueDate: new Date(data.dueDate),
            status: "PENDING"
        });
        return await invoice.save();
    } catch (error) {
        console.error("Error creating invoice:", error);
        throw error;
    }
};

const getInvoice = async (id) => {
    try {
        return await Invoice.findById(id);
    } catch (error) {
        console.error("Error fetching invoice:", error);
        return null;
    }
};

const updateInvoiceStatus = async (id, status) => {
    try {
        return await Invoice.findByIdAndUpdate(id, { status }, { new: true });
    } catch (error) {
        console.error("Error updating invoice:", error);
        return null;
    }
};

const markInvoiceAsPaid = async (id) => {
    return await updateInvoiceStatus(id, 'PAID');
};

module.exports = {
    createInvoice,
    getInvoice,
    updateInvoiceStatus,
    markInvoiceAsPaid
};
