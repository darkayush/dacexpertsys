# DACexpertsys — Disciplinary Action Committee Expert System

A web application for **BML Munjal University** that manages student disciplinary cases from the first hostel report to the final committee decision. It includes:

- A **multi-stage approval workflow**: Warden → Chief Warden → DSW → Admin.
- **Role-based dashboards** for five roles: student, warden, chief warden, DSW and admin.
- **Student profiles** with complete DAC case history and penalty points.
- **Group incidents**: one registration for several students creates a separate case per student, each with its own alcohol reading.
- **Hindi → English voice input** for the incident description (browser speech recognition + Groq translation).
- **AI penalty recommendations** (Groq) on the case page for the Admin's final decision, generated on request and grounded in the official DAC and Unfair Means policies. **Use in decision** copies the suggested points, fine and action into the decision form.
- **DAC meetings**: the Admin schedules an in-person meeting; the student sees it on their dashboard and gets an email.
- **Automatic emails** (Gmail SMTP) for meetings and for DAC points imposed by the Admin.
- **Private evidence storage** in Supabase Storage with short-lived signed links.
- **Demo fine payments**: on a resolved case with a fine, the student pays from a Payment panel below the Workflow panel (checkout, processing and success screens) and gets a server-generated PDF receipt. **No real gateway and no real money**: the student screens show a normal payment flow, but every payment is stored with `payment_type = 'DEMO'` and the PDF receipt is marked as a demonstration.
- In-app **notifications** and a **case timeline** (audit trail).
- **Total Outstanding Fine** on the student dashboard: outstanding total, case-wise breakdown (payable / awaiting resolution / paid), and paying several cases in one transaction with the same checkout and an itemized receipt.
- **Global search** in the top bar on every page (Ctrl/⌘ + K): students (name, enrollment number, email), cases (case ID, offence, student) and offences, scoped to the user's role. Choosing a result opens that record; opening or closing search never changes the page.
- A **DAC Assistant chatbot** for staff. Groq (`openai/gpt-oss-120b`) writes the answer from database lookups and PostgreSQL keyword search over DAC policy and case documents; a rule-based answer is used when Groq is not configured or fails.
- **DAC points count only after resolution**: a student's total is the sum of points of their resolved cases (warnings add none), kept in sync by a database trigger.
- **Dashboard charts** (Case Trend, Case Distribution) with hover details.

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 7, React Router 7, Tailwind CSS 3 (PostCSS), Framer Motion, Lenis (smooth scroll), Google Material Symbols |
| Backend | Node.js (ES modules), Express 5, `pg`, `jsonwebtoken`, `bcrypt`, `multer` (memory storage), `google-auth-library`, `nodemailer`, `@supabase/supabase-js`, `pdfkit` (payment receipts) |
| Database | PostgreSQL 14+ (local or Supabase) |
| AI | Groq, model `openai/gpt-oss-120b` (configurable with `GROQ_MODEL`), called over its OpenAI-compatible REST API with `fetch` (no SDK): chatbot answers, Hindi → English translation and penalty recommendations |
| Chatbot retrieval | PostgreSQL keyword search (`ILIKE`) over `rag_documents`; no embeddings |
| Email | Gmail SMTP through Nodemailer (App Password) |
| File storage | Supabase Storage, private bucket `evidence` |
| Auth | Email + password (bcrypt) or Google Sign-In, both exchanged for an app JWT |

