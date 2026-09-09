# Technical Research & Architecture Decisions: Production Hardening

**Feature**: `specs/001-production-hardening`  
**Date**: 2026-09-08  
**Status**: Completed  

---

## 1. Authentication Hardening & Bypass Elimination

### Decision
Completely remove the plain-text bypass condition `(password === 'password123' || password === 'Password123!')` from `server/routes/auth.js`. Require that every login attempt compares the submitted password against `user.password_hash` using `bcrypt.compare()`. If no hash exists or comparison fails, return a generic `401 Unauthorized` ("Incorrect email or password").

### Rationale
- The existing plain-text fallback constitutes a critical security vulnerability: any user account—including administrators, enterprise clients, and verified specialists—can currently be accessed by anyone using the default password string regardless of the actual stored hash.
- Genuine users already have valid bcrypt password hashes seeded in `database/schema.sql` and `database/xtraearn_db.json`.
- Generic error messaging prevents account enumeration while salted bcrypt prevents rainbow-table and credential stuffing exploits.

### Alternatives Considered
- **Environment-gated bypass (`if (process.env.NODE_ENV === 'development')`)**: Rejected. Development backdoors frequently leak to staging or production environments and create false positives in security verification suites.
- **Master Admin Password**: Rejected. Violates audit non-repudiation and role-based access control compliance.

---

## 2. Consultation Escrow Authorization & Ownership Guards

### Decision
Upgrade `/api/consult/booking/:id/complete` and `/api/consult/booking/:id/cancel` in `server/routes/consult.js` from `authOptional` to `authRequired`. Enforce strict role and identity validation:
1. **For Completion (`/complete`)**: Only the booking client (`req.user.id === booking.user_id`) or an authorized platform administrator (`req.user.role === 'admin'`) may release escrow funds to the specialist.
2. **For Cancellation (`/cancel`)**: Only the booking client, the assigned specialist (`req.user.id === booking.expert_user_id`), or an administrator may trigger cancellation and escrow refund.
3. Forbid all other callers with a strict `403 Forbidden` response.

### Rationale
- The current implementation accepts unauthenticated calls (`authOptional`) and does not verify caller identity before releasing escrow funds to the specialist's wallet or refunding the client.
- Escrow releases transfer real monetary value. Without ownership verification, malicious actors could sweep funds simply by iterating integer IDs or guessing booking codes.

### Alternatives Considered
- **URL Query Secret Token**: Rejected. URL tokens are routinely leaked through browser histories, HTTP referrers, and proxy logs. Standard JWT bearer tokens tied to authenticated user IDs provide cryptographically verifiable proof of authorization.
- **Specialist-Initiated Self-Payout**: Rejected. To maintain marketplace trust, the paying client must sign off on completion, or an admin must intervene in case of arbitration.

---

## 3. Single Authoritative Persistence Layer (Eliminating Split-Brain)

### Decision
Unify all runtime data storage under the active MySQL database connection (`db.pool.query`) when `mode === 'mysql'`. Specifically:
1. Update consultation booking queries (`completeConsultationBooking`, `cancelConsultationBooking`, `getConsultationRoom`, `getUserConsultationBookings`) to execute SQL queries against `consultation_bookings` and `transactions` rather than only mutating the in-memory `mem()` array.
2. Ensure admin actions (user balance adjustments, wallet freezes, KYC reviews, task status overrides) execute live SQL `UPDATE` / `INSERT` operations against MySQL tables.
3. Ensure digital advice/prescription notes and room chat messages are stored in relational tables or structured JSON columns within the database.
4. Keep the in-memory `mem()` and `xtraearn_db.json` persistence as an automatic fallback **strictly** when MySQL is unreachable.

### Rationale
- In the current system, task posting, user logins, and task deliveries use MySQL, but consultation sessions and several admin sub-panels mutate `mem()` in memory and save to `xtraearn_db.json`.
- This creates a split-brain condition: data modified through one interface is invisible to queries reading from MySQL, and server restarts or multi-instance deployments discard un-synchronized memory state.

### Alternatives Considered
- **Bi-directional JSON-to-SQL Sync Daemon**: Rejected. Periodic bidirectional polling introduces race conditions, merge conflicts, high disk I/O, and data corruption risks. A direct single authoritative database is the standard architectural pattern.
- **Pure Memory Store**: Rejected. Does not satisfy enterprise durability, transactional atomicity, or foreign key relationship requirements for financial ledgers.

---

## 4. Wallet Concurrency & Idempotency Safeguards

### Decision
Implement transactional state checks and idempotency keys on all balance-altering endpoints:
1. **Atomic Status Check**: In consultation completion and task milestone approval, check `status = 'confirmed'` (or `'delivered'`) in the `UPDATE` query:
   ```sql
   UPDATE consultation_bookings 
   SET status = 'completed', escrow_status = 'released_to_specialist', completed_at = NOW() 
   WHERE id = ? AND status = 'confirmed';
   ```
   If the affected rows count is `0`, reject subsequent requests as already processed.
2. **Unique Financial Reference**: Enforce unique transaction codes and reference IDs (`reference_id` + `reference_type`) in `transactions` to prevent duplicate ledger credits under network retries.
3. **Withdrawal Balance Guard**: Use atomic conditional updates:
   ```sql
   UPDATE users 
   SET wallet_balance = wallet_balance - ? 
   WHERE id = ? AND wallet_balance >= ?;
   ```
   If row count is 0, reject immediately with `400 Bad Request` ("Insufficient available balance").

### Rationale
- Under concurrent double-clicks or automated retries, non-atomic read-then-write operations cause race conditions that result in double payouts or negative balances.

### Alternatives Considered
- **In-Memory Mutex Lock**: Rejected. Only works within a single Node.js process thread and fails if multiple processes or cluster workers are run.

---

## 5. Secrets Isolation & Environment Sanitization

### Decision
1. Sanitize `.env` by replacing live SendGrid API keys and Brevo SMTP passwords with environment variable references or configuration placeholders.
2. Update `.env.example` with clear documentation for all mandatory and optional environment keys.
3. Add an initialization sanity check in `server/db.js` / `server/index.js` that checks:
   - In production (`NODE_ENV === 'production'`), if `JWT_SECRET` is unset or equals the default string `'xtraearn-dev-secret-change-me'`, abort startup with an explicit fatal error message.
   - If third-party SMTP/SMS credentials are omitted, log a warning and fall back to the safe simulator/mock provider without throwing unhandled exceptions.

### Rationale
- Live secrets in git repositories create extreme security and financial exposure (API quota theft, unauthorized email spamming).
- Weak or default JWT signing keys allow attackers to forge tokens for any user ID, completely bypassing role and identity checks.

### Alternatives Considered
- **Hardcoded Secret Vault**: Rejected. Proprietary secret vaults require external infrastructure dependencies not suitable for standard deployments. Standard 12-factor environment variables provide security without overhead.

---

## 6. Non-Destructive Preservation Strategy

### Decision
Execute hardening surgically:
1. Preserve all existing route URL signatures, request payloads, and response JSON formats across the 24 route modules.
2. Preserve all 55+ working scenarios in `server/test-api.js` (auth, marketplace, bids, escrow, chat, deliveries, reviews, invoices).
3. Do not modify or break frontend UI contracts in `app.js`, `task.js`, `wallet.js`, `consult.js`, or `admin.js`.
4. Implement backward-compatible database views (`wallet_transactions`, `v_top_earners`, etc.) so legacy query structures remain functional.

### Rationale
- The user explicitly requested architecture stabilization without rewriting working functionality. Surgical hardening delivers maximum security and consistency while eliminating regression risk.
