const express = require('express');
const { initializeWhatsApp } = require('./services/whatsappService');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Initialize WhatsApp Client
initializeWhatsApp();

app.get('/', (req, res) => {
    res.send('PayPilot Backend is running');
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
