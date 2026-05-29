# External Integrations

**Analysis Date:** 2026-02-22

## APIs & External Services

**OAuth & Social Authentication:**
- Google OAuth 2.0 - SSO authentication
  - SDK/Client: aiohttp (async HTTP calls to Google API)
  - Token exchange endpoint: `https://www.googleapis.com/oauth2/v3/userinfo?alt=json`
  - Config: `google_client_id` env var
  - Implementation: `/home/alejandro-jordan/Documents/Personal/Code/portfolio/backend/app/core/security/social.py` - `exchange_google_sso_data_for_email()`

- Microsoft OAuth 2.0 - SSO authentication
  - SDK/Client: aiohttp
  - Token exchange endpoint: `https://graph.microsoft.com/v1.0/me`
  - Implementation: `/home/alejandro-jordan/Documents/Personal/Code/portfolio/backend/app/core/security/social.py` - `exchange_microsoft_sso_data_for_email()`

- Facebook OAuth 2.0 - SSO authentication
  - SDK/Client: aiohttp
  - Token exchange endpoint: `https://graph.facebook.com/v13.0/me?fields=email`
  - Implementation: `/home/alejandro-jordan/Documents/Personal/Code/portfolio/backend/app/core/security/social.py` - `exchange_facebook_sso_data_for_email()`

- Apple OAuth 2.0 - SSO authentication
  - SDK/Client: aiohttp + pyjwt
  - Token exchange endpoint: `https://appleid.apple.com/auth/keys`
  - JWT validation: RS256 algorithm
  - Implementation: `/home/alejandro-jordan/Documents/Personal/Code/portfolio/backend/app/core/security/social.py` - `exchange_apple_sso_data_for_email()`

## Data Storage

**Databases:**
- MongoDB - Primary document database
  - Connection: `db_conn_str` env var (default: `mongodb://localhost:27017/`)
  - Database name: `db_name` env var
  - Client: Motor (async MongoDB driver)
  - ODM: Beanie for document models
  - Connection manager: `/home/alejandro-jordan/Documents/Personal/Code/portfolio/backend/app/db/db_manager.py`
  - Models location: `/home/alejandro-jordan/Documents/Personal/Code/portfolio/backend/app/models/`
    - User model: `/home/alejandro-jordan/Documents/Personal/Code/portfolio/backend/app/models/user/model.py`
    - Role model: `/home/alejandro-jordan/Documents/Personal/Code/portfolio/backend/app/models/role/model.py`
  - Pool settings: `db_max_pool_size` (default: 10), `db_min_pool_size` (default: 1)
  - Timeouts: serverSelectionTimeoutMS (5s), connectTimeoutMS (10s), socketTimeoutMS (20s)

**File Storage:**
- Local filesystem only - Email templates stored locally
  - Template directory: `/home/alejandro-jordan/Documents/Personal/Code/portfolio/backend/app/services/email/email-templates/built/`
  - No cloud storage integration detected

**Caching:**
- TanStack Query (React Query) - Client-side HTTP cache
  - Location: `/home/alejandro-jordan/Documents/Personal/Code/portfolio/frontend/src/integrations/tanstack-query/QueryProvider.tsx`
  - Managed at: React application level
- No server-side cache (Redis, Memcached) detected

## Authentication & Identity

**Auth Provider:**
- Custom JWT-based authentication
  - Implementation: `/home/alejandro-jordan/Documents/Personal/Code/portfolio/backend/app/core/security/`
  - Token generation: `/home/alejandro-jordan/Documents/Personal/Code/portfolio/backend/app/services/auth/auth_service.py`
  - OAuth2PasswordBearer scheme for API authentication

**Authentication Methods:**
1. Basic authentication (email/password)
   - Password hashing: passlib with bcrypt
   - Setup: `/home/alejandro-jordan/Documents/Personal/Code/portfolio/backend/app/core/security/api.py`

