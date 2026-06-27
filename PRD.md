# Backend Product Requirements Document
## Weather Web Application
**Document Version:** 1.0
**Status:** Draft for Engineering Review
**Owner:** Backend Architecture Team
**Last Updated:** June 27, 2026
---
## Table of Contents
1. [Project Overview](#1-project-overview)
2. [Authentication](#2-authentication)
3. [User Roles & Permissions](#3-user-roles--permissions)
4. [Database Design](#4-database-design)
5. [API Requirements](#5-api-requirements)
6. [External Services](#6-external-services)
7. [Backend Architecture](#7-backend-architecture)
8. [Security](#8-security)
9. [Performance](#9-performance)
10. [Error Handling](#10-error-handling)
11. [Logging & Monitoring](#11-logging--monitoring)
12. [Deployment](#12-deployment)
13. [Testing Strategy](#13-testing-strategy)
14. [Non-Functional Requirements](#14-non-functional-requirements)
15. [Future Scope](#15-future-scope)
---
## 1. Project Overview
### 1.1 Purpose
This document defines the backend product and technical requirements for a responsive, production-ready Weather Web Application. The application enables users to explore real-time weather information for any location worldwide via an interactive world map, manage favorite locations, view recent searches, and personalize preferences.
### 1.2 Scope of the Backend
The backend is responsible for:
- User identity, authentication, and account lifecycle
- Persisting user preferences, favorite locations, and recent searches
- Acting as a secure proxy and cache layer in front of third-party weather and geocoding providers
- Enforcing authorization, validation, rate limiting, and observability
- Delivering low-latency weather data to a global user base
### 1.3 Core Features Supported
- Login, Create Account, Forgot/Reset Password, Email Verification
- User Profile management
- Interactive World Map with click-to-fetch weather popups
- Recent Searches history
- Favorite Locations management
- User Preferences (units, language, theme, default location)
### 1.4 Goals
- Sub-second cached weather response (P95 < 300 ms)
- 99.9% monthly availability
- Horizontally scalable, stateless API layer
- Strict separation between public, authenticated, and administrative surfaces
### 1.5 Out of Scope
- Native mobile clients
- Paid subscription tiers (initial release)
- Frontend implementation details
---
## 2. Authentication
### 2.1 User Registration
- Accepts email, password, and display name
- Validates email format and password strength (min 12 chars, mixed case, number, symbol)
- Enforces email uniqueness (case-insensitive)
- Sends an email verification message containing a single-use, time-bound token (24h TTL)
- Account is created in `unverified` state; weather features remain accessible, but profile and persistence features require verification
### 2.2 Login
- Credentials: email + password
- On success issues an Access Token (JWT, short-lived) and a Refresh Token (long-lived, rotating)
- Tracks failed attempts; account is temporarily locked after 5 failures within 15 minutes
- Returns minimal user profile in the response payload
### 2.3 Logout
- Invalidates the current refresh token (server-side revocation list)
- Clears server session record
- Idempotent; safe to call with already-expired tokens
### 2.4 Forgot Password
- Accepts email address
- Always returns a generic success response (prevents account enumeration)
- If account exists, issues a single-use reset token (TTL 30 minutes) and sends a password reset email
### 2.5 Reset Password
- Accepts reset token + new password
- Validates token authenticity, expiry, and single-use status
- Hashes and persists new password
- Invalidates all existing refresh tokens and active sessions for the user
### 2.6 Email Verification
- Verification link contains opaque token mapped server-side to the user
- On verification, sets `email_verified_at` timestamp
- Allows token resend with rate limiting (max 3 per hour)
### 2.7 JWT Authentication
- Algorithm: RS256 (asymmetric keys)
- Access token TTL: 15 minutes
- Claims: `sub` (user id), `role`, `email_verified`, `iat`, `exp`, `iss`, `aud`, `jti`
- Sent via `Authorization: Bearer <token>` header
- Public key exposed via a JWKS endpoint for verification
### 2.8 Refresh Tokens
- Stored hashed in the database; never returned after issuance other than once
- TTL: 30 days; rotated on every use (refresh token rotation)
- Reuse detection: presenting a previously rotated token revokes the entire token family
- Bound to user-agent + IP fingerprint (soft binding, logged on mismatch)
### 2.9 Secure Password Hashing
- Algorithm: Argon2id (preferred) or bcrypt cost ≥ 12 as fallback
- Per-user unique salt
- Hash parameters stored alongside the hash to allow future migration
### 2.10 Session Management
- Each refresh token corresponds to a `user_sessions` record (device, IP, user-agent, last seen)
- Users can list and revoke active sessions from their profile
- Administrators can force-revoke any session
---
## 3. User Roles & Permissions
### 3.1 Roles
Roles are stored in a dedicated `user_roles` table (never on the user/profile record) to prevent privilege escalation.
| Role | Description |
|------|-------------|
| `guest` | Unauthenticated visitor |
| `user` | Registered, authenticated end-user |
| `admin` | Operational administrator |
### 3.2 Permission Matrix
| Capability | Guest | User | Admin |
|---|---|---|---|
| View weather by coordinates / city | ✅ | ✅ | ✅ |
| Reverse geocoding | ✅ | ✅ | ✅ |
| Register / Login | ✅ | — | — |
| Manage own profile | — | ✅ | ✅ |
| Manage own favorites | — | ✅ | ✅ |
| Manage own recent searches | — | ✅ | ✅ |
| Manage own preferences | — | ✅ | ✅ |
| Manage own sessions | — | ✅ | ✅ |
| View any user account | — | — | ✅ |
| Suspend / delete accounts | — | — | ✅ |
| View system metrics & logs | — | — | ✅ |
| Manage cache invalidation | — | — | ✅ |
---
## 4. Database Design
All entities below describe logical models. The implementation may use a relational store (PostgreSQL) for transactional data and a key-value store (Redis) for caching and ephemeral data.
### 4.1 `users`
- **Purpose:** Canonical user identity.
- **Fields:**
  | Field | Type | Required | Notes |
  |---|---|---|---|
  | `id` | UUID | ✅ | Primary key |
  | `email` | string(255) | ✅ | Unique, case-insensitive |
  | `password_hash` | string | ✅ | Argon2id |
  | `display_name` | string(80) | ✅ | |
  | `avatar_url` | string(500) | ❌ | |
  | `email_verified_at` | timestamp | ❌ | Null until verified |
  | `status` | enum(`active`,`locked`,`suspended`,`deleted`) | ✅ | |
  | `failed_login_count` | integer | ✅ | Default 0 |
  | `locked_until` | timestamp | ❌ | |
  | `created_at` | timestamp | ✅ | |
  | `updated_at` | timestamp | ✅ | |
- **Validation:** email RFC 5322, display_name 2–80 chars trimmed.
- **Relationships:** 1:1 `user_preferences`, 1:N `favorite_locations`, `recent_searches`, `user_sessions`, `user_roles`, `password_reset_tokens`.
### 4.2 `user_roles`
- **Purpose:** Role assignments (separated to prevent privilege escalation).
- **Fields:** `id` UUID, `user_id` UUID (FK → users.id, cascade), `role` enum(`user`,`admin`), `granted_at` timestamp, `granted_by` UUID (nullable).
- **Constraints:** Unique (`user_id`, `role`).
### 4.3 `user_preferences`
- **Purpose:** Personalization settings.
- **Fields:** `user_id` UUID (PK, FK → users.id), `temperature_unit` enum(`celsius`,`fahrenheit`), `wind_speed_unit` enum(`kmh`,`mph`,`ms`), `precipitation_unit` enum(`mm`,`inch`), `pressure_unit` enum(`hpa`,`inhg`), `time_format` enum(`12h`,`24h`), `language` string(8) (BCP-47), `theme` enum(`light`,`dark`,`system`), `default_latitude` decimal(9,6) optional, `default_longitude` decimal(9,6) optional, `updated_at` timestamp.
- **Validation:** Latitude −90..90, longitude −180..180.
### 4.4 `favorite_locations`
- **Purpose:** Saved locations for quick access.
- **Fields:** `id` UUID, `user_id` UUID (FK), `label` string(120), `latitude` decimal(9,6), `longitude` decimal(9,6), `country_code` string(2), `region` string(120) optional, `city` string(120) optional, `sort_order` integer, `created_at` timestamp.
- **Constraints:** Unique (`user_id`, `latitude`, `longitude`); max 50 favorites per user.
### 4.5 `recent_searches`
- **Purpose:** Rolling history of user-initiated lookups.
- **Fields:** `id` UUID, `user_id` UUID (FK), `query` string(200), `latitude` decimal(9,6), `longitude` decimal(9,6), `resolved_name` string(200) optional, `searched_at` timestamp.
- **Retention Rule:** Keep last 25 per user; older entries pruned by background job.
### 4.6 `weather_cache`
- **Purpose:** Server-side cache for upstream weather payloads.
- **Fields:** `cache_key` string (PK; hash of provider+endpoint+coords+units), `payload` JSON, `provider` string, `latitude` decimal(9,6), `longitude` decimal(9,6), `fetched_at` timestamp, `expires_at` timestamp.
- **Notes:** Primary cache lives in Redis; this table is an optional durability tier for analytics and warm-start.
### 4.7 `user_sessions`
- **Purpose:** Refresh-token-backed sessions.
- **Fields:** `id` UUID, `user_id` UUID (FK), `refresh_token_hash` string, `token_family_id` UUID, `user_agent` string(500), `ip_address` string(45), `last_used_at` timestamp, `expires_at` timestamp, `revoked_at` timestamp nullable, `created_at` timestamp.
- **Validation:** `expires_at > created_at`.
### 4.8 `password_reset_tokens`
- **Purpose:** Single-use password reset tokens.
- **Fields:** `id` UUID, `user_id` UUID (FK), `token_hash` string, `expires_at` timestamp, `used_at` timestamp nullable, `created_at` timestamp.
- **Rule:** Issuing a new token invalidates outstanding tokens for the same user.
### 4.9 `email_verification_tokens`
- **Purpose:** Single-use email verification tokens.
- **Fields:** Same shape as `password_reset_tokens`.
### 4.10 `audit_logs`
- **Purpose:** Security-relevant event trail.
- **Fields:** `id` UUID, `actor_user_id` UUID nullable, `action` string, `target_type` string, `target_id` string, `metadata` JSON, `ip_address` string, `created_at` timestamp.
---
## 5. API Requirements
### 5.1 Conventions
- **Base path:** `/api/v1`
- **Format:** JSON, UTF-8
- **Auth:** `Authorization: Bearer <access_token>` where required
- **Idempotency:** Mutating endpoints accept optional `Idempotency-Key` header
- **Pagination:** Cursor-based via `?limit=` (default 20, max 100) and `?cursor=`
- **Timestamps:** ISO 8601 UTC
### 5.2 Authentication Endpoints
#### `POST /api/v1/auth/register`
- **Auth:** None
- **Purpose:** Create a new account; triggers verification email.
- **Body:** `email`, `password`, `display_name`
- **Validation:** Email format, password policy, unique email
- **Response 201:** `{ user: { id, email, display_name, email_verified: false } }`
- **Errors:** 400 validation, 409 email taken, 429 rate limit
#### `POST /api/v1/auth/login`
- **Auth:** None
- **Body:** `email`, `password`
- **Response 200:** `{ access_token, refresh_token, expires_in, user }`
- **Errors:** 400, 401 invalid credentials, 423 locked, 429
#### `POST /api/v1/auth/logout`
- **Auth:** Required
- **Body:** `refresh_token`
- **Response 204**
#### `POST /api/v1/auth/refresh`
- **Auth:** None (refresh token in body)
- **Body:** `refresh_token`
- **Response 200:** `{ access_token, refresh_token, expires_in }`
- **Errors:** 401 invalid/rotated/expired
#### `POST /api/v1/auth/forgot-password`
- **Auth:** None
- **Body:** `email`
- **Response 202:** Generic success
- **Errors:** 429
#### `POST /api/v1/auth/reset-password`
- **Auth:** None
- **Body:** `token`, `new_password`
- **Response 204**
- **Errors:** 400, 410 token expired/used
#### `POST /api/v1/auth/verify-email`
- **Auth:** None
- **Body:** `token`
- **Response 204**
#### `POST /api/v1/auth/verify-email/resend`
- **Auth:** Required
- **Response 202**
#### `GET /api/v1/auth/.well-known/jwks.json`
- **Auth:** None
- **Purpose:** Publish public keys for JWT verification.
### 5.3 User Endpoints
#### `GET /api/v1/users/me`
- **Auth:** Required
- **Response 200:** Profile object including preferences summary.
#### `PATCH /api/v1/users/me`
- **Auth:** Required
- **Body:** Partial: `display_name`, `avatar_url`
- **Response 200**
#### `POST /api/v1/users/me/change-password`
- **Auth:** Required
- **Body:** `current_password`, `new_password`
- **Response 204** (revokes all sessions except current)
- **Errors:** 401 wrong current password
#### `GET /api/v1/users/me/preferences`
- **Auth:** Required
#### `PUT /api/v1/users/me/preferences`
- **Auth:** Required
- **Body:** Full preferences object
- **Response 200**
#### `GET /api/v1/users/me/sessions`
#### `DELETE /api/v1/users/me/sessions/{session_id}`
- **Auth:** Required
### 5.4 Weather Endpoints
All weather endpoints accept optional `units` query parameter (`metric`|`imperial`) overriding user preference. Guest access permitted; authenticated calls receive higher rate limits.
#### `GET /api/v1/weather/current`
- **Query:** `lat`, `lon`, `units?`, `lang?`
- **Response 200:** Current conditions (temperature, feels-like, humidity, wind, pressure, condition code, icon, observation time).
- **Errors:** 400 invalid coords, 502 upstream failure (with stale-while-error fallback when cached).
#### `GET /api/v1/weather/hourly`
- **Query:** `lat`, `lon`, `hours?` (default 24, max 48), `units?`, `lang?`
- **Response 200:** Array of hourly forecast points.
#### `GET /api/v1/weather/weekly`
- **Query:** `lat`, `lon`, `days?` (default 7, max 14), `units?`, `lang?`
- **Response 200:** Daily forecast points.
#### `GET /api/v1/weather/air-quality`
- **Query:** `lat`, `lon`
- **Response 200:** AQI, pollutant breakdown (PM2.5, PM10, O3, NO2, SO2, CO).
#### `GET /api/v1/weather/by-city`
- **Query:** `q` (city name), `units?`, `lang?`
- **Response 200:** Resolved location + current conditions.
- **Errors:** 404 unknown city.
#### `GET /api/v1/weather/geocode`
- **Query:** `q`
- **Response 200:** Ranked list of matching locations.
#### `GET /api/v1/weather/reverse-geocode`
- **Query:** `lat`, `lon`
- **Response 200:** `{ country, region, city, formatted_address }`
### 5.5 Favorites Endpoints
#### `GET /api/v1/favorites`
- **Auth:** Required
- **Response 200:** Paginated list.
#### `POST /api/v1/favorites`
- **Auth:** Required
- **Body:** `label`, `latitude`, `longitude`, `country_code`, `region?`, `city?`
- **Errors:** 409 duplicate, 422 favorites limit reached.
#### `PATCH /api/v1/favorites/{id}`
- **Auth:** Required
- **Body:** Partial (`label`, `sort_order`)
#### `DELETE /api/v1/favorites/{id}`
- **Auth:** Required
- **Response 204**
### 5.6 Recent Searches Endpoints
#### `GET /api/v1/recent-searches`
#### `POST /api/v1/recent-searches`
- **Body:** `query`, `latitude`, `longitude`, `resolved_name?`
#### `DELETE /api/v1/recent-searches/{id}`
#### `DELETE /api/v1/recent-searches` (clear all)
### 5.7 Administrative Endpoints (`admin` role only)
- `GET /api/v1/admin/users`
- `PATCH /api/v1/admin/users/{id}` (status, role grants)
- `DELETE /api/v1/admin/users/{id}`
- `POST /api/v1/admin/cache/invalidate`
- `GET /api/v1/admin/metrics`
### 5.8 System Endpoints
- `GET /api/v1/health` (liveness)
- `GET /api/v1/ready` (readiness; checks DB, cache, upstream)
- `GET /api/v1/version`
### 5.9 Standard Validation Rules
- Latitude: numeric, −90 to 90, max 6 decimals
- Longitude: numeric, −180 to 180, max 6 decimals
- Strings: trimmed, length-bounded per entity definitions
- Enumerations strictly validated against allowed values
- Reject unknown fields (strict schema parsing)
---
## 6. External Services
### 6.1 Weather Data Provider — Open-Meteo (primary) / OpenWeather (fallback)
- **Usage:** Source for current conditions, hourly forecast, daily forecast, and air quality data.
- **Requirements:** Configurable provider selection, automatic failover, response normalization into a provider-agnostic internal schema, respect of upstream rate limits, attribution where required by the provider's terms.
### 6.2 Reverse Geocoding Service
- **Usage:** Resolve user-clicked coordinates into human-readable place names; resolve free-text queries to coordinates.
- **Requirements:** Multi-language responses, result ranking, caching of resolved tuples.
### 6.3 Email Service (Transactional)
- **Usage:** Deliver verification emails, password reset emails, security notifications (new device sign-in), and administrative alerts.
- **Requirements:** Templated emails, localization-ready, bounce and complaint handling via webhook, SPF/DKIM/DMARC alignment.
### 6.4 Map Service
- **Usage:** Backend supplies tile-provider configuration (style URL, attribution) and any signed access tokens required by the frontend map.
- **Requirements:** Token issuance scoped per session, never exposing long-lived service credentials to the client.
### 6.5 Common Integration Requirements
- All outbound calls have explicit timeouts (default 5s) and circuit breakers
- Retries with exponential backoff and jitter on idempotent calls only
- Provider credentials stored in the secrets manager; never in source control
- Per-provider request and error metrics
---
## 7. Backend Architecture
### 7.1 Architectural Style
- Stateless HTTP API, horizontally scalable behind a load balancer
- Layered (hexagonal-friendly) architecture
- Asynchronous background workers for non-critical work (email send, cache warmups, pruning)
- Shared Redis cache and PostgreSQL primary with read replicas
### 7.2 Logical Folder Structure (conceptual)
```
backend/
├── api/                # HTTP route definitions, request/response shapes
│   ├── auth/
│   ├── users/
│   ├── weather/
│   ├── favorites/
│   ├── recent-searches/
│   └── admin/
├── controllers/        # HTTP-layer orchestration
├── services/           # Business logic, provider-agnostic
├── repositories/       # Persistence access
├── integrations/       # External provider adapters (weather, email, geocoding)
├── middleware/         # Auth, rate limiting, logging, error handling, CORS
├── dtos/               # Request and response data shapes
├── validators/         # Schema definitions
├── domain/             # Entities, value objects, enums
├── jobs/               # Background workers and schedulers
├── config/             # Environment-driven configuration
├── observability/      # Logging, metrics, tracing setup
└── tests/              # Unit, integration, e2e
```
### 7.3 Layer Responsibilities
- **Controllers:** Validate input, invoke services, translate domain errors into HTTP responses. No business logic.
- **Services:** Encapsulate business rules and orchestrate repositories and integrations. Transaction boundaries live here.
- **Repositories:** Sole gateway to persistence. Expose intention-revealing queries; no leaking ORM types.
- **Middleware:** Cross-cutting concerns (authentication, role checks, rate limiting, request ID propagation, structured logging, error normalization, CORS, security headers).
- **DTOs:** Distinct request and response shapes per endpoint; never reuse domain entities directly at the boundary.
- **Validators:** Declarative schemas enforced at the controller boundary; failures yield uniform 400 responses.
- **Configuration:** Strongly typed, validated at boot, sourced exclusively from environment variables and the secrets manager.
### 7.4 Environment Variables (representative)
- `APP_ENV`, `APP_PORT`, `APP_BASE_URL`
- `DATABASE_URL`, `DATABASE_READ_URL`, `DATABASE_POOL_SIZE`
- `REDIS_URL`
- `JWT_PRIVATE_KEY`, `JWT_PUBLIC_KEY`, `JWT_ISSUER`, `JWT_AUDIENCE`
- `ACCESS_TOKEN_TTL`, `REFRESH_TOKEN_TTL`
- `WEATHER_PROVIDER_PRIMARY`, `WEATHER_PROVIDER_FALLBACK`, `WEATHER_API_KEY`
- `GEOCODING_API_KEY`
- `EMAIL_PROVIDER_API_KEY`, `EMAIL_FROM_ADDRESS`
- `MAP_TILE_STYLE_URL`, `MAP_TILE_TOKEN`
- `CORS_ALLOWED_ORIGINS`
- `RATE_LIMIT_GUEST_PER_MIN`, `RATE_LIMIT_USER_PER_MIN`
- `LOG_LEVEL`, `OTEL_EXPORTER_OTLP_ENDPOINT`
---
## 8. Security
### 8.1 Password Hashing
- Argon2id with tuned memory/iterations; bcrypt (cost ≥ 12) as fallback
- Hashing parameters versioned and upgradeable on next successful login
### 8.2 JWT
- RS256, short-lived access tokens, rotating refresh tokens
- Strict `iss`/`aud` validation; `kid` header used to select signing key
- Tokens never logged or persisted in plain text
### 8.3 Transport Security
- HTTPS-only (HSTS, min TLS 1.2)
- HTTP redirected to HTTPS at the edge
### 8.4 Rate Limiting
- Per-IP and per-user buckets via token bucket algorithm
- Stricter limits on auth endpoints (e.g., 10 login attempts / 15 min / IP)
- Distinct quotas for weather endpoints by role
### 8.5 CORS
- Allowlist of known origins; credentials enabled only for first-party origins
- Preflight cached for 10 minutes
### 8.6 CSRF Protection
- Stateless JWT auth via `Authorization` header eliminates classic CSRF; if cookie-based sessions are added later, double-submit token pattern is required
### 8.7 XSS Prevention
- Strict output encoding for any server-rendered surface
- `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`
### 8.8 Injection Prevention
- Parameterized queries / prepared statements exclusively
- ORM/query builder configured to disallow raw string interpolation
- Input length and type bounds enforced before persistence
### 8.9 Input Validation
- Schema-first validation at every public boundary
- Reject unknown fields, enforce enumerations, normalize whitespace
- Coordinate, email, and URL formats validated against canonical specs
### 8.10 Secure Headers
- `Strict-Transport-Security`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Permissions-Policy`, `Cross-Origin-Opener-Policy`, `Cross-Origin-Resource-Policy`
### 8.11 Secrets Management
- All secrets sourced from a managed secret store; injected as environment variables at runtime
- No secrets in source, logs, or error messages
- Quarterly rotation policy for high-value secrets (JWT keys, provider API keys)
### 8.12 Account Protection
- Generic responses to enumeration-prone flows (forgot password, login)
- Lockout after repeated failures with exponential cooldown
- Notification email on password change, new device login, and role change
---
## 9. Performance
### 9.1 Weather Response Caching
- **Layered cache:** in-process LRU (per instance) → Redis (shared) → durable `weather_cache`
- **Cache key:** SHA-256 of `(provider, endpoint, lat_rounded_3dp, lon_rounded_3dp, units, lang)`
- **Stale-while-revalidate:** serve stale within 5 minutes past expiry while a single background refresh executes
- **Stale-if-error:** serve stale up to 1 hour when upstream is unavailable
### 9.2 Cache Expiration Targets
| Resource | TTL |
|---|---|
| Current conditions | 5 minutes |
| Hourly forecast | 30 minutes |
| Weekly forecast | 3 hours |
| Air quality | 30 minutes |
| Reverse geocoding | 30 days |
| Forward geocoding | 30 days |
### 9.3 API Rate Limits (initial targets)
- Guests: 30 requests/minute/IP for weather endpoints
- Authenticated users: 120 requests/minute/user
- Auth endpoints: 10 requests/15 minutes/IP
- 429 responses include `Retry-After` and `X-RateLimit-*` headers
### 9.4 Pagination
- Cursor-based for all list endpoints; opaque cursors prevent client-side mutation
- Hard caps per endpoint to protect the database
### 9.5 Compression
- `gzip` and `brotli` content encoding negotiated via `Accept-Encoding`
### 9.6 Lazy Loading
- Forecast endpoints support `fields` parameter for partial responses where applicable
- Heavy data (e.g., extended weekly forecast) loaded only on demand
### 9.7 Background Jobs
- Prune `recent_searches` beyond per-user retention
- Purge expired tokens and revoked sessions
- Refresh popular-location caches on schedule
- Send queued transactional emails with retry policy
---
## 10. Error Handling
### 10.1 Standard Error Response
```
{
  "error": {
    "code": "string_machine_readable_code",
    "message": "Human readable summary",
    "details": [ { "field": "email", "issue": "INVALID_FORMAT" } ],
    "request_id": "uuid",
    "timestamp": "ISO-8601"
  }
}
```
### 10.2 Categories
| HTTP | Code Prefix | Use Case |
|---|---|---|
| 400 | `VALIDATION_*` | Schema or business rule validation failure |
| 401 | `AUTH_*` | Missing/invalid/expired credentials |
| 403 | `FORBIDDEN_*` | Authenticated but not authorized |
| 404 | `NOT_FOUND_*` | Resource does not exist |
| 409 | `CONFLICT_*` | Duplicate or state conflict |
| 410 | `GONE_*` | Token expired or consumed |
| 422 | `UNPROCESSABLE_*` | Semantically invalid (e.g., favorites limit) |
| 423 | `LOCKED_*` | Account temporarily locked |
| 429 | `RATE_LIMITED` | Throttling |
| 502 | `UPSTREAM_FAILURE` | External provider failure (with optional cached payload) |
| 500 | `INTERNAL_ERROR` | Unhandled server error |
| 503 | `SERVICE_UNAVAILABLE` | Dependency down, degraded mode |
### 10.3 Principles
- Never leak stack traces, SQL, or provider responses
- Every error carries a server-generated `request_id` for traceability
- Validation errors include per-field detail; auth errors never disclose which factor failed
---
## 11. Logging & Monitoring
### 11.1 Application Logs
- Structured JSON, one event per line
- Mandatory fields: `timestamp`, `level`, `service`, `env`, `request_id`, `user_id?`, `route`, `latency_ms`, `status`
### 11.2 Error Logs
- Captured with stack traces and contextual metadata
- Forwarded to error tracking system (Sentry-class)
- Alerting thresholds on error rate spikes
### 11.3 Audit Logs
- Persisted in `audit_logs` for: authentication events, password and email changes, role changes, admin actions, session revocations
- Retention: minimum 12 months
### 11.4 Performance Metrics
- RED metrics (Rate, Errors, Duration) per endpoint
- USE metrics (Utilization, Saturation, Errors) for DB and Redis
- Upstream provider latency and error rate, cache hit ratio per resource type
- Exposed via OpenTelemetry exporter
### 11.5 Distributed Tracing
- W3C Trace Context propagated end-to-end
- Spans for HTTP handler, DB calls, cache calls, upstream provider calls
### 11.6 Health Check Endpoints
- `GET /api/v1/health` — process liveness, always cheap
- `GET /api/v1/ready` — verifies DB connectivity, Redis connectivity, and at least one weather provider reachable
---
## 12. Deployment
### 12.1 Environments
| Environment | Purpose | Data |
|---|---|---|
| Development | Local engineering | Synthetic |
| Staging | Pre-production validation | Anonymized / synthetic |
| Production | Live user traffic | Real |
### 12.2 Environment Variable Management
- Per-environment configuration sourced from the secrets manager
- Configuration validated at boot; service refuses to start on missing/invalid values
### 12.3 Containerization
- Service packaged as an immutable container image
- Multi-stage build; minimal runtime base image; non-root user
- Image signed and stored in a private registry; vulnerability scanning on every push
### 12.4 Orchestration
- Stateless deployments with horizontal autoscaling on CPU and request concurrency
- Rolling updates with health-gated readiness checks
- Separate worker deployment for background jobs
### 12.5 CI/CD Requirements
- Pipeline stages: lint → unit tests → integration tests → security scan → build image → deploy to staging → smoke tests → manual approval → deploy to production
- Database migrations applied via a controlled, idempotent migration runner before service rollout
- Automated rollback on failed readiness or elevated error rate post-deploy
---
## 13. Testing Strategy
### 13.1 Unit Testing
- Coverage target ≥ 80% for services, validators, and domain logic
- Pure-function bias; external dependencies mocked at adapter boundaries
### 13.2 Integration Testing
- Real database and Redis (containerized) for repository and service flows
- External providers replaced with contract-tested fakes
### 13.3 API / Contract Testing
- End-to-end HTTP tests covering every endpoint's success and primary error paths
- OpenAPI specification maintained as the source of truth; contract tests validate responses against the spec
### 13.4 Load Testing
- Baseline scenarios: 1k concurrent users browsing the map, 200 RPS on weather endpoints
- Acceptance: P95 latency ≤ 300 ms on cache hit, ≤ 1.2 s on cache miss; error rate < 0.5%
### 13.5 Security Testing
- Static analysis (SAST) and dependency scanning in CI
- Periodic dynamic application security testing (DAST)
- Annual third-party penetration test
### 13.6 Regression and Smoke Testing
- Post-deploy smoke suite executed against staging and production
- Synthetic monitors for critical journeys (login, fetch weather, save favorite)
---
## 14. Non-Functional Requirements
| Attribute | Requirement |
|---|---|
| **Scalability** | Stateless API horizontally scalable; cache and DB scale via replicas and partitioning where needed |
| **Availability** | 99.9% monthly uptime SLO; multi-AZ deployment |
| **Reliability** | Graceful degradation when upstream providers fail (stale-if-error, circuit breakers) |
| **Maintainability** | Layered architecture, strict typing, ≥ 80% test coverage, OpenAPI as contract |
| **Performance** | P95 ≤ 300 ms cache hit / ≤ 1.2 s cache miss; cache hit ratio ≥ 85% for weather endpoints |
| **Security** | OWASP ASVS L2 compliance target; quarterly secret rotation; annual pentest |
| **Accessibility** | API responses include localized, screen-reader-friendly text fields where applicable |
| **Documentation** | OpenAPI spec, architecture decision records, runbooks for on-call, changelog per release |
| **Observability** | Structured logs, metrics, traces, audit trail; mean time to detect < 5 minutes |
| **Compliance** | GDPR-aligned data handling: data export and deletion endpoints, lawful basis recorded |
---
## 15. Future Scope
- **Weather Alerts:** Server-side evaluation of severe weather thresholds with user-configurable rules
- **Push Notifications:** Web Push and mobile push delivery for alerts and daily summaries
- **Multiple Languages:** Full localization of API messages, emails, and provider-returned text
- **Offline Mode Support:** Snapshot endpoints optimized for client-side caching and sync
- **Historical Weather:** Endpoints exposing daily aggregates for past dates with long-term storage
- **AI Weather Insights:** Natural-language summaries, anomaly detection, and personalized recommendations via an AI gateway
- **Weather Radar Layers:** Tile endpoints or signed proxy for precipitation, cloud, and wind radar overlays
- **Social Features:** Shareable location links, public favorite collections
- **Premium Tier:** Higher rate limits, extended forecast horizon, advanced AI insights
- **Multi-region Active-Active:** Geo-distributed deployments for sub-100 ms global latency
---
*End of document.*