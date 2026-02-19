const express = require('express');
const { initializeWhatsApp, getClient } = require('./services/whatsappService');
const { initScheduler } = require('./services/schedulerService');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// ─────────────────────────────────────────────
// Health Check Endpoint
// ─────────────────────────────────────────────
app.get('/', (req, res) => {
    res.json({
        service: 'PayPilot Backend',
        status: 'running',
        version: '1.0.0',
        timestamp: new Date().toISOString()
    });
});

// ─────────────────────────────────────────────
// Initialize WhatsApp Client
// ─────────────────────────────────────────────
console.log('🚀 Starting PayPilot Backend...\n');
initializeWhatsApp();

// ─────────────────────────────────────────────
// Initialize Scheduler (pass getClient so it can
// lazily retrieve the client when WhatsApp is ready)
// ─────────────────────────────────────────────
initScheduler(getClient);

// ─────────────────────────────────────────────
// Start Express Server
// ─────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`\n🌐 Express server running on http://localhost:${PORT}`);
    console.log('📱 Waiting for WhatsApp QR code...\n');
});