2. Magic Link authentication (email-based)
   - Token generation: Via auth service
   - Token expiry: `email_reset_token_expire_minutes` (default: 60 minutes)
   - Enabled via: `magic_link_enabled` env var
   - Refresh interval: `magic_link_refresh_seconds` (default: 60 seconds)

3. Social login (OAuth2)
   - Providers: Google, Microsoft, Facebook, Apple
   - Token exchange: `/home/alejandro-jordan/Documents/Personal/Code/portfolio/backend/app/core/security/social.py`
   - Provider routing: `provider_map` in social.py (Google implemented)

**JWT Configuration:**
- Issuer/Verification: Custom implementation in auth service
- Secret key: `secret_key` env var (production required - validation enforced)
- Refresh key: `authjwt_refresh_key` env var
- Access token expiry: `token_expire_minutes` (default: 30 minutes)
- Refresh token expiry: `refresh_token_expire_minutes` (default: 60 minutes)

**Authorization:**
- Role-based access control (RBAC)
  - Roles: Admin role and custom roles
  - Setup: `/home/alejandro-jordan/Documents/Personal/Code/portfolio/backend/app/db/db_manager.py` - `create_admin_role()`
  - Default admin users: `admin_users` env var (pipe-delimited list)

**Frontend Auth Storage:**
- Auth context: `/home/alejandro-jordan/Documents/Personal/Code/portfolio/frontend/src/contexts/auth/AuthContext.tsx`
- Token handling: Manual JWT decoding and Bearer auth headers
  - Decode function: `/home/alejandro-jordan/Documents/Personal/Code/portfolio/frontend/src/api/helpers.ts` - `decodeToken()`
  - Applied to all requests: `Authorization: Bearer {token}`

## Email & Communications

**SMTP Service:**
- Provider: SendGrid (default, configurable)
- Host: `smtp.sendgrid.net` (default via `smtp_host`)
- Port: 587 (default via `smtp_port`)
- TLS: Enabled by default (`smtp_tls`)
- SSL: Optional (`smtp_ssl`)
- Auth: `smtp_user`, `smtp_password` env vars
- Enabled: `emails_enabled` env var

**Email Types:**
1. Welcome email - New user registration
2. Password reset - Account recovery
3. Magic link - Passwordless login

**Email Service:**
- Implementation: `/home/alejandro-jordan/Documents/Personal/Code/portfolio/backend/app/services/email/email.py`
- Template engine: Jinja2
- Template location: `/home/alejandro-jordan/Documents/Personal/Code/portfolio/backend/app/services/email/email-templates/built/`
- Async execution: ThreadPoolExecutor for SMTP operations
- Background tasks: `/home/alejandro-jordan/Documents/Personal/Code/portfolio/backend/app/tasks/background_tasks.py`
  - `send_welcome_email_task()`
  - `send_reset_password_email_task()`
  - `send_magic_link_email_task()`

## Monitoring & Observability

**Error Tracking:**
- Custom exception handlers: `/home/alejandro-jordan/Documents/Personal/Code/portfolio/backend/app/core/exception_handlers.py`
  - HTTP exceptions
  - Validation errors
  - Rate limit exceeded
  - Pydantic validation errors
  - General exceptions
- No external error tracking service (Sentry, etc.) detected

**Logs:**
- Framework: loguru
  - Setup: `/home/alejandro-jordan/Documents/Personal/Code/portfolio/backend/app/core/logging_config.py`
  - Access logging: Middleware in `/home/alejandro-jordan/Documents/Personal/Code/portfolio/backend/app/main.py`
  - Request ID tracking: Unique `x-request-id` per request via middleware
  - Location: `/home/alejandro-jordan/Documents/Personal/Code/portfolio/backend/app/core/middleware.py`

**Health Checks:**
- Endpoints:
  - `GET /health` - Overall health (checks database)
  - `GET /health/ready` - Readiness probe (K8s compatible)
  - `GET /health/live` - Liveness probe (K8s compatible)
- Implementation: `/home/alejandro-jordan/Documents/Personal/Code/portfolio/backend/app/main.py`
- Database health check: `/home/alejandro-jordan/Documents/Personal/Code/portfolio/backend/app/utills/health_checks.py`

