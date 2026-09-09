# Feature Specification: XtraEarn Production Hardening and Architecture Stabilization

**Feature Directory**: `specs/001-production-hardening`

**Created**: 2026-09-08

**Status**: Draft

**Input**: User description: "XtraEarn Production Hardening and Architecture Stabilization. Use the existing XtraEarn codebase and the recent architectural audit as the basis. The goal is to make the existing platform safer, more consistent, and production-ready without unnecessarily rewriting working functionality."

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Secure Identity & Credential Protection (Priority: P1)

As a registered member, client, specialist, or platform administrator, I need absolute assurance that my account and private data can only be accessed using my own verified credentials, so that unauthorized actors cannot hijack my profile, funds, or administrative controls.

**Why this priority**:
Security audits identified a critical vulnerability where hardcoded fallback passwords allow arbitrary account access without valid credentials. Eliminating all credential bypasses and securing authentication is an immediate prerequisite for any production operation.

**Independent Test**:
Can be tested independently by attempting login against existing user accounts with hardcoded bypass passwords (must be strictly rejected with 401 Unauthorized) and verifying that only genuine, salted cryptographic password matches are granted access.

**Acceptance Scenarios**:
1. **Given** an existing user account with a secure password hash, **When** an attacker attempts to log in using arbitrary hardcoded credentials (such as `password123` or `Password123!`), **Then** the platform rejects the login attempt with 401 Unauthorized and records a failed security audit event.
2. **Given** a valid user providing their correct password, **When** they authenticate, **Then** access is granted and a signed cryptographic session token with bounded expiration is issued.
3. **Given** an unauthenticated or expired request to a protected profile or administrative endpoint, **When** the request is processed, **Then** access is strictly denied with 401 Unauthorized.
4. **Given** a non-administrative user holding a valid user token, **When** they attempt to access any back-office or administrative route, **Then** access is strictly blocked with 403 Forbidden.

---

### User Story 2 - Escrow, Consultation & Wallet Authorization Integrity (Priority: P1)

As a paying client, freelancer, or verified specialist, I need all financial operations—including escrow funding, milestone payouts, consultation fee releases, and cancellations—to strictly verify actor ownership and prevent duplicate disbursement, so that my funds are never released without authorization or lost due to race conditions.

**Why this priority**:
Consultation booking escrow completion and cancellation routes currently allow unverified callers to trigger fund releases. Financial mutations must enforce strict ownership guards and atomic balance adjustments to prevent financial loss and fraud.

**Independent Test**:
Can be tested independently by attempting to trigger task or consultation escrow completion and cancellation from a non-participant account (must fail with 403 Forbidden), and confirming that only the legitimate client or an authorized platform administrator can release or refund escrowed funds.

**Acceptance Scenarios**:
1. **Given** a consultation booking between Client A and Specialist B, **When** an unauthenticated caller or unrelated User C attempts to mark the session complete or request a payout, **Then** the request is rejected with 403 Forbidden.
2. **Given** an active consultation session, **When** the legitimate booking client or an authorized platform administrator triggers completion, **Then** escrow funds are released to the specialist's wallet, the session status updates to completed, and a permanent transaction record is written.
3. **Given** an active consultation session, **When** the legitimate booking client or administrator cancels the session with a valid reason, **Then** the escrow fee is refunded to the client's wallet and status updates to cancelled.
4. **Given** concurrent or repeated completion requests for the same milestone or consultation booking, **When** processed by the financial ledger, **Then** idempotent handling guarantees that funds are disbursed exactly once without double-crediting.
5. **Given** a user requesting a withdrawal, **When** the requested amount exceeds their available, unfrozen wallet balance, **Then** the withdrawal is rejected and the wallet balance remains unmodified.

---

### User Story 3 - Authoritative Unified Data Persistence (Priority: P1)

