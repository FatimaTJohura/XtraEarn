# Tasks: XtraEarn Production Hardening and Architecture Stabilization

**Feature**: `specs/001-production-hardening` | **Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

---

## Phase 1: Setup (Environment & Tooling)

**Purpose**: Baseline repository configuration and security audit preparation

- [X] T001 Audit and sanitize committed secrets in `.env` and create `.env.example` with descriptive placeholders in `c:\Users\BCC_User\.zcode\workspace\default\.env.example`
- [X] T002 [P] Configure production environment safety validator in `c:\Users\BCC_User\.zcode\workspace\default\server\index.js`
- [X] T003 [P] Verify MySQL connection health and active schema integrity via `c:\Users\BCC_User\.zcode\workspace\default\server\db.js`

---

## Phase 2: Foundational (Blocking Security Prerequisites)

**Purpose**: Establish core security guards, session validation helpers, and error sanitation needed across all user stories

- [X] T004 Enhance session and role verification helper functions in `c:\Users\BCC_User\.zcode\workspace\default\server\middleware\auth.js`
- [X] T005 [P] Create security assertion test harness in `c:\Users\BCC_User\.zcode\workspace\default\server\verify-security.js`
- [X] T006 Ensure database views (`wallet_transactions`, `v_top_earners`) are active in `c:\Users\BCC_User\.zcode\workspace\default\database\schema.sql`

**Checkpoint**: Core middleware, environment guards, and test scaffolding ready. User story implementation can now proceed.

---

## Phase 3: User Story 1 - Secure Identity & Credential Protection (Priority: P1) 🎯 MVP

**Goal**: Remove all hardcoded password bypasses and guarantee that only salted cryptographic Bcrypt matches grant account access.

**Independent Test**: Attempt login with `password123` / `Password123!` across multiple accounts; all must be rejected with 401 Unauthorized, while valid credentials succeed.

### Tests for User Story 1
- [X] T007 [P] [US1] Add automated bypass rejection and invalid password tests in `c:\Users\BCC_User\.zcode\workspace\default\server\verify-security.js`

### Implementation for User Story 1
- [X] T008 [US1] Purge hardcoded plain-text password fallback comparison in `c:\Users\BCC_User\.zcode\workspace\default\server\routes\auth.js`
- [X] T009 [US1] Enforce strict Bcrypt credential validation and standard error response formatting in `c:\Users\BCC_User\.zcode\workspace\default\server\routes\auth.js`
- [X] T010 [US1] Validate password change endpoint current-password Bcrypt checks in `c:\Users\BCC_User\.zcode\workspace\default\server\routes\auth.js`

**Checkpoint**: User Story 1 complete. Password bypasses are eliminated. Only genuine cryptographically verified logins are allowed.

---

## Phase 4: User Story 2 - Escrow, Consultation & Wallet Authorization Integrity (Priority: P1)

**Goal**: Protect consultation escrow releases, cancellations, and wallet withdrawals with strict caller ownership checks and atomic balance guards.

**Independent Test**: Call `/api/consult/booking/:id/complete` without a token or with an unrelated user token; request must be rejected with 401 or 403. Attempt an over-balance withdrawal; request must fail with 400 without balance deduction.

### Tests for User Story 2
- [X] T011 [P] [US2] Add unauthorized consultation escrow release and over-balance withdrawal tests in `c:\Users\BCC_User\.zcode\workspace\default\server\verify-security.js`

### Implementation for User Story 2
- [X] T012 [US2] Upgrade consultation booking complete and cancel endpoints to `authRequired` in `c:\Users\BCC_User\.zcode\workspace\default\server\routes\consult.js`
- [X] T013 [US2] Implement client and admin ownership validation on consultation completion in `c:\Users\BCC_User\.zcode\workspace\default\server\routes\consult.js`
- [X] T014 [US2] Implement client, specialist, and admin ownership validation on consultation cancellation in `c:\Users\BCC_User\.zcode\workspace\default\server\routes\consult.js`
- [X] T015 [US2] Add atomic available-balance checks to withdrawal processing in `c:\Users\BCC_User\.zcode\workspace\default\server\routes\wallet.js`
- [X] T016 [US2] Enforce atomic state transition (`WHERE status = 'confirmed'`) and idempotency on escrow payouts in `c:\Users\BCC_User\.zcode\workspace\default\server\store.js`

**Checkpoint**: User Story 2 complete. Escrow funds and withdrawals are protected against unauthorized manipulation, race conditions, and duplicate execution.

---

## Phase 5: User Story 3 - Authoritative Unified Data Persistence (Priority: P1)

**Goal**: Unify runtime persistence under MySQL for consultation bookings, digital advice notes, and administrative actions, eliminating split-brain data loss.

**Independent Test**: Complete a consultation booking or perform an admin user status change, restart the server, and verify the record persists durably in MySQL.

### Tests for User Story 3
- [X] T017 [P] [US3] Add MySQL persistence and durability verification test in `c:\Users\BCC_User\.zcode\workspace\default\server\verify-security.js`

