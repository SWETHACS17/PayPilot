const fs = require('fs');
const axios = require('axios');
const path = require('path');
const FormData = require('form-data');
require('dotenv').config();

/**
 * Transcribe audio file to text
 * Priority: Sarvam AI → Mock fallback
 */
async function transcribeAudio(filePath) {
    console.log(`🎙️ Transcribing audio file: ${filePath}`);

    // ─────────────────────────────────────────────
    // Priority 1: Sarvam AI STT
    // ─────────────────────────────────────────────
    if (process.env.SARVAM_API_KEY && process.env.SARVAM_API_KEY !== 'your_sarvam_api_key_here') {
        console.log('   Using Sarvam AI for transcription...');
        try {
            const data = new FormData();
            data.append('file', fs.createReadStream(filePath));
            data.append('model', 'saaras:v2.5');
            data.append('language_code', 'hi-IN');  // Hindi + English support
            data.append('with_timestamps', 'false');

            const response = await axios.post(
                'https://api.sarvam.ai/speech-to-text-translate',
                data,
                {
                    headers: {
                        'api-subscription-key': process.env.SARVAM_API_KEY,
                        ...data.getHeaders()
                    },
                    timeout: 30000 // 30 second timeout
                }
            );

            console.log('   ✅ Sarvam AI Response:', JSON.stringify(response.data));
            const transcript = response.data.transcript || response.data.text || '';

            if (transcript.trim()) {
                return transcript;
            }

            console.log('   ⚠️ Empty transcript from Sarvam, falling back...');
        } catch (error) {
            const errMsg = error.response ? JSON.stringify(error.response.data) : error.message;
            console.error('   ❌ Sarvam AI Error:', errMsg);
            console.log('   ↩️ Falling back to mock transcription...');
        }
    }

    // ─────────────────────────────────────────────
    // Fallback: Mock transcription (for development)
    // ─────────────────────────────────────────────
    console.warn('   ⚠️ No valid STT API key found. Returning mock transcription.');
    return 'Create invoice for John Doe amount 5000 for consultation due in 7 days';
}

module.exports = { transcribeAudio };
