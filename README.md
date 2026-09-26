# ⚖️ Legal Document Assistant

> A GenAI-powered web app that helps users understand, compare, and navigate legal documents (contracts, agreements, policies) without replacing professional legal advice.

**Hackathon Submission:** PromptWars  
**Theme:** AI for Legal Assistance & Access  

---

## 1. Demo Vertical & Focus Area
While **Legal Document Assistant** is general-purpose and can process any standard legal agreement, the primary demo verticals used for testing and demonstration are:
1. **Residential Lease Agreements** (tenant rights, deposit forfeitures, late payment penalties, automatic renewal, entry rights).
2. **Software Terms of Service (SLA / SaaS)** (mandatory binding arbitration, class-action waivers, limitation of liability caps, automatic renewals).

---

## 2. Approach & Architecture Logic

### Why Vite + TypeScript + Vercel Serverless Functions?
- **Speed & Tiny Footprint:** Vanilla TypeScript with Vite provides lightning-fast page loads and zero bundle bloat (no heavy React/Next.js overhead).
- **Stateless & Secure:** Vercel Serverless Functions (`/api/*.ts`) keep the backend completely stateless per request. The **Google Gemini API key** is read strictly from `process.env.GEMINI_API_KEY` inside `/api` functions and is **never exposed to the client bundle**.
- **Client-Side Extraction:** PDF and DOCX files are parsed directly in the browser (`pdfjs-dist` and `mammoth`), preventing large binary payload uploads to serverless endpoints.

### Hybrid Rule + Gemini AI Risk Classification
1. **Fast Rule-Based Pre-Checks (Client-Side):** Instant regex scanning detects penalties (`$`, `USD`, `fines`), strict deadlines (`notice period`, `within X days`), strong obligations (`shall`, `must`, `waives right`), and liability clauses (`indemnify`, `hold harmless`).
2. **Grounded Gemini AI Analysis (Server-Side):** Flagged/ambiguous clauses are sent to `/api/classify` where Gemini assigns a structured category (*Obligation*, *Risk*, *Right*, *Deadline*, *Neutral*), a risk level (*LOW*, *MEDIUM*, *HIGH*), and a 1-line plain language rationale.

---

## 3. How the Solution Works

### ASCII Architecture Diagram
```
┌────────────────────────────────────────────────────────────────────────┐
│                          CLIENT (BROWSER)                              │
│                                                                        │
│  ┌───────────────────────┐   ┌─────────────────┐   ┌────────────────┐ │
│  │ Document Parser       │   │ Clause Segment  │   │ Risk Pre-Check │ │
│  │ (PDF / DOCX / Text)   │──>│ & Chunker       │──>│ (Regex Rules)  │ │
│  └───────────────────────┘   └─────────────────┘   └────────────────┘ │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ UI Tabs: Overview & Metadata | Clause Analysis | Compare | Q&A   │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │ HTTPS JSON Requests
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                VERCEL SERVERLESS FUNCTIONS (/api)                      │
│                                                                        │
│  /api/simplify   /api/classify   /api/compare   /api/chat   /api/checklist│
│         │               │               │           │           │      │
│         └───────────────┴───────┬───────┴───────────┴───────────┘      │
│                                 │ Shared Gemini Client (_gemini.ts)    │
│                                 ▼                                      │
│                  Google Gemini API (gemini-1.5-flash)                  │
└────────────────────────────────────────────────────────────────────────┘
```

### Feature Walkthrough
- **1. Document Overview & Key Metadata Extraction:** Automatically extracts an executive overview, parties involved, important dates, financial amounts, core rights, and core obligations into structured chips at the top of the analysis tab.
- **2. Clause Simplification & Risk Flagging:** Segments text into numbered clauses and pairs original legal text with plain-language explanations. Color-coded + text-labeled risk badges (`🚨 HIGH RISK`, `⚠️ MEDIUM RISK`, `✅ LOW RISK`) highlight potential pitfalls.
- **3. Side-by-Side Document Comparison:** Upload a revised draft (Document B) to generate a semantic diff showing added, removed, or modified provisions with practical implications.
- **4. Grounded Q&A Chatbot with Clause Citations:** Interactive chat constrained by system prompts to answer strictly from document text, embedding explicit clause/section citations (e.g., `[Clause 2: Rent and Payment Terms]`).
- **5. Actionable Outputs & Downloads:** Generates executive summaries, prioritized task checklists, and specific attorney review questions downloadable as `.txt` or `.md`.
- **6. Safety & Disclaimers:** Persistent visible legal disclaimer, high-risk warnings recommending attorney consultation, and neutral non-judgmental AI phrasing.

---

## 4. Problem Statement Alignment & Feature Parity