As a platform administrator and system operator, I need all business operations, specialist bookings, financial ledgers, and content updates to be stored in a single authoritative persistent database rather than split across volatile in-memory storage and relational tables, so that data never becomes inconsistent or lost during service restarts.

**Why this priority**:
The platform currently exhibits a split-brain architecture where core task operations touch the relational database, but consultations, CMS pages, pricing rules, and admin updates write only to memory and disk JSON. Unifying persistence guarantees data consistency across the entire application.

**Independent Test**:
Can be tested independently by creating a specialist consultation booking, updating a CMS setting, and adjusting a user status through the admin panel, then restarting the backend service; upon restart, all created records and state transitions must persist intact and be readable via standard queries.

**Acceptance Scenarios**:
1. **Given** the application running in production mode, **When** any user, specialist, or administrator performs a create, update, or delete action, **Then** the change is committed directly to the authoritative database.
2. **Given** existing historical records residing in legacy file-based seed storage, **When** the synchronization migration runs, **Then** all valid business entities (consultation bookings, pricing rules, content pages, businesses, reviews) are ingested into the authoritative relational schema without data loss or duplicate primary keys.
3. **Given** any administrative query (such as user dossiers, audit logs, or financial overview KPIs), **When** executed, **Then** the metrics reflect the live database state rather than stale in-memory arrays.

---

### User Story 4 - Secrets Isolation & Configuration Hygiene (Priority: P2)

As a security engineer and compliance officer, I need all third-party API keys, email credentials, database connection strings, and encryption secrets to be strictly managed through externalized environment variables without raw secrets committed to version control, so that credentials cannot be compromised.

**Why this priority**:
Active email gateway tokens and API credentials were found stored in repository configuration files. Isolating secrets and providing automated credential validation prevents unauthorized third-party service exploitation.

**Independent Test**:
Can be tested independently by running repository secret scans and verifying that all third-party integrations (SMTP, SMS gateways, database) load credentials dynamically from environment variables, failing fast with descriptive configuration errors when required keys are omitted.

**Acceptance Scenarios**:
1. **Given** the application repository, **When** inspecting tracked files and templates, **Then** no active production secrets, passwords, or API keys are present in source code or committed files.
2. **Given** a missing or default `JWT_SECRET` in a production environment, **When** the server initializes, **Then** the application refuses to start and logs a critical configuration error instructing the operator to provide a secure secret.
3. **Given** external communication providers (Brevo SMTP, SendGrid, SMS gateways), **When** credentials are not supplied, **Then** the system gracefully falls back to mock/simulator mode with clear administrative warnings without crashing.

---

### User Story 5 - Automated Security & Regression Test Coverage (Priority: P2)

As a quality assurance and engineering lead, I need a comprehensive regression test suite that verifies all security boundaries, role enforcement, financial math, and marketplace workflows, so that future updates do not reintroduce vulnerabilities or break existing capabilities.

**Why this priority**:
Ensuring that fixes for credential bypasses, authorization loopholes, and escrow safety remain permanent requires automated regression tests integrated into the test harness.

**Independent Test**:
Can be tested independently by executing the test suite via command line and verifying that 100% of security test cases, authorization matrix tests, and end-to-end task workflows pass successfully.

**Acceptance Scenarios**:
1. **Given** the automated test runner, **When** executing the security test suite, **Then** it tests and confirms rejection of bypass passwords, unauthorized escrow release attempts, role escalation, and duplicate withdrawal attacks.
2. **Given** existing marketplace features (online tasks, physical tasks, proposals, deliveries, reviews, wallet deposits), **When** regression tests run, **Then** all existing user flows pass without regression.

---

### Edge Cases

