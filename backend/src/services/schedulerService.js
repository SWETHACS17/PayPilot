const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const initScheduler = (whatsappClient) => {
    console.log('Initializing Scheduler...');

    // Run every day at 9:00 AM
    cron.schedule('0 9 * * *', async () => {
        console.log('Running daily invoice check...');

        try {
            const today = new Date();
            const overdueInvoices = await prisma.invoice.findMany({
                where: {
                    status: 'PENDING',
                    dueDate: {
                        lt: today
                    }
                }
            });

            console.log(`Found ${overdueInvoices.length} overdue invoices.`);

            for (const invoice of overdueInvoices) {
                // In a real app, you would have the user's phone number linked to the invoice or customer
                // For this demo, we'll log it or send to a default/admin number if available
                console.log(`Sending reminder for Invoice #${invoice.id} (${invoice.customerName})`);

                // Example: whatsappClient.sendMessage(userPhoneNumber, `Reminder: Invoice ${invoice.id} is overdue.`);
            }
        } catch (error) {
            console.error('Error in scheduler:', error);
        }
    });
};

module.exports = { initScheduler };