### Implementation for User Story 3
- [X] T018 [US3] Implement MySQL queries for `completeConsultationBooking` and `cancelConsultationBooking` in `c:\Users\BCC_User\.zcode\workspace\default\server\store.js`
- [X] T019 [US3] Implement MySQL queries for consultation room dossier retrieval and message storage in `c:\Users\BCC_User\.zcode\workspace\default\server\store.js`
- [X] T020 [US3] Implement MySQL queries for digital advice and prescription notes in `c:\Users\BCC_User\.zcode\workspace\default\server\store.js`
- [X] T021 [US3] Update admin user status, wallet freeze, and balance adjustment methods to commit directly to MySQL in `c:\Users\BCC_User\.zcode\workspace\default\server\store.js`

**Checkpoint**: User Story 3 complete. State transitions commit directly to the authoritative database and survive server restarts.

---

## Phase 6: User Story 4 - Secrets Isolation & Configuration Hygiene (Priority: P2)

**Goal**: Ensure no active credentials are committed to version control and require secure configuration in production.

**Independent Test**: Verify that `.env` contains no raw production API keys, and server startup in `NODE_ENV=production` safely halts if `JWT_SECRET` is insecure or unset.

### Implementation for User Story 4
- [X] T022 [P] [US4] Remove active SendGrid and Brevo credentials from tracked source files and update `c:\Users\BCC_User\.zcode\workspace\default\.env`
- [X] T023 [P] [US4] Add production JWT secret strength validation check on server startup in `c:\Users\BCC_User\.zcode\workspace\default\server\index.js`
- [X] T024 [US4] Implement graceful simulator fallback when third-party notification credentials are omitted in `c:\Users\BCC_User\.zcode\workspace\default\server\notificationService.js`

**Checkpoint**: User Story 4 complete. Secret exposure risk is eliminated and configuration validation fails fast on insecure defaults.

---

## Phase 7: User Story 5 - Automated Security & Regression Test Coverage (Priority: P2)

**Goal**: Establish an automated test suite verifying all hardened security boundaries and proving zero regressions across existing marketplace features.

**Independent Test**: Run `node server/verify-security.js` and `node server/test-api.js`; both suites pass with 100% success.

### Implementation for User Story 5
- [X] T025 [P] [US5] Execute security regression test suite in `c:\Users\BCC_User\.zcode\workspace\default\server\verify-security.js`
- [X] T026 [US5] Fix test harness compatibility issues and execute full marketplace regression suite in `c:\Users\BCC_User\.zcode\workspace\default\server\test-api.js`
- [X] T027 [US5] Validate end-to-end task lifecycle (post, apply, escrow accept, delivery, rework, approval, review, invoice download) via `c:\Users\BCC_User\.zcode\workspace\default\server\test-api.js`

**Checkpoint**: User Story 5 complete. Full automated regression confidence achieved.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final verification, quickstart validation, and operational documentation

- [X] T028 [P] Validate all quickstart test scenarios documented in `c:\Users\BCC_User\.zcode\workspace\default\specs\001-production-hardening\quickstart.md`
- [X] T029 Update system documentation with security hardening and single-store architecture in `c:\Users\BCC_User\.zcode\workspace\default\README.md`
- [X] T030 Verify clean server startup and live MySQL health status via `c:\Users\BCC_User\.zcode\workspace\default\server\index.js`

---

## Dependencies & Execution Order

### Phase Dependencies
- **Setup (Phase 1)**: No dependencies — starts immediately.
- **Foundational (Phase 2)**: Depends on Phase 1 completion — blocks all user stories.
- **User Story 1 (Phase 3 - P1)**: Depends on Phase 2 — MVP milestone.
- **User Story 2 (Phase 4 - P1)**: Depends on Phase 2 and User Story 1 completion.
- **User Story 3 (Phase 5 - P1)**: Depends on Phase 2, User Story 1, and User Story 2.
- **User Story 4 (Phase 6 - P2)**: Can run in parallel with User Story 3 (isolated config files).
- **User Story 5 (Phase 7 - P2)**: Depends on completion of User Stories 1, 2, 3, and 4.
- **Polish (Phase 8)**: Depends on all phases being complete.

---

## Parallel Opportunities

```bash
# Foundational parallel tasks:
Task T005: "Create security assertion test harness in server/verify-security.js"
Task T006: "Ensure database views are active in database/schema.sql"

# User Story 1 parallel tasks:
Task T007: "Add automated bypass rejection tests in server/verify-security.js"
Task T008: "Purge hardcoded plain-text password fallback in server/routes/auth.js"

# User Story 4 parallel tasks:
Task T022: "Remove active credentials in .env and update .env.example"
Task T023: "Add production JWT secret validation in server/index.js"
```

---

## Implementation Strategy

### MVP Milestone (Phases 1, 2, & 3)
1. Complete Setup and Foundational prerequisites.
2. Complete User Story 1 (Hardcoded password bypass removal).
3. **STOP and VALIDATE**: Confirm that no account can be accessed via `password123` and that genuine credentials log in successfully.

### Production Readiness Milestone (Phases 4, 5, 6, & 7)
1. Lock down consultation escrow endpoints with ownership checks (User Story 2).
2. Migrate consultation and admin state mutations to MySQL (User Story 3).
3. Sanitize environment secrets and add startup fail-safe checks (User Story 4).
4. Run comprehensive security test suite and full marketplace regression suite (User Story 5).
5. Validate quickstart run guide (Phase 8).