- **Concurrent Escrow Completion**: Two requests to complete the same consultation or task milestone arrive simultaneously; database transaction locks or status verification must process the first and reject the second as already completed.
- **Unauthenticated Session in Consultation Room**: A user opens a direct meeting URL (`/consult/room/:id`) without a session token; the room interface must display a guest view with view-only or restricted access, preventing prescription issuance or escrow manipulation.
- **Missing or Invalid Foreign Key References**: Seed or legacy JSON contains consultation bookings referencing deleted user IDs; ingestion must handle null foreign keys safely without aborting migration.
- **Malformed Webhook or Callback**: An external payment callback sends unexpected or altered payloads; the system must reject unsigned or unverifiable inputs and preserve existing wallet balance.

---

## Requirements *(mandatory)*

### Functional Requirements

#### Authentication & Authorization Hardening (Critical - P1)
- **FR-001**: System MUST strictly authenticate user credentials against cryptographic password hashes with secure salt rounds and MUST NOT allow any plain-text password match or hardcoded bypass credentials.
- **FR-002**: System MUST enforce authentication on all user-specific, financial, proposal, delivery, and consultation mutation endpoints using cryptographic token validation.
- **FR-003**: System MUST enforce role-based access control, restricting administrative routes strictly to verified users with the `admin` role.
- **FR-004**: System MUST fail securely on invalid or expired authentication tokens, returning standardized 401 Unauthorized responses without leaking internal stack traces.

#### Escrow & Financial Integrity (Critical - P1)
- **FR-005**: System MUST enforce that only the booking client or a verified administrator can complete a consultation booking and authorize escrow payout to the specialist.
- **FR-006**: System MUST enforce that only the booking client, specialist, or a verified administrator can cancel a consultation booking and authorize an escrow refund.
- **FR-007**: System MUST record immutable transaction ledger entries for all escrow holds, escrow releases, refunds, platform fees, and wallet deposits.
- **FR-008**: System MUST implement idempotency safeguards on milestone approvals and consultation completions to prevent duplicate payouts.
- **FR-009**: System MUST prevent withdrawals that exceed the user's available (unfrozen and non-escrowed) balance.

#### Unified Data Persistence & Migration (Critical - P1)
- **FR-010**: System MUST use the authoritative relational database for all production business entities, including consultation bookings, room notes, pricing rules, reviews, and CMS configurations.
- **FR-011**: System MUST provide a lossless migration script that synchronizes any remaining entity data currently stored in `xtraearn_db.json` into the authoritative database schema.
- **FR-012**: System MUST eliminate divergence between in-memory state and the database by ensuring all administrative actions (such as user balance adjustments, wallet freezes, KYC reviews, and status changes) commit to the database.

#### Configuration & Secrets Management (High - P2)
- **FR-013**: System MUST load all sensitive credentials (database passwords, JWT secret keys, third-party API keys, SMTP credentials) strictly from external environment configuration.
- **FR-014**: System MUST validate that required production configuration variables are set upon startup, rejecting insecure default secrets in production mode.
- **FR-015**: System MUST provide a sanitized `.env.example` file containing descriptive placeholders without any live API keys or credentials.

#### Preservation of Existing Business Workflows (High - P2)
- **FR-016**: System MUST preserve all existing micro-task marketplace workflows: task creation, online/physical classification, search and filtering, proposal submission, escrow hold, deliverable upload with file attachments, rework cycles, and ratings.
- **FR-017**: System MUST preserve existing specialist directory browsing, package pricing, video meeting room interfaces, and digital prescription pad features.
- **FR-018**: System MUST preserve existing PDF invoice and payment receipt generation functionality.
- **FR-019**: System MUST preserve existing referral code generation, invite tracking, and bonus claims.
- **FR-020**: System MUST preserve existing multi-channel notifications (in-app feed, HTML transactional emails, and SMS gateway abstractions).

#### Architecture Stabilization & Maintainability (Medium - P3 / Technical Debt)
- **FR-021**: System MUST isolate modular route handlers and business services rather than adding new monolithic logic to `server/store.js`.
- **FR-022**: System MUST add structured error logging with contextual request correlation for failed security events and financial operations.

---

### Key Entities

