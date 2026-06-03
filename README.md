# Vyapar-Agent: Autonomous Shop Bookkeeping & ERP

**Vyapar-Agent** is an autonomous shop bookkeeping assistant designed for small retailers (Kirana shops) across Asia-Pacific. Instead of forcing shopkeepers to learn complex software or type entries manually, Vyapar-Agent runs silently in the background, intercepts receipt printing streams, and uses a coordinated network of Google Gemini AI agents to manage inventory, update metrics, and handle supplier procurement autonomously.

---

## 🤖 Coordinated Multi-Agent Architecture

Vyapar-Agent employs a specialized 5-agent pipeline orchestrated by a master supervisor:

```
                  ┌──────────────────────┐
                  │   Receipt Print Job  │
                  └──────────┬───────────┘
                             │
                             ▼
  ┌──────────────────────────────────────────────────────┐
  │         AGENT 0: SUPERVISOR (Gemini 1.5 Pro)         │
  │  - Master brain orchestrating the retail pipeline     │
  │  - Validates outputs, updates live audit log streams  │
  └──────────┬───────────────────────────────┬───────────┘
             │                               │
             ▼                               ▼
┌─────────────────────────┐     ┌─────────────────────────┐
│ AGENT 1: RECEIPT PARSER │     │ AGENT 2: STOCK MANAGER  │
│ (Gemini Pro)            │     │ (Gemini Pro)            │
│ Parses raw print text   │     │ Adjusts stock levels,   │
│ into structured JSON    │     │ computes net profits    │
└─────────────────────────┘     └────────────┬────────────┘
                                             │ (if stock low)
                                             ▼
                                ┌─────────────────────────┐
                                │ AGENT 3: PROCUREMENT    │
                                │ (Gemini Pro)            │
                                │ Drafts local language   │
                                │ WhatsApp supply orders  │
                                └─────────────────────────┘
```

*   **Agent 0 (Supervisor Agent)**: Oversees all worker agents, logs actions, and audits data.
*   **Agent 1 (Receipt Parser Agent)**: Reads messy abbreviations on thermal cash receipts and outputs clean structured items list.
*   **Agent 2 (Inventory Manager Agent)**: Tracks stock, subtracts purchases, and flags low-stock warnings.
*   **Agent 3 (Procurement Agent)**: Generates Hinglish/local language supplier reorder messages ready for 1-click WhatsApp send.
*   **Agent 4 (Dukaan Mitra Helper Agent)**: A friendly, local language conversational assistant in the sidebar to answer business health questions.

---

## 💻 Tech Stack

- **Core**: Next.js 16 (App Router, Turbopack) & React 19
- **Styling**: Pure Vanilla CSS featuring modern responsive Glassmorphism layout
- **Database**: Local JSON-based persistent file store (plug-and-play local setup)
- **AI Engine**: Google Gemini API via `@google/generative-ai` with smart offline simulation fallback

---

## 🚀 Getting Started

### 1. Installation
Install project dependencies:
```bash
npm install
```

### 2. Configure Environment Variable (Optional)
Create a `.env.local` file in the root directory and add your Gemini API key:
```env
GEMINI_API_KEY=your_google_gemini_api_key_here
```
*Note: If no API key is provided, the application automatically falls back to an intelligent mock simulation mode so you can test all agent pipelines seamlessly.*

### 3. Run Development Server
Start the local server:
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your web browser.

### 4. Run CLI Integration Tests
Verify the pipeline with a single command:
```bash
npx tsx test-agents.ts
```
This feeds a simulated thermal cash register receipt into the Supervisor Agent and prints out the transaction breakdown.
