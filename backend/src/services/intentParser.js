const Groq = require('groq-sdk');
require('dotenv').config();

let groqClient = null;

if (process.env.GROQ_API_KEY) {
    groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
}

/**
 * Parse user intent using GROQ LLM
 * Extracts structured invoice data from natural language
 */
async function parseIntent(text) {
    if (!groqClient) {
        console.warn('⚠️  GROQ_API_KEY not found, using simple keyword matching.');
        return fallbackParse(text);
    }

    try {
        const response = await groqClient.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: [
                {
                    role: 'system',
                    content: `You are an invoice assistant intent parser. Analyze the user's message and extract structured data.

Return a JSON object with these fields:
- "intent": one of "create_invoice", "update_payment", "check_status", "list_invoices", or "unknown"
- "amount": number (the invoice amount, if mentioned)
- "customerName": string (the customer/client name, if mentioned)
- "customerPhone": string (the customer's phone number if mentioned, digits only with country code e.g. "919876543210". If no country code, assume India +91)
- "description": string (what the invoice is for, if mentioned)
- "dueDate": string (ISO date string for when payment is due, if mentioned. If user says "in X days", calculate from today: ${new Date().toISOString().split('T')[0]})
- "invoiceId": string (the invoice ID, if mentioned — for payment updates or status checks)

Rules:
- For "paid 102" or "mark invoice 102 as paid" → intent should be "update_payment" with invoiceId
- For "create invoice for ABC Traders..." → intent should be "create_invoice"
- For "status of invoice 102" → intent should be "check_status"
- For "show my invoices" or "list all invoices" → intent should be "list_invoices"
- If a phone number is mentioned (e.g. "send to 9876543210"), extract it as customerPhone
- If the message is unclear, set intent to "unknown"
- Always return valid JSON only, no extra text`
                },
                { role: 'user', content: text }
            ],
            response_format: { type: 'json_object' },
            temperature: 0.1,
            max_tokens: 300
        });

        const parsed = JSON.parse(response.choices[0].message.content);
        console.log('🧠 GROQ parsed intent:', parsed);
        return parsed;
    } catch (error) {
        console.error('❌ GROQ Error:', error.message || error);
        console.log('↩️  Falling back to keyword matching...');
        return fallbackParse(text);
    }
}

/**
 * Fallback keyword-based parser when GROQ is unavailable
 */
function fallbackParse(text) {
    const lowerText = text.toLowerCase().trim();

    // Check for "paid" command (e.g., "paid 102" or "mark invoice abc123 as paid")
    const paidMatch = lowerText.match(/(?:paid|mark.*paid)\s+([a-zA-Z0-9-]+)/i);
    if (paidMatch) {
        return {
            intent: 'update_payment',
            invoiceId: paidMatch[1].trim()
        };
    }

    // Check for status check
    const statusMatch = lowerText.match(/(?:status|check).*?([a-zA-Z0-9-]+)/i);
    if (statusMatch && (lowerText.includes('status') || lowerText.includes('check'))) {
        return {
            intent: 'check_status',
            invoiceId: statusMatch[1].trim()
        };
    }

    // Check for list invoices
    if (lowerText.includes('list') || lowerText.includes('show') || lowerText.includes('all invoices')) {
        return {
            intent: 'list_invoices'
        };
    }

    // Try to parse as invoice creation
    const amountMatch = text.match(/(?:₹|rs\.?|inr|amount\s*)[\s]*([0-9,]+(?:\.\d{2})?)/i);
    const nameMatch = text.match(/(?:to|for|customer|client)\s+([a-zA-Z\s]+?)(?:\s+(?:for|amount|₹|rs|due|$))/i);
    const descMatch = text.match(/(?:for|regarding|about)\s+([a-zA-Z\s]+?)(?:\s+(?:due|amount|₹|rs|$))/i);
    const dueMatch = text.match(/(?:due\s+in|within)\s+(\d+)\s*days?/i);
    const phoneMatch = text.match(/(?:\+?91[\s-]?)?([6-9]\d{9})\b/);

    const amount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : 0;
    const customerName = nameMatch ? nameMatch[1].trim() : 'Unknown';
    const description = descMatch ? descMatch[1].trim() : 'Invoice generated via WhatsApp';
    const customerPhone = phoneMatch ? '91' + phoneMatch[1] : null;

    let dueDate = new Date();
    if (dueMatch) {
        dueDate.setDate(dueDate.getDate() + parseInt(dueMatch[1]));
    } else {
        dueDate.setDate(dueDate.getDate() + 7); // Default: 7 days
    }

    return {
        intent: 'create_invoice',
        amount,
        customerName,
        customerPhone,
        description,
        dueDate: dueDate.toISOString()
    };
}

module.exports = { parseIntent };
