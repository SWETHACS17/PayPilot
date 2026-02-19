const Groq = require('groq-sdk');
require('dotenv').config();

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

async function parseIntent(text) {
    if (!process.env.GROQ_API_KEY) {
        console.warn("GROQ_API_KEY not found, using simple keyword matching.");
        return mockParse(text);
    }

    try {
        console.log("Parsing intent with Groq...");
        const completion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: "You are an invoice assistant. Extract structured data from the user's request. Output ONLY valid JSON.\n" +
                        "If the user wants to create an invoice, return: { \"intent\": \"create_invoice\", \"customerName\": \"...\", \"amount\": 0, \"description\": \"...\", \"dueDate\": \"YYYY-MM-DD\" }.\n" +
                        "If no due date is mentioned, use today + 7 days.\n" +
                        "If the user says 'Paid [ID]', return: { \"intent\": \"update_payment\", \"invoiceId\": \"...\" }.\n" +
                        "If you cannot understand, return: { \"intent\": \"unknown\" }."
                },
                {
                    role: "user",
                    content: text
                }
            ],
            model: "llama3-8b-8192",
            temperature: 0,
            response_format: { type: "json_object" }
        });

        const content = completion.choices[0]?.message?.content;
        console.log("Groq Response:", content);
        return JSON.parse(content);
    } catch (error) {
        console.error("Groq Error:", error);
        return mockParse(text);
    }
}

function mockParse(text) {
    // Check for "paid" command (e.g., "paid 102")
    const paidMatch = text.match(/paid\s+(.+)/i);
    if (paidMatch) {
        return {
            intent: "update_payment",
            invoiceId: paidMatch[1].trim()
        };
    }

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
