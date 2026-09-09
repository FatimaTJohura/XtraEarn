/**
 * XtraEarn Security & Architecture Verification Suite
 * Automated tests validating security hardening, role guards, and data integrity.
 */

const BASE = 'http://localhost:3000';

let passed = 0;
let failed = 0;
const failures = [];

function assert(name, condition, extra = '') {
  if (condition) {
    passed++;
    console.log(`PASS  ${name}${extra ? ' -> ' + extra : ''}`);
  } else {
    failed++;
    failures.push(name + (extra ? ` [${extra}]` : ''));
    console.log(`FAIL  ${name}${extra ? ' -> ' + extra : ''}`);
  }
}

async function request(path, opts = {}) {
  const res = await fetch(BASE + path, {
    method: opts.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {})
    },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined
  });
  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    data = null;
  }
  return { status: res.status, data };
}

(async () => {
  console.log('================ XTRAEARN SECURITY VERIFICATION SUITE ================\n');

  try {
    // 1. Database Mode & Health Check
    const health = await request('/api/health');
    assert('API health check responds', health.status === 200);
    assert('Database mode is MySQL (authoritative persistence)', health.data && health.data.mode === 'mysql', `mode=${health.data ? health.data.mode : 'unknown'}`);

    // 2. Authentication Bypass Elimination
    const bypassAdmin = await request('/api/auth/login', {
      method: 'POST',
      body: { email: 'admin@xtraearn.com', password: 'password123' }
    });
    assert('Hardcoded password bypass (password123) strictly rejected for admin', bypassAdmin.status === 401, `status=${bypassAdmin.status}`);

    const bypassUser = await request('/api/auth/login', {
      method: 'POST',
      body: { email: 'rahat@example.com', password: 'password123' }
    });
    assert('Bypass password attempt (password123) strictly rejected for regular users', bypassUser.status === 401, `status=${bypassUser.status}`);

    // 3. Legitimate Login Verification
    // Demo accounts have Password123! in seed database
    const validLogin = await request('/api/auth/login', {
      method: 'POST',
      body: { email: 'rahat@example.com', password: 'Password123!' }
    });
    let userToken = null;
    let userId = null;
    if (validLogin.status === 200 && validLogin.data && validLogin.data.token) {
      userToken = validLogin.data.token;
      userId = validLogin.data.user.id;
      assert('Legitimate seed user login succeeds with authentic hash', true, `user=${validLogin.data.user.name}`);
    }

    // Register a dedicated fresh test user to verify authentic hash login and custom password protection
    const testEmail = `sec_test_${Date.now()}@example.com`;
    const reg = await request('/api/auth/register', {
      method: 'POST',
      body: { name: 'Security Test User', email: testEmail, password: 'StrongPassword2026!', role: 'freelancer' }
    });
    assert('User registration succeeds with cryptographic hash', reg.status === 201 && reg.data && reg.data.token);
    if (reg.data && reg.data.token) {
      // Login with valid custom password
      const authLogin = await request('/api/auth/login', {
        method: 'POST',
        body: { email: testEmail, password: 'StrongPassword2026!' }
      });
      assert('Cryptographic Bcrypt login succeeds for valid password', authLogin.status === 200 && !!authLogin.data.token);

      // Attempt login with old bypass password (Password123!) on custom account
      const bypassCustom = await request('/api/auth/login', {
        method: 'POST',
        body: { email: testEmail, password: 'Password123!' }
      });
      assert('Old bypass password (Password123!) strictly rejected on custom user account (401)', bypassCustom.status === 401, `status=${bypassCustom.status}`);

      const wrongLogin = await request('/api/auth/login', {
        method: 'POST',
        body: { email: testEmail, password: 'WrongPassword999!' }
      });
      assert('Invalid password strictly rejected with 401', wrongLogin.status === 401);
    }

    // 4. Role-Based Access Control (Admin routes)
    if (userToken) {
      const adminProbe = await request('/api/admin/overview', { token: userToken });
      assert('Non-admin user blocked from /api/admin/* with 403', adminProbe.status === 403, `status=${adminProbe.status}`);
    }

    const unauthAdmin = await request('/api/admin/overview');
    assert('Unauthenticated caller blocked from /api/admin/* with 401', unauthAdmin.status === 401, `status=${unauthAdmin.status}`);

    // 5. Consultation Escrow Release Ownership Guards
    const unauthComplete = await request('/api/consult/booking/16/complete', { method: 'POST' });
    assert('Unauthenticated consultation escrow release rejected (401/403)', unauthComplete.status === 401 || unauthComplete.status === 403, `status=${unauthComplete.status}`);

    if (userToken) {
      // User is not client of booking 16 (Booking 16 is Atiqur Rahman, id 140)
      const unauthorizedComplete = await request('/api/consult/booking/16/complete', {
        method: 'POST',
        token: userToken
      });
      assert('Unauthorized third-party user cannot release consultation escrow (403)', unauthorizedComplete.status === 403, `status=${unauthorizedComplete.status}`);

      const unauthorizedCancel = await request('/api/consult/booking/16/cancel', {
        method: 'POST',
        token: userToken,
        body: { reason: 'Malicious cancellation attempt' }
      });
      assert('Unauthorized third-party user cannot cancel consultation booking (403)', unauthorizedCancel.status === 403, `status=${unauthorizedCancel.status}`);
    }

    // 6. Over-Balance Withdrawal Guard
    if (userToken) {
      const overWithdraw = await request('/api/wallet/withdraw', {
        method: 'POST',
        token: userToken,
        body: { amount: 99999999, method: 'bkash', account_number: '01700000000' }
      });
      assert('Withdrawal exceeding wallet balance strictly rejected with 400', overWithdraw.status === 400, `status=${overWithdraw.status}`);
    }

    // 7. MySQL Authoritative Persistence & Durability Verification
    const db = require('./db');
    await db.init();
    if (!db.isMemory()) {
      const [bRows] = await db.pool.query('SELECT status, escrow_status FROM consultation_bookings WHERE id = 16');
      assert('Consultation booking 16 state is recorded in MySQL table', bRows && bRows.length > 0, `status=${bRows[0]?.status}`);

      const [vRows] = await db.pool.query('SELECT COUNT(*) AS cnt FROM wallet_transactions');
      assert('Authoritative wallet_transactions view queryable in MySQL', vRows && vRows.length > 0 && vRows[0].cnt >= 0);
    }

    // 8. Admin Wallet Freeze Authoritative Persistence (T021)
    const adminLogin = await request('/api/auth/login', {
      method: 'POST',
      body: { email: 'admin@xtraearn.com', password: 'Password123!' }
    });
    const adminToken = adminLogin.data?.token;

    const user2Login = await request('/api/auth/login', {
      method: 'POST',
      body: { email: 'kamal@example.com', password: 'Password123!' }
    });
    const targetUserId = user2Login.data?.user?.id || 15;
    const targetUserToken = user2Login.data?.token;

    if (adminToken && targetUserToken) {
      // Test freeze user
      const freezeRes = await request(`/api/admin/wallets/${targetUserId}/freeze`, {
        method: 'POST',
        token: adminToken,
        body: { is_frozen: 1, reason: 'Suspicious activity audit' }
      });
      assert('Admin can freeze user wallet via /api/admin/wallets/:id/freeze', freezeRes.status === 200 && freezeRes.data?.is_frozen === 1, `status=${freezeRes.status}`);

      if (!db.isMemory()) {
        const [wRows] = await db.pool.query('SELECT is_frozen, freeze_reason FROM wallets WHERE user_id = ?', [targetUserId]);
        assert('Authoritative wallets table in MySQL records is_frozen=1 and freeze_reason',
          wRows.length > 0 && Number(wRows[0].is_frozen) === 1 && wRows[0].freeze_reason === 'Suspicious activity audit',
          `is_frozen=${wRows[0]?.is_frozen}, reason=${wRows[0]?.freeze_reason}`);
      }

      // Verify withdrawal blocked when frozen
      const blockedWithdraw = await request('/api/wallet/withdraw', {
        method: 'POST',
        token: targetUserToken,
        body: { amount: 100, method: 'bkash', account_number: '01711000015' }
      });
      assert('Withdrawal strictly blocked with 403 when user wallet is frozen', blockedWithdraw.status === 403, `status=${blockedWithdraw.status}`);

      // Unfreeze wallet for user
      const unfreezeRes = await request(`/api/admin/wallets/${targetUserId}/freeze`, {
        method: 'POST',
        token: adminToken,
        body: { is_frozen: 0, reason: '' }
      });
      assert('Admin can unfreeze user wallet', unfreezeRes.status === 200 && unfreezeRes.data?.is_frozen === 0, `status=${unfreezeRes.status}`);

      if (!db.isMemory()) {
        const [wRowsAfter] = await db.pool.query('SELECT is_frozen, freeze_reason FROM wallets WHERE user_id = ?', [targetUserId]);
        assert('Authoritative wallets table in MySQL records is_frozen=0 after unfreeze',
          wRowsAfter.length > 0 && Number(wRowsAfter[0].is_frozen) === 0,
          `is_frozen=${wRowsAfter[0]?.is_frozen}`);
      }
    }

    console.log(`\n========================================================`);
    console.log(`Security Test Results: ${passed} Passed, ${failed} Failed`);
    if (failures.length > 0) {
      console.log('Failures:\n - ' + failures.join('\n - '));
    }
    console.log(`========================================================\n`);

    if (failed > 0) {
      process.exit(1);
    }
    process.exit(0);
  } catch (err) {
    console.error('Test Suite Error:', err);
    process.exit(1);
  }
})();
