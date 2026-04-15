# TalentNet — Architecture Guide

## Repository Layout

```
talent-net/
├── apps/
│   ├── api/            # Serverless Lambda backend (AWS API Gateway + Lambda)
│   └── web/            # Next.js 15 frontend (AWS Amplify)
└── packages/
    ├── config/         # Shared tsconfig bases and ESLint rules
    ├── types/          # Shared TypeScript enums and DTOs
    └── database/       # TypeORM entities, migrations, repositories
```

## Tech Stack

| Layer            | Technology                                  |
|------------------|---------------------------------------------|
| Monorepo tooling | Turborepo v2 + npm workspaces               |
| Frontend         | Next.js 15 (App Router), Tailwind CSS, SWR  |
| Backend          | Serverless Framework v3, AWS Lambda, API GW |
| Database         | PostgreSQL + TypeORM 0.3                    |
| Language         | TypeScript 5.6 throughout                  |
| Auth             | JWT (jsonwebtoken) + bcrypt                 |
| Validation       | Zod                                         |
| AI evaluation    | OpenRouter (OpenAI-compatible, model-agnostic) |
| File storage     | AWS S3                                      |
| Email            | Resend                                      |
| Deployment       | Serverless CLI (API) + AWS Amplify (web)    |

## Domain Model (Key Entities)

```
Job ─────────────┬─── ScoringConfig
                 │         ├─── EvaluationDimension (N)
                 │         └─── KnockoutRule (N)
                 ├─── ApplicationForm
                 │         └─── ScreeningQuestion (N)
                 └─── Application (N)
                           ├─── ApplicationAnswer (N)
                           ├─── CandidateScore
                           └─── Interview (N)
                                     ├─── InterviewSchedule
                                     ├─── InterviewParticipant (N)
                                     └─── IntegritySignal (N)

Candidate ───────┬─── Application (N)
                 ├─── PoolMembership (N) ──── TalentPool
                 └─── ConsentRecord (N)

User ────────────┬─── JobAssignment (N)
                 ├─── InterviewParticipant (N)
                 └─── InternalNote (N)
```

## Scoring & Evaluation Model

Each `Job` has exactly **one** `ScoringConfig` that defines:

- **Evaluation Dimensions** — weighted scoring categories (e.g. Skill Match 30%, Experience 25%).
  - Weights must sum to 100%.
  - Per-phase weighting separates pre/post-interview scores.
  - `minimumThreshold` triggers manual-review flags per dimension.
  - Dimension visibility can be restricted to senior reviewers.

- **Knockout Rules** — hard conditions that flag or block candidates:
  - `non_progression` — prevents pipeline advancement
  - `rejection_review` — flags for HR before rejection is confirmed
  - `manual_review_required` — escalates to a human decision

- **Thresholds**:
  - `shortlistThreshold` — auto-shortlist at this score
  - `passThreshold` — minimum acceptable overall score
  - `manualReviewThreshold` — below this requires human review

HR can validate the config before publishing via `GET /jobs/{id}/scoring/validate`.
Scoring configs can be saved as reusable templates (`isTemplate: true`).

## Public vs Admin Routing

### Public (Next.js SSG/ISR)
- `/careers` — job listing, ISR every 5 min
- `/careers/[slug]` — job detail, `generateStaticParams` + ISR fallback

### Admin (CSR with React)
All routes under `/admin/**` are client-side rendered — they require a JWT token
stored in `localStorage` and call the authenticated API.

- `/admin/jobs` — paginated job list with status management
- `/admin/jobs/new` — create job form
- `/admin/jobs/[id]` — job detail + edit
- `/admin/jobs/[id]/scoring` — **Scoring Configuration Editor** (primary initial task)
- `/admin/applications` — candidate pipeline workspace
- `/admin/candidates` — candidate database search
- `/admin/interviews` — interview coordination hub
- `/admin/pools` — talent pool management
- `/admin/analytics` — reporting dashboards

## API Conventions

All Lambda handlers:
1. Call `withErrorHandler()` wrapper — handles ZodError, AppError, and uncaught exceptions.
2. Call `requireRoles()` — extracts and verifies JWT, enforces RBAC.
3. Call `parseBody()` — parses JSON body safely.
4. Call `db()` — returns a singleton TypeORM DataSource (reused on warm invocations).

Response shape:
```json
{ "success": true, "data": { ... }, "meta": { "total": 0, "page": 1, ... } }
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "...", "details": {} } }
```

## Getting Started

```bash
# 1. Copy environment config
cp .env.example .env   # fill in DATABASE_URL, JWT_SECRET, etc.

# 2. Install all workspace dependencies
npm install

# 3. Build shared packages
npm run build --filter=@talent-net/types
npm run build --filter=@talent-net/database

# 4. Run database migrations
npm run db:migrate

# 5. Start local API (port 4000)
cd apps/api && npm run dev

# 6. Start frontend (port 3000)
cd apps/web && npm run dev
```

## Deployment

### API → AWS Lambda
```bash
cd apps/api
npm run deploy              # dev stage
npm run deploy:prod         # prod stage
```

### Web → AWS Amplify
Connect the repository in the Amplify Console and point build settings to
`amplify.yml` in `apps/web/`. Environment variables are set via Amplify console.