| Problem Statement & Feature Requirement | Implemented Feature | Location in Codebase |
| :--- | :--- | :--- |
| **Document Overview & Key Metadata Extraction** | Executive 2-3 sentence overview + key entities (parties, dates, amounts, rights, obligations) | [`/api/simplify.ts`](file:///c:/Users/kapil/Desktop/Legal-Document-Assistant/api/simplify.ts), [`/src/ui/clauseView.ts`](file:///c:/Users/kapil/Desktop/Legal-Document-Assistant/src/ui/clauseView.ts) |
| **Clause Classification & Risk Highlighting** | Regex pre-checks + Gemini risk classifier with accessibility labels | [`/src/lib/riskRules.ts`](file:///c:/Users/kapil/Desktop/Legal-Document-Assistant/src/lib/riskRules.ts), [`/api/classify.ts`](file:///c:/Users/kapil/Desktop/Legal-Document-Assistant/api/classify.ts), [`/src/ui/riskBadge.ts`](file:///c:/Users/kapil/Desktop/Legal-Document-Assistant/src/ui/riskBadge.ts) |
| **Document Comparison** | Semantic clause-level diff engine with practical implications | [`/api/compare.ts`](file:///c:/Users/kapil/Desktop/Legal-Document-Assistant/api/compare.ts), [`/src/ui/comparisonView.ts`](file:///c:/Users/kapil/Desktop/Legal-Document-Assistant/src/ui/comparisonView.ts) |
| **Grounded Q&A Chatbot with Citations** | Strictly-grounded chat API citing specific clause numbers & titles | [`/api/chat.ts`](file:///c:/Users/kapil/Desktop/Legal-Document-Assistant/api/chat.ts), [`/src/ui/chatPanel.ts`](file:///c:/Users/kapil/Desktop/Legal-Document-Assistant/src/ui/chatPanel.ts) |
| **Actionable Outputs & Checklist** | Executive summary, task checklist, lawyer questions & `.txt`/`.md` blob downloads | [`/api/checklist.ts`](file:///c:/Users/kapil/Desktop/Legal-Document-Assistant/api/checklist.ts), [`/src/ui/actionableOutput.ts`](file:///c:/Users/kapil/Desktop/Legal-Document-Assistant/src/ui/actionableOutput.ts) |
| **Edge-Case & File Failure Handling** | Zero-byte rejection, 5MB limits, unreadable PDF/DOCX handling, non-English warning | [`/src/lib/parser.ts`](file:///c:/Users/kapil/Desktop/Legal-Document-Assistant/src/lib/parser.ts), [`/src/ui/upload.ts`](file:///c:/Users/kapil/Desktop/Legal-Document-Assistant/src/ui/upload.ts) |
| **Disclaimer & Safety** | Sticky disclaimer banner, high-risk consultation warnings, compliant prompt framing | [`/src/ui/disclaimer.ts`](file:///c:/Users/kapil/Desktop/Legal-Document-Assistant/src/ui/disclaimer.ts), [`/api/_gemini.ts`](file:///c:/Users/kapil/Desktop/Legal-Document-Assistant/api/_gemini.ts) |

---

## 5. Architectural Design Decisions & Trade-Offs

1. **Stateless Serverless vs. Persistent Database & RAG Vector Store**
   - *Choice:* 100% in-memory, stateless Vercel Serverless Functions per request.
   - *Rationale:* User contracts contain sensitive private information. By eliminating persistent databases and user account storage, no document content is ever stored server-side. This guarantees user privacy, zero storage maintenance, and instant serverless cold-start performance.

2. **Direct Text Context & Clause Headings Citations vs. PDF Page Indexing**
   - *Choice:* Extract direct clause titles (e.g., `[Clause 2: Rent and Payment Terms]`) and exact text excerpts in chat answers.
   - *Rationale:* PDF page numbers vary depending on font size and renderer. Citing structural clause titles provides far more meaningful context for legal contract navigation without requiring external vector databases or complex page indexing infrastructure.

3. **Client-Side Document Extraction vs. Heavy Server OCR**
   - *Choice:* Extract text in browser using `pdfjs-dist` and `mammoth`.
   - *Rationale:* Parsing documents client-side prevents transferring multi-megabyte binary payloads across network boundaries to serverless functions, dramatically lowering latency and API costs. Unreadable/scanned PDFs display a clear warning requesting text-based documents.

---

## 6. Assumptions Made
1. **Language:** Primary analysis model tuned for English legal documents (with non-English text detection warnings).
2. **File Size Limit:** Maximum file size capped at 5 MB per document.
3. **Stateless Processing:** No document text or user data is persisted on any database or logged server-side.
4. **Model:** Google Gemini API (`@google/generative-ai`) model `gemini-1.5-flash`.

---

## 7. Setup & Local Development

### Prerequisites
- Node.js (v18+ recommended)
- npm

### Installation
```bash
# Clone the repository
git clone https://github.com/kapil31jangid/Legal-Document-Assistant.git
cd Legal-Document-Assistant

# Install dependencies
npm install
```

### Environment Configuration
Copy `.env.example` to `.env` and insert your Google Gemini API key:
```bash
cp .env.example .env
```
Inside `.env`:
```env
GEMINI_API_KEY=AIzaSyYourActualGeminiApiKeyHere
```

### Running Locally
To launch the Vite development server:
```bash
npm run dev
```
To test Vercel serverless functions alongside the frontend locally:
```bash
npx vercel dev
```

---

## 8. Deployment Instructions

### Deploying to Vercel
1. Install Vercel CLI or connect your GitHub repository to Vercel.
2. Ensure build command is set to: `npm run build`
3. Ensure output directory is set to: `dist`
4. Set Environment Variable in Vercel Dashboard:
   - Key: `GEMINI_API_KEY`
   - Value: `your-gemini-api-key`
5. Deploy:
```bash
npx vercel --prod
```

---

## 9. Testing Instructions

Run unit tests using Vitest:
```bash
npm test
```

To run build verification:
```bash
npm run build
```

---

## 📄 License
Created for PromptWars Hackathon. Educational & Informational use only.