- **User**: Represents platform actors (Clients, Freelancers, Specialists, Admins) with role, verification status, contact details, and cryptographic credentials.
- **Wallet**: Financial account holding available balance, escrow-locked balance, and frozen balance.
- **Transaction**: Immutable double-entry financial record documenting debits, credits, platform commissions, reference entities, and balance before/after.
- **Task**: Marketplace gig with category, task type (online/physical), location, budget, delivery timeline, and escrow lifecycle status (`open`, `in_progress`, `delivered`, `completed`, `cancelled`).
- **Task Delivery**: Submitted deliverable with notes, attachments JSON, and client approval/rework status.
- **Consultation Booking**: Scheduled advisory or telehealth session with client details, specialist details, fee, escrow status (`held_in_escrow`, `released_to_specialist`, `refunded_to_client`), meeting room link, and prescription pad notes.
- **Review**: Mutual rating (1–5 stars) and feedback text linked to completed tasks and consultation sessions.
- **Pricing Rule**: Contextual commission and take-rate rule evaluated through the multi-tier pricing hierarchy.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of unauthorized login attempts using hardcoded bypass passwords are confirmed rejected across all user accounts.
- **SC-002**: 100% of consultation escrow release and cancellation requests from unauthorized non-participants are rejected with 403 Forbidden.
- **SC-003**: 0% duplicate payouts occur when milestone approvals or consultation completions are triggered multiple times concurrently.
- **SC-004**: 100% of business entities created or modified in production persist across service restarts without relying on in-memory files.
- **SC-005**: 0 hardcoded production credentials, live API keys, or SMTP passwords remain in tracked source files or template configurations.
- **SC-006**: 100% of existing functional tests in the end-to-end suite (`test-api.js`) pass alongside new security and regression tests.

---

## Assumptions

- **Environment**: The production environment operates on Node.js 18+ with an active MySQL 8.x instance configured through standard environment variables (`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`).
- **Database Schema**: The existing relational schema (`database/schema.sql`) already defines tables for users, tasks, wallets, consultations, reviews, and transactions; hardening will utilize these existing tables without requiring breaking structural redesigns.
- **Backward Compatibility**: Existing clients and freelancers will retain their current login credentials, wallet balances, task histories, and ratings.
- **Third-Party Gateways**: Where live production credentials for external SMS gateways or official bKash merchant merchant APIs are not yet provisioned, the platform's existing fallback/simulator handlers remain active for local and staging environments.

---

## Classification: Critical Fixes vs. Optional Technical Debt

### Phase 1: Critical Security & Integrity Fixes (Mandatory Before Production)
1. **Remove Hardcoded Password Bypass**: Purge plain-text password fallback checks from `server/routes/auth.js`.
2. **Consultation Escrow Authorization**: Enforce strict client/admin verification on `/api/consult/booking/:id/complete` and `/api/consult/booking/:id/cancel`.
3. **Secrets Sanitization**: Remove live SendGrid and Brevo API tokens from tracked files; update `.env.example`.
4. **Authoritative Consultation Persistence**: Ensure consultation bookings, completions, and digital prescription notes commit to the MySQL `consultation_bookings` table rather than solely in-memory `mem()`.
5. **Security Regression Tests**: Add automated test assertions verifying bypass password rejection and escrow unauthorized access prevention.

### Phase 2: Architecture Stabilization & Debt Improvements (Optional / Secondary)
1. **Monolithic Store Decomposition**: Incrementally extract consultation, admin, and CMS domain handlers out of the 19,900-line `server/store.js` into focused service modules.
2. **Frontend Admin Bundle Splitting**: Break down the 1.1MB `public/admin.js` into smaller lazy-loaded panel scripts.
3. **Strict WebRTC Signaling**: Upgrade the polling-based consultation room communication to a dedicated WebSocket or SSE connection.
4. **Live Merchant Payment Gateways**: Replace simulated wallet deposits with official bKash/Nagad Tokenized Checkout webhooks.
