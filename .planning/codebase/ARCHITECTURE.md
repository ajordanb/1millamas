# Architecture

**Analysis Date:** 2026-02-22

## Pattern Overview

**Overall:** Client-Server Microservices with Monolithic Tiers

**Key Characteristics:**
- Separated frontend (React SPA) and backend (FastAPI) applications
- Frontend uses file-based routing with TanStack Router
- Backend uses API versioning (v1) with layered request handlers
- Token-based authentication (JWT) with refresh token flow
- MongoDB for persistent storage with async motor driver
- Context-based global state management in frontend

## Layers

**Frontend UI Layer:**
- Purpose: Render user interface components and handle presentation logic
- Location: `frontend/src/components/`, `frontend/src/routes/`
- Contains: React functional components, UI primitives (Button, Input, Textarea, Label), route definitions
- Depends on: React, TailwindCSS, Lucide icons
- Used by: Routes and parent components

**Frontend Integration Layer:**
- Purpose: Manage third-party library setup and configuration
- Location: `frontend/src/integrations/tanstack-query/`
- Contains: QueryClient configuration, TanStack React Query provider
- Depends on: React Query, React
- Used by: Main application initialization in `main.tsx`

**Frontend Context/State Layer:**
- Purpose: Manage global application state and authentication context
- Location: `frontend/src/contexts/auth/`
- Contains: AuthContext, authentication state, token management
- Depends on: React Context API, localStorage for token persistence
- Used by: Routes and components requiring auth state

**Frontend API Layer:**
- Purpose: Provide HTTP client functions and typed API interfaces
- Location: `frontend/src/api/`
- Contains: Helper functions (`_getRequest`, `_postRequest`, `_putRequest`, `_deleteRequest`), API models, endpoint definitions
- Depends on: Fetch API, Token management from AuthContext
- Used by: Components and routes needing backend data

**Frontend Data Layer:**
- Purpose: Store static portfolio and configuration data
- Location: `frontend/src/data/portfolio.ts`
- Contains: Static content for portfolio display, projects, journey, education
- Depends on: Nothing
- Used by: Route components for rendering

**Backend FastAPI Application:**
- Purpose: Main application entry point and configuration
- Location: `backend/app/main.py`
- Contains: FastAPI instance creation, middleware setup, exception handlers, route registration, lifespan management
- Depends on: FastAPI, database manager, configuration
- Used by: Uvicorn ASGI server

**Backend Core Layer:**
- Purpose: Cross-cutting concerns and infrastructure
- Location: `backend/app/core/`
- Contains: Configuration management, security (password hashing, JWT), logging, exception handlers, middleware, request ID tracking
- Depends on: Pydantic, Loguru, Passlib, cryptography
- Used by: All API layers and main application

**Backend Database Layer:**
- Purpose: Database connection management and lifecycle
- Location: `backend/app/db/db_manager.py`
- Contains: AsyncIO MongoDB client setup, connection pooling, health checks, Beanie ODM initialization
- Depends on: Motor (async MongoDB driver), Beanie ODM
- Used by: Application lifespan, services

**Backend Models Layer:**
- Purpose: Define data structures and business entities
- Location: `backend/app/models/`
- Contains: Pydantic models for User, Role, Auth, MagicLink; database documents using Beanie; request/response schemas
- Depends on: Pydantic, Beanie, PyMongo
- Used by: Services, endpoints, serialization

**Backend Services Layer:**
- Purpose: Business logic and domain operations
- Location: `backend/app/services/`
- Contains: AuthService (token creation/validation), UserService (CRUD operations), RoleService, EmailService
- Depends on: Models, security utilities, email transport
- Used by: API endpoints

**Backend API Router Layer:**
- Purpose: HTTP request handling and routing
- Location: `backend/app/api/v1/`
- Contains: Endpoints for auth, user, role, magic link functionality
- Depends on: FastAPI routing, services, models
- Used by: FastAPI application root

