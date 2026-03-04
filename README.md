# Ecom Store Auth Scaffold

This repo contains:
- `frontend`: Next.js app (auth pages, middleware-protected dashboard)
- `backend`: Go API (Postgres, cookie sessions, mandatory TOTP 2FA)

## Quick Start

1. Configure env files:
   - `backend/.env`
   - `frontend/.env.local`
2. Run backend:
   - `cd backend`
   - `go mod tidy`
   - `go run ./cmd/api`
3. Run frontend:
   - `cd frontend`
   - `npm install`
   - `npm run dev`

Default URLs:
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:8080`