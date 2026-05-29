# Technology Stack

**Analysis Date:** 2026-02-22

## Languages

**Primary:**
- TypeScript 5.7.2 - Frontend SPA (React components, routing, API integration)
- Python 3.12 - Backend API (FastAPI, business logic, database operations)

**Secondary:**
- JavaScript - Build configuration and development tools
- CSS - Styling (via Tailwind CSS)

## Runtime

**Environment:**
- Node.js (implied by package.json type: "module", supports ES modules)
- Python 3.12 (`/home/alejandro-jordan/Documents/Personal/Code/portfolio/backend/.python-version`)

**Package Manager:**
- npm (Node.js package manager)
  - Lockfile: `package-lock.json` present in `/home/alejandro-jordan/Documents/Personal/Code/portfolio/frontend/`
- uv (Python package manager)
  - Lockfile: `uv.lock` present in `/home/alejandro-jordan/Documents/Personal/Code/portfolio/backend/`
  - Dependencies defined in `pyproject.toml`

## Frameworks

**Core:**
- FastAPI 0.115.12+ - Backend REST API framework with async support
  - Location: `/home/alejandro-jordan/Documents/Personal/Code/portfolio/backend/`
  - Includes: Starlette middleware, exception handling, CORS support
- React 19.2.0 - Frontend UI framework
  - Location: `/home/alejandro-jordan/Documents/Personal/Code/portfolio/frontend/src/`

**Routing:**
- TanStack Router (React Router) 1.132.0 - Client-side routing for SPA
  - Plugin: `@tanstack/router-plugin` 1.132.0
  - Route files: `/home/alejandro-jordan/Documents/Personal/Code/portfolio/frontend/src/routes/`

**State Management:**
- TanStack Query (React Query) 5.90.21 - Server state management, API caching, synchronization
  - Provider: `/home/alejandro-jordan/Documents/Personal/Code/portfolio/frontend/src/integrations/tanstack-query/QueryProvider.tsx`
  - DevTools: `@tanstack/react-query-devtools` 5.91.3

**Testing:**
- Vitest 3.0.5 - Frontend unit testing (Vite-native test runner)
  - Config: JavaScript/TypeScript test discovery
- @testing-library/react 16.2.0 - React component testing utilities
- @testing-library/dom 10.4.0 - DOM testing utilities
- jsdom 27.0.0 - DOM implementation for Node.js testing

**Build/Dev:**
- Vite 7.1.7 - Frontend build tool and dev server
  - Config: `/home/alejandro-jordan/Documents/Personal/Code/portfolio/frontend/vite.config.ts`
  - Plugins: React integration, TailwindCSS, path resolution
- Uvicorn 0.34.2 - ASGI server for FastAPI
  - Command: `python app.py` runs on `0.0.0.0:5151` with reload enabled

## Key Dependencies

**Critical:**

**Backend - Database:**
- beanie 1.29.0 - ODM (Object-Document Mapper) for MongoDB
  - Uses: `Document` base class for models
  - Location: `/home/alejandro-jordan/Documents/Personal/Code/portfolio/backend/app/models/`
- motor 3.x (async) - Async MongoDB driver via motor.motor_asyncio
  - Connection management: `AsyncIOMotorClient`, `AsyncIOMotorDatabase`
  - Location: `/home/alejandro-jordan/Documents/Personal/Code/portfolio/backend/app/db/db_manager.py`

**Backend - Security:**
- passlib 1.7.4 - Password hashing and verification
  - Implementation: `/home/alejandro-jordan/Documents/Personal/Code/portfolio/backend/app/core/security/api.py`
  - Used for admin user creation and authentication
- pyjwt 2.10.1 - JWT token encoding/decoding
  - Services: `/home/alejandro-jordan/Documents/Personal/Code/portfolio/backend/app/services/auth/`
  - Social auth token validation: `/home/alejandro-jordan/Documents/Personal/Code/portfolio/backend/app/core/security/social.py`
- cryptography 45.0.1 - Cryptographic operations
- password-strength 0.0.3.post2 - Password validation

**Backend - HTTP/API:**
- aiohttp 3.11.18+ - Async HTTP client for OAuth/SSO data exchange
  - Used in: `/home/alejandro-jordan/Documents/Personal/Code/portfolio/backend/app/core/security/social.py`
  - Providers: Google, Microsoft, Facebook, Apple OAuth flows
