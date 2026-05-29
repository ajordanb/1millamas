# Codebase Concerns

**Analysis Date:** 2026-02-22

## Critical Bugs

**Undefined variable in auth refresh endpoint:**
- Issue: Lines 136-137 in `/home/alejandro-jordan/Documents/Personal/Code/portfolio/backend/app/api/v1/auth/endpoints.py` reference `token_scopes` and `token_roles` which are not defined. Should be `scopes` and `user_role_names` (obtained from lines 125-126).
- Files: `backend/app/api/v1/auth/endpoints.py`
- Impact: Token refresh endpoint will crash with `NameError` when attempted, breaking token refresh functionality for all authenticated users.
- Fix approach: Replace `token_scopes` with `scopes` and `token_roles` with `user_role_names` on lines 136-137.

## Tech Debt

**Typo in package directory name:**
- Issue: Directory named `utills` instead of `utils` throughout the codebase
- Files: `backend/app/utills/` (multiple files)
- Impact: Non-standard naming creates confusion and makes the codebase harder to maintain; may cause import issues if refactored
- Fix approach: Rename `backend/app/utills/` to `backend/app/utils/` and update all imports throughout the codebase

**Hardcoded database connection logic:**
- Issue: `/home/alejandro-jordan/Documents/Personal/Code/portfolio/backend/app/db/db_manager.py` lines 25-44 check if connection string contains "localhost" to determine configuration. This couples database initialization to specific connection strings.
- Files: `backend/app/db/db_manager.py`
- Impact: Difficult to test with different databases; configuration is implicit rather than explicit
- Fix approach: Move localhost detection logic to configuration and pass as explicit flag; consider separate dev/prod database managers

**Email service uses ThreadPoolExecutor with hardcoded max_workers:**
- Issue: `/home/alejandro-jordan/Documents/Personal/Code/portfolio/backend/app/services/email/email.py` line 22 creates ThreadPoolExecutor with fixed `max_workers=2`
- Files: `backend/app/services/email/email.py`
- Impact: Small thread pool could bottleneck email sending under load; doesn't scale with concurrent requests
- Fix approach: Make thread pool size configurable via settings; consider using async SMTP instead

**Manual JWT decoding in frontend without error handling:**
- Issue: `/home/alejandro-jordan/Documents/Personal/Code/portfolio/frontend/src/api/helpers.ts` line 67 decodes JWT using `window.atob()` with no try-catch, and assumes base64url format without validation
- Files: `frontend/src/api/helpers.ts`
- Impact: Malformed tokens will throw uncaught errors; no validation that decoded data matches expected shape
- Fix approach: Add try-catch around atob decoding; add type validation on decoded token payload

**Frontend API helpers use generic error messages:**
- Issue: `/home/alejandro-jordan/Documents/Personal/Code/portfolio/frontend/src/api/helpers.ts` error handling (lines 52-59) extracts error messages but has no retry logic or detailed error classification
- Files: `frontend/src/api/helpers.ts`
- Impact: Network errors and API errors are treated identically; users get generic messages with no actionable guidance
- Fix approach: Classify error types (network vs API error); implement exponential backoff for retryable errors

## Logging and Debugging Issues

**Debug print statements left in production code:**
- Issue: Line 67 in `/home/alejandro-jordan/Documents/Personal/Code/portfolio/backend/app/core/security/social.py` contains `pprint(decoded_token)` and line 72 in `/home/alejandro-jordan/Documents/Personal/Code/portfolio/backend/app/core/security/helpers.py` contains `print(e, e.args)`
- Files:
  - `backend/app/core/security/social.py`
  - `backend/app/core/security/helpers.py`
- Impact: Debug output pollutes logs and stdout in production; potentially exposes sensitive data in token contents
- Fix approach: Replace print/pprint with logger.debug() statements and remove or guard behind debug flag

**Exception handling uses print() for JWT errors:**
- Issue: `/home/alejandro-jordan/Documents/Personal/Code/portfolio/backend/app/core/security/helpers.py` line 72 uses `print()` instead of logging
- Files: `backend/app/core/security/helpers.py`
- Impact: Error information not captured in structured logs; makes debugging production issues difficult
- Fix approach: Use `logger.error()` instead of print()

