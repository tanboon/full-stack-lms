---
description: How to start the development services (API, Web, Mobile)
---

# Starting Development Services

All commands should be run from the project root: `/Users/tanboontiengtut/Documents/full-stack-lms`

## Start All Three Services at Once

// turbo
```bash
pnpm run dev:all
```

This starts:
- **API Server** on `http://localhost:8080` (Express + MongoDB)
- **LMS Web** on `http://localhost:5173` (Vite + React)
- **LMS Mobile** on `http://localhost:8081` (Expo)

## Start Individual Services

### API Server (port 8080)
// turbo
```bash
pnpm run dev:api
```

### LMS Web (port 5173)
// turbo
```bash
pnpm run dev:web
```

### LMS Mobile (port 8081)
// turbo
```bash
pnpm run dev:mobile
```

## Notes
- The API server loads its `.env` file automatically (MongoDB URI, JWT secret, port).
- The web app proxies `/api` requests to `http://localhost:8080` via Vite's dev server proxy.
- The mobile app connects to `http://localhost:8080/api` (configured in `contexts/AuthContext.tsx`).
- Press `Ctrl+C` to stop any running service.
