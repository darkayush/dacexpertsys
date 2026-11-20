# DACexpertsys — Disciplinary Action Committee Expert System

A web application for **BML Munjal University** that manages student disciplinary cases from the first hostel report to the final committee decision. It includes:

- A **multi-stage approval workflow**: Warden → Chief Warden → DSW → Admin.
- **Role-based dashboards** for five roles: student, warden, chief warden, DSW and admin.
- **Student profiles** with complete DAC case history and penalty points.
- **Group incidents**: one registration for several students creates a separate case per student, each with its own alcohol reading.
- **Hindi → English voice input** for the incident description (browser speech recognition + Groq translation).
- **AI penalty recommendations** (Groq) on the case page for the Admin's final decision, generated on request and grounded in the official DAC and Unfair Means policies.
- **DAC meetings**: the Admin schedules an in-person meeting; the student sees it on their dashboard and gets an email.
- **Automatic emails** (Gmail SMTP) for meetings and for DAC points imposed by the Admin.
- **Private evidence storage** in Supabase Storage with short-lived signed links.
- In-app **notifications** and a **case timeline** (audit trail).
- A **DAC Assistant chatbot**. It uses RAG over DAC policy documents and case records with PostgreSQL + pgvector + Google Gemini, and falls back to a rule-based answer when Gemini is not configured.

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 7, React Router 7, Tailwind CSS 3 (PostCSS), Framer Motion, Lenis (smooth scroll), Google Material Symbols |
| Backend | Node.js (ES modules), Express 5, `pg`, `jsonwebtoken`, `bcrypt`, `multer` (memory storage), `google-auth-library`, `nodemailer`, `@supabase/supabase-js` |
| Database | PostgreSQL (local or Supabase), optional `pgvector` extension |
| AI / RAG | `@google/genai` — Gemini for chatbot answers and embeddings (768-dim). Groq (`openai/gpt-oss-120b`, OpenAI-compatible REST) for Hindi translation and penalty recommendations |
| Email | Gmail SMTP through Nodemailer (App Password) |
| File storage | Supabase Storage, private bucket `evidence` |
| Auth | Email + password (bcrypt) or Google Sign-In, both exchanged for an app JWT |

