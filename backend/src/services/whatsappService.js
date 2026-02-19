const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');
const { transcribeAudio } = require('./sttService');
const { parseIntent } = require('./intentParser');
const { createInvoice, markInvoiceAsPaid } = require('./invoiceService');
const { generateInvoicePDF } = require('./pdfService');

let client;
const conversationState = {}; // { userId: { step: 'CONFIRM_DRAFT', data: {} } }

const initializeWhatsApp = () => {
    client = new Client({
        authStrategy: new LocalAuth(),
        puppeteer: {
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        }
    });

    client.on('qr', (qr) => {
        console.log('QR RECEIVED', qr);
        qrcode.generate(qr, { small: true });
    });

    client.on('ready', () => {
        console.log('WhatsApp Client is ready!');
    });

    client.on('message', async msg => {
        console.log('Message received:', msg.body);
        const userId = msg.from;

        try {
            // 1. Handle Voice Notes
            let text = msg.body;
            if (msg.hasMedia && msg.type === 'ptt') { // 'ptt' is voice note
                console.log("Voice note detected. Downloading...");
                const media = await msg.downloadMedia();
                if (media) {
                    const buffer = Buffer.from(media.data, 'base64');
                    const tempPath = path.join(__dirname, `../../temp_${Date.now()}.ogg`);
                    fs.writeFileSync(tempPath, buffer);

                    msg.reply('Processing voice note...');
                    text = await transcribeAudio(tempPath);
                    fs.unlinkSync(tempPath); // Cleanup
                    console.log("Transcribed text:", text);
                }
            }

            // 2. Handle Conversation State (Draft Confirmation)
            if (conversationState[userId] && conversationState[userId].step === 'CONFIRM_DRAFT') {
                const response = text.toLowerCase().trim();
                const draftData = conversationState[userId].data;

                if (response === 'yes' || response === 'si' || response === 'confirm') {
                    // Create Invoice
                    msg.reply('Creating invoice...');
                    const newInvoice = await createInvoice(draftData);

                    // Generate PDF
                    const pdfPath = await generateInvoicePDF(newInvoice);
                    const media = MessageMedia.fromFilePath(pdfPath);

                    await client.sendMessage(userId, media, { caption: `Invoice #${newInvoice.id.slice(0, 8)} created successfully.` });
                    delete conversationState[userId]; // Reset state
                } else if (response === 'no' || response === 'cancel') {
                    msg.reply('Invoice creation cancelled.');
                    delete conversationState[userId];
                } else {
                    msg.reply('Please reply "yes" to confirm or "no" to cancel.');
                }
                return;
            }

            // 3. Parse Intent (New Request)
            const intentData = await parseIntent(text);
            console.log('Parsed Internal:', intentData);

            if (intentData.intent === 'create_invoice') {
                // Return Draft Summary
                const draft = {
                    customerName: intentData.customerName,
                    amount: intentData.amount,
                    description: intentData.description,
                    dueDate: intentData.dueDate || new Date().toISOString()
                };

                conversationState[userId] = {
                    step: 'CONFIRM_DRAFT',
                    data: draft
                };

                const summary = `
*Draft Invoice Details:*
Customer: ${draft.customerName}
Amount: ${draft.amount}
Description: ${draft.description}

*Reply "yes" into confirm or "no" to cancel.*`;
                msg.reply(summary);

            } else if (intentData.intent === 'update_payment') {
                await markInvoiceAsPaid(intentData.invoiceId);
                msg.reply(`Invoice ${intentData.invoiceId} marked as PAID.`);

            } else {
                if (!msg.hasMedia) { // Don't reply to random media that isn't PTT
                    msg.reply('I did not understand. Try "Create invoice for..." or "Paid [ID]".');
                }
            }

        } catch (error) {
            console.error('Error processing message:', error);
            msg.reply('An error occurred processing your request.');
        }
    });

    client.initialize();
};

const getClient = () => client;

module.exports = {
    initializeWhatsApp,
    getClient
};
