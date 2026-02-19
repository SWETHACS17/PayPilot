const cron = require('node-cron');
const { getOverdueInvoices, getUpcomingDueInvoices, updateInvoiceStatus } = require('./invoiceService');

let whatsappClientRef = null;

const initScheduler = (getClientFn) => {
    console.log('⏰ Initializing Scheduler...');

    // Store reference to the getClient function so we can get the client when needed
    whatsappClientRef = getClientFn;

    // ─────────────────────────────────────────────────────
    // Job 1: Check for OVERDUE invoices — runs daily at 9:00 AM
    // ─────────────────────────────────────────────────────
    cron.schedule('0 9 * * *', async () => {
        console.log('📋 [Scheduler] Running daily overdue invoice check...');

        try {
            const overdueInvoices = await getOverdueInvoices();
            console.log(`   Found ${overdueInvoices.length} overdue invoice(s).`);

            const client = typeof whatsappClientRef === 'function' ? whatsappClientRef() : whatsappClientRef;

            for (const invoice of overdueInvoices) {
                // Update status to OVERDUE
                await updateInvoiceStatus(invoice.id, 'OVERDUE');

                // Send WhatsApp reminder if client is connected and user_phone exists
                if (client && invoice.user_phone) {
                    const reminderMsg = `🔴 *OVERDUE REMINDER*\n\n` +
                        `Invoice #${invoice.id.slice(0, 8)} is overdue!\n` +
                        `Customer: ${invoice.customer_name}\n` +
                        `Amount: ₹${parseFloat(invoice.amount).toLocaleString('en-IN')}\n` +
                        `Due Date: ${new Date(invoice.due_date).toLocaleDateString('en-IN')}\n\n` +
                        `Reply "paid ${invoice.id.slice(0, 8)}" to mark as paid.`;

                    try {
                        await client.sendMessage(invoice.user_phone, reminderMsg);
                        console.log(`   ✅ Reminder sent for Invoice #${invoice.id.slice(0, 8)}`);
                    } catch (sendErr) {
                        console.error(`   ❌ Failed to send reminder for ${invoice.id}:`, sendErr.message);
                    }
                }
            }
        } catch (error) {
            console.error('❌ [Scheduler] Error in overdue check:', error.message);
        }
    });

    // ─────────────────────────────────────────────────────
    // Job 2: Upcoming due reminders — runs daily at 10:00 AM
    // ─────────────────────────────────────────────────────
    cron.schedule('0 10 * * *', async () => {
        console.log('📋 [Scheduler] Running upcoming due invoice check...');

        try {
            const upcomingInvoices = await getUpcomingDueInvoices(2); // Due within 2 days
            console.log(`   Found ${upcomingInvoices.length} upcoming invoice(s).`);

            const client = typeof whatsappClientRef === 'function' ? whatsappClientRef() : whatsappClientRef;

            for (const invoice of upcomingInvoices) {
                if (client && invoice.user_phone) {
                    const daysLeft = Math.ceil(
                        (new Date(invoice.due_date) - new Date()) / (1000 * 60 * 60 * 24)
                    );

                    const reminderMsg = `🟡 *UPCOMING DUE REMINDER*\n\n` +
                        `Invoice #${invoice.id.slice(0, 8)} is due ${daysLeft <= 0 ? 'today' : `in ${daysLeft} day(s)`}!\n` +
                        `Customer: ${invoice.customer_name}\n` +
                        `Amount: ₹${parseFloat(invoice.amount).toLocaleString('en-IN')}\n` +
                        `Due Date: ${new Date(invoice.due_date).toLocaleDateString('en-IN')}\n\n` +
                        `Reply "paid ${invoice.id.slice(0, 8)}" when payment is received.`;

                    try {
                        await client.sendMessage(invoice.user_phone, reminderMsg);
                        console.log(`   ✅ Upcoming reminder sent for Invoice #${invoice.id.slice(0, 8)}`);
                    } catch (sendErr) {
                        console.error(`   ❌ Failed to send reminder for ${invoice.id}:`, sendErr.message);
                    }
                }
            }
        } catch (error) {
            console.error('❌ [Scheduler] Error in upcoming check:', error.message);
        }
    });

    console.log('✅ Scheduler initialized with daily jobs at 9:00 AM and 10:00 AM');
};

module.exports = { initScheduler };