## Security Considerations

**CORS configured to allow all origins in development:**
- Issue: `/home/alejandro-jordan/Documents/Personal/Code/portfolio/backend/app/core/config.py` line 69 has default `cors_origins: str = "http://localhost:3000,http://localhost:5173,*"`
- Files: `backend/app/core/config.py`
- Impact: Wildcard CORS in production allows any website to make authenticated requests on behalf of users
- Fix approach: Remove wildcard from defaults; require explicit configuration per environment; add validation in `validate_production_secrets()`

**OAuth provider implementation incomplete:**
- Issue: `/home/alejandro-jordan/Documents/Personal/Code/portfolio/backend/app/core/security/social.py` lines 85-87 only defines Google in provider_map, but Microsoft, Facebook, and Apple handlers exist but are not registered
- Files: `backend/app/core/security/social.py`
- Impact: Microsoft, Facebook, and Apple OAuth are implemented but disabled; users attempting to use these will get key errors
- Fix approach: Either register all providers or remove unused implementations; document which providers are enabled

**Database password stored in connection string:**
- Issue: `/home/alejandro-jordan/Documents/Personal/Code/portfolio/backend/app/core/config.py` expects MongoDB credentials in connection string via `.env`
- Files: `backend/app/core/config.py`
- Impact: Credentials are logged whenever connection string is logged; no separation between connection info and auth
- Fix approach: Parse connection string into components; store password separately from connection URI

**No rate limiting for password validation endpoint:**
- Issue: `/home/alejandro-jordan/Documents/Personal/Code/portfolio/backend/app/api/v1/auth/endpoints.py` line 176 endpoint `check_password_strength` has no rate limiting decorator
- Files: `backend/app/api/v1/auth/endpoints.py`
- Impact: Endpoint can be brute-force attacked to enumerate common passwords
- Fix approach: Add `@limiter.limit()` decorator like other auth endpoints

## Fragile Areas

**JWT validation split across multiple files without clear contract:**
- Issue: Token validation logic spread across `auth_service.py`, `dependencies.py`, and `helpers.py` with inconsistent validation approaches
- Files:
  - `backend/app/services/auth/auth_service.py` (lines 96-131)
  - `backend/app/utills/dependencies.py` (lines 38-61)
  - `backend/app/core/security/helpers.py` (lines 51-75)
- Impact: Multiple sources of truth for token validation; risk of inconsistencies in token expiry checking
- Fix approach: Consolidate token validation into single service; create clear validation pipeline

**AuthContext component is large and handles too many concerns:**
- Issue: `/home/alejandro-jordan/Documents/Personal/Code/portfolio/frontend/src/contexts/auth/AuthContext.tsx` is 314 lines and mixes state management, API calls, and business logic
- Files: `frontend/src/contexts/auth/AuthContext.tsx`
- Impact: Difficult to test; changes to auth logic require changes in context; hard to reuse pieces
- Fix approach: Extract API calls to separate hooks; separate token refresh logic; split into smaller contexts if needed

**Error recovery in token refresh is undefined:**
- Issue: When refresh token fails, `logout()` is called but subsequent behavior is unclear. No queue of pending requests or retry mechanism.
- Files: `frontend/src/contexts/auth/AuthContext.tsx`
- Impact: Users may lose requests in flight when token expires; no recovery mechanism for transient failures
- Fix approach: Implement request queue; retry failed requests after successful refresh

**Admin user creation at startup may fail silently:**
- Issue: `/home/alejandro-jordan/Documents/Personal/Code/portfolio/backend/app/db/db_manager.py` lines 97-113 create admin users but errors are only logged, not raised
- Files: `backend/app/db/db_manager.py`
- Impact: If default admin creation fails, app still starts but has no admin users; difficult to detect deployment issues
- Fix approach: Raise exceptions for admin creation failures in production mode; add startup health check

