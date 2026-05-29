# Codebase Structure

**Analysis Date:** 2026-02-22

## Directory Layout

```
portfolio/
├── backend/                    # FastAPI backend application
│   ├── app/                    # Main application package
│   │   ├── api/               # API routers and endpoints
│   │   │   └── v1/            # API version 1
│   │   │       ├── auth/      # Authentication endpoints
│   │   │       ├── user/      # User endpoints
│   │   │       ├── role/      # Role endpoints
│   │   │       ├── magic_link/# Magic link endpoints
│   │   │       └── util/      # Utility endpoints
│   │   ├── core/              # Cross-cutting concerns
│   │   │   ├── config.py      # Settings management
│   │   │   ├── exception_handlers.py # Error handling
│   │   │   ├── logging_config.py    # Logging setup
│   │   │   ├── middleware.py  # Custom middleware
│   │   │   └── security/      # Password hashing, JWT, OAuth
│   │   ├── db/                # Database management
│   │   │   └── db_manager.py  # MongoDB connection & lifecycle
│   │   ├── models/            # Data models (Pydantic/Beanie)
│   │   │   ├── auth/          # Authentication models
│   │   │   ├── user/          # User entity
│   │   │   ├── role/          # Role entity
│   │   │   ├── magic_link/    # Magic link models
│   │   │   └── util/          # Shared models
│   │   ├── services/          # Business logic
│   │   │   ├── auth/          # Auth service
│   │   │   ├── user/          # User service
│   │   │   ├── role/          # Role service
│   │   │   └── email/         # Email service
│   │   ├── tasks/             # Background tasks
│   │   ├── utills/            # Utilities & helpers
│   │   ├── docs/              # API documentation
│   │   └── main.py            # FastAPI app setup
│   ├── app.py                 # Uvicorn entry point
│   ├── pyproject.toml         # Python dependencies
│   ├── uv.lock                # Dependency lock file
│   └── tools/                 # Management tools
│
├── frontend/                  # React SPA
│   ├── src/                   # Source code
│   │   ├── api/               # API layer
│   │   │   ├── auth/          # Auth API functions
│   │   │   ├── user/          # User API functions
│   │   │   ├── role/          # Role API functions
│   │   │   ├── helpers.ts     # HTTP helper functions
│   │   │   ├── apiUrl.ts      # API base URL config
│   │   │   └── api.ts         # API exports
│   │   ├── components/        # Reusable React components
│   │   │   └── ui/            # UI primitives (Button, Input, etc.)
│   │   ├── contexts/          # React contexts for global state
│   │   │   └── auth/          # Authentication context
│   │   ├── data/              # Static data
│   │   │   └── portfolio.ts   # Portfolio content
│   │   ├── hooks/             # Custom React hooks
│   │   ├── integrations/      # Third-party library setup
│   │   │   └── tanstack-query/# React Query configuration
│   │   ├── lib/               # Utility functions
│   │   │   └── utils.ts       # Shared utilities
│   │   ├── routes/            # TanStack Router routes
│   │   │   ├── __root.tsx     # Root layout
│   │   │   └── index.tsx      # Home page
│   │   ├── assets/            # Static assets
│   │   │   └── images/        # Image files
│   │   ├── main.tsx           # React entry point
│   │   ├── router.tsx         # Router configuration
│   │   ├── routeTree.gen.ts   # Auto-generated route tree
│   │   └── styles.css         # Global styles
│   ├── public/                # Static assets served as-is
│   ├── dist/                  # Built output
│   ├── package.json           # npm dependencies
│   ├── vite.config.ts         # Vite build config
│   ├── tsconfig.json          # TypeScript config
│   ├── eslint.config.mjs      # ESLint rules
│   └── prettier.config.mjs    # Code formatting rules
│
├── .planning/                 # GSD documentation
│   └── codebase/             # Codebase analysis docs
│
├── .github/                   # GitHub configuration
│   └── workflows/            # CI/CD workflows
│
└── .vscode/                   # VS Code settings
```

## Directory Purposes

