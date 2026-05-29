# Testing Patterns

**Analysis Date:** 2026-02-22

## Test Framework

**Frontend Runner:**
- **Vitest** v3.0.5
- Config: `frontend/vitest` (inferred from vite.config.ts or default)
- Uses React Testing Library for component testing
- JSDOM environment for DOM simulation

**Assertion Library:**
- **Chai** (via `@types/chai`)
- Vitest provides expect() interface compatible with Jest

**Backend:**
- No test framework currently configured
- FastAPI provides `TestClient` from `starlette.testclient`
- Test suite not established in codebase

**Run Commands:**
```bash
# Frontend
npm run test              # Run tests (Vitest)
npm run lint             # Check ESLint rules
npm run format           # Check Prettier formatting
npm run check            # Format and lint in one pass

# Backend
# No test script defined - would need to be added
```

## Test File Organization

**Frontend - Location:**
- Co-located with source files (pattern recognized from devDependencies)
- Likely pattern: `Component.test.tsx` or `Component.spec.tsx` next to `Component.tsx`
- Example path would be: `src/components/ProjectCard.test.tsx`

**Frontend - Naming:**
- Test files: `*.test.ts`, `*.test.tsx`, `*.spec.ts`, `*.spec.tsx`

**Backend:**
- No test files currently in codebase
- Recommended structure: Create `tests/` directory at project root
- Tests would mirror `app/` structure: `tests/api/v1/user/test_endpoints.py`

**Structure:**
```
frontend/
├── src/
│   ├── components/
│   │   ├── ProjectCard.tsx
│   │   ├── ProjectCard.test.tsx
│   │   ├── Pill.tsx
│   │   └── Pill.test.tsx
│   ├── routes/
│   │   ├── index.tsx
│   │   └── index.test.tsx
│   ├── contexts/
│   │   └── auth/
│   │       ├── AuthContext.tsx
│   │       └── AuthContext.test.tsx
│   └── api/
│       └── helpers.test.ts

backend/
├── tests/
│   ├── conftest.py           # Shared fixtures
│   ├── api/
│   │   ├── v1/
│   │   │   ├── test_auth.py
│   │   │   ├── user/
│   │   │   │   └── test_user_endpoints.py
│   │   │   └── role/
│   │   │       └── test_role_endpoints.py
│   ├── services/
│   │   └── user/
│   │       └── test_user_service.py
│   └── models/
│       └── test_user_model.py
```

## Test Structure

**Frontend Pattern:**
- React Testing Library follows user-centric testing approach
- Import statements include React Testing Library utilities
- Setup would follow pattern:
  ```typescript
  import { render, screen } from '@testing-library/react';
  import { ProjectCard } from './ProjectCard';
  import type { Project } from '@/data/portfolio';

  describe('ProjectCard', () => {
    it('renders project title', () => {
      const project: Project = {
        title: 'Test Project',
        description: 'Test desc',
        tags: ['react']
      };

      render(<ProjectCard project={project} />);
      expect(screen.getByText('Test Project')).toBeInTheDocument();
    });
  });
  ```

**Backend Pattern (Recommended):**
- Use pytest with FastAPI TestClient
- Async test support via pytest-asyncio
- DI-friendly testing using FastAPI's `Depends()` override
- Structure:
  ```python
  import pytest
  from fastapi.testclient import TestClient
  from app.main import create_app

  @pytest.fixture
  def client():
      app = create_app()
      return TestClient(app)

  def test_create_user(client):
      response = client.post(
          "/api/v1/user/register",
          json={
              "email": "test@example.com",
              "password": "secure_pass",
              "roles": []
          }
      )
      assert response.status_code == 200
  ```

## Mocking

**Framework:** Vitest's built-in mocking via `vi` object

**Patterns (Recommended):**
```typescript
// Mock fetch for API calls
vi.mock('global', () => ({
  fetch: vi.fn()
}));

// Mock modules
vi.mock('@/api/helpers', () => ({
  _getRequest: vi.fn(),
  decodeToken: vi.fn()
}));

// Mock React Context
vi.mock('@/contexts/auth/AuthContext', () => ({
  AuthContext: {
    Provider: ({ children }: any) => children
  }
}));
```

**What to Mock:**
- Fetch/HTTP calls - use mocked responses instead of real API
- External services - database calls, email services, authentication providers
- Time-dependent operations - use `vi.useFakeTimers()` for date/timer testing
- File system operations (if any)
- Environment variables for testing configuration

**What NOT to Mock:**
- Internal utility functions - test real implementation (e.g., `cn()` helper)
- React component rendering - test actual DOM output
- Router integration - test actual navigation if possible
- Core business logic - test real implementations
- Data models and validators - test actual Pydantic validation

## Fixtures and Factories

**Frontend Test Data:**
- Keep test fixtures inline near tests (simple case)
- For complex shared data, create factory functions
- Example pattern (would be in test utilities):
  ```typescript
  // src/__tests__/fixtures.ts
  import type { Project } from '@/data/portfolio';

  export function createMockProject(overrides?: Partial<Project>): Project {
    return {
      title: 'Mock Project',
      description: 'Test description',
      tags: ['typescript', 'react'],
      ...overrides,
    };
  }

  // In test file
  import { createMockProject } from '@/__tests__/fixtures';

  it('renders custom title', () => {
    const project = createMockProject({ title: 'Custom' });
    render(<ProjectCard project={project} />);
  });
  ```

