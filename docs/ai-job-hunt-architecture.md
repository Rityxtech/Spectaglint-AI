# AI Job Hunting Operating System Blueprint

## 1. System Overview
**Architecture Style:** Modular Monolith → Microservices ready
**Core Goal:** A full ecosystem for job acquisition, tracking, generating assets, and managing active operations via automated systems.

### Core Components
- **Frontend:** React / Next.js (Web App)
- **Backend API:** Node.js / Express
- **AI Service Layer:** Prompting and generation engines
- **Job Aggregation Service:** Internal scrapers and webhook integration
- **Automation / Extension Layer:** Browser-based automation for auto-fills and scraping
- **Database:** PostgreSQL (Supabase)

---

## 2. Project Directory Structure
Based on the implementation context, the structural footprint is distributed into:
```
sound-translator-ai/
│
├── web/                      # React frontend
│   ├── src/pages/JobBoard.jsx    # Main hub
│   ├── src/pages/Applications.jsx
│   └── src/components/       # UI Components
│
├── backend/                  # API Backend
│   ├── src/routes/jobs.js
│   ├── src/routes/applications.js
│   ├── src/routes/resume.js
│   ├── src/services/aiEngine.js
│   ├── src/services/scraper.js
│   └── src/services/emailParser.js
│
├── extension/                # Browser Extension
│   ├── manifest.json
│   ├── content-scripts/
│   │   └── autofill.js
│   └── background.js
│
└── docs/                     # Additional Technical Specs
```

---

## 3. Frontend Modules Configuration (Web App)

### Job Explorer Tab
- **Core Loop:** Users filter, retrieve matches, click "AI Apply".
- **Requirements:** 
  - Implementation of state management for Filter UI.
  - Integration with `/api/jobs` endpoint.
  - Component to display dynamic Match Score based on AI parsing.

### Application Tracker Kanban
- **Core Loop:** Users view application states grouped by column (Applied, Interview, Offer, Rejected).
- **Requirements:**
  - Drag-and-drop mechanics (optional but recommended).
  - Webhooks fetching status updates from the database.

### Intelligent Assets
- **Resume Builder:** 
  - Manage multiple profiles/versions.
  - Real-time preview and export integration.
- **AI Tools UI:** 
  - Cover letter generator UI interacting with the `aiEngine` service.

---

## 4. Backend & API Endpoints

### 4.1 Jobs & Aggregation
- **`GET /api/jobs`**: Fetch aggregated jobs from internal DB.
- **`POST /api/jobs/analyze`**: Submit job description for AI match scoring with User Profile.

### 4.2 Application State & Tracking
- **`POST /api/applications`**: Create application entry.
- **`GET /api/applications`**: Fetch kanban board data.
- **`PATCH /api/applications/:id`**: Update application status node.

### 4.3 AI Generation Service
- **`POST /api/resume/generate`**: Feed job ID and return highly targeted resume.
- **`POST /api/cover-letter/generate`**: Auto-generate cover letter via LLM based on job desc.

---

## 5. Automation & Browser Extension Integration
- **Objective:** Detect job platforms (LinkedIn, Indeed).
- **Content Script Extract:** Detect Title, Manager, Desc.
- **Autofill Protocol:** Push parsed user resume and structured answers to corresponding DOM elements.
- **Comms Interface:** `window.postMessage` layer linking the backend with the extension for token synchronization and execution commands.

---

## 6. Email Integration & Event Parsing (Active Mailbox Service)
- **Mechanic:** Connect user inbox (OAuth integration for read-only access).
- **AI Email Parser Service (`emailParser.js`):**
  - Scans for "We regret to inform you" -> Triggers auto-status change to **Rejected**.
  - Scans for "Schedule an interview", Calendly links -> Triggers auto-status change to **Interviewing**.
  - **Output:** `{ "type": "rejection|interview|offer", "confidence": 0.92 }`

---

## 7. Database Core Schema (Supabase)

### `Jobs` Table
- `id` (UUID)
- `title` (Text)
- `company` (Text)
- `description` (Text)
- `source_url` (Text)
- `base_match_score` (Integer)

### `Applications` Table
- `id` (UUID)
- `user_id` (UUID)
- `job_id` (UUID, FK)
- `status` (Enum/Text: 'applied', 'interview', 'rejected', 'offer')
- `created_at` (Timestamp)

### `Email_Telemetry` (Tracking Webhooks)
- `id` (UUID)
- `application_id` (UUID, FK)
- `subject` (Text)
- `classification` (Enum)
- `confidence_score` (Float)

---

## 8. Development Roadmap

### Phase 1: Core Foundation & UI
- [x] Implemented Dashboard Hub (`JobBoard.jsx`).
- [ ] Establish Supabase tables (`Jobs`, `Applications`).
- [ ] Connect JobBoard UI static mocked data to API Layer endpoints.

### Phase 2: Agentic Matching & Application
- [ ] Build `aiEngine.js` connection to generate tailor-made Resumes.
- [ ] Create basic job aggregation fetchers (scrapers / remote APIs).
- [ ] Link `JobBoard` UI 'AI APPLY' button logic to queue submissions.

### Phase 3: Feedback Loops & Automation
- [ ] Create `/auth/mailbox` OAuth flow.
- [ ] Setup CRON / Polling workers to read inbound messages.
- [ ] Connect AI Parser to auto-update Application Tracker status.
- [ ] Deploy Browser Extension logic for Auto-filling forms.