**backend/**
- Purpose: FastAPI REST API application
- Contains: Python source code, configuration, dependencies
- Key files: `app/main.py` (FastAPI setup), `app.py` (server entry point), `pyproject.toml` (dependencies)

**backend/app/**
- Purpose: Main Python package
- Contains: All application code organized by layer
- Key files: `main.py` (FastAPI instance), `__init__.py` (package marker)

**backend/app/api/v1/**
- Purpose: API versioning container
- Contains: Routers for each resource (auth, user, role, magic_link)
- Key files: `*/endpoints.py` files with route handlers

**backend/app/core/**
- Purpose: Shared infrastructure and configuration
- Contains: Security utilities, logging setup, exception handlers, middleware
- Key files: `config.py` (settings), `security/` (password/JWT), `exception_handlers.py`

**backend/app/db/**
- Purpose: Database layer
- Contains: MongoDB connection management via Motor async driver and Beanie ODM
- Key files: `db_manager.py` (DatabaseManager singleton)

**backend/app/models/**
- Purpose: Data model definitions
- Contains: Pydantic models for validation, Beanie documents for MongoDB storage
- Key files: `user/model.py`, `role/model.py`, `auth/model.py`

**backend/app/services/**
- Purpose: Business logic encapsulation
- Contains: Service classes with methods for CRUD and domain operations
- Key files: `user/user_service.py`, `auth/auth_service.py`, `email/email.py`

**backend/app/tasks/**
- Purpose: Background job execution
- Contains: Functions for async operations (email sending)
- Key files: `background_tasks.py`

**backend/app/utills/**
- Purpose: Helper utilities and dependencies
- Contains: Health checks, dependency injection functions, token validation
- Key files: `health_checks.py`, `dependencies.py`

**frontend/**
- Purpose: React single-page application
- Contains: TypeScript/TSX source, build configuration, styling
- Key files: `src/main.tsx` (React entry), `src/router.tsx` (routing), `package.json` (dependencies)

**frontend/src/api/**
- Purpose: Backend communication layer
- Contains: HTTP helper functions, API endpoints by resource
- Key files: `helpers.ts` (fetch wrappers), `apiUrl.ts` (configuration), `*/model.ts` (types)

**frontend/src/components/**
- Purpose: Reusable UI components
- Contains: React functional components for portfolio display
- Key files: `ProjectCard.tsx`, `Pill.tsx`, `SectionHeading.tsx`, `ui/` (primitives)

**frontend/src/contexts/**
- Purpose: Global state management
- Contains: React context providers and hooks
- Key files: `auth/AuthContext.tsx` (authentication state)

**frontend/src/routes/**
- Purpose: Page-level components for file-based routing
- Contains: TanStack Router route definitions
- Key files: `__root.tsx` (layout), `index.tsx` (home page)

**frontend/src/integrations/**
- Purpose: Third-party library initialization
- Contains: Configuration for React Query, Apollo, etc.
- Key files: `tanstack-query/QueryProvider.tsx`

**frontend/src/data/**
- Purpose: Static content and constants
- Contains: Portfolio information, project definitions
- Key files: `portfolio.ts`

**frontend/src/lib/**
- Purpose: Shared utility functions
- Contains: Helper functions for common operations
- Key files: `utils.ts`

## Key File Locations

**Entry Points:**
- `backend/app.py`: Python ASGI entry point (run with Uvicorn)
- `backend/app/main.py`: FastAPI application factory and configuration
- `frontend/src/main.tsx`: React DOM render and provider setup
- `frontend/src/router.tsx`: TanStack Router creation
- `frontend/public/index.html`: HTML template for SPA

**Configuration:**
- `backend/app/core/config.py`: Environment-based settings via Pydantic
- `frontend/.env.example`: Example environment variables
- `frontend/vite.config.ts`: Build and dev server configuration
- `frontend/tsconfig.json`: TypeScript compiler options

**Core Logic:**
- `backend/app/services/user/user_service.py`: User CRUD and business logic
- `backend/app/services/auth/auth_service.py`: Authentication and token management
- `backend/app/api/v1/auth/endpoints.py`: Login and token endpoints
- `frontend/src/contexts/auth/AuthContext.tsx`: Global authentication state

**Testing:**
- `frontend/vitest.config.ts`: Vitest test runner configuration
- `frontend/src/**/*.test.tsx`: Test files (co-located pattern)
- `backend/tests/`: Python test files

**Styling:**
- `frontend/src/styles.css`: Global CSS with Tailwind directives
- `frontend/tailwind.config.ts`: Tailwind CSS configuration
- `frontend/src/components/ui/`: Styled UI component library

## Naming Conventions

**Files:**
- TypeScript/React files: `camelCase.tsx` for components, `camelCase.ts` for utilities
- Python files: `snake_case.py` for all files
- Models: `model.py` for data definitions, `endpoints.py` for routes
- Tests: `*.test.tsx` (frontend), `test_*.py` (backend)
- Config files: `config.ts`, `config.mjs`, `config.json`

**Directories:**
- Feature directories (frontend): `lowercase` (e.g., `components`, `routes`, `api`)
- Version directories (backend): `v1` for API versioning
- Service directories: Named after domain entity (e.g., `user`, `auth`, `role`)
- React components: PascalCase export names matching file name (e.g., `ProjectCard.tsx` exports `ProjectCard`)

**Functions & Variables:**
- Frontend: camelCase functions, UPPERCASE constants
- Backend: snake_case functions, UPPERCASE constants for config
- React hooks: `use*` prefix (custom hooks in `hooks/`)
- API helpers: Underscore prefix for private functions (`_getRequest`, `_postRequest`)

**Types & Interfaces:**
- React: Props interfaces named `{ComponentName}Props`
- API models: Named by entity and use case (e.g., `UserOut`, `CreateAPIKey`, `UpdateAPIKey`)
- Pydantic: Full capitalization (e.g., `User`, `Role`, `Token`)
- TypeScript enums: PascalCase values

## Where to Add New Code

**New Feature (API Endpoint):**
- Primary code: `backend/app/api/v1/{resource}/endpoints.py` (route handler)
- Service logic: `backend/app/services/{resource}/{resource}_service.py`
- Data model: `backend/app/models/{resource}/model.py`
- Tests: `backend/tests/test_v1_{resource}_endpoints.py`

**New Component (React):**
- Implementation: `frontend/src/components/{ComponentName}.tsx`
- Tests: `frontend/src/components/{ComponentName}.test.tsx`
- Styles: Inline via Tailwind className or in `styles.css` if global
- If reusable UI primitive: Place in `frontend/src/components/ui/`

**New Route (Frontend Page):**
- Route definition: `frontend/src/routes/{pageName}.tsx`
- Auto-registered via TanStack Router file-based routing
- Access via `Link` component or programmatic navigation

**New Service (Backend):**
- Service class: `backend/app/services/{domain}/{domain}_service.py`
- Initialize in dependency injection: `backend/app/utills/dependencies.py`
- Use in endpoint handlers: Inject via `Depends(get_{service_name})`

**Shared Utilities:**
- Frontend: `frontend/src/lib/utils.ts` or create `frontend/src/hooks/{name}.ts`
- Backend: `backend/app/utills/{module}.py`

**Static Content:**
- Portfolio data: `frontend/src/data/portfolio.ts`
- Environment config: `.env` file or `backend/app/core/config.py` for backend

## Special Directories

**backend/.venv/:**
- Purpose: Python virtual environment
- Generated: Yes (created by `pip` or `uv`)
- Committed: No (in `.gitignore`)

**backend/.idea/:**
- Purpose: PyCharm IDE configuration
- Generated: Yes
- Committed: No (in `.gitignore`)

**frontend/node_modules/:**
- Purpose: npm package dependencies
- Generated: Yes (created by `npm install` or `pnpm install`)
- Committed: No (in `.gitignore`)

**frontend/dist/:**
- Purpose: Built production output
- Generated: Yes (created by `npm run build`)
- Committed: No (in `.gitignore`)

**frontend/.tanstack/tmp/:**
- Purpose: TanStack Router temporary route tree generation
- Generated: Yes (created by router plugin)
- Committed: No (in `.gitignore`)

**.planning/codebase/:**
- Purpose: GSD architecture documentation
- Generated: No (manually created)
- Committed: Yes (source of truth for architecture decisions)

---

*Structure analysis: 2026-02-22*
