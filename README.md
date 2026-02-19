# 🧾 Conversational AI Invoice Generator

An AI-powered conversational invoice system that allows users to create, manage, and track invoices using natural language via chat or voice.

Example input:

> “Invoice ₹15,000 to ABC Traders for consulting, due in 7 days”

The system extracts structured data, confirms details, generates a PDF invoice, and supports reminders and payment tracking.

---

## 🚀 Features

- 💬 Natural language invoice creation
- 🎙️ Voice-to-text (Sarvam STT integration)
- 🧠 LLM-based intent parsing (structured JSON output)
- ✅ Confirmation before invoice creation
- 📄 Automatic PDF invoice generation
- 💾 Invoice storage (PostgreSQL / SQLite)
- 🔔 Reminder scheduling
- 💰 Payment simulation & reconciliation
- 📱 Optional WhatsApp Cloud API integration
- 🌐 Web chat UI support (Next.js)

---

## 🏗️ Architecture Overview

```
User (Chat / Voice)
        ↓
Web UI / WhatsApp Webhook
        ↓
FastAPI Backend
   ├── STT Service (Sarvam)
   ├── Intent Parser (LLM)
   ├── Invoice Service
   ├── PDF Generator
   ├── Reminder Scheduler
   └── PostgreSQL Database
```

---

## 🛠️ Tech Stack

### Backend
- Python
- FastAPI
- SQLAlchemy
- PostgreSQL (or SQLite for MVP)
- APScheduler
- WeasyPrint (PDF generation)
- httpx (async API calls)

### AI / NLP
- Sarvam STT API (voice → text)
- OpenAI / LLM structured extraction

### Frontend (Optional)
- Next.js
- Tailwind CSS

---

## 📂 Project Structure

```
backend/
│
├── main.py
├── database.py
├── models.py
│
├── routes/
│   ├── webhook.py
│   └── invoices.py
│
├── services/
│   ├── stt_service.py
│   ├── intent_parser.py
│   ├── invoice_service.py
│   └── pdf_generator.py
│
└── scheduler/
    └── reminders.py
```

---

## ⚙️ Setup Instructions

### 1️⃣ Clone Repository

```bash
git clone https://github.com/your-username/conversational-invoice-ai.git
cd conversational-invoice-ai
```

---

### 2️⃣ Create Virtual Environment

```bash
python -m venv venv
source venv/bin/activate   # Mac/Linux
venv\Scripts\activate      # Windows
```

---

### 3️⃣ Install Dependencies

```bash
pip install -r requirements.txt
```

Example `requirements.txt`:

```
fastapi
uvicorn
sqlalchemy
psycopg2-binary
python-dotenv
apscheduler
weasyprint
httpx
python-multipart
openai
```

---

### 4️⃣ Configure Environment Variables

Create a `.env` file:

```
DATABASE_URL=postgresql://user:password@localhost/invoice_db
SARVAM_API_KEY=your_sarvam_key
OPENAI_API_KEY=your_openai_key
WHATSAPP_TOKEN=your_whatsapp_token
```

---

### 5️⃣ Run Server

```bash
uvicorn main:app --reload
```

Open API docs:

```
http://127.0.0.1:8000/docs
```

---

## 🧠 How It Works

### 1️⃣ User Input

Text or voice message:
```
Invoice ₹15,000 to ABC Traders for consulting, due in 7 days
```

---

### 2️⃣ Voice Processing (If Audio)

- Audio file received
- Sent to Sarvam STT
- Transcript returned

---

### 3️⃣ Intent Parsing

LLM extracts structured fields:

```json
{
  "amount": 15000,
  "customer_name": "ABC Traders",
  "description": "consulting",
  "due_date": "2026-02-26"
}
```

---

### 4️⃣ Confirmation Flow

System replies:

```
Create invoice of ₹15,000 to ABC Traders for "consulting", due in 7 days?
```

User confirms before saving.

---

### 5️⃣ Invoice Creation

- Saved in database
- Invoice ID generated
- PDF created
- Payment link generated (demo)

---

### 6️⃣ Payment Simulation

User can send:

```
mark invoice 102 as paid
```

System updates status and sends confirmation.

---

## 🗄️ Database Schema (Simplified)

### Users
- id
- name
- phone

### Customers
- id
- user_id
- name
- phone

### Invoices
- id
- user_id
- customer_id
- amount
- description
- due_date
- status (draft / sent / paid / overdue)

---

## 🎯 MVP Scope
