const cron = require('node-cron');
const Invoice = require('../models/Invoice');

const initScheduler = (whatsappClient) => {
    console.log('Initializing Scheduler...');

    // Run every day at 9:00 AM
    cron.schedule('0 9 * * *', async () => {
        console.log('Running daily invoice check...');

        try {
            const today = new Date();
            const overdueInvoices = await Invoice.find({
                status: 'PENDING',
                dueDate: {
                    $lt: today
                }
            });

            console.log(`Found ${overdueInvoices.length} overdue invoices.`);

            for (const invoice of overdueInvoices) {
                // In a real app, you would have the user's phone number linked.
                console.log(`Sending reminder for Invoice #${invoice._id} (${invoice.customerName})`);

                // Example: whatsappClient.sendMessage(userPhoneNumber, `Reminder: Invoice ${invoice._id} is overdue.`);
            }
        } catch (error) {
            console.error('Error in scheduler:', error);
        }
    });
};

module.exports = { initScheduler };