## Performance Bottlenecks

**Email service blocks event loop:**
- Issue: `/home/alejandro-jordan/Documents/Personal/Code/portfolio/backend/app/services/email/email.py` uses `ThreadPoolExecutor.run_in_executor()` instead of async SMTP library
- Files: `backend/app/services/email/email.py`
- Impact: Email sending ties up thread pool; doesn't scale to many concurrent sends
- Fix approach: Replace with `aiosmtplib` or similar async SMTP library; remove ThreadPoolExecutor dependency

**Database queries without pagination in get_all_users:**
- Issue: `/home/alejandro-jordan/Documents/Personal/Code/portfolio/backend/app/services/user/user_service.py` line 31 calls `all_users()` with limit but doesn't validate limit. Default limit is 1000 which is unbounded for small datasets.
- Files: `backend/app/services/user/user_service.py`
- Impact: Large user lists cause memory spikes and slow API responses
- Fix approach: Add max_limit validation; implement cursor-based pagination; add timeout to queries

**Synchronous role lookup in request validation:**
- Issue: `/home/alejandro-jordan/Documents/Personal/Code/portfolio/backend/app/utills/dependencies.py` lines 103-110 iterate through all roles and query database for each in CheckScope class
- Files: `backend/app/utills/dependencies.py`
- Impact: Every protected endpoint makes N+1 database queries for role lookups
- Fix approach: Cache role-to-scopes mapping; consider moving scope checks to token generation

## Missing Critical Features

**No audit logging for security events:**
- Issue: User login, password changes, and permission modifications are not recorded in separate audit logs
- Files: Multiple auth and user service files
- Impact: Cannot track who changed what and when; violates compliance requirements
- Fix approach: Implement audit log collection; log sensitive operations separately

**No session management or token revocation:**
- Issue: Backend has no way to revoke tokens or logout sessions. Once issued, tokens are valid until expiry.
- Files: `backend/app/services/auth/auth_service.py`
- Impact: Users cannot force logout others or revoke compromised tokens
- Fix approach: Implement token blacklist or allowlist; add revocation endpoint

**No password history enforcement:**
- Issue: `/home/alejandro-jordan/Documents/Personal/Code/portfolio/backend/app/models/user/model.py` line 67 stores last 5 passwords but never checks them when user changes password
- Files: `backend/app/models/user/model.py`
- Impact: Users can immediately reuse old passwords
- Fix approach: Validate new password against `last_passwords` list before accepting change

## Test Coverage Gaps

**No tests for token refresh endpoint:**
- Issue: Token refresh endpoint (lines 117-145 in `backend/app/api/v1/auth/endpoints.py`) has undefined variable bug but likely no tests caught it
- Files: `backend/app/api/v1/auth/endpoints.py`
- Risk: High - token refresh is critical flow for all authenticated users
- Priority: High

**No tests for email service failure scenarios:**
- Issue: `/home/alejandro-jordan/Documents/Personal/Code/portfolio/backend/app/services/email/email.py` has try-catch returning False on failure but no tests verify recovery
- Files: `backend/app/services/email/email.py`
- Risk: High - if email sending fails, user signup is lost
- Priority: High

**No tests for social OAuth providers:**
- Issue: Google, Microsoft, Facebook, and Apple OAuth implementations exist but only Google is in provider_map. No tests verify the unused implementations work.
- Files: `backend/app/core/security/social.py`
- Risk: Medium - unused code may bitrot
- Priority: Medium

## Dependencies at Risk

**outdated-looking OAuth implementation:**
- Issue: `/home/alejandro-jordan/Documents/Personal/Code/portfolio/backend/app/core/security/social.py` manually constructs OAuth flows instead of using well-maintained libraries like `authlib` or `httpx-oauth`
- Files: `backend/app/core/security/social.py`
- Impact: Security vulnerabilities in OAuth implementation could be missed; PKCE flow not visible
- Fix approach: Migrate to `authlib` or `python-oauth2-library`; leverage battle-tested implementations

---

*Concerns audit: 2026-02-22*
