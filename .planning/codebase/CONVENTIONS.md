# Coding Conventions

**Analysis Date:** 2026-02-22

## Naming Patterns

**Files:**
- React components: PascalCase (e.g., `ProjectCard.tsx`, `ExpandButton.tsx`)
- Services and utilities: camelCase (e.g., `user_service.py`, `helpers.ts`)
- Python models: PascalCase (e.g., `User`, `UserAuth`, `Role`)
- Constants: UPPER_SNAKE_CASE (e.g., `PREVIEW_LIMIT = 2`)
- Routes: kebab-case in URL paths, PascalCase in filenames (e.g., `index.tsx` for `/`)

**Functions:**
- React/TypeScript: camelCase (e.g., `handleSubmit`, `useLocalStorage`, `decodeToken`)
- Python: snake_case (e.g., `get_user_by_email`, `create_user`, `send_magic_link`)
- Async functions: prefix optional, use `async def` for Python coroutines
- Internal/private functions: prefix with underscore in Python (e.g., `_format_validation_errors`, `_get_request_id`)

**Variables:**
- React/TypeScript: camelCase (e.g., `accessToken`, `userRoles`, `isAuthenticated`)
- Python: snake_case (e.g., `db_conn_str`, `email_service`, `hashed_password`)
- Booleans: prefix with `is`, `has`, `can` (e.g., `isAuthenticated`, `hasRole`, `canDelete`)

**Types:**
- React/TypeScript: PascalCase interfaces and types (e.g., `AuthContextType`, `TokenData`, `SocialLoginParams`)
- Python Pydantic models: PascalCase (e.g., `UserBase`, `UpdatePassword`, `APIKey`)
- Python enums: PascalCase class, UPPER_CASE members (e.g., `class Mode(str, Enum)` with `Mode.dev`)

## Code Style

**Formatting:**
- **Prettier** for TypeScript/JavaScript
  - `semi: false` - no semicolons at end of statements
  - `singleQuote: true` - single quotes for strings
  - `trailingComma: "all"` - trailing commas in multi-line structures

**Linting:**
- **ESLint** with `@tanstack/eslint-config` in frontend
  - Disabled rules: `import/no-cycle`, `import/order`, `sort-imports`, `@typescript-eslint/array-type`, `@typescript-eslint/require-await`
  - Uses TypeScript parser and strict type checking

- **Python**: No explicit linter configured (relies on type hints via Pydantic)
  - Type hints are mandatory for Pydantic models and function signatures

## Import Organization

**Order:**
1. React and third-party libraries (e.g., `import { useState } from 'react'`)
2. TanStack libraries (e.g., `@tanstack/react-router`, `@tanstack/react-query`)
3. Project imports using path aliases (e.g., `@/components`, `@/api`)
4. Relative imports (rarely used)

**Path Aliases:**
- Frontend TypeScript: `@/*` resolves to `./src/*` (configured in `tsconfig.json`)
- Example: `import { cn } from '@/lib/utils'` instead of `import { cn } from '../../../lib/utils'`

**Python:**
- Explicit imports using absolute paths from app root
- Example: `from app.core.config import settings` not `from .config import settings`

## Error Handling

**Frontend (React/TypeScript):**
- Use try-catch blocks around async operations
- Throw `Error` objects with descriptive messages
- Extract error messages from API responses: `data.detail || data.message || data.error?.message`
- Log errors to console: `console.error('message:', error)`
- Example pattern in `AuthContext.tsx`:
  ```typescript
  try {
    const response = await _jsonPostRequest('auth/social_login', { provider, data });
    handleAuthenticationResponse(response);
  } catch (error) {
    console.error('Authentication failed:', error);
    logout();
    throw error;
  }
  ```