## Rate Limiting & API Protection

**Rate Limiting:**
- Framework: slowapi
- Implementation: `/home/alejandro-jordan/Documents/Personal/Code/portfolio/backend/app/main.py`
- Key function: Remote IP address (`get_remote_address`)
- Used in:
  - Auth endpoints: `/home/alejandro-jordan/Documents/Personal/Code/portfolio/backend/app/api/v1/auth/endpoints.py`
  - User endpoints: `/home/alejandro-jordan/Documents/Personal/Code/portfolio/backend/app/api/v1/user/endpoints.py`

**CORS:**
- Origin whitelist: `cors_origins` env var (comma-delimited list)
- Default: `http://localhost:3000,http://localhost:5173,*`
- Credentials: Allowed
- Methods: All (`*`)
- Headers: All (`*`)
- Middleware: Starlette CORSMiddleware in FastAPI setup

## CI/CD & Deployment

**Hosting:**
- Self-hosted capable (no vendor lock-in detected)
- Docker ready: `/home/alejandro-jordan/Documents/Personal/Code/portfolio/backend/Dockerfile` present
- Health check endpoints for container orchestration (K8s)

**CI Pipeline:**
- GitHub Actions present: `.github/` directory
- No webhook integrations detected in codebase

**Deployment Configuration:**
- Environment: Dev/Prod mode auto-detection based on connection string
- Production validation: Enforces non-default values for `secret_key`, `authjwt_refresh_key`, `user_default_password`
- Server: Uvicorn ASGI server
- Reload: Enabled in development (app.py)

## Environment Configuration

**Required env vars - Core:**
- `DB_CONN_STR` - MongoDB connection string
- `DB_NAME` - Database name
- `SECRET_KEY` - JWT secret (production: must differ from default)
- `AUTHJWT_REFRESH_KEY` - Refresh token secret (production: must differ from default)

**Required env vars - Email:**
- `SMTP_HOST` - Default: smtp.sendgrid.net
- `SMTP_USER` - Default: apikey (for SendGrid)
- `SMTP_PASSWORD` - API key for SMTP provider
- `EMAILS_FROM_EMAIL` - Sender email address
- `EMAILS_FROM_NAME` - Sender display name

**Required env vars - Security:**
- `ADMIN_USERS` - Comma or pipe-delimited admin email list
- `USER_DEFAULT_PASSWORD` - Initial admin password (production: must differ from default)
- `GOOGLE_CLIENT_ID` - OAuth client ID

**Optional env vars - Feature Flags:**
- `ALLOW_NEW_USERS` - Default: true
- `MAGIC_LINK_ENABLED` - Default: true
- `EMAILS_ENABLED` - Default: true

**Optional env vars - Configuration:**
- `APP_NAME` - Default: "your_backend_app"
- `APP_DOMAIN` - Default: http://localhost:5151
- `MOUNT_POINT` - Default: v1
- `CORS_ORIGINS` - Default: localhost origins + *
- `TOKEN_EXPIRE_MINUTES` - Default: 30
- `REFRESH_TOKEN_EXPIRE_MINUTES` - Default: 60
- `EMAIL_RESET_TOKEN_EXPIRE_MINUTES` - Default: 60
- `MAGIC_LINK_REFRESH_SECONDS` - Default: 60

**Frontend env vars:**
- `VITE_API_URL` - Backend API base URL (default: http://localhost:8000)

**Secrets location:**
- Backend: `.env` file (git-ignored, never committed)
- Frontend: Vite `.env` files (project-specific environment config)

## Webhooks & Callbacks

**Incoming:**
- No incoming webhooks detected (email provider callbacks, etc.)
- Auth callbacks: OAuth redirect URIs configured at provider level

**Outgoing:**
- No outgoing webhooks to external services detected
- Background task completion: Internal only (async tasks in FastAPI)

---

*Integration audit: 2026-02-22*