**Backend Background Tasks Layer:**
- Purpose: Asynchronous operations outside request/response cycle
- Location: `backend/app/tasks/`
- Contains: Email sending tasks (welcome, password reset, magic link)
- Depends on: Services, FastAPI BackgroundTasks
- Used by: Services and endpoints

**Backend Utilities Layer:**
- Purpose: Helper functions and common utilities
- Location: `backend/app/utills/` (note: typo in directory name)
- Contains: Database health checks, dependency injection, token validation
- Depends on: Models, services, security
- Used by: Endpoints, middleware, lifespan handlers

## Data Flow

**Authentication Flow:**

1. User submits credentials via login endpoint (`POST /v1/auth/token`)
2. AuthService validates credentials via `password_authenticated_user()` or `client_id_authenticated_user()`
3. User roles and scopes retrieved via `User.get_user_scopes_and_roles()`
4. AuthService creates access token and refresh token (JWT format)
5. Tokens returned in RefreshToken response model
6. Frontend decodes token via `decodeToken()` and stores in localStorage
7. Subsequent requests include Authorization header with Bearer token

**User Retrieval Flow:**

1. Frontend calls `GET /v1/user/me` with Authorization header
2. Endpoint dependency `validate_token()` extracts and validates JWT
3. UserService queries User document from MongoDB by email
4. User document includes references to Role documents
5. UserService fetches related roles via `user.user_roles()`
6. Response returns UserOut model with populated roles
7. Frontend stores in React Query cache and AuthContext

**Request Processing Flow:**

1. HTTP request arrives at FastAPI application
2. RequestIDMiddleware assigns unique request ID to `request.state.request_id`
3. CORSMiddleware allows cross-origin requests based on configuration
4. Slowapi rate limiter checks request quota (e.g., 10/minute on auth endpoints)
5. FastAPI dependency injection resolves handler dependencies (services, auth state)
6. Handler business logic executes via service layer
7. Response is serialized via Pydantic model validators
8. Access log middleware records request metadata with request ID
9. Exception handlers catch and format errors with appropriate HTTP status codes

**State Management Flow (Frontend):**

1. AuthContext initialized on app startup with stored token from localStorage
2. User logs in, token stored in context and localStorage
3. React Query QueryProvider manages server state with 5-minute stale time
4. Components use query hooks to fetch data, cached for performance
5. On logout, token removed from context and localStorage cleared

## Key Abstractions

**Authentication & Authorization:**
- Purpose: Manage user identity and permissions
- Examples: `backend/app/core/security/`, `backend/app/models/auth/model.py`, `frontend/src/contexts/auth/`
- Pattern: JWT-based with refresh tokens; role-based access control (RBAC) with scopes

**Database Document:**
- Purpose: Persist domain entities as MongoDB documents
- Examples: `backend/app/models/user/model.py` (User), `backend/app/models/role/model.py` (Role)
- Pattern: Beanie ODM wrapping Pydantic for async query interface and validation

**Service Layer:**
- Purpose: Encapsulate business logic away from HTTP concerns
- Examples: `backend/app/services/user/user_service.py`, `backend/app/services/auth/auth_service.py`
- Pattern: Dependency injection via FastAPI, async/await for I/O operations

**API Request Helper:**
- Purpose: Standardize HTTP calls and token injection
- Examples: `frontend/src/api/helpers.ts` (_getRequest, _postRequest, _putRequest, _deleteRequest)
- Pattern: Token passed explicitly to each function; error extraction from response.detail

**Data Container (Portfolio):**
- Purpose: Decouple static content from component logic
- Examples: `frontend/src/data/portfolio.ts`
- Pattern: Single TypeScript object exporting profile, projects, journey, education arrays

## Entry Points

**Frontend SPA Entry Point:**
- Location: `frontend/src/main.tsx`
- Triggers: Browser loads `index.html`, Vite executes main.tsx
- Responsibilities: Render React root, initialize providers (QueryProvider, AuthProvider), setup router

**Frontend Router Entry Point:**
- Location: `frontend/src/router.tsx`
- Triggers: Called from main.tsx during initialization
- Responsibilities: Create TanStack Router instance with route tree, configure scroll restoration, preload settings