**Backend (FastAPI/Python):**
- Use FastAPI's `HTTPException` for API responses with proper status codes
- Custom exception handlers in `app/core/exception_handlers.py`:
  - `http_exception_handler`: Handles HTTP exceptions
  - `validation_exception_handler`: Formats Pydantic validation errors
  - `rate_limit_handler`: Returns 429 with Retry-After header
  - `general_exception_handler`: Catches unhandled exceptions
  - `pydantic_validation_handler`: Handles internal validation errors
- Return structured error responses:
  ```python
  {
    "error": {
      "code": 400,
      "message": "User validation error",
      "path": "/api/v1/user",
      "request_id": "uuid-string",
      "details": [{"field": "email", "message": "...", "type": "..."}]
    }
  }
  ```
- Log sensitive errors in production with redaction of auth headers

## Logging

**Framework:** `loguru` for Python backend

**Patterns:**
- Development mode: Human-readable colored output to stdout
- Production mode: JSON format for structured logging to stdout
- Log levels: DEBUG (dev), INFO/WARNING/ERROR (both modes)
- Use `logger.info()`, `logger.warning()`, `logger.error()` with `extra={}` for context
- Sanitize sensitive keys in logs: `authorization`, `cookie`, `x-service-psk`, `x-api-key`, `password`, `token`, `secret`
- Include request_id in all error logs for request tracing
- Example from `user_service.py`:
  ```python
  logger.warning(
    f"Validation error on {request.method} {path}: {errors!r}",
    extra={"path": path, "errors": errors, "request_id": request_id}
  )
  ```

**Frontend:**
- Use `console.error()`, `console.warn()`, `console.log()` for debugging
- No structured logging library used

## Comments

**When to Comment:**
- Document complex algorithms or non-obvious logic
- Mark incomplete implementations: `// TODO: wire up a real submission target`
- Explain business logic intent, not what the code does
- Section dividers for large blocks: `/* --- Opener --- */` (see `index.tsx`)

**JSDoc/TSDoc:**
- Python docstrings: Use triple quotes with structured documentation
  - Include Attributes, Returns, Raises sections
  - Example from `config.py`:
    ```python
    """
    Application settings configuration.

    Attributes:
        app_name: The app name, open to anything
        db_name: db_name to be used to create the app mongo database
    """
    ```

## Function Design

**Size:**
- Keep functions focused on single responsibility
- Example: `handleAuthenticationResponse()` only handles auth state updates
- Longer endpoints (189 lines in `user/endpoints.py`) are acceptable when grouping related routes

**Parameters:**
- React: Use object destructuring with type annotations
  ```typescript
  function ProjectCard({ project }: { project: Project })
  function ContactForm() // no params
  ```
- Python: Use type hints for all parameters
  - Use Pydantic models for complex inputs
  - Use `Depends()` for FastAPI dependency injection

**Return Values:**
- React: Return JSX.Element or React.ReactNode
- Python: Return Pydantic models, not raw dicts
  - Example: `async def create_user(...) -> UserBase:` returns model instance

## Module Design

**Exports:**
- React components exported as named exports from files
  - Example: `export function ProjectCard({ project }: { project: Project })`
- Python services exported as class instances for dependency injection
  - Example: `user_service: UserService = Depends(get_user_service)`

**Barrel Files:**
- Not widely used in frontend (except auto-generated `routeTree.gen.ts`)
- Python uses flat structure with explicit imports

**Project Structure Patterns:**
- Frontend: Feature-based organization
  - `components/` - reusable UI components
  - `routes/` - page components (TanStack Router auto-generated)
  - `api/` - API layer with models and service functions
  - `contexts/` - React context providers (auth, etc.)
  - `integrations/` - third-party library setup (TanStack Query)

- Backend: Layered architecture
  - `api/v1/` - route definitions with endpoint handlers
  - `services/` - business logic (UserService, AuthService, EmailService)
  - `models/` - Pydantic data models
  - `core/` - configuration, logging, exception handling, security
  - `db/` - database connection and management
  - `tasks/` - background tasks (email, etc.)
