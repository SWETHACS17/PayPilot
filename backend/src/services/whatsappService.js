const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');
const { transcribeAudio } = require('./sttService');
const { parseIntent } = require('./intentParser');
const { createInvoice, markInvoiceAsPaid, getInvoice, getInvoices } = require('./invoiceService');
const { generateInvoicePDF } = require('./pdfService');

let client;
let qrDisplayed = false;
let loadingInterval = null;
let myNumber = null; // Owner's WhatsApp number (set on ready)

const conversationState = {};
const botSending = {};  // per-chat counter of in-flight bot sends

// ─────────────────────────────────────────────
// Anti-loop: counter incremented BEFORE send, so message_create
// sees it immediately and skips the bot's own replies.
// ─────────────────────────────────────────────
const botSend = async (chatId, content, options = {}) => {
    botSending[chatId] = (botSending[chatId] || 0) + 1;
    try {
        return await client.sendMessage(chatId, content, options);
    } finally {
        setTimeout(() => {
            botSending[chatId] = Math.max(0, (botSending[chatId] || 1) - 1);
        }, 500);
    }
};

// Loading spinner while Chromium starts
const startLoading = () => {
    const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    let i = 0;
    loadingInterval = setInterval(() => {
        process.stdout.write(`\r${frames[i]} Loading WhatsApp (launching browser)...`);
        i = (i + 1) % frames.length;
    }, 100);
};

const stopLoading = () => {
    if (loadingInterval) {
        clearInterval(loadingInterval);
        loadingInterval = null;
        process.stdout.write('\r' + ' '.repeat(60) + '\r');
    }
};