**Frontend Route Handler:**
- Location: `frontend/src/routes/__root.tsx`, `frontend/src/routes/index.tsx`
- Triggers: Router resolves path and renders matched route component
- Responsibilities: Display page-specific UI, call API handlers, manage local state

**Backend ASGI Entry Point:**
- Location: `backend/app.py`
- Triggers: `uvicorn run "app.main:app" ... reload=True`
- Responsibilities: Start Uvicorn server, expose ASGI application

**Backend FastAPI Instance:**
- Location: `backend/app/main.py` - `create_app()` function and `app` instance
- Triggers: Called by Uvicorn or imported by test suites
- Responsibilities: Configure FastAPI with middleware, exception handlers, lifespan, route registration

**Backend API Routes:**
- Location: `backend/app/api/v1/auth/endpoints.py`, `backend/app/api/v1/user/endpoints.py`, `backend/app/api/v1/role/endpoints.py`
- Triggers: HTTP requests to `/v1/auth/*`, `/v1/user/*`, `/v1/role/*` paths
- Responsibilities: Parse request, validate via dependencies, call services, return responses

**Backend Health Check Endpoint:**
- Location: `backend/app/main.py` - `/health`, `/health/ready`, `/health/live` routes
- Triggers: Liveness/readiness probes or monitoring systems
- Responsibilities: Check database connectivity, return health status

## Error Handling

**Strategy:** Layered exception handling with custom handlers and HTTP status codes

**Patterns:**

**FastAPI Validation Errors:**
- Caught by `validation_exception_handler` in `backend/app/core/exception_handlers.py`
- Returns 422 Unprocessable Entity with detail list of field errors
- Pydantic validation errors also caught by `pydantic_validation_handler`

**HTTPException (Starlette):**
- Caught by `http_exception_handler`
- Returns status code and detail message from exception
- Used throughout endpoints (e.g., 401 Unauthorized, 403 Forbidden, 404 Not Found)

**Rate Limit Exceeded:**
- Caught by `rate_limit_handler`
- Returns 429 Too Many Requests
- Triggered by Slowapi limiter when endpoint quota exceeded

**Unhandled Exceptions:**
- Caught by `general_exception_handler`
- Returns 500 Internal Server Error with generic message
- Logs full exception traceback via Loguru

**Frontend API Errors:**
- Extracted from response.detail, response.message, or response.error.message
- Thrown as Error objects with descriptive messages
- Caught in component try/catch or React Query retry logic

## Cross-Cutting Concerns

**Logging:**
- Framework: Loguru
- Pattern: Configured in `backend/app/core/logging_config.py`, logger obtained via `get_logger()`
- Usage: Debug logs on app startup/shutdown, info logs for database connection, access logs for all requests, warning logs for health check failures, error logs for exception handling

**Validation:**
- Framework: Pydantic v2
- Pattern: Model validation occurs on FastAPI endpoint parameter deserialization; service layer may perform additional business logic validation
- Frontend: Form validation via browser HTML5 attributes (required, type="email")

**Authentication:**
- Pattern: JWT tokens created by AuthService; validated by dependency `validate_token()` before endpoint execution
- Token includes subject (email) and optional client_id for API keys
- Refresh tokens stored client-side in localStorage; access tokens short-lived (30 minutes default)

**Rate Limiting:**
- Framework: Slowapi
- Pattern: `@limiter.limit("10/minute")` decorator on sensitive endpoints (auth, user creation)
- Key function: `get_remote_address` - rate limits by IP address

**CORS:**
- Framework: Starlette CORSMiddleware
- Pattern: Configured in main.py with `settings.cors_origins_list`
- Default: Allows localhost:3000 and localhost:5173 for development

**Database Connection Management:**
- Pattern: Singleton `db_manager` instance created in `backend/app/db/db_manager.py`
- Lifecycle: Connected in FastAPI lifespan startup, disconnected in shutdown
- Access: Via `app.state.db` during request handling

---

*Architecture analysis: 2026-02-22*