**Backend Test Data (Recommended):**
- Create pytest fixtures in `conftest.py` for shared setup
- Use factory patterns for complex models
- Example structure:
  ```python
  # tests/conftest.py
  import pytest
  from app.models.user.model import User, UserAuth

  @pytest.fixture
  async def sample_user():
      return User(
          email="test@example.com",
          password="hashed_password",
          name="Test User",
          roles=[]
      )

  @pytest.fixture
  async def sample_admin(sample_user):
      sample_user.roles = [...]
      return sample_user
  ```

**Location:**
- Frontend fixtures: `src/__tests__/fixtures.ts` or co-located in test files
- Backend fixtures: `tests/conftest.py` (pytest convention)

## Coverage

**Requirements:** Not enforced in codebase

**Configuration:**
- Vitest supports coverage via `vitest --coverage` command
- Backend would need coverage config addition (e.g., pytest-cov)

**View Coverage:**
```bash
# Frontend - if configured
npm run test -- --coverage

# Backend - would be
pytest --cov=app tests/
```

**Current State:**
- No coverage reporting configured
- Recommend setting target of 70%+ for critical paths (auth, services)

## Test Types

**Frontend Unit Tests:**
- Scope: Individual React components in isolation
- Approach: Render component, simulate user interactions, assert DOM output
- Example areas:
  - `ProjectCard` - renders props correctly, handles variants
  - `Pill` - renders with correct variant styles
  - `cn()` utility - merges Tailwind classes correctly
- Use React Testing Library for user-centric assertions

**Frontend Integration Tests:**
- Scope: Multiple components working together with routing/state
- Approach: Render full page or route, test data flow between components
- Example areas:
  - Home page with all slides rendered
  - Context providers with child components
  - API integration with auth context

**Backend Unit Tests (Not yet implemented, recommended):**
- Scope: Individual service methods and model methods
- Approach: Call methods directly, mock dependencies, assert return values
- Example areas:
  - `UserService.create_user()` - validates inputs, creates user, sends email task
  - `User.by_email()` - queries database correctly
  - Password hashing and verification
- Mock database, email service, auth service

**Backend Integration Tests (Not yet implemented, recommended):**
- Scope: Full endpoint flows with real database (test DB)
- Approach: Make HTTP request to endpoint, verify response and side effects
- Example areas:
  - POST `/api/v1/user/register` - creates user, returns correct response
  - PUT `/api/v1/user/{id}` with invalid role - returns 404
  - Rate limiting on password reset endpoint - returns 429

**E2E Tests:**
- Framework: Not used in current codebase
- Recommended: Playwright or Cypress for full user flows
- Would test: Login flow, form submission, navigation

## Common Patterns

**Async Testing (Frontend):**
```typescript
it('handles async auth check', async () => {
  // Vitest automatically handles async test functions
  render(<AuthProvider><App /></AuthProvider>);

  // Wait for async operations
  await waitFor(() => {
    expect(screen.getByText('Logged in')).toBeInTheDocument();
  });

  // Or use screen queries that retry
  const element = await screen.findByText('Loaded');
  expect(element).toBeInTheDocument();
});
```

**Error Testing (Frontend):**
```typescript
it('handles API error gracefully', async () => {
  vi.mock('@/api/helpers', () => ({
    _getRequest: vi.fn().mockRejectedValue(new Error('Network error'))
  }));

  render(<SomeComponent />);

  await waitFor(() => {
    expect(screen.getByText(/error/i)).toBeInTheDocument();
  });
});
```

**Async Testing (Backend - Recommended):**
```python
@pytest.mark.asyncio
async def test_create_user_async():
    user = await User.insert(...)
    assert user is not None
    assert user.email == "test@example.com"
```

**Error Testing (Backend - Recommended):**
```python
def test_duplicate_user_email_rejected(client):
    # First creation succeeds
    response1 = client.post("/api/v1/user/register", json={...})
    assert response1.status_code == 200

    # Second with same email fails
    response2 = client.post("/api/v1/user/register", json={...})
    assert response2.status_code == 400
    assert "User already exists" in response2.json()["error"]["message"]
```

## Current Testing Gaps

**Frontend:**
- No test files present in `src/` directories
- Missing component tests for: ProjectCard, Pill, AuthContext, API helpers
- Missing route/page tests
- Missing context provider tests

**Backend:**
- No test directory or test files
- Critical gaps:
  - User service endpoints not tested
  - Authentication flows untested (OAuth, JWT, magic links)
  - Database operations untested
  - Exception handler behavior untested
  - Rate limiting not tested

**Recommended Test Priorities (in order):**
1. Backend: Authentication service (JWT creation, token validation)
2. Backend: User service (CRUD operations, API key management)
3. Frontend: Auth context (login, logout, token refresh)
4. Frontend: API helper functions (request building, error handling)
5. Backend: Email task background execution
6. Frontend: Component rendering (ProjectCard, Form components)

---

*Testing analysis: 2026-02-22*
