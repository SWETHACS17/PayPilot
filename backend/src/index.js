const express = require('express');
const { initializeWhatsApp, getClient } = require('./services/whatsappService');
const { initScheduler } = require('./services/schedulerService');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Initialize WhatsApp Client
initializeWhatsApp();

// Initialize Scheduler (once client is ready, but we pass the getClient accessor or similar)
// Ideally wait for ready event, but for simplicity:
const client = getClient(); // might be undefined initially, scheduler handles it or we pass a getter
initScheduler(client);

app.get('/', (req, res) => {
    res.send('PayPilot Backend is running');
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
