const fs = require('fs');
const axios = require('axios');
const OpenAI = require('openai');
const path = require('path');
const FormData = require('form-data');
require('dotenv').config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

async function transcribeAudio(filePath) {
    console.log(`Transcribing audio file: ${filePath}`);

    // Priority 1: Sarvam AI
    if (process.env.SARVAM_API_KEY) {
        console.log("Using Sarvam AI for transcription...");
        try {
            const data = new FormData();
            data.append('file', fs.createReadStream(filePath));
            data.append('model', 'saaras:v1'); // or v2/v3 based on availability

            const response = await axios.post('https://api.sarvam.ai/speech-to-text-translate', data, {
                headers: {
                    'api-subscription-key': process.env.SARVAM_API_KEY,
                    ...data.getHeaders()
                }
            });

            console.log("Sarvam AI Response:", response.data);
            return response.data.transcript || response.data.text || "";
        } catch (error) {
            console.error("Sarvam AI Error:", error.response ? error.response.data : error.message);
            console.log("Falling back to OpenAI/Mock...");
        }
    }

    // Priority 2: OpenAI Whisper
    if (process.env.OPENAI_API_KEY) {
        try {
            const transcription = await openai.audio.transcriptions.create({
                file: fs.createReadStream(filePath),
                model: "whisper-1",
            });
            console.log("OpenAI Transcription:", transcription.text);
            return transcription.text;
        } catch (error) {
            console.error("OpenAI Error:", error);
        }
    }

    console.warn("No valid API Key found. Returning mock transcription.");
    return "Create invoice for John Doe amount 150 for consultation";
}

module.exports = { transcribeAudio };
