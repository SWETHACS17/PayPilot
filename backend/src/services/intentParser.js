const OpenAI = require('openai');
require('dotenv').config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

async function parseIntent(text) {
    if (!process.env.OPENAI_API_KEY) {
        console.warn("OPENAI_API_KEY not found, using simple keyword matching.");
        return mockParse(text);
    }

    try {
        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                {
                    role: "system",
                    content: "You are an intent parser for an invoice generator. Extract: amount, customerName, description, dueDate. Return JSON."
                },
                { role: "user", content: text }
            ],
            response_format: { type: "json_object" }
        });
        return JSON.parse(response.choices[0].message.content);
    } catch (error) {
        console.error("OpenAI Error:", error);
        return mockParse(text);
    }
}

function mockParse(text) {
    // innovative regex parsing for demonstration
    const amountMatch = text.match(/amount\s*(\d+)/i);
    const nameMatch = text.match(/for\s*([a-zA-Z\s]+)/i);

    return {
        intent: "create_invoice",
        amount: amountMatch ? parseFloat(amountMatch[1]) : 0,
        customerName: nameMatch ? nameMatch[1].trim() : "Unknown",
        description: "Invoice generated via WhatsApp",
        dueDate: new Date().toISOString()
    };
}

module.exports = { parseIntent };
