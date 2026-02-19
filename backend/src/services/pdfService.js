const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

/**
 * Find a Chrome executable from puppeteer cache or system install
 */
const findChrome = () => {
    const homeDir = process.env.USERPROFILE || process.env.HOME || '';

    // 1. Check puppeteer cache for any installed Chrome version
    const cacheDir = path.join(homeDir, '.cache', 'puppeteer', 'chrome');
    if (fs.existsSync(cacheDir)) {
        const versions = fs.readdirSync(cacheDir).filter(d => {
            return fs.statSync(path.join(cacheDir, d)).isDirectory();
        });
        // Sort descending to get latest version
        versions.sort().reverse();
        for (const ver of versions) {
            const chromePath = path.join(cacheDir, ver, 'chrome-win64', 'chrome.exe');
            if (fs.existsSync(chromePath)) {
                console.log(`🔍 Found Chrome at: ${chromePath}`);
                return chromePath;
            }
        }
    }

    // 2. Fallback to common system Chrome paths (Windows)
    const systemPaths = [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        path.join(homeDir, 'AppData', 'Local', 'Google', 'Chrome', 'Application', 'chrome.exe')
    ];
    for (const p of systemPaths) {
        if (fs.existsSync(p)) {
            console.log(`🔍 Found system Chrome at: ${p}`);
            return p;
        }
    }

    return null; // Let puppeteer try its default
};

/**
 * Generate a professional PDF invoice using Puppeteer
 */
const generateInvoicePDF = async (invoice) => {
    const executablePath = findChrome();
    const launchOptions = {
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
    };
    if (executablePath) {
        launchOptions.executablePath = executablePath;
    }
    const browser = await puppeteer.launch(launchOptions);
    const page = await browser.newPage();

    const invoiceId = invoice.id.slice(0, 8).toUpperCase();
    const amount = parseFloat(invoice.amount).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
    const createdDate = new Date(invoice.created_at || Date.now()).toLocaleDateString('en-IN', {
        day: '2-digit', month: 'long', year: 'numeric'
    });
    const dueDate = invoice.due_date
        ? new Date(invoice.due_date).toLocaleDateString('en-IN', {
            day: '2-digit', month: 'long', year: 'numeric'
        })
        : 'On Receipt';
    const status = invoice.status || 'PENDING';
    const statusColor = status === 'PAID' ? '#10b981' : status === 'OVERDUE' ? '#ef4444' : '#f59e0b';

    const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }

            body {
                font-family: 'Inter', -apple-system, sans-serif;
                color: #1f2937;
                background: #ffffff;
                padding: 40px;
                line-height: 1.6;
            }

            .invoice-container {
                max-width: 700px;
                margin: 0 auto;
            }

            /* ── Header ── */
            .header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 40px;
                padding-bottom: 24px;
                border-bottom: 3px solid #6366f1;
            }

            .brand {
                display: flex;
                align-items: center;
                gap: 12px;
            }

            .brand-icon {
                width: 48px;
                height: 48px;
                background: linear-gradient(135deg, #6366f1, #8b5cf6);
                border-radius: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-weight: 700;
                font-size: 20px;
            }

            .brand-name {
                font-size: 24px;
                font-weight: 700;
                color: #6366f1;
            }

            .brand-tagline {
                font-size: 12px;
                color: #9ca3af;
                margin-top: 2px;
            }

            .invoice-title {
                text-align: right;
            }

            .invoice-title h1 {
                font-size: 32px;
                font-weight: 700;
                color: #1f2937;
                letter-spacing: -0.5px;
            }

            .invoice-id {
                font-size: 14px;
                color: #6b7280;
                margin-top: 4px;
            }

            /* ── Status Badge ── */
            .status-badge {
                display: inline-block;
                padding: 4px 14px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: 600;
                color: white;
                background: ${statusColor};
                margin-top: 8px;
            }

            /* ── Info Grid ── */
            .info-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 30px;
                margin-bottom: 40px;
            }

            .info-block h3 {
                font-size: 11px;
                text-transform: uppercase;
                letter-spacing: 1px;
                color: #9ca3af;
                margin-bottom: 8px;
                font-weight: 600;
            }

            .info-block p {
                font-size: 15px;
                color: #374151;
                font-weight: 500;
            }

            .info-block .value-large {
                font-size: 18px;
                font-weight: 600;
                color: #1f2937;
            }

            /* ── Table ── */
            .invoice-table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 30px;
            }

            .invoice-table thead th {
                background: #f9fafb;
                padding: 12px 16px;
                text-align: left;
                font-size: 11px;
                text-transform: uppercase;
                letter-spacing: 1px;
                color: #6b7280;
                font-weight: 600;
                border-bottom: 2px solid #e5e7eb;
            }

            .invoice-table thead th:last-child {
                text-align: right;
            }

            .invoice-table tbody td {
                padding: 16px;
                border-bottom: 1px solid #f3f4f6;
                font-size: 14px;
            }

            .invoice-table tbody td:last-child {
                text-align: right;
                font-weight: 600;
            }

            /* ── Totals ── */
            .totals-section {
                display: flex;
                justify-content: flex-end;
                margin-bottom: 40px;
            }

            .totals-box {
                width: 280px;
            }

            .total-row {
                display: flex;
                justify-content: space-between;
                padding: 10px 0;
                font-size: 14px;
                color: #6b7280;
            }

            .total-row.grand-total {
                border-top: 2px solid #1f2937;
                margin-top: 8px;
                padding-top: 14px;
                font-size: 20px;
                font-weight: 700;
                color: #1f2937;
            }

            /* ── Footer ── */
            .footer {
                margin-top: 50px;
                padding-top: 24px;
                border-top: 1px solid #e5e7eb;
                text-align: center;
            }

            .footer p {
                font-size: 12px;
                color: #9ca3af;
                line-height: 1.8;
            }

            .footer .thank-you {
                font-size: 16px;
                font-weight: 600;
                color: #6366f1;
                margin-bottom: 8px;
            }
        </style>
    </head>
    <body>
        <div class="invoice-container">
            <!-- Header -->
            <div class="header">
                <div class="brand">
                    <div class="brand-icon">PP</div>
                    <div>
                        <div class="brand-name">PayPilot</div>
                        <div class="brand-tagline">Smart Invoice Management</div>
                    </div>
                </div>
                <div class="invoice-title">
                    <h1>INVOICE</h1>
                    <div class="invoice-id">#${invoiceId}</div>
                    <div class="status-badge">${status}</div>
                </div>
            </div>

            <!-- Info Grid -->
            <div class="info-grid">
                <div class="info-block">
                    <h3>Bill To</h3>
                    <p class="value-large">${invoice.customer_name}</p>
                </div>
                <div class="info-block" style="text-align: right;">
                    <h3>Invoice Date</h3>
                    <p>${createdDate}</p>
                    <h3 style="margin-top: 16px;">Due Date</h3>
                    <p class="value-large">${dueDate}</p>
                </div>
            </div>

            <!-- Invoice Table -->
            <table class="invoice-table">
                <thead>
                    <tr>
                        <th>Description</th>
                        <th>Amount</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>${invoice.description || 'Services rendered'}</td>
                        <td>₹${amount}</td>
                    </tr>
                </tbody>
            </table>

            <!-- Totals -->
            <div class="totals-section">
                <div class="totals-box">
                    <div class="total-row">
                        <span>Subtotal</span>
                        <span>₹${amount}</span>
                    </div>
                    <div class="total-row">
                        <span>Tax</span>
                        <span>₹0.00</span>
                    </div>
                    <div class="total-row grand-total">
                        <span>Total</span>
                        <span>₹${amount}</span>
                    </div>
                </div>
            </div>

            <!-- Footer -->
            <div class="footer">
                <p class="thank-you">Thank you for your business!</p>
                <p>
                    Generated by PayPilot — AI-Powered Invoice Management<br>
                    This invoice was generated automatically via WhatsApp.
                </p>
            </div>
        </div>
    </body>
    </html>
    `;

    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

    // Ensure invoices directory exists
    const invoicesDir = path.join(__dirname, '../../invoices');
    if (!fs.existsSync(invoicesDir)) {
        fs.mkdirSync(invoicesDir, { recursive: true });
    }

    const pdfPath = path.join(invoicesDir, `invoice_${invoice.id.slice(0, 8)}.pdf`);

    await page.pdf({
        path: pdfPath,
        format: 'A4',
        printBackground: true,
        margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' }
    });

    await browser.close();
    console.log(`📄 PDF generated: ${pdfPath}`);
    return pdfPath;
};

module.exports = { generateInvoicePDF };