const initializeWhatsApp = () => {
    startLoading();

    client = new Client({
        authStrategy: new LocalAuth(),
        puppeteer: {
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-gpu',
                '--disable-dev-shm-usage',
                '--disable-extensions',
                '--disable-background-networking',
                '--disable-translate',
                '--disable-sync',
                '--no-first-run',
                '--disable-default-apps',
                '--disable-hang-monitor',
                '--disable-popup-blocking',
                '--disable-prompt-on-repost',
                '--metrics-recording-only',
                '--mute-audio'
            ]
        }
    });

    client.on('qr', (qr) => {
        stopLoading();
        if (!qrDisplayed) {
            qrDisplayed = true;
            console.log('\n╔══════════════════════════════════════════════════╗');
            console.log('║         📱 WHATSAPP QR CODE — SCAN ME!          ║');
            console.log('╠══════════════════════════════════════════════════╣');
            console.log('║                                                  ║');
            console.log('║  How to connect:                                 ║');
            console.log('║  1. Open WhatsApp on your phone                  ║');
            console.log('║  2. Tap ⋮ (Menu) → "Linked Devices"             ║');
            console.log('║  3. Tap "Link a Device"                          ║');
            console.log('║  4. Point your phone camera at the QR below      ║');
            console.log('║                                                  ║');
            console.log('╚══════════════════════════════════════════════════╝\n');
            qrcode.generate(qr, { small: true });
            console.log('⏳ Waiting for you to scan... (QR expires in ~60s)\n');
        } else {
            console.log('🔄 QR code refreshed. Restart the server (rs + Enter) if you need to see it again.');
        }
    });

    client.on('ready', () => {
        // Capture the owner's number so we can identify "Message Yourself" chat
        myNumber = client.info.wid._serialized;
        console.log(`\n✅ WhatsApp Client is ready!`);
        console.log(`📱 Your number: ${myNumber}`);
        console.log('💡 Open "Message Yourself" chat and type or send a voice note to create invoices.\n');
    });

    let authLogged = false;
    client.on('authenticated', () => {
        stopLoading();
        if (!authLogged) {
            authLogged = true;
            console.log('🔐 WhatsApp Client authenticated successfully.');
        }
    });

    client.on('auth_failure', (msg) => {
        console.error('❌ WhatsApp authentication failed:', msg);
        console.log('💡 Try deleting the .wwebjs_auth folder and restart.');
    });

    client.on('disconnected', (reason) => {
        console.log('🔌 WhatsApp Client disconnected:', reason);
        qrDisplayed = false;
    });

    // ─────────────────────────────────────────────
    // Helper: Find a WhatsApp contact by name or phone
    // ─────────────────────────────────────────────
    const findCustomerContact = async (customerName, customerPhone) => {
        try {
            // 1. If phone number is provided, use it directly
            if (customerPhone) {
                const phone = customerPhone.replace(/[^0-9]/g, '');
                const chatId = `${phone}@c.us`;
                const isRegistered = await client.isRegisteredUser(chatId);
                if (isRegistered) {
                    console.log(`📱 Found customer by phone: ${chatId}`);
                    return chatId;
                }
                console.log(`⚠️ Phone ${phone} is not registered on WhatsApp.`);
            }

            // 2. Search contacts by name
            if (customerName && customerName !== 'Unknown') {
                const contacts = await client.getContacts();
                const searchName = customerName.toLowerCase().trim();

                // Exact match first
                let match = contacts.find(c =>
                    c.name && c.name.toLowerCase() === searchName
                );

                // Partial match
                if (!match) {
                    match = contacts.find(c =>
                        c.name && (
                            c.name.toLowerCase().includes(searchName) ||
                            searchName.includes(c.name.toLowerCase())
                        )
                    );
                }

                // Also try pushname (WhatsApp profile name)
                if (!match) {
                    match = contacts.find(c =>
                        c.pushname && (
                            c.pushname.toLowerCase().includes(searchName) ||
                            searchName.includes(c.pushname.toLowerCase())
                        )
                    );
                }

                if (match && match.id && match.id._serialized) {
                    console.log(`📱 Found customer contact: ${match.name || match.pushname} → ${match.id._serialized}`);
                    return match.id._serialized;
                }
            }

            return null;
        } catch (err) {
            console.error('⚠️ Contact lookup failed:', err.message);
            return null;
        }
    };

    // ═══════════════════════════════════════════════════
    // MAIN MESSAGE HANDLER — "Message Yourself" chat ONLY
    // ═══════════════════════════════════════════════════
    client.on('message_create', async (msg) => {

        // ── RULE 1: Only process messages I send (fromMe) ──
        if (!msg.fromMe) return;

        // ── RULE 2: Only process "Message Yourself" chat ──
        // In "Message Yourself", msg.to === my own number
        if (!myNumber) return;
        if (msg.to !== myNumber) return;

        // ── RULE 3: Skip bot's own replies (counter-based) ──
        if (botSending[myNumber] > 0) return;

        // ── Skip empty / media-only messages (except voice notes) ──
        const isVoice = msg.hasMedia && (msg.type === 'ptt' || msg.type === 'audio');
        if (!msg.body && !isVoice) return;
        if (!msg.body && msg.hasMedia && !isVoice) return;

        console.log(`📩 You → Message Yourself: ${msg.body || '[voice note]'}`);

        try {
            // ─────────────────────────────────────────────
            // 1. Handle Voice Notes
            // ─────────────────────────────────────────────
            let text = msg.body;
            if (isVoice) {
                console.log('🎙️ Voice note detected. Downloading...');
                const media = await msg.downloadMedia();
                if (media) {
                    const buffer = Buffer.from(media.data, 'base64');
                    const tempPath = path.join(__dirname, `../../temp_${Date.now()}.ogg`);
                    fs.writeFileSync(tempPath, buffer);

                    await botSend(myNumber, '🎙️ Processing your voice note...');
                    text = await transcribeAudio(tempPath);

                    // Cleanup temp file
                    try { fs.unlinkSync(tempPath); } catch (e) { /* ignore */ }
                    console.log('📝 Transcribed text:', text);

                    if (!text || text.trim() === '') {
                        await botSend(myNumber, '❌ Could not transcribe the voice note. Please try again or type your message.');
                        return;
                    }
                } else {
                    await botSend(myNumber, '❌ Could not download the voice note. Please try again.');
                    return;
                }
            }

            // Skip if no text
            if (!text || text.trim() === '') return;

            // ─────────────────────────────────────────────
            // 2. Handle Confirmation (yes / no)
            // ─────────────────────────────────────────────
            if (conversationState[myNumber] && conversationState[myNumber].step === 'CONFIRM_DRAFT') {
                const response = text.toLowerCase().trim();
                const draftData = conversationState[myNumber].data;

                if (['yes', 'y', 'confirm', 'ok', 'sure', 'si', 'haan'].includes(response)) {
                    await botSend(myNumber, '⏳ Creating invoice...');

                    // Create Invoice in Supabase
                    const newInvoice = await createInvoice({
                        ...draftData,
                        userPhone: myNumber
                    });

                    // Generate PDF
                    const pdfPath = await generateInvoicePDF(newInvoice);
                    const pdfMedia = MessageMedia.fromFilePath(pdfPath);

                    // ── Send to ME (Message Yourself) ──
                    const successMsg = `✅ *Invoice Created Successfully!*\n\n` +
                        `🆔 ID: ${newInvoice.id.slice(0, 8)}\n` +
                        `👤 Customer: ${newInvoice.customer_name}\n` +
                        `💰 Amount: ₹${parseFloat(newInvoice.amount).toLocaleString('en-IN')}\n` +
                        `📄 Description: ${newInvoice.description}\n` +
                        `📅 Due: ${newInvoice.due_date ? new Date(newInvoice.due_date).toLocaleDateString('en-IN') : 'Not set'}\n\n` +
                        `📎 PDF invoice attached below.`;

                    await botSend(myNumber, successMsg);
                    await botSend(myNumber, pdfMedia, {
                        caption: `Invoice_${newInvoice.id.slice(0, 8)}.pdf`
                    });

                    // ── Send to RECIPIENT on WhatsApp ──
                    const recipientChatId = await findCustomerContact(
                        draftData.customerName,
                        draftData.customerPhone
                    );

                    if (recipientChatId) {
                        try {
                            const recipientPdfMedia = MessageMedia.fromFilePath(pdfPath);
                            const recipientMsg = `📄 *Invoice from PayPilot*\n\n` +
                                `Hello ${newInvoice.customer_name},\n\n` +
                                `You have a new invoice:\n` +
                                `💰 Amount: ₹${parseFloat(newInvoice.amount).toLocaleString('en-IN')}\n` +
                                `📄 ${newInvoice.description}\n` +
                                `📅 Due: ${newInvoice.due_date ? new Date(newInvoice.due_date).toLocaleDateString('en-IN') : 'On receipt'}\n\n` +
                                `Please find the invoice attached.`;

                            await botSend(recipientChatId, recipientMsg);
                            await botSend(recipientChatId, recipientPdfMedia, {
                                caption: `Invoice_${newInvoice.id.slice(0, 8)}.pdf`
                            });

                            await botSend(myNumber, `✅ Invoice also sent to *${newInvoice.customer_name}* on WhatsApp!`);
                            console.log(`📤 Invoice sent to recipient: ${recipientChatId}`);
                        } catch (sendErr) {
                            console.error('⚠️ Could not send to recipient:', sendErr.message);
                            await botSend(myNumber, `⚠️ Could not send invoice to ${newInvoice.customer_name} on WhatsApp. You can forward the PDF manually.`);
                        }
                    } else {
                        await botSend(myNumber, `ℹ️ Could not find *${draftData.customerName}* in your WhatsApp contacts. You can forward the PDF manually.`);
                    }

                    // Cleanup PDF file
                    try { fs.unlinkSync(pdfPath); } catch (e) { /* ignore */ }

                    delete conversationState[myNumber];

                } else if (['no', 'n', 'cancel', 'nahi', 'nope'].includes(response)) {
                    await botSend(myNumber, '❌ Invoice creation cancelled.');
                    delete conversationState[myNumber];
                } else {
                    await botSend(myNumber, 'Please reply *"yes"* to confirm or *"no"* to cancel.');
                }
                return;
            }

            // ─────────────────────────────────────────────
            // 3. Parse Intent via GROQ LLM
            // ─────────────────────────────────────────────
            const intentData = await parseIntent(text);
            console.log('🧠 Parsed intent:', intentData);

            switch (intentData.intent) {
                // ── Create Invoice ──
                case 'create_invoice': {
                    const draft = {
                        customerName: intentData.customerName || 'Unknown',
                        customerPhone: intentData.customerPhone || null,
                        amount: intentData.amount || 0,
                        description: intentData.description || 'No description',
                        dueDate: intentData.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
                    };

                    conversationState[myNumber] = {
                        step: 'CONFIRM_DRAFT',
                        data: draft
                    };

                    const dueDateFormatted = new Date(draft.dueDate).toLocaleDateString('en-IN', {
                        day: '2-digit', month: 'short', year: 'numeric'
                    });

                    const summary = `📝 *Draft Invoice Details:*\n\n` +
                        `👤 Customer: ${draft.customerName}\n` +
                        `💰 Amount: ₹${parseFloat(draft.amount).toLocaleString('en-IN')}\n` +
                        `📄 Description: ${draft.description}\n` +
                        `📅 Due Date: ${dueDateFormatted}\n\n` +
                        `Reply *"yes"* to confirm or *"no"* to cancel.`;

                    await botSend(myNumber, summary);
                    break;
                }

                // ── Update Payment ──
                case 'update_payment': {
                    if (!intentData.invoiceId) {
                        await botSend(myNumber, '❌ Please provide the invoice ID. Example: "paid abc123"');
                        break;
                    }

                    try {
                        const updated = await markInvoiceAsPaid(intentData.invoiceId);
                        await botSend(myNumber,
                            `✅ *Payment Recorded!*\n\n` +
                            `Invoice #${updated.id.slice(0, 8)} has been marked as *PAID*.\n` +
                            `Customer: ${updated.customer_name}\n` +
                            `Amount: ₹${parseFloat(updated.amount).toLocaleString('en-IN')}`
                        );
                    } catch (err) {
                        await botSend(myNumber, `❌ Could not find invoice "${intentData.invoiceId}". Please check the ID and try again.`);
                    }
                    break;
                }

                // ── Check Status ──
                case 'check_status': {
                    if (!intentData.invoiceId) {
                        await botSend(myNumber, '❌ Please provide the invoice ID. Example: "status abc123"');
                        break;
                    }

                    try {
                        const invoice = await getInvoice(intentData.invoiceId);
                        const statusEmoji = invoice.status === 'PAID' ? '✅' : invoice.status === 'OVERDUE' ? '🔴' : '🟡';

                        await botSend(myNumber,
                            `${statusEmoji} *Invoice #${invoice.id.slice(0, 8)} Status*\n\n` +
                            `👤 Customer: ${invoice.customer_name}\n` +
                            `💰 Amount: ₹${parseFloat(invoice.amount).toLocaleString('en-IN')}\n` +
                            `📄 Description: ${invoice.description}\n` +
                            `📅 Due Date: ${invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('en-IN') : 'N/A'}\n` +
                            `📊 Status: *${invoice.status}*`
                        );
                    } catch (err) {
                        await botSend(myNumber, `❌ Could not find invoice "${intentData.invoiceId}".`);
                    }
                    break;
                }

                // ── List Invoices ──
                case 'list_invoices': {
                    try {
                        const invoices = await getInvoices({ userPhone: myNumber });

                        if (!invoices || invoices.length === 0) {
                            await botSend(myNumber, '📋 You have no invoices yet. Send a message like:\n\n"Invoice ₹15,000 to ABC Traders for consulting, due in 7 days"');
                            break;
                        }

                        let listMsg = `📋 *Your Invoices (${invoices.length}):*\n\n`;
                        const displayInvoices = invoices.slice(0, 10);

                        for (const inv of displayInvoices) {
                            const statusEmoji = inv.status === 'PAID' ? '✅' : inv.status === 'OVERDUE' ? '🔴' : '🟡';
                            listMsg += `${statusEmoji} #${inv.id.slice(0, 8)} — ${inv.customer_name} — ₹${parseFloat(inv.amount).toLocaleString('en-IN')} — *${inv.status}*\n`;
                        }

                        if (invoices.length > 10) {
                            listMsg += `\n...and ${invoices.length - 10} more.`;
                        }

                        await botSend(myNumber, listMsg);
                    } catch (err) {
                        await botSend(myNumber, '❌ Could not fetch invoices. Please try again.');
                    }
                    break;
                }

                // ── Unknown Intent ──
                default: {
                    await botSend(myNumber,
                        `🤖 *PayPilot — Invoice Assistant*\n\n` +
                        `I can help you with:\n\n` +
                        `📝 *Create Invoice:* "Invoice ₹15,000 to ABC Traders for consulting, due in 7 days"\n` +
                        `💰 *Mark Paid:* "paid abc123"\n` +
                        `📊 *Check Status:* "status abc123"\n` +
                        `📋 *List Invoices:* "show my invoices"\n\n` +
                        `🎙️ You can also send a *voice note*!`
                    );
                }
            }

        } catch (error) {
            console.error('❌ Error processing message:', error);
            try {
                await botSend(myNumber, '❌ An error occurred processing your request. Please try again.');
            } catch (replyErr) {
                console.error('❌ Could not send error reply:', replyErr.message);
            }
        }
    });

    client.initialize();
};

const getClient = () => client;

module.exports = {
    initializeWhatsApp,
    getClient
};
