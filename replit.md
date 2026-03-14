# Workspace — LMS E-Learning System

## Overview

Full-stack E-Learning System (LMS) for a university final project covering 35 functional requirements across 3 phases.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Primary DB**: MongoDB via Mongoose 9.x (university requirement)
- **Secondary DB**: PostgreSQL + Drizzle ORM (Replit built-in, available)
- **Validation**: Zod (`zod/v4`), Mongoose schema validators
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Structure

```text
workspace/
├── artifacts/
│   ├── api-server/              ← Backend (Express 5 + Mongoose)
│   │   └── src/
│   │       ├── config/db.ts     ← MongoDB connection
│   │       ├── models/
│   │       │   ├── User.ts      ← bcrypt pre-save, soft-delete filter
│   │       │   ├── Course.ts    ← virtuals, soft-delete filter
│   │       │   └── TokenBlacklist.ts ← JWT blacklist (TTL 7d)
│   │       ├── middlewares/
│   │       │   ├── circuitBreaker.ts  ← Rate limiter (in-memory Map)
│   │       │   ├── protect.ts         ← JWT + ghost check
│   │       │   └── restrictTo.ts      ← RBAC factory
│   │       └── routes/
│   │           ├── health.ts    ← /health, /healthz
│   │           ├── auth.ts      ← /auth/register, login, logout, me
│   │           ├── courses.ts   ← /courses CRUD + enroll + stats
│   │           ├── stream.ts    ← /stream/:filename
│   │           └── gateway.ts   ← /gateway/users
│   │
│   ├── lms-web/                 ← PHASE 2: React + Vite + Tailwind (TODO)
│   └── lms-mobile/              ← PHASE 3: Expo React Native (TODO)
│
└── lib/
    ├── api-spec/openapi.yaml    ← OpenAPI contract
    ├── api-client-react/        ← Generated React Query hooks
    └── api-zod/                 ← Generated Zod schemas
```

## Environment Variables

- `MONGODB_URI` — MongoDB Atlas connection string (set)
- `JWT_SECRET` — JWT signing secret (auto-generated, set)
- `JWT_EXPIRES_IN` — Token expiry, default `7d` (set)
- `NODE_ENV` — `development` (set)
- `DATABASE_URL` — PostgreSQL URL (Replit-managed)

## Phase 1 — Backend (COMPLETE ✅)

All 15 backend functional requirements implemented and tested:

| Function | Endpoint | Status |
|---|---|---|
| [3.1] CORS + Morgan + Query parsing | All routes | ✅ |
| [3.2] Health monitoring (uptime + MB) | `GET /api/health` | ✅ |
| [3.3] Circuit breaker (5 req/10s, in-memory Map, 429) | Global middleware | ✅ |
| [3.4] File vault streamer (createReadStream, User-Agent, 20MB cap) | `GET /api/stream/:file` | ✅ |
| [3.5] API gateway (fetch + flatten + X-Powered-By) | `GET /api/gateway/users` | ✅ |
| [4.1] Course CRUD (Mongoose schema, required, min, enum) | `/api/courses` | ✅ |
| [4.2] Soft delete (isDeleted, deletedAt, auto-filtered) | `DELETE /api/courses/:id` | ✅ |
| [4.3] Atomic enrollment ($inc, findOneAndUpdate, transaction) | `POST /api/courses/:id/enroll` | ✅ |
| [4.4] Tag search ($all), skip/limit, totalPages | `GET /api/courses?tags=...` | ✅ |
| [4.5] salePrice virtual + aggregation ($group, $avg) | `GET /api/courses/stats/aggregation` | ✅ |
| [5.1] Register (bcrypt Salt 12, pre-save hook, select:false) | `POST /api/auth/register` | ✅ |
| [5.2+5.3] Login (JWT HttpOnly cookie, ghost check, changedPasswordAfter) | `POST /api/auth/login` | ✅ |
| [5.4] RBAC factory (restrictTo) | Route middleware | ✅ |
| [5.5] Anti-brute force (500ms delay) + token blacklist (MongoDB TTL) | `POST /api/auth/logout` | ✅ |

## Phase 2 — Web Frontend (COMPLETE)

React + Vite + Tailwind Admin/Instructor portal at `/` with:
- ThemeContext dark/light toggle, RecursiveComment, Zustand cart + 8% VAT
- lodash 600ms debounce search, file upload queue (max 2 concurrent)
- React Router v6 + useParams, 3-step course creation with Outlet + Zod
- Optimistic delete with Axios retry interceptors (×3)
- Dynamic Exam Form Engine from JSON schema (`/api/exam/schema`)
- react-hook-form review submission with sonner toasts

## Phase 3 — Mobile Frontend (COMPLETE)

Expo React Native student app at `/lms-mobile/` with 5 tabs:
- **Profile** [7.1]: Link-in-Bio with Flexbox, rounded avatar, Pressable buttons with random color generation
- **Convert** [7.2]: Currency converter with KeyboardAvoidingView + Glassmorphism UI, 8 currencies
- **Library** [7.3]: Deep-link explorer with Stack navigation, useLocalSearchParams, favorite callback sync via AsyncStorage
- **Dashboard** [7.4]: Promise.allSettled (2 APIs parallel), offline cache mode via AsyncStorage, pull-to-refresh
- **Exams** [7.5]: Offline-first exam submission, AsyncStorage FIFO queue, NetInfo auto-sync on reconnect

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`.

- `pnpm run typecheck` — full check across all packages
- `pnpm --filter @workspace/api-server run dev` — run dev server

## Key Notes

- Mongoose 9.x: async pre-hooks do NOT take `next` as a parameter — just `return` or `throw` to stop
- Circuit breaker uses in-memory `Map` (not Redis) per [3.3] requirement
- Soft-deleted items are automatically excluded via Mongoose pre-query hooks matching `/^find/`