> Firebase is still listed in `package.json` and `src/firebase/` still exists. Both are **legacy code**: the running app does not import them. See [Legacy / unused code](#legacy--unused-code).

---

## Repository layout

```text
.
├── index.html                 # Vite entry HTML (title, Material Symbols font)
├── vite.config.js             # Vite + React plugin
├── tailwind.config.js         # Tailwind theme (Google Sans font, `dac` colour palette)
├── postcss.config.js          # tailwindcss + autoprefixer
├── eslint.config.js           # Flat ESLint config (react-hooks, react-refresh)
├── .env.example               # Environment template (copy to .env)
│
├── backend/
│   ├── server.js              # Express app: CORS allowlist, routes, static /uploads, startup bootstrap
│   ├── seedPasswords.cjs      # Dev helper: sets one known password per role
│   ├── config/
│   │   ├── db.js              # pg Pool (DATABASE_URL/Supabase with pinned CA, or PG_* / PG* vars); max PG_POOL_MAX (5), retries when the pooler is full
│   │   ├── bootstrap.js       # ensureWorkflowSchema(): idempotent migrations run on every start
│   │   ├── dacPolicy.js       # Official DAC Policy v2 + Unfair Means Policy, transcribed from the signed PDFs (single source)
│   │   └── supabase-ca.crt    # Supabase root CA for verified TLS
│   ├── middleware/
│   │   └── auth.middleware.js # verifyToken (Bearer JWT), requireRoles(...)
│   ├── routes/                # auth, users, cases, evidence, notifications, rules, chatbot, policies, email, translate
│   ├── controllers/           # Request validation + HTTP status mapping
│   ├── services/
│   │   ├── cases.service.js        # Case CRUD, paging + summary, workflow, warnings, group incidents, DAC-points email
│   │   ├── meetings.service.js     # DAC meeting scheduling, notification, timeline entry and email
│   │   ├── recommendation.service.js # Groq penalty recommendation for one case
│   │   ├── groqService.js          # Groq chat-completions client (timeout, JSON mode, model fallback)
│   │   ├── email.service.js        # Nodemailer Gmail transport + shared HTML email template
│   │   ├── storage.service.js      # Supabase Storage upload + signed URLs for evidence
│   │   ├── notifications.service.js
│   │   ├── timeline.service.js
│   │   ├── evidence.service.js
│   │   ├── users.service.js / auth.service.js / rules.service.js
│   │   ├── chatbot.service.js      # Chatbot orchestration (SQL lookups + RAG + Gemini + fallback)
│   │   ├── queryRouter.js          # Intent classification + filter extraction (regex based)
│   │   ├── ragService.js           # pgvector similarity search, with ILIKE text-search fallback
│   │   └── geminiService.js        # Gemini client, embeddings, generation, retry/timeout
│   ├── knowledge_base/        # JSONL sources for RAG ingestion
│   │   ├── dac_policy.jsonl        # 7 official policy sections (DAC-POL-001 … 007)
│   │   ├── case_documents.jsonl    # 5,000 synthetic case narratives
│   │   └── case_timelines.jsonl    # 5,000 synthetic case timelines
│   └── uploads/evidence/      # Legacy local evidence files only (new uploads go to Supabase Storage)
│
├── database/
│   ├── schema.sql             # Enums, tables, indexes, optional pgvector column + HNSW index
│   ├── seed.sql               # Large synthetic dataset (~153k lines, see "Seed data")
│   ├── workflow_migration.sql # One-off migration for pre-workflow databases
│   └── rag_vector_migration.sql # Enables pgvector + rag_documents.embedding + HNSW index
│
├── scripts/
│   ├── seed-dac.js            # npm run seed:dac  — import CSVs from DAC_DATA_DIR, or run seed.sql
│   ├── ingest-rag.js          # npm run rag:ingest — chunk JSONL, embed, upsert into rag_documents
│   ├── test-rag-queries.js    # Chatbot verification suite (needs a seeded DB)
│   └── test-all-10-queries.js # 10 reference chatbot questions with expected intents
│
├── public/                    # Static assets (favicon, logo, login-campus.jpg)
└── src/
    ├── main.jsx               # Mounts <App/> inside <AuthProvider>
    ├── App.jsx                # Routes + ProtectedRoute role guard + global <DacChatbot/>
    ├── Login.jsx              # Email/password + Google Identity Services login (campus photo, glass form panel)
    ├── index.css              # Tailwind directives + Google Sans @font-face
    ├── context/AuthContext.jsx# JWT + user kept in localStorage, expiry check, login/logout
    ├── services/api.js        # Every backend call (fetch wrapper that adds the Bearer token)
    ├── hooks/useLenis.js      # Global Lenis smooth scroll + scrollToElement()
    ├── hooks/usePagedCases.js # Server-side paging + debounced search for case lists
    ├── lib/
    │   ├── motion.js          # Shared Framer Motion variants
    │   └── assistant.js       # window event that opens/closes the chatbot panel
    ├── components/
    │   ├── DacChatbot.jsx     # Floating DAC Assistant panel (staff only)
    │   ├── LogoCirclesBackground.jsx # Login background: drifting SVG circles in the BMU logo colours
    │   ├── NotificationBell.jsx # Top-bar bell, polls every 30 s
    │   ├── layout/            # DACLayout (sidebar per role, top bar, search), SearchBox
    │   ├── cases/             # CasesTable, charts (TrendChart, Donut), parts (Card, Icon, Avatar…),
    │   │                      # caseUi.js (labels, mapping, filters, links), trend.js, StudentProfileLink
    │   └── ui/                # StudentCard, StatusBadge, EmptyState (SeverityBadge is unused)
    └── pages/
        ├── Dashboard.jsx      # Admin / DSW / Chief Warden / Warden dashboard (all-time counts, role-scoped table)
        ├── CaseList.jsx       # Server-paged, searchable case list
        ├── CaseDetail.jsx     # Case page: stepper, details, evidence, timeline, workflow, warning, group, DAC meeting
        ├── StudentProfile.jsx # Staff view of one student's DAC history
        ├── Notifications.jsx, Profile.jsx, Settings.jsx (change password)
        ├── AdminSettings.jsx  # Shell for admin/* nested routes
        ├── admin/             # UserManagement, SystemConfig (policy view), RulesWeights, EmailTest
        ├── student/           # StudentDashboard (with DAC meeting card), StudentPolicy (both PDFs)
        └── warden/RegisterCase.jsx # Case registration wizard: single or group incident, Hindi voice input
```

---

## Roles and case workflow

Roles come from the PostgreSQL enum `user_role`: `student`, `warden`, `chief_warden`, `dsw`, `admin`.

```text
 Warden / any staff            Chief Warden            DSW                  Admin
 registers case  ───────▶  pending_chief  ──approve──▶ pending_dsw ──approve──▶ pending_admin ──decide──▶ resolved
```

1. **Create** (`POST /api/cases`, or `POST /api/cases/group` for a group incident): only wardens and chief wardens can register cases. The case starts as `status = pending_chief` and `assigned_to_role = chief_warden`. The backend gives it a public ID in the format `DAC-<year>-<00000 id>`. It notifies every chief warden and writes a timeline entry. All of this runs in one transaction.
2. **Approve** (`PUT /api/cases/:id/approve`): only the role in `assigned_to_role` can act.
   - The chief warden moves the case to `pending_dsw`. The backend notifies every DSW.
   - The DSW moves the case to `pending_admin`. The backend notifies every admin.
   - The admin moves the case to `resolved`. The backend sets `resolved_by`, `resolved_by_role` and `resolved_at`.
   - Each step notifies the case creator and adds a timeline event.
3. **Admin decision**: in `CaseDetail`, the admin enters penalty points, a fine and a decision text. The frontend sends `PUT /api/cases/:id` first, then `PUT /api/cases/:id/approve`.
4. **Resolve with warning** (`PUT /api/cases/:id/warn`): the Chief Warden, DSW or Admin can close the case at their stage with a warning instead of forwarding it. The case gets `resolution_type = 'warning'`, every member sees "Resolved by … with a warning", and no points are added.
5. **DAC meeting** (`POST /api/cases/:id/meetings`): while the case is `pending_admin`, the Admin picks a date, time and place. The student is notified in the app and by email, and a timeline entry is written.
6. **Final decision emails**: when the Admin resolves a case with more than 0 points, the student is emailed the points, fine, decision and appeal rules.
7. **Edit**: an admin can edit any case. A warden can edit only their own case, and only while it is `pending_chief`.

### Group incidents

On the Register Case page, **Group incident** registers 2–50 students caught together. Each student gets a **separate case** that shares the incident details. Each student has their own alcohol reading, and an optional own location and notes. All cases are created in one transaction and share an `incident_group_id` (`GRP-<year>-<8 hex>`). One uploaded evidence file is attached to every case. Staff see the linked cases in a **Group Incident** card on the case page.

### Hindi → English voice input

In the description field, the voice language can be **English** or **Hindi → English**. In Hindi mode:

- The first mic click starts recording (`hi-IN`, continuous); the second click stops it.
- The whole recording is sent once to `POST /api/translate/hi-en` (Groq), and the English text is added to the description.
- The original Hindi is shown under the box.

Works best in Chrome or Edge.

### DAC policy

The official policies are transcribed in `backend/config/dacPolicy.js` and served by `GET /api/policies/dac`. They are shown on the student **DAC Policy** page and the admin **Rules & Policies** page, and are used to load the rules list and to ground AI recommendations.

**Disciplinary Action Policy, Version 02** (BMU/RO/2025/0051, 19 February 2025):

| Level | Points | Fine | Offences (summary) |
|---|---|---|---|
| 1 | 10 | ₹1,000 | missing a compulsory lecture/event, entering campus after intoxicants, leaving campus without permission, arriving late at night |
| 2 | 25 | ₹2,500 | possession/consumption of cigarettes, liquor or intoxicants on campus, stirring communal sentiments, disturbance in hostel, derogatory slogans |
| 3 | 50 | ₹5,000 | misbehaviour with staff/faculty, cyber offence, gambling, stealing, damage to property, fights, endangering life, false fire alarms |
| 4 | 100 | ₹10,000 | violent assault, serious cyber offence, maligning the University, forgery, any offence under law, bringing disrepute to BMU |

- 100 accumulated points: barred from placement. 200 points: expulsion.
- Paying the fine does not cancel the points.
- Appeals: write to appeal.dac@bml.edu.in within a week, after paying the fine and a ₹500 appeal fee.

**Unfair Means Policy** (BMU/RO/UFM/2018/0222) covers examinations: Category 2 = DAC Level I, Category 3 = Level II, Category 4 = Level III/IV, Category 5 = expulsion.

**Rules list.** The admin rules table holds 48 rules from both PDFs, with weight = penalty points: the 22 DAC offences, 24 exam offences (Unfair Means categories 2–4; Category 4 uses Level III's 50 points as the minimum) and 2 plagiarism rules. **System Config → Load DAC & Unfair Means Policy** adds or corrects them; **Replace all** also deletes rules that are not in the policy.

### Frontend routes by role

| Role | Landing | Main routes |
|---|---|---|
| student | `/student/dashboard` | `/student/cases`, `/student/cases/:id`, `/student/profile`, `/student/disciplinary-policy` |
| warden | `/warden/dashboard` | `/warden/register`, `/warden/cases`, `/warden/cases/:id`, `/warden/notifications`, `/warden/profile` |
| chief_warden | `/chief-warden/dashboard` | `/chief-warden/register`, `/chief-warden/cases`, `/chief-warden/cases/:id`, `/chief-warden/notifications`, `/chief-warden/profile` |
| dsw | `/dsw-dashboard` | `/dashboard`, `/cases/:id` |
| admin | `/dashboard` | `/cases/:id`, `/admin-settings/{users,rules-weights,system,email-test}` |
| staff (all except student) | — | `/students/:enrollmentNo` (student profile) |

DSW and Admin cannot register cases. In Admin Settings, **Rules & Policies** (`rules-weights`) shows the official policy and **System Config** (`system`) manages the rules and weights. The Email Test page has no sidebar link; open `/admin-settings/email-test` directly.

**Dashboards.** The four count cards are all-time. High & Critical counts only open (not resolved) cases. The table shows all cases for the Admin, the last 10 days for the Chief Warden and DSW, and only the cases a warden registered for that warden.

`/settings` (change password) is available to every role. `ProtectedRoute` in `App.jsx` redirects any unauthorised role to `/`.

---

## Backend API

Base URL: `http://localhost:5001` in development (macOS uses port 5000 for AirPlay; set `PORT`). All `/api/*` routes except login need the header `Authorization: Bearer <jwt>`. `/users` and `/cases` are also mounted without the `/api` prefix, as legacy aliases.

| Method & path | Roles | Purpose |
|---|---|---|
| `GET /health` | public | Liveness check |
| `GET /test` | public | DB connectivity (`SELECT NOW()`) |
| `POST /api/login` | public | Email + password → `{ token, user }` |
| `POST /api/login/google` | public | Google ID token → `{ token, user }`. Only for users that already exist in the DB. |
| `POST /api/change-password` | self | Change own password |
| `GET /api/users` | staff | List users (`?excludeRole=student`) |
| `GET /api/users/me` | any | Current user's record |
| `GET/POST/PUT/DELETE /api/users[/:id]` | admin | User CRUD. A create without a password returns a temporary password. |
| `PUT /api/users/:id/role`, `POST /api/users/:id/reset-password` | admin | Change role / reset to a temp password |
| `GET /api/cases` | any (scoped) | Students see only their own cases. Wardens can pass `?role=my_created_only`. DSW sees `pending_dsw`, `pending_admin` and `resolved`. Also filters by `?status=`. With `?page=` it returns one page `{ rows, total }` and accepts `pageSize`, `filter` (`all`, `active`, `mine`, `resolved`, `severe`), `q` (name, enrollment, case ID, offence) and `days`. |
| `GET /api/cases/summary` | any (scoped) | Dashboard numbers: `{ total, severe, byStatus, trend, queue }` |
| `GET /api/cases/history?limit=` | any (scoped) | Recent cases |
| `GET /api/cases/:id` | any (students: own only) | Case + student details |
| `POST /api/cases` | warden, chief_warden | Create case (`student_id`, `offense_type` required; also substance, time, location, alcohol reading, notes) |
| `POST /api/cases/group` | warden, chief_warden | Group incident: `{ students: [{ student_id, location?, alcohol_reading?, notes? }], ...shared }` → `{ incident_group_id, cases }` |
| `GET /api/cases/:id/group` | staff | Other cases from the same group incident |
| `PUT /api/cases/:id/warn` | chief_warden, dsw, admin | Resolve with a warning |
| `POST /api/cases/:id/recommendation` | chief_warden, dsw, admin | Groq penalty recommendation (only for `pending_admin` cases; advisory, nothing saved) |
| `POST /api/cases/:id/meetings` | admin | Schedule a DAC meeting `{ scheduled_at, location, notes? }` (only for `pending_admin`) |
| `GET /api/cases/:id/meetings` | staff, owning student | Meetings for a case |
| `GET /api/cases/meetings/mine` | student | The student's own meetings |
| `PUT /api/cases/:id` | admin, or the owning warden while `pending_chief` | Update fields (incl. `fine`, `decision`) |
| `DELETE /api/cases/:id` | admin | Delete case |
| `PUT /api/cases/:id/approve` | assigned reviewer | Advance the workflow |
| `GET /api/cases/student/:enrollmentNo[/profile]` | staff | Student history / profile with summary |
| `GET/POST/PUT/DELETE /api/cases/:id/timeline[/:timelineId]` | read: any (students: own), write: admin | Timeline |
| `POST /api/cases/upload-evidence` | warden, chief_warden | `multipart/form-data` field `file` + `case_id` (or `case_ids` comma list for a group). PDF, image or video, **max 2 MB**. Stored in Supabase Storage. |
| `GET /api/cases/:id/evidence` | any (students: own) | Evidence list with signed links that expire after 10 minutes |
| `GET /api/evidence[?case_id=]`, `GET /api/evidence/:id` | staff | Evidence metadata |
| `PUT/DELETE /api/evidence/:id` | admin | Edit / delete evidence |
| `GET /api/notifications`, `PUT /api/notifications/:id/read` | any (own) | Read notifications |
| `POST /api/notifications/create`, `PUT/DELETE /api/notifications/:id` | admin | Manage notifications |
| `GET /api/rules` | any | Questionnaire rules |
| `POST/PUT/DELETE /api/rules[/:id]`, `POST /api/rules/load-dac-policy` | admin | Rule CRUD / load DAC Policy v2 offences |
| `GET /api/policies` | any | DAC policy sections in the RAG store (`rag_documents` where `document_type = 'dac_policy'`) |
| `GET /api/policies/dac` | any | Official policies from the PDFs: `{ dac, unfairMeans }` |
| `POST /api/translate/hi-en` | warden, chief_warden | `{ text }` (max 6,000 chars) → `{ translation }` (Groq, Gemini as fallback) |
| `POST /api/email/test` | admin | Sends a test email to `EMAIL_TEST_TO` |
| `POST /api/chat` | any | `{ message, conversationId? }` → `{ answer, intent, showCases, cases, sources, suggestedQuestions }` |

---

## DAC Assistant (RAG chatbot)

Each question goes through this pipeline (`backend/services/chatbot.service.js`):

1. **Intent routing** (`queryRouter.js`). Regex rules classify the question as one of `workflow`, `count`, `policy`, `student_history`, `case_detail`, `case_search`, `hybrid` or `general_knowledge_base`. The router also extracts filters: case ID, 6-digit enrollment number, student name, substance, offence, hostel (`APJ`, `BSH`, `VSB`, `HBH`, `GH`), program, batch, severity, level, gender and status. Case cards are returned only when the user explicitly asks to *show/list/display* cases.
2. **Structured retrieval**. Parameterised SQL fetches student profiles, case details, timelines, counts and "which hostel/program has the most" aggregates.
3. **Semantic retrieval** (`ragService.js`).
   - It uses pgvector cosine similarity over `rag_documents.embedding`, controlled by `RAG_TOP_K` and `RAG_MIN_SCORE`.
   - It falls back to keyword `ILIKE` search when Gemini or pgvector is unavailable.
   - Policy and workflow questions search only `dac_policy` documents.
4. **Generation**. Gemini (`GEMINI_MODEL`, temperature 0.1) answers with a grounding system prompt and up to 6 turns of in-memory history. History is kept per user and conversation for 30 minutes. Without `GEMINI_API_KEY`, or when Gemini fails, a deterministic fallback answer is used.
5. **Access control**.
   - Students can ask only about their own records.
   - Count and aggregate queries are staff-only.
   - Vector and text search limit students to policy documents and their own documents.
   - The chatbot panel itself appears only for staff roles.

### Ingesting the knowledge base

```bash
npm run rag:ingest
```

- The script reads `backend/knowledge_base/*.jsonl` and splits each document into chunks of up to 2,000 characters with 200 characters of overlap.
- It skips chunks that have not changed, using a SHA-256 `content_hash`.
- It creates embeddings in batches and upserts the chunks into `rag_documents`.
- Without a Gemini key, it stores the documents without embeddings, so text search still works.

---

## Database

`database/schema.sql` creates:

- **Enums**: `user_role`, `case_status` (`pending_chief`, `pending_dsw`, `pending_admin`, `resolved`), `case_severity` (`low`, `medium`, `high`, `critical`), `program_type` (`btech`, `bba`, `mba`, `ballb`, `bcom`).
- **Tables**: `users`, `cases`, `case_timeline`, `rules`, `evidence`, `notifications`, `rag_documents`, `case_meetings`.
- **Newer columns**: `cases.resolution_type` (`'warning'` when closed with a warning), `cases.incident_group_id`.
- **Indexes** for the dashboard and case page: `cases(created_by)`, `cases(incident_group_id)`, `case_timeline(case_id)`, `evidence(case_id)`, `notifications(user_id, created_at)`, `case_meetings(case_id)`, `case_meetings(student_id, scheduled_at)`.
- **Optional**: `rag_documents.embedding vector(768)` and an HNSW index, created only when `pgvector` is installed.

Student details (name, enrollment number, program, hostel, room, gender) live **only in `users`**. Cases reference them through `student_id`.

On every start, `backend/config/bootstrap.js` (`ensureWorkflowSchema`) runs idempotent `ALTER`/`CREATE … IF NOT EXISTS` statements. It also upserts a demo student, **Aarav Sharma** (enrollment `240123`), with case `DAC-2026-09001`. An older database is upgraded automatically.

### Seed data (`database/seed.sql`)

All seed data is synthetic. It contains:

- 6 staff accounts (`warden1@test.com`, `warden2@test.com`, `chief@test.com`, `dsw@test.com`, `admin@test.com`, and a `test` DSW account).
- 1,658 students and ~5,000 cases.
- 21,000+ timeline events.
- Sample evidence and notifications. (The rules table is loaded from the policy instead; see DAC policy above.)
- Student email addresses are placeholders (`@dac.edu`, `@test.com`). Give a student a real address in User Management before expecting emails to arrive.
- The DAC policy RAG documents.

---

## Getting started

### Prerequisites

- Node.js 20+ (the backend uses `node --watch`; Express 5 needs Node 18+).
- PostgreSQL 14+, either local or Supabase. `pgvector` is optional but recommended.
- Optional: a Gemini API key and a Google OAuth client ID.

### 1. Install

```bash
npm install
```

### 2. Configure the environment

```bash
cp .env.example .env
```

| Variable | Used by | Notes |
|---|---|---|
| `PORT` | backend | Default `5000`; use `5001` on macOS |
| `PG_POOL_MAX` | backend | Max DB connections, default `5`. Use Supabase's transaction pooler (port 6543) for more headroom. |
| `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE` | backend | `PG_HOST`-style names are also accepted |
| `DATABASE_URL` | backend | When set (Supabase session pooler), it replaces the `PG*` vars. TLS uses `backend/config/supabase-ca.crt`. |
| `JWT_SECRET` | backend | **Set this.** The fallback dev secret is insecure. It is not in `.env.example`. |
| `JWT_EXPIRES_IN` | backend | Default `8h` |
| `CORS_ORIGINS` | backend | Comma-separated exact origins. Default `http://localhost:5173`. |
| `GOOGLE_CLIENT_ID` / `VITE_GOOGLE_CLIENT_ID` | backend / frontend | Google Sign-In. The button is hidden when the variable is unset. |
| `VITE_API_BASE_URL` | frontend | e.g. `http://localhost:5001/api` |
| `GEMINI_API_KEY` | backend | Enables Gemini answers and embeddings. **Backend only.** |
| `GEMINI_MODEL`, `GEMINI_EMBEDDING_MODEL` | backend | Defaults `gemini-2.5-flash` and `gemini-embedding-2` (from `.env.example`). The embedding call falls back to `text-embedding-004`. |
| `GEMINI_TIMEOUT_MS`, `EMBEDDING_DIMENSION` | backend | Defaults `12000` and `768` |
| `RAG_TOP_K`, `RAG_MIN_SCORE`, `RAG_CHUNK_SIZE`, `RAG_CHUNK_OVERLAP` | backend | Retrieval and chunking settings |
| `GROQ_API_KEY`, `GROQ_MODEL` | backend | Hindi translation and AI recommendations. Default model `openai/gpt-oss-120b`; if the configured model is retired (404), the default is used. `GROQ_TIMEOUT_MS` optional. **Backend only.** |
| `SMTP_USER`, `SMTP_PASS` | backend | Gmail address and 16-character App Password (needs 2-Step Verification). `SMTP_HOST`/`SMTP_PORT` optional (default `smtp.gmail.com:465`). |
| `EMAIL_FROM`, `EMAIL_TEST_TO` | backend | Display sender; recipient of the admin test email |
| `MEETING_TIME_ZONE` | backend | Time zone used in meeting emails, default `Asia/Kolkata` |
| `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `SUPABASE_EVIDENCE_BUCKET` | backend | Evidence storage. Secret key `sb_secret_…` (`SUPABASE_SERVICE_ROLE_KEY` also accepted). Bucket default `evidence`, must be **private**. |
| `DAC_DATA_DIR` | `seed-dac.js` | Folder with the CSV exports. Default `~/Downloads`. |

### 3. Create and seed the database

Run these steps in order:

```bash
createdb dacexpertsys
psql -d dacexpertsys -f database/schema.sql
psql -d dacexpertsys -f database/seed.sql      # or: npm run seed:dac
```

`npm run seed:dac` imports the CSV exports when they exist in `DAC_DATA_DIR`. Otherwise it runs `database/seed.sql`.

To set known development passwords for every account, run the following from the `backend/` folder. It reads `../.env` and the `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` and `DB_NAME` variables:

```bash
cd backend && node seedPasswords.cjs
```

| Role | Password |
|---|---|
| Student | `Student@123` |
| Warden | `Warden@123` |
| Chief Warden | `Chief@123` |
| DSW | `DSW@123` |
| Admin | `Admin@123` |

These are development credentials only. Never use them in a deployed environment.

### 4. Build the RAG index (optional)

```bash
npm run rag:ingest
```

### 5. Run

```bash
npm run server        # API on http://localhost:$PORT  (npm run server:dev for auto-reload)
npm run dev           # Vite on http://localhost:5173
```

### Other scripts

```bash
npm run build                          # Production build to dist/
npm run preview                        # Serve the build
npm run lint                           # ESLint
node scripts/test-rag-queries.js       # Chatbot checks (needs seeded DB + ingested KB)
node scripts/test-all-10-queries.js    # 10 reference chatbot questions
```

There is no unit-test runner. The two `test-*` scripts are integration checks against a live database.

---

## Contribution conventions

- **API access**: all HTTP calls go through `src/services/api.js`. Do not call `fetch` in components.
- **Backend layering**: `routes` → `controllers` (validation, status codes) → `services` (SQL). Use parameterised queries only. Workflow changes must keep the case update, notifications and timeline in one transaction (see `cases.service.js`).
- **Authorisation**: guard routes with `verifyToken` and `requireRoles(...)` on the backend. Add matching `ProtectedRoute roles` in `App.jsx` on the frontend. The frontend guard is only for user experience; the backend guard is the real check.
- **Schema changes**: add them to `database/schema.sql` **and** to `backend/config/bootstrap.js`, so existing databases upgrade on start.
- **UI**: build pages with `DACLayout` and the shared pieces in `components/cases/` (`Card`, `Icon`, `CasesTable`, `caseUi.js` helpers). Style with Tailwind utility classes. Icons are Material Symbols (`<Icon name="..." />`).
- **Animation**: reuse the variants in `src/lib/motion.js`. Lenis smooth scrolling starts once in `App.jsx`.

---

## Known gaps

These are current limitations, kept here so that contributors do not assume the features are complete:

- **The rule engine is advisory.** The rules list feeds the AI recommendation, but the backend does not compute severity or points automatically; the Admin enters them. `src/services/ruleEngine.js` belongs to the old Firebase flow.
- **Chatbot policy text is outdated.** The DAC Assistant answers from `backend/knowledge_base/dac_policy.jsonl` (`GET /api/policies`), which predates the PDFs and does not match `dacPolicy.js` (for example the appeal rules). Re-ingest it from the PDFs.
- **Legacy evidence is public.** Files uploaded before Supabase Storage remain in `backend/uploads/` and are served at `/uploads` without authentication. New uploads are private.
- **Emails need real addresses and SMTP.** Without `SMTP_USER`/`SMTP_PASS`, or with placeholder student addresses, meetings and decisions are saved but no email arrives; the Admin sees the reason on the case page.
- **AI output needs review.** Recommendations and translations come from an external model (Groq). Student names and enrollment numbers are not sent, but case descriptions are.
- **Chatbot memory** is in-process (a `Map`). It is lost on restart and is not shared across instances.
- **Password rules.** The change-password UI says "at least 8 characters", but neither the frontend nor the backend enforces a minimum length.

## Legacy / unused code

None of these files are imported by the running app. They can be removed together with the `firebase` dependency:

- `src/firebase/firebaseConfig.js`, `src/firebase/firestore.js`
- `src/services/caseService.js`, `questionService.js`, `ruleEngine.js`, `seedFirestore.js` (the Firestore-based design)
- `src/components/ui/SeverityBadge.jsx`, `src/App.css` (Vite template CSS), `src/assets/react.svg` (empty file)
- `@tailwindcss/postcss` and `@tailwindcss/vite` (v4) are installed, but the build uses Tailwind **v3** through `postcss.config.js`.