- httpx 0.28.1 - Modern HTTP client (backup/alternative to aiohttp)
- python-multipart 0.0.20 - Form data parsing for multipart requests
- slowapi 0.1.9 - Rate limiting middleware
  - Location: `/home/alejandro-jordan/Documents/Personal/Code/portfolio/backend/app/main.py`

**Backend - Email:**
- emails 0.6 - Email sending library via SMTP
  - Implementation: `/home/alejandro-jordan/Documents/Personal/Code/portfolio/backend/app/services/email/email.py`
  - Template engine: Jinja2 templates in `email-templates/built/`
  - Async wrapper using ThreadPoolExecutor

**Backend - Configuration:**
- pydantic 2.11.4+ - Data validation and settings management
- pydantic-settings 2.9.1 - Environment-based configuration
  - Settings class: `/home/alejandro-jordan/Documents/Personal/Code/portfolio/backend/app/core/config.py`
- python-dotenv 1.0.0 - .env file loading

**Backend - Logging:**
- loguru 0.7.3 - Structured logging
  - Setup: `/home/alejandro-jordan/Documents/Personal/Code/portfolio/backend/app/core/logging_config.py`

**Backend - Documentation:**
- scalar-fastapi 1.5.0 - API documentation UI (replaces Swagger/ReDoc)
  - Route: `/docs` endpoint in `/home/alejandro-jordan/Documents/Personal/Code/portfolio/backend/app/main.py`

**Frontend - UI Components:**
- radix-ui 1.4.3 - Headless UI component library
- lucide-react 0.561.0 - Icon library
- class-variance-authority 0.7.1 - Component variant pattern management
- clsx 2.1.1 - Utility for conditional className binding
- tailwind-merge 3.0.2 - Tailwind CSS class merging

**Frontend - Styling:**
- tailwindcss 4.1.18 - Utility-first CSS framework
- @tailwindcss/vite 4.1.18 - Vite plugin for Tailwind CSS
- tw-animate-css 1.3.6 - Additional CSS animations

**Frontend - Development:**
- typescript 5.7.2 - TypeScript compiler
- prettier 3.5.3 - Code formatter
- @tanstack/eslint-config 0.3.0 - TanStack ESLint preset
- vite-tsconfig-paths 5.1.4 - TypeScript path alias resolution for Vite
- @vitejs/plugin-react 5.0.4 - Vite React plugin

## Configuration

**Environment:**

**Backend:**
- Location: `backend/.env` (not committed, `.env.example` provided)
- Configuration class: `Settings` in `/home/alejandro-jordan/Documents/Personal/Code/portfolio/backend/app/core/config.py`
- Mode detection: Automatically detects dev/prod based on `db_conn_str`

**Frontend:**
- Vite environment variables: `VITE_API_URL`
  - Default: `http://localhost:8000` if not set
  - Loaded: `/home/alejandro-jordan/Documents/Personal/Code/portfolio/frontend/src/api/apiUrl.ts`

**Key Configs:**

Backend:
- `app_name`, `app_domain`, `mount_point` - App identity
- `db_conn_str` - MongoDB connection string (localhost or production)
- `db_max_pool_size`, `db_min_pool_size` - Connection pooling
- `SMTP_*` - Email configuration (SendGrid by default)
- `secret_key`, `authjwt_refresh_key` - Security keys for JWT
- `google_client_id` - OAuth provider
- `cors_origins` - CORS policy
- `allow_new_users`, `magic_link_enabled`, `emails_enabled` - Feature flags

Frontend:
- `VITE_API_URL` - Backend API base URL

## Build

**Frontend Build:**
- Input: `/home/alejandro-jordan/Documents/Personal/Code/portfolio/frontend/src/`
- Output: Vite bundle (dist directory)
- Commands:
  - `npm run dev` - Development server (port 3000)
  - `npm run build` - Production build
  - `npm run preview` - Preview production build

**Backend Deployment:**
- Server: Uvicorn with FastAPI
- Port: 5151 (development)
- Health checks:
  - `/health` - Overall health status
  - `/health/ready` - Readiness probe
  - `/health/live` - Liveness probe
- Documentation: `/docs` (Scalar API reference)

## Platform Requirements

**Development:**
- Node.js (LTS recommended for npm)
- Python 3.12 (required)
- MongoDB (local or remote connection string)
- SMTP server credentials (SendGrid or alternative)

**Production:**
- FastAPI/Uvicorn capable server
- MongoDB cluster or instance
- SMTP service for email delivery
- Environment variables properly configured with production secrets

---

*Stack analysis: 2026-02-22*
