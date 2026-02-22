# PayPilot Backend

PayPilot is an AI-powered invoice generator that integrates directly with **WhatsApp**. It allows users to create, view, and manage invoices using natural language text or voice notes.

The system uses **Groq (Llama 3)** for intent parsing, **Sarvam AI** for voice-to-text transcription, and **Puppeteer** for generating professional PDF invoices. All data is stored in **Supabase**.

The standard government invoice format is used in pdf generation.



## Youtube link

https://youtu.be/tMPPqJDV8sE


## Features

- **WhatsApp Interface**: Interact with the bot entirely through WhatsApp.
- **Natural Language Invoicing**: "Create invoice for 5000 to ABC Corp for consulting"
- **Voice Support**: Send voice notes (English/Hindi), powered by Sarvam AI.
- **Smart Intent Parsing**: Uses LLMs (Groq/Llama 3) to extract structured data from text.
- **PDF Generation**: Automatically generates and sends PDF invoices.
- **Payment Tracking**: Mark invoices as paid using natural language.
- **Scheduler**: Automated checks for overdue invoices.



## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: Supabase (PostgreSQL)
- **WhatsApp Integration**: `whatsapp-web.js`
- **AI / LLM**: Groq SDK (Llama 3.3 70B Versatile)
- **Speech-to-Text**: Sarvam AI
- **PDF Generation**: Puppeteer
- **Scheduling**: Node-cron



## Project Structure

```
backend/
├── src/
│   ├── services/
│   │   ├── intentParser.js    # LLM interaction (Groq)
│   │   ├── invoiceService.js  # DB operations (Supabase)
│   │   ├── pdfService.js      # PDF generation (Puppeteer)
│   │   ├── schedulerService.js# Cron jobs for reminders
│   │   ├── sttService.js      # Speech-to-text (Sarvam AI)
│   │   ├── supabaseClient.js  # DB connection
│   │   └── whatsappService.js # WhatsApp bot logic
│   ├── index.js               # Enry point
│   └── setupDatabase.js       # Database initialization script
├── .env                       # Environment variables
├── package.json               # Dependencies
└── README.md                  # Documentation
```


## Setup & Installation

### 1. Clone the Repository
```bash
git clone <repository-url>
cd PayPilot/backend
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Variables
Create a `.env` file in the `backend/` directory with the following keys:

```env
PORT=3000

# WhatsApp (Optional, handled by whatsapp-web.js)
# WHATSAPP_CLIENT_ID=

# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# AI Services
GROQ_API_KEY=your_groq_api_key
SARVAM_API_KEY=your_sarvam_api_key
```

### 4. Database Setup
Run the setup script to create the necessary tables in your Supabase project:
```bash
npm run setup-db
```
*Note: This script creates an `invoices` table if it doesn't exist.*

### 5. Start the Server
```bash
npm start
```
OR for development with auto-reload:
```bash
npm run dev
```

## How to Use

1. **Start the Bot**: Run the server. It will generate a QR code in the terminal.
2. **Scan QR Code**: Use WhatsApp on your phone to scan the QR code (Linked Devices explained below).
3. **Send Commands**:
   - **Create Invoice**:
     > "Create invoice of ₹15,000 to ABC Traders for consulting, due in 7 days"
   - **Check Status**:
     > "Show invoice status for #1234"
   - **Mark as Paid**:
     > "Mark invoice #1234 as paid"
   - **Voice Note**:
     > *Record a voice note saying the same commands.*


```
╔══════════════════════════════════════════════════╗
                WHATSAPP QR CODE — SCAN ME!                           
╠══════════════════════════════════════════════════╣
  How to connect:                                                
  1. Open WhatsApp on your phone                                 
  2. Tap ⋮ (Menu) → "Linked Devices"                               
  3. Tap "Link a Device"                                         
  4. Point your phone camera at the QR below                     
╚══════════════════════════════════════════════════╝
```

## Screenshots

### QR code to link your mobile to the system through whatsapp

<img width="482" height="337" alt="Screenshot 2026-02-19 162808" src="https://github.com/user-attachments/assets/4b0bd9ab-f660-43d8-9a17-df02b0f6e066" />

### Transcribed text
<img width="486" height="207" alt="Screenshot 2026-02-19 194643" src="https://github.com/user-attachments/assets/3de08cb2-07c8-4d69-be67-43f6d75acb0b" />

### Pdf auto generated
<img width="210" height="537" alt="image" src="https://github.com/user-attachments/assets/b8975afa-d6e6-40e4-a889-a30dbfc4e637" />