> Firebase and `react-icons` are still listed in `package.json`, and `src/firebase/` still exists. The running app does not use them. See [Legacy / unused code](#legacy--unused-code).

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
│   ├── routes/                # auth, users, cases, evidence, notifications, rules, chatbot, policies, email, translate, payments, search
│   ├── controllers/           # Request validation + HTTP status mapping
│   ├── services/
│   │   ├── cases.service.js        # Case CRUD, paging + summary, workflow, warnings, group incidents, DAC-points email
│   │   ├── meetings.service.js     # DAC meeting scheduling, notification, timeline entry and email
│   │   ├── recommendation.service.js # Groq penalty recommendation for one case (short-lived cache, shared in-flight calls)
│   │   ├── groqService.js          # Groq chat-completions client (history, timeout, JSON mode, model fallback, 429 retry)
│   │   ├── payments.service.js     # Demo fine payments: eligibility, single and consolidated payments, history, receipts data
│   │   ├── receipt.service.js      # PDF receipt (pdfkit), single-case or itemized consolidated
│   │   ├── email.service.js        # Nodemailer Gmail transport + shared HTML email template
│   │   ├── storage.service.js      # Supabase Storage upload + signed URLs for evidence
│   │   ├── notifications.service.js
│   │   ├── timeline.service.js
│   │   ├── evidence.service.js
│   │   ├── users.service.js / auth.service.js / rules.service.js
│   │   ├── chatbot.service.js      # Chatbot orchestration (SQL lookups + keyword search + Groq + rule-based fallback)
│   │   ├── queryRouter.js          # Intent classification + filter extraction (regex based)
│   │   └── ragService.js           # Keyword (ILIKE) search over rag_documents, scoped for students
│   ├── knowledge_base/        # JSONL sources for RAG ingestion
│   │   ├── dac_policy.jsonl        # 7 official policy sections (DAC-POL-001 … 007)
│   │   ├── case_documents.jsonl    # 5,000 synthetic case narratives
│   │   └── case_timelines.jsonl    # 5,000 synthetic case timelines (not in seed.sql; added by npm run rag:ingest)
│   └── uploads/evidence/      # Legacy local evidence files only (new uploads go to Supabase Storage)
│
├── database/
│   ├── schema.sql             # Enums, tables, indexes, payments tables, DAC points trigger + CHECK
│   ├── seed.sql               # Large synthetic dataset (~153k lines, see "Seed data")
│   ├── workflow_migration.sql # One-off migration for pre-workflow databases
│   └── rag_vector_migration.sql # Unused: pgvector embedding column + index from the removed embedding search
│
├── scripts/
│   ├── seed-dac.js            # npm run seed:dac  — import CSVs from DAC_DATA_DIR, or run seed.sql
│   ├── ingest-rag.js          # npm run rag:ingest — chunk JSONL and upsert the text into rag_documents
│   ├── test-rag-queries.js    # Chatbot verification suite (needs a seeded DB)
│   ├── test-all-10-queries.js # 10 reference chatbot questions with expected intents
│   ├── test-payments.js       # Demo payment checks (writes rolled back)
│   ├── test-search.js         # Global search checks (read-only)
│   └── test-points.js         # DAC points rule + concurrency checks (writes rolled back)
│
├── public/                    # Static assets (favicon.png = sidebar/login logo, logo.png, login-campus.jpg,
│                              # loader-tree.png + page-loader.css for the page loader)
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
    │   ├── PageLoader.jsx     # Page / route loader (tree logo + rotating ring; styles in public/page-loader.css)
    │   ├── LogoCirclesBackground.jsx # Login background: drifting SVG circles in the BMU logo colours
    │   ├── NotificationBell.jsx # Top-bar bell, polls every 30 s
    │   ├── layout/            # DACLayout (sidebar per role, top bar), GlobalSearch (header search on every page)
    │   ├── cases/             # CasesTable, charts (TrendChart, Donut, with hover cards), parts (Card, Icon, Avatar…),
    │   │                      # caseUi.js (labels, mapping, filters, links), trend.js, StudentProfileLink,
    │   │                      # AiRecommendationCard (Groq recommendation on the admin's case page)
    │   ├── payments/          # PaymentPanel (case page), OutstandingFinePanel + FineBreakdownModal (dashboard),
    │   │                      # CheckoutModal + PaymentSheet (shared checkout), PaymentHistoryCard, receipts
    │   └── ui/                # StudentCard, StatusBadge, EmptyState (SeverityBadge is unused)
    └── pages/
        ├── Dashboard.jsx      # Admin / DSW / Chief Warden / Warden dashboard (all-time counts, role-scoped table, charts)
        ├── CaseList.jsx       # Server-paged, searchable case list
        ├── CaseDetail.jsx     # Case page: stepper, details, evidence, timeline, workflow, warning, group, DAC meeting,
        │                      # AI recommendation (admin), Payment panel (student, resolved cases)
        ├── StudentProfile.jsx # Staff view of one student's DAC history (resolved points + pending points)
        ├── Notifications.jsx, Profile.jsx, Settings.jsx (change password)
        ├── AdminSettings.jsx  # Shell for admin/* nested routes
        ├── admin/             # UserManagement, SystemConfig (policy view), RulesWeights, EmailTest
        ├── student/           # StudentDashboard (DAC meeting card, Total fine due + Pay now, payment history),
        │                      # StudentPolicy (both PDFs)
        └── warden/RegisterCase.jsx # Case registration wizard: single or group incident, Hindi voice input
```

---

## Roles and case workflow

Roles come from the PostgreSQL enum `user_role`: `student`, `warden`, `chief_warden`, `dsw`, `admin`.

```text
 Warden / Chief Warden         Chief Warden            DSW                  Admin
 registers case  ───────▶  pending_chief  ──approve──▶ pending_dsw ──approve──▶ pending_admin ──decide──▶ resolved
```

1. **Create** (`POST /api/cases`, or `POST /api/cases/group` for a group incident): only wardens and chief wardens can register cases. The case starts as `status = pending_chief` and `assigned_to_role = chief_warden`. The backend gives it a public ID in the format `DAC-<year>-<00000 id>`. It notifies every chief warden and writes a timeline entry. All of this runs in one transaction.
2. **Approve** (`PUT /api/cases/:id/approve`): only the role in `assigned_to_role` can act.
   - The chief warden moves the case to `pending_dsw`. The backend notifies every DSW.
   - The DSW moves the case to `pending_admin`. The backend notifies every admin.
   - The admin moves the case to `resolved`. The backend sets `resolved_by`, `resolved_by_role` and `resolved_at`.
   - Each step notifies the case creator and adds a timeline event.
3. **Admin decision**: in `CaseDetail`, the admin enters penalty points, a fine and a decision text. The frontend sends `PUT /api/cases/:id` first, then `PUT /api/cases/:id/approve`. **Generate recommendation** asks Groq for a suggested penalty first (optional, advisory). Points must be a whole number ≥ 0.
   - **Points count only once the case is resolved.** Points entered or registered earlier (pending cases) do not change the student's total; a warning adds none. Re-opening, editing or deleting a resolved case updates the total.
4. **Resolve with warning** (`PUT /api/cases/:id/warn`): the Chief Warden, DSW or Admin can close the case at their stage with a warning instead of forwarding it. The case gets `resolution_type = 'warning'`, every member sees "Resolved by … with a warning", and no points are added.
5. **DAC meeting** (`POST /api/cases/:id/meetings`): while the case is `pending_admin`, the Admin picks a date, time and place. The student is notified in the app and by email, and a timeline entry is written.
6. **Final decision emails**: when the Admin resolves a case with more than 0 points, the student is emailed the points, fine, decision and appeal rules.
7. **Fine payment (demo)**: after resolution, the student can pay the fine from the case page or from the dashboard's **Total fine due → Pay now** (several cases in one transaction). See Demo payments in Known gaps.
8. **Edit**: an admin can edit any case. A warden can edit only their own case, and only while it is `pending_chief`.

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

Every rule has an **offence type** (`rules.offence_type`, one of `OFFENCE_TYPES` in `dacPolicy.js`):

- Substance Abuse
- Attendance & Curfew
- Disruption & Conduct
- Harassment & Violence
- Property Damage & Theft
- Cyber Offence
- Serious Misconduct
- Exam Malpractice
- Plagiarism
- Other (typed by hand)

On **Register Case**, the warden picks a type, then one of that type's rules. The chosen offence is saved in the case notes; the DAC still sets the final level and points. A rule the admin adds in **System Config** appears under the type chosen for it. On start, bootstrap fills in the type for policy rules that have none. It also relabels cases stored under the old type names (Attendance, Disruption, Harassment, Vandalism) to the new names.

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

DSW and Admin cannot register cases. In Admin Settings, **Rules & Policies** (`rules-weights`, the default for `/admin-settings`) shows the official policy and **System Config** (`system`) manages the rules and weights. The Email Test page has no sidebar link; open `/admin-settings/email-test` directly.

After login, `Login.jsx` sends each role to `/student-dashboard`, `/warden-dashboard`, `/chief-dashboard`, `/dsw-dashboard` or `/admin-dashboard`; these redirect to the landing pages above. Chatbot case links use `/view-case/:id` (admin, DSW), `/warden/view/:id` and `/chief-warden/view/:id`.

**Dashboards.** The four count cards are all-time. High & Critical counts only open (not resolved) cases. The table shows all cases for the Admin, the last 10 days for the Chief Warden and DSW, and only the cases a warden registered for that warden. **Case Trend** (7D / 30D / 3M / 1Y) and **Case Distribution** show a card with the period's count or the status share on hover (keyboard: Tab to the trend chart, then ← / →).

**Student dashboard.** Penalty Points (resolved points only), case counts, **Total fine due** with **Pay now** (opens the list of unpaid fines), My Cases, and Payment History.

`/settings` (change password) is available to every role. `ProtectedRoute` in `App.jsx` redirects any unauthorised role to `/`.

---

## Backend API

Base URL: `http://localhost:5000` in development (`PORT`, default `5000`; on macOS use `5001` because AirPlay takes port 5000). All `/api/*` routes except login need the header `Authorization: Bearer <jwt>`. `/users` and `/cases` are also mounted without the `/api` prefix, as legacy aliases.

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
| `POST /api/cases` | warden, chief_warden | Create case (`student_id`, `offense_type` required; also substance, time, location, alcohol reading, notes). `penalty_points` must be a whole number ≥ 0 (400 otherwise) |
| `POST /api/cases/group` | warden, chief_warden | Group incident: `{ students: [{ student_id, location?, alcohol_reading?, notes? }], ...shared }` → `{ incident_group_id, cases }` |
| `GET /api/cases/:id/group` | staff | Other cases from the same group incident |
| `PUT /api/cases/:id/warn` | chief_warden, dsw, admin | Resolve with a warning |
| `POST /api/cases/:id/recommendation` | chief_warden, dsw, admin | Groq penalty recommendation (only for `pending_admin` cases; advisory, nothing saved) |
| `POST /api/cases/:id/meetings` | admin | Schedule a DAC meeting `{ scheduled_at, location, notes? }` (only for `pending_admin`) |
| `GET /api/cases/:id/meetings` | staff, owning student | Meetings for a case |
| `GET /api/cases/meetings/mine` | student | The student's own meetings |
| `GET /api/payments/cases/:id` | student (own case), staff | Payment panel state: `{ case_ref, amount, currency, eligible, reason, payment }` |
| `POST /api/payments/cases/:id` | student (own case) | Confirm a **demo** payment `{ idempotency_key }` → `{ payment, replayed }` (201 new, 200 replay of the same checkout). 409 when not resolved, no fine, or already paid |
| `GET /api/payments/mine` | student | Own payment history, one entry per transaction (a consolidated payment lists its cases) |
| `GET /api/payments/summary` | student | Case-wise fines: `{ total_outstanding, outstanding_count, paid_total, paid_count, awaiting_count, items }`; each item is `payable`, `paid`, `awaiting_resolution` or `no_fine` |
| `POST /api/payments/batch` | student | Pay several own cases in **one** transaction `{ case_ids, expected_total, idempotency_key }`. All or nothing: every case is re-checked under row locks and the server computes the total; 409 `CASES_NOT_PAYABLE` / `AMOUNT_CHANGED` if anything changed |
| `GET /api/payments/:transactionId/receipt[?download=1]` | owning student, staff | PDF receipt built from the stored payment |
| `PUT /api/cases/:id` | admin, or the owning warden while `pending_chief` | Update fields (incl. `penalty_points`, `fine`, `decision`); invalid points return 400 |
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
| `POST /api/translate/hi-en` | warden, chief_warden | `{ text }` (max 6,000 chars) → `{ translation }` (Groq; 503 when `GROQ_API_KEY` is not set) |
| `POST /api/email/test` | admin | Sends a test email to `EMAIL_TEST_TO` |
| `GET /api/search?q=` | any (scoped) | Global search → `{ students, cases, offences }`. At least 2 characters (max 100); case-insensitive partial matches; up to 5 students, 6 cases, 5 offences. Students and offences are returned to staff only; cases follow the same visibility as the case lists. `?offence=<name>` lists that offence's cases |
| `POST /api/chat` | any (students: own records and policy only) | `{ message, conversationId? }` → `{ answer, intent, showCases, cases, sources, suggestedQuestions }` |

---

## DAC Assistant (chatbot)

Each question goes through this pipeline (`backend/services/chatbot.service.js`):

1. **Intent routing** (`queryRouter.js`). Regex rules classify the question as one of `workflow`, `count`, `policy`, `student_history`, `case_detail`, `case_search`, `hybrid` or `general_knowledge_base`. The router also extracts filters: case ID, 6-digit enrollment number, student name, substance, offence, hostel (`APJ`, `BSH`, `VSB`, `HBH`, `GH`), program, batch, severity, level, gender and status. Case cards are returned only when the user explicitly asks to *show/list/display* cases.
2. **Structured retrieval**. Parameterised SQL fetches student profiles, case details, timelines, counts and "which hostel/program has the most" aggregates.
3. **Document retrieval** (`ragService.js`). PostgreSQL keyword search (`ILIKE`, stop words removed, up to 8 terms) over `rag_documents`, ranked by the number of matching terms; `RAG_TOP_K` documents (default 5, 7 for policy questions). Policy and workflow questions search only `dac_policy` documents. There are no embeddings.
4. **Generation**. Groq (`GROQ_MODEL`, default `openai/gpt-oss-120b`, temperature 0.1, low reasoning effort) answers with a grounding system prompt, the retrieved context and up to 6 earlier turns. History is kept in memory per user and conversation for 30 minutes. Without `GROQ_API_KEY`, or when Groq fails, a deterministic rule-based answer is built from the same context.
5. **Access control**.
   - Students can ask only about their own records.
   - Count and aggregate queries are staff-only.
   - Document search gives students only policy documents and their own case documents; if their enrollment number is unknown, policy documents only.
   - The chatbot panel itself appears only for staff roles.

### Ingesting the knowledge base

```bash
npm run rag:ingest
```

- The script reads `backend/knowledge_base/*.jsonl` and splits each document into chunks of up to 2,000 characters with 200 characters of overlap.
- It skips chunks that have not changed, using a SHA-256 `content_hash`.
- It upserts the chunk text into `rag_documents`; nothing else is generated.
- `seed.sql` already contains the policy and case documents. Ingesting also adds the 5,000 case-timeline documents.

---

## Database

`database/schema.sql` creates:

- **Enums**: `user_role`, `case_status` (`pending_chief`, `pending_dsw`, `pending_admin`, `resolved`), `case_severity` (`low`, `medium`, `high`, `critical`), `program_type` (`btech`, `bba`, `mba`, `ballb`, `bcom`).
- **Tables**: `users`, `cases`, `case_timeline`, `rules`, `evidence`, `notifications`, `rag_documents`, `case_meetings`, `case_payments`, `payment_transactions`.
- **Newer columns**: `cases.resolution_type` (`'warning'` when closed with a warning), `cases.incident_group_id`.
- **Indexes** for the dashboard and case page: `cases(created_by)`, `cases(incident_group_id)`, `case_timeline(case_id)`, `evidence(case_id)`, `notifications(user_id, created_at)`, `case_meetings(case_id)`, `case_meetings(student_id, scheduled_at)`.
- **`case_payments`** (demo fine payments): FKs to `users` and `cases` with `ON DELETE RESTRICT` (a paid case or its student cannot be deleted), unique `transaction_id` (`TXN-YYYYMMDD-XXXXXXXX`; older `DEMO-…` ids are still accepted) and `idempotency_key`, CHECKs on amount, `payment_status` (`PENDING`/`SUCCESS`/`FAILED`) and `payment_type` (`DEMO` only), and a partial unique index allowing **one `SUCCESS` payment per case**. The amount is copied from `cases.fine` (the Admin's decision) at payment time.
- **`payment_transactions`** (consolidated payments): one header per transaction (`transaction_id`, `total_amount`, `case_count`, `idempotency_key`); its cases are `case_payments` rows linked by `case_payments.payment_transaction_id` (NULL for single-case payments). The one-`SUCCESS`-per-case index covers both kinds.
- **DAC points rule**: `users.total_points` = sum of `penalty_points` of the student's **resolved** cases, excluding cases resolved with a warning. Points on pending cases never count. The `cases_total_points` trigger (created in `bootstrap.js` and `schema.sql`) keeps it in sync on every case insert, update and delete; it locks the student row (`FOR NO KEY UPDATE`) before summing, so simultaneous changes to one student's cases cannot leave a stale total. Bootstrap and `seed.sql` / `npm run seed:dac` recalculate all totals (the seeds no longer write `total_points`). `cases.penalty_points` must be a whole number ≥ 0: the API returns 400 otherwise, and the `cases_penalty_points_nonnegative` CHECK constraint enforces it in the database.
- **Unused**: `rag_documents.embedding vector(768)` and an HNSW index are still created when the `pgvector` extension is available. They were for the removed embedding search; nothing reads or writes them.

Student details (name, enrollment number, program, hostel, room, gender) live **only in `users`**. Cases reference them through `student_id`.

On every start, `backend/config/bootstrap.js` (`ensureWorkflowSchema`) runs idempotent `ALTER`/`CREATE … IF NOT EXISTS` statements, (re)creates the DAC points trigger and CHECK constraint, and recalculates any stale points totals. It also upserts a demo student, **Aarav Sharma** (enrollment `240123`), with case `DAC-2026-09001`, in every environment. An older database is upgraded automatically. Scripts that call it (`seed:dac`, `rag:ingest`, `test-rag-queries.js`, `test-all-10-queries.js`) apply the same changes to the database they connect to.

### Seed data (`database/seed.sql`)

All seed data is synthetic. It contains:

- 6 staff accounts (`warden1@test.com`, `warden2@test.com`, `chief@test.com`, `dsw@test.com`, `admin@test.com`, and a `test` DSW account).
- 1,658 students and ~5,000 cases.
- 21,000+ timeline events.
- Sample evidence and notifications. (The rules table is loaded from the policy instead; see DAC policy above.)
- Student email addresses are placeholders (`@dac.edu`, `@test.com`). Give a student a real address in User Management before expecting emails to arrive.
- The RAG documents: 7 DAC policy sections and the case narratives (no timeline documents).
- No `total_points` values: every student's points total is recalculated from their resolved cases at the end of the file.

---

## Getting started

### Prerequisites

- Node.js 20+ (the backend uses `node --watch`; Express 5 needs Node 18+).
- PostgreSQL 14+, either local or Supabase.
- A Groq API key for the chatbot answers, Hindi translation and AI recommendations (without it, the chatbot gives rule-based answers and the other two return 503).
- Optional: a Google OAuth client ID (Google Sign-In), Gmail SMTP credentials and a Supabase project for evidence storage.

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
| `VITE_API_BASE_URL` | frontend | e.g. `http://localhost:5000/api`. In production the backend serves the built frontend, so leave it unset. |
| `GROQ_API_KEY`, `GROQ_MODEL` | backend | Chatbot answers, Hindi translation and AI recommendations. Default model `openai/gpt-oss-120b`; if the configured model is retired (404), the default is used. Rate-limit (429) responses are retried up to 3 times. `GROQ_TIMEOUT_MS` (default `12000`) optional. **Backend only.** |
| `RAG_TOP_K` | backend | Documents retrieved per chatbot question, default `5` |
| `NODE_ENV` | backend | `production` hides internal error details in some API responses |
| `SMTP_USER`, `SMTP_PASS` | backend | Gmail address and 16-character App Password (needs 2-Step Verification). `SMTP_HOST`/`SMTP_PORT` optional (default `smtp.gmail.com:465`). |
| `EMAIL_FROM`, `EMAIL_TEST_TO` | backend | Display sender; recipient of the admin test email |
| `MEETING_TIME_ZONE` | backend | Time zone used in meeting emails, default `Asia/Kolkata` |
| `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `SUPABASE_EVIDENCE_BUCKET` | backend | Evidence storage. Secret key `sb_secret_…` (`SUPABASE_SERVICE_ROLE_KEY` also accepted). Bucket default `evidence`, must be **private**. |
| `DAC_DATA_DIR` | `seed-dac.js` | Folder with the CSV exports. Default `~/Downloads`. |

`.env.example` also lists `GEMINI_API_KEY`, `GEMINI_MODEL`, `GEMINI_EMBEDDING_MODEL`, `RAG_MIN_SCORE`, `RAG_CHUNK_SIZE`, `RAG_CHUNK_OVERLAP` and `GOOGLE_CLIENT_SECRET`. Nothing reads them any more; leave them empty or remove them from your `.env`.

### 3. Create and seed the database

Run these steps in order:

```bash
createdb dacexpertsys
psql -d dacexpertsys -f database/schema.sql
psql -d dacexpertsys -f database/seed.sql      # or: npm run seed:dac
```

`npm run seed:dac` imports the CSV exports when they exist in `DAC_DATA_DIR`. Otherwise it runs `database/seed.sql`.

To set known development passwords for every account, run the following from the `backend/` folder. It reads `../.env` and the `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` and `DB_NAME` variables (not `DATABASE_URL` or `PG*`, so set these for Supabase too):

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

### 4. Ingest the chatbot knowledge base (optional)

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
node scripts/test-rag-queries.js       # Chatbot checks (needs seeded DB + ingested KB; runs bootstrap, calls Groq)
node scripts/test-all-10-queries.js    # 10 reference chatbot questions (runs bootstrap, calls Groq)
node scripts/test-payments.js          # Demo payment checks; all writes are rolled back
node scripts/test-search.js            # Global search checks (read-only)
node scripts/test-points.js            # DAC points rule checks; all writes are rolled back
POINTS_TEST_DISPOSABLE_DB=1 node scripts/test-points.js   # + committing two-connection race test (throwaway DB only)
```

There is no unit-test runner. The `test-*` scripts are integration checks against a live database. `test-payments.js` and `test-points.js` run every write inside a transaction that is rolled back, and `test-search.js` only reads, so they leave no data behind (rolled-back inserts still advance ID sequences). `test-rag-queries.js` and `test-all-10-queries.js` run `ensureWorkflowSchema` first, which applies pending schema changes to that database.

---

## Contribution conventions

- **API access**: all HTTP calls go through `src/services/api.js`. Do not call `fetch` in components.
- **Backend layering**: `routes` → `controllers` (validation, status codes) → `services` (SQL). Use parameterised queries only. Workflow changes must keep the case update, notifications and timeline in one transaction (see `cases.service.js`).
- **Authorisation**: guard routes with `verifyToken` and `requireRoles(...)` on the backend. Add matching `ProtectedRoute roles` in `App.jsx` on the frontend. The frontend guard is only for user experience; the backend guard is the real check.
- **Schema changes**: add them to `database/schema.sql` **and** to `backend/config/bootstrap.js`, so existing databases upgrade on start. Keep the DAC points function text identical in both (`test-points.js` checks it).
- **AI calls**: use `groqGenerate` from `backend/services/groqService.js`; keys stay on the backend.
- **UI**: build pages with `DACLayout` and the shared pieces in `components/cases/` (`Card`, `Icon`, `CasesTable`, `caseUi.js` helpers). Style with Tailwind utility classes. Icons are Material Symbols (`<Icon name="..." />`).
- **Animation**: reuse the variants in `src/lib/motion.js`. Lenis smooth scrolling starts once in `App.jsx`.

---

## Known gaps

These are current limitations, kept here so that contributors do not assume the features are complete:

- **The rule engine is advisory.** The rules list feeds the AI recommendation, but the backend does not compute severity or points automatically; the Admin enters them. `src/services/ruleEngine.js` belongs to the old Firebase flow.
- **Chatbot policy text is outdated.** The DAC Assistant answers from `backend/knowledge_base/dac_policy.jsonl` (`GET /api/policies`), which predates the PDFs and does not match `dacPolicy.js` (for example the appeal rules). Re-ingest it from the PDFs.
- **Legacy evidence is public.** Files uploaded before Supabase Storage remain in `backend/uploads/` and are served at `/uploads` without authentication. New uploads are private.
- **Emails need real addresses and SMTP.** Without `SMTP_USER`/`SMTP_PASS`, or with placeholder student addresses, meetings and decisions are saved but no email arrives; the Admin sees the reason on the case page.
- **AI output needs review, and data leaves the server.** Chatbot answers, recommendations and translations come from an external model (Groq). Recommendations send the case and history without the student's name or enrollment number. Chatbot questions send the retrieved database context to Groq, which can include student names, enrollment numbers and case descriptions.
- **Payments are a demo.** No payment gateway is integrated; a confirmed checkout is recorded as a successful `DEMO` transaction. Integrating a real gateway needs server-side payment verification before a row is marked `SUCCESS`.
- **Chatbot memory** is in-process (a `Map`). It is lost on restart and is not shared across instances.
- **Password rules.** The change-password UI says "at least 8 characters", but neither the frontend nor the backend enforces a minimum length.
- **Security hardening still to do.**
  - `JWT_SECRET` falls back to a fixed development secret when unset.
  - Login has no rate limiting, and admin-reset temporary passwords are `Temp@` + 4 random digits.
  - Three evidence files are committed under `backend/uploads/evidence/` and served publicly at `/uploads`.
  - A warden can attach evidence to any case, and can set `fine` and `decision` on their own pending case.
  - `GET /api/cases/history?limit=` has no upper limit.
  - The demo student `240123` is upserted on every start, including production.

## Legacy / unused code

None of these files are imported by the running app. They can be removed together with the `firebase` dependency:

- `src/firebase/firebaseConfig.js`, `src/firebase/firestore.js`
- `src/services/caseService.js`, `questionService.js`, `ruleEngine.js`, `seedFirestore.js` (the Firestore-based design)
- `src/components/ui/SeverityBadge.jsx`, `src/App.css` (Vite template CSS), `src/assets/react.svg` (empty file)
- `@tailwindcss/postcss` and `@tailwindcss/vite` (v4) are installed, but the build uses Tailwind **v3** through `postcss.config.js`.
- `react-icons` is installed but not imported anywhere.
- `GOOGLE_DEFAULT_ROLE` (`auth.controller.js`) and `createUserFromGoogle` (`auth.service.js`) are unused: Google Sign-In only accepts existing users.
- `database/rag_vector_migration.sql` and the `rag_documents.embedding` column belong to the removed embedding search.
- Committed by accident: `.DS_Store` files and `public/logo.png 00-05-37-825.png`.
