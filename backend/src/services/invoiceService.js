const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const createInvoice = async (data) => {
    return await prisma.invoice.create({
        data: {
            customerName: data.customerName,
            amount: parseFloat(data.amount),
            description: data.description,
            dueDate: new Date(data.dueDate),
            status: "PENDING"
        }
    });
};

const getInvoice = async (id) => {
    return await prisma.invoice.findUnique({
        where: { id }
    });
};

const updateInvoiceStatus = async (id, status) => {
    return await prisma.invoice.update({
        where: { id },
        data: { status }
    });
};

module.exports = {
    createInvoice,
    getInvoice,
    updateInvoiceStatus
};
