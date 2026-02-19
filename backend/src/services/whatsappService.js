const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

let client;

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

        if (msg.body === '!ping') {
            msg.reply('pong');
            return;
        }

        try {
            // 1. Parse Intent
            const { parseIntent } = require('./intentParser');
            const intentData = await parseIntent(msg.body);
            console.log('Parsed Internal:', intentData);

            if (intentData.intent === 'create_invoice') {
                msg.reply('Generando factura, por favor espere...');

                // 2. Create Invoice in DB
                const { createInvoice } = require('./invoiceService');
                const newInvoice = await createInvoice({
                    customerName: intentData.customerName,
                    amount: intentData.amount,
                    description: intentData.description,
                    dueDate: intentData.dueDate
                });

                // 3. Generate PDF
                const { generateInvoicePDF } = require('./pdfService');
                const pdfPath = await generateInvoicePDF(newInvoice);

                // 4. Send PDF to User
                const { MessageMedia } = require('whatsapp-web.js');
                const media = MessageMedia.fromFilePath(pdfPath);
                await client.sendMessage(msg.from, media, { caption: `Factura #${newInvoice.id.slice(0, 8)} generada exitosamente.` });

            } else {
                msg.reply('No entendí tu solicitud. Intenta decir: "Crear factura para Juan por 100 dólares por servicios web".');
            }
        } catch (error) {
            console.error('Error processing message:', error);
            msg.reply('Ocurrió un error al procesar tu solicitud.');
        }
    });

    client.initialize();
};

const getClient = () => client;

module.exports = {
    initializeWhatsApp,
    getClient
};
