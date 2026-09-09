# Quickstart & Verification Guide: Production Hardening

**Feature**: `specs/001-production-hardening`  
**Date**: 2026-09-08  
**Status**: Completed  

---

## 1. Prerequisites

1. **Node.js**: Version 18.0.0 or higher (`node -v`).
2. **MySQL Server**: Running on `localhost:3306` (e.g. via XAMPP, Laragon, or standalone MySQL 8).
3. **Dependencies**: Installed in project root (`npm install`).
4. **Active Database**: Provisioned with live seed data (`npm run db:setup`).

---

## 2. Environment Verification

Inspect your local configuration:
```powershell
Get-Content .env
```
Confirm:
- `DB_NAME=xtraearn`
- `DB_USER=root`
- `JWT_SECRET` is set to a secure string (minimum 32 characters).
- No sensitive production API keys are committed in source control.

---

## 3. Automated Security & Functional Validation Scenarios

### Scenario A: Authentication Security & Bypass Password Rejection
**Purpose**: Verify that hardcoded bypass passwords (`password123` / `Password123!`) are strictly rejected and only valid bcrypt credentials succeed.

**Run**:
```powershell
node -e "
const BASE = 'http://localhost:3000';
(async () => {
  // Test 1: Hardcoded bypass attempt (Must be rejected)
  const resBypass = await fetch(BASE + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@xtraearn.com', password: 'password123' })
  });
  console.log('Bypass Attempt Status:', resBypass.status, resBypass.status === 401 ? '✅ PASS' : '❌ FAIL');

  // Test 2: Valid credential attempt
  const resValid = await fetch(BASE + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'rahat@example.com', password: 'Password123!' })
  });
  const data = await resValid.json();
  console.log('Valid Login Status:', resValid.status, data.token ? '✅ PASS' : '❌ FAIL');
})();
"
```

---

### Scenario B: Consultation Escrow Authorization & Ownership Verification
**Purpose**: Verify that an unauthenticated caller or unauthorized user cannot trigger consultation completion or escrow release.

**Run**:
```powershell
node -e "
const BASE = 'http://localhost:3000';
(async () => {
  // Attempt completion without token or with random user token
  const res = await fetch(BASE + '/api/consult/booking/16/complete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  console.log('Unauthenticated Consultation Release Status:', res.status, res.status === 401 || res.status === 403 ? '✅ PASS (Protected)' : '❌ FAIL (Vulnerable)');
})();
"
```

---

### Scenario C: Full Regression & Marketplace Verification Suite
**Purpose**: Verify that existing task, wallet, escrow, chat, delivery, and review workflows remain 100% operational.

**Run**:
```powershell
node server/test-api.js
```
**Expected Outcome**:
All 50+ core functional test assertions report `PASS` with zero regressions on live MySQL data.

---

### Scenario D: Database Persistence & Durability Check
**Purpose**: Verify that session notes, consultations, and wallet ledger updates survive service restarts.

**Steps**:
1. Check live database mode:
   ```powershell
   node -e "fetch('http://localhost:3000/api/health').then(r => r.json()).then(console.log)"
   ```
   *Expected Output*: `{ ok: true, mode: 'mysql', ... }`
2. Perform a financial transaction or consultation booking update.
3. Restart the server:
   ```powershell
   npm start
   ```
4. Query the record to confirm the state was durably persisted in MySQL.
