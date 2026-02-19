const express = require('express');
const mongoose = require('mongoose');
const { initializeWhatsApp, getClient } = require('./services/whatsappService');
const { initScheduler } = require('./services/schedulerService');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

// Initialize WhatsApp Client
initializeWhatsApp();

// Initialize Scheduler
const client = getClient();
initScheduler(client);

app.get('/', (req, res) => {
    res.send('PayPilot Backend is running');
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
