/**
 * Comprehensive Pricing & Monetization Engine Verification Suite
 * Tests end-to-end integration with tasks, escrow, wallets, snapshots, ledger, and rules.
 */

const assert = require('assert');

const BASE_URL = 'http://localhost:3000';

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const data = await res.json();
  if (!res.ok && options.throwOnError !== false) {
    throw new Error(`HTTP ${res.status} on ${endpoint}: ${JSON.stringify(data)}`);
  }
  return { status: res.status, data };
}

async function runVerification() {
  console.log('================================================================');
  console.log('🚀 STARTING PRICING & MONETIZATION ENGINE VERIFICATION SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      fn();
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ FAIL: ${name}`);
      console.error(`     Error: ${err.message}`);
      failed++;
    }
  }

  async function asyncTest(name, fn) {
    try {
      await fn();
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ FAIL: ${name}`);
      console.error(`     Error: ${err.message}`);
      failed++;
    }
  }

  // 0. Authenticate Admin and Test Users
  console.log('--- TEST GROUP 0: Authentication ---');
  let adminToken, clientToken, workerToken;
  await asyncTest('Admin login', async () => {
    const res = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'admin@xtraearn.com', password: 'Password123!' })
    });
    assert.ok(res.data.token, 'Admin token returned');
    adminToken = res.data.token;
  });

  await asyncTest('Client login', async () => {
    const res = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'bdshop@example.com', password: 'Password123!' })
    });
    assert.ok(res.data.token, 'Client token returned');
    clientToken = res.data.token;
  });

  await asyncTest('Worker login', async () => {
    const res = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'rahat@example.com', password: 'Password123!' })
    });
    assert.ok(res.data.token, 'Worker token returned');
    workerToken = res.data.token;
  });

  // 1. Core Rule Rates: 10%, 5%, 1%, 0%
  console.log('\n--- TEST GROUP 1: Multi-Tier Rates (10%, 5%, 1%, 0%) ---');
  await asyncTest('Global Baseline Rate is 10%', async () => {
    const res = await request('/api/pricing/calculate', {
      method: 'POST',
      body: JSON.stringify({ amount: 1000, currency: 'BDT' })
    });
    assert.strictEqual(res.data.calculation.worker.effective_rate_percent, 10);
    assert.strictEqual(res.data.calculation.worker.fee_amount, 100);
    assert.strictEqual(res.data.calculation.worker.net_amount, 900);
  });

  await asyncTest('Category Rules: Design 7%, Programming 5%, Health & Medical 15%', async () => {
    const designRes = await request('/api/pricing/calculate', {
      method: 'POST',
      body: JSON.stringify({ amount: 1000, task: { category: 'Design & Creative' } })
    });
    assert.strictEqual(designRes.data.calculation.worker.effective_rate_percent, 7);
    assert.strictEqual(designRes.data.calculation.worker.fee_amount, 70);
    assert.strictEqual(designRes.data.calculation.worker.net_amount, 930);

    const progRes = await request('/api/pricing/calculate', {
      method: 'POST',
      body: JSON.stringify({ amount: 1000, task: { category: 'Web & Software Development' } })
    });
    assert.strictEqual(progRes.data.calculation.worker.effective_rate_percent, 5);
    assert.strictEqual(progRes.data.calculation.worker.net_amount, 950);

    const medRes = await request('/api/pricing/calculate', {
      method: 'POST',
      body: JSON.stringify({ amount: 1000, task: { category: 'Health & Medical' } })
    });
    assert.strictEqual(medRes.data.calculation.worker.effective_rate_percent, 15);
    assert.strictEqual(medRes.data.calculation.worker.net_amount, 850);
  });

  await asyncTest('User-Specific Overrides: Rahim (5%), Karim (1%), Partner Agency (0%)', async () => {
    // Rahim Ahmed (User #10)
    const rahimRes = await request('/api/pricing/calculate', {
      method: 'POST',
      body: JSON.stringify({ amount: 1000, user: { id: 10 } })
    });
    assert.strictEqual(rahimRes.data.calculation.worker.effective_rate_percent, 5);
    assert.strictEqual(rahimRes.data.calculation.worker.net_amount, 950);

    // Karim Ullah (User #11)
    const karimRes = await request('/api/pricing/calculate', {
      method: 'POST',
      body: JSON.stringify({ amount: 1000, user: { id: 11 } })
    });
    assert.strictEqual(karimRes.data.calculation.worker.effective_rate_percent, 1);
    assert.strictEqual(karimRes.data.calculation.worker.net_amount, 990);

    // Partner Agency (User #12)
    const partnerRes = await request('/api/pricing/calculate', {
      method: 'POST',
      body: JSON.stringify({ amount: 1000, user: { id: 12 } })
    });
    assert.strictEqual(partnerRes.data.calculation.worker.effective_rate_percent, 0);
    assert.strictEqual(partnerRes.data.calculation.worker.fee_amount, 0);
    assert.strictEqual(partnerRes.data.calculation.worker.net_amount, 1000);
    assert.strictEqual(partnerRes.data.calculation.worker.is_zero_fee, true);
  });

  await asyncTest('0% Commission is a Valid Business State (Never null/undefined)', async () => {
    const eidRes = await request('/api/pricing/calculate', {
      method: 'POST',
      body: JSON.stringify({ amount: 2000, campaign_code: 'EID2026' })
    });
    const w = eidRes.data.calculation.worker;
    assert.strictEqual(w.effective_rate_percent, 0);
    assert.notStrictEqual(w.effective_rate_percent, null);
    assert.notStrictEqual(w.effective_rate_percent, undefined);
    assert.strictEqual(w.fee_amount, 0);
    assert.strictEqual(w.net_amount, 2000);
    assert.strictEqual(w.is_zero_fee, true);
  });

  // 2. Pricing Simulator Endpoint & Match Lineage
  console.log('\n--- TEST GROUP 2: Pricing Simulator & Rule Lineage ---');
  await asyncTest('Simulator returns candidate match trace and winning rule', async () => {
    const simRes = await request('/api/pricing/simulate', {
      method: 'POST',
      body: JSON.stringify({
        amount: 2500,
        currency: 'BDT',
        task: { category: 'Design & Creative' },
        user: { id: 10 } // User override (5%) vs Category rule (7%)
      })
    });
    assert.ok(simRes.data.simulation_id, 'Simulation ID returned');
    assert.ok(Array.isArray(simRes.data.rule_hierarchy_trace), 'Rule hierarchy trace returned');
    // Priority 800 (User Rahim 5%) beats Priority 400 (Category Design 7%)
    assert.strictEqual(simRes.data.decision_summary.effective_worker_rate_percent, 5);
    assert.strictEqual(simRes.data.decision_summary.winning_rule.scope_type, 'user');
  });

  // 3. Admin Monetization Hub Endpoints
  console.log('\n--- TEST GROUP 3: Admin Monetization Hub APIs ---');
  let createdRuleId;
  await asyncTest('Admin can list, create, toggle and delete custom pricing rule', async () => {
    // 1. Create a custom campaign rule with 2.5% rate
    const createRes = await request('/api/pricing/rules', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + adminToken },
      body: JSON.stringify({
        rule_code: 'RUL-VERIFY-001',
        name: 'Flash Weekend Promo 2.5%',
        scope_type: 'campaign',
        target: 'weekend_flash',
        campaign_code: 'weekend_flash',
        rate_pct: 2.5,
        priority: 950,
        fee_side: 'worker',
        status: 'active',
        description: 'Temporary flash weekend rate.'
      })
    });
    assert.strictEqual(createRes.status, 201);
    createdRuleId = createRes.data.rule.id;
    assert.ok(createdRuleId, 'Rule ID returned');

    // 2. Verify rule calculates immediately
    const calcRes = await request('/api/pricing/calculate', {
      method: 'POST',
      body: JSON.stringify({ amount: 1000, campaign_code: 'weekend_flash' })
    });
    assert.strictEqual(calcRes.data.calculation.worker.effective_rate_percent, 2.5);
    assert.strictEqual(calcRes.data.calculation.worker.fee_amount, 25);

    // 3. Toggle rule to inactive
    const toggleRes = await request(`/api/pricing/rules/${createdRuleId}/toggle`, {
      method: 'PATCH',
      headers: { 'Authorization': 'Bearer ' + adminToken }
    });
    assert.strictEqual(toggleRes.data.rule.status, 'inactive');

    // 4. Verify fallback after deactivation (returns Global 10%)
    const fallbackRes = await request('/api/pricing/calculate', {
      method: 'POST',
      body: JSON.stringify({ amount: 1000, campaign_code: 'weekend_flash' })
    });
    assert.strictEqual(fallbackRes.data.calculation.worker.effective_rate_percent, 10);

    // 5. Delete temporary rule
    const delRes = await request(`/api/pricing/rules/${createdRuleId}`, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + adminToken }
    });
    assert.strictEqual(delRes.data.success, true);
  });

  await asyncTest('Admin can set user override dynamically via /api/pricing/overrides', async () => {
    const overrideRes = await request('/api/pricing/overrides', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + adminToken },
      body: JSON.stringify({
        user_id: 999,
        rate_percent: 3.5,
        reason: 'Enterprise VIP Freelancer discount'
      })
    });
    assert.strictEqual(overrideRes.data.success, true);

    const calcRes = await request('/api/pricing/calculate', {
      method: 'POST',
      body: JSON.stringify({ amount: 1000, user: { id: 999 } })
    });
    assert.strictEqual(calcRes.data.calculation.worker.effective_rate_percent, 3.5);
    assert.strictEqual(calcRes.data.calculation.worker.fee_amount, 35);
  });

  // 4. End-to-End Escrow, Snapshot & Double-Entry Ledger Flow
  console.log('\n--- TEST GROUP 4: End-to-End Escrow, Snapshots & Ledger ---');
  await asyncTest('End-to-end task flow creates immutable snapshot and ledger records', async () => {
    const store = require('./store');

    // 1. Prepare Client with balance
    const client = await store.getUserById(7); // farhana (client)
    await store.adjustWallet(7, 5000); // ensure ample funds

    // 2. Create Task with category 'Design & Creative' (7% rate)
    const task = await store.createTask({
      clientId: 7,
      title: 'Design Minimalist Logo for Test Suite',
      description: 'End-to-end verification task for pricing and snapshots.',
      category: 'Design & Creative',
      categoryId: 1,
      category_id: 1,
      subcategory: 'Logo & Branding',
      budget: 1000,
      currency: 'BDT'
    });
    assert.ok(task.id, 'Task created');

    // 3. Worker applies to task
    const app = await store.applyToTask(task.id, 1, {
      cover_letter: 'I can deliver this with quality.',
      proposed_rate: 1000,
      delivery_days: 1
    });
    assert.ok(app.id, 'Application created');

    // 4. Hold Escrow with workerId #10 (Rahim Ahmed 5% custom override rule)
    const idempotencyKey = `HOLD-TSK-${task.id}-${Date.now()}`;
    const escrowHoldResult = await store.holdEscrow(task, 7, {
      workerId: 10,
      idempotency_key: idempotencyKey
    });

    assert.ok(escrowHoldResult.snapshot, 'Immutable snapshot created');
    assert.strictEqual(escrowHoldResult.snapshot.is_immutable, true);
    // Rahim gets 5% rate override instead of category 7% or global 10%
    assert.strictEqual(escrowHoldResult.snapshot.worker.commission_rate, 5);
    assert.strictEqual(escrowHoldResult.snapshot.worker.fee_amount, 50);
    assert.strictEqual(escrowHoldResult.snapshot.worker.net_amount, 950);

    // 5. Test Idempotency: Repeating holdEscrow returns identical cached result without deducting wallet twice
    const clientBalanceBefore = (await store.getUserById(7)).wallet_balance;
    const idempotentHoldResult = await store.holdEscrow(task, 7, {
      workerId: 10,
      idempotency_key: idempotencyKey
    });
    const clientBalanceAfter = (await store.getUserById(7)).wallet_balance;
    assert.strictEqual(clientBalanceBefore, clientBalanceAfter, 'Balance not deducted twice');
    assert.strictEqual(idempotentHoldResult.snapshot.id, escrowHoldResult.snapshot.id);

    // 6. Test Snapshot Immutability: Mutate the pricing rule to 20% in the store
    const rahimRule = store.monetizationStore.getRules().find(r => r.id === 10);
    if (rahimRule) rahimRule.rate_pct = 20.0;

    // 7. Release Escrow: Payout MUST use original snapshot (5% -> ৳950 net, NOT 20% -> ৳800)
    const releaseIdempotencyKey = `REL-TSK-${task.id}-${Date.now()}`;
    const releaseResult = await store.releaseEscrow(task, 10, {
      idempotency_key: releaseIdempotencyKey
    });

    assert.strictEqual(releaseResult.payout, 950, 'Payout strictly used original 5% snapshot (৳950), not altered rule');
    assert.strictEqual(releaseResult.fee, 50, 'Platform commission strictly used original snapshot (৳50)');

    // Reset rule back
    if (rahimRule) rahimRule.rate_pct = 5.0;

    // 8. Verify Double-Entry Ledger Entries
    const ledger = store.getFinancialLedger({ taskId: task.id });
    assert.ok(ledger.entries.length >= 2, 'At least 2 ledger entries recorded');
    const fundedEntry = ledger.entries.find(e => e.entry_type === 'escrow_funded');
    const releaseEntry = ledger.entries.find(e => e.entry_type === 'escrow_release');
    const commEntry = ledger.entries.find(e => e.entry_type === 'worker_commission');

    assert.ok(fundedEntry, 'escrow_funded ledger entry found');
    assert.ok(releaseEntry, 'escrow_release ledger entry found');
    assert.ok(commEntry, 'worker_commission ledger entry found');
    assert.strictEqual(fundedEntry.net_amount, 1000);
    assert.strictEqual(releaseEntry.net_amount, 950);
    assert.strictEqual(commEntry.net_amount, 50);
  });

  // 5. Monetization Streams: Memberships, Credits & Leads
  console.log('\n--- TEST GROUP 5: Monetization Streams ---');
  await asyncTest('Memberships listing and subscription', async () => {
    const memRes = await request('/api/pricing/memberships');
    assert.ok(Array.isArray(memRes.data.plans), 'Membership plans array returned');
    assert.ok(memRes.data.plans.length >= 5, 'At least 5 plans present');

    const subRes = await request('/api/pricing/memberships/subscribe', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + workerToken },
      body: JSON.stringify({ plan_id: 'starter', duration_months: 1 })
    });
    assert.strictEqual(subRes.data.success, true);
    assert.strictEqual(subRes.data.subscription.plan_id, 'starter');
    assert.strictEqual(subRes.data.subscription.commission_rate_pct, 7.0);
  });

  await asyncTest('Credit packages listing and purchasing', async () => {
    const pkgRes = await request('/api/pricing/credits/packages');
    assert.ok(Array.isArray(pkgRes.data.packages), 'Packages array returned');

    const buyRes = await request('/api/pricing/credits/purchase', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + clientToken },
      body: JSON.stringify({ package_id: 'cred_100' })
    });
    assert.strictEqual(buyRes.data.success, true);
    assert.strictEqual(buyRes.data.credits_added, 100);
  });

  await asyncTest('Lead marketplace products and purchase', async () => {
    const leadRes = await request('/api/pricing/leads');
    assert.ok(Array.isArray(leadRes.data.leads), 'Leads array returned');

    const buyLeadRes = await request('/api/pricing/leads/purchase', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + workerToken },
      body: JSON.stringify({ lead_id: 'lead_plumbing' })
    });
    assert.strictEqual(buyLeadRes.data.success, true);
    assert.strictEqual(buyLeadRes.data.lead_id, 'lead_plumbing');
  });

  // 6. Financial Ledger & Monetization Analytics
  console.log('\n--- TEST GROUP 6: Financial Ledger & Analytics ---');
  await asyncTest('Admin can query financial ledger with filters', async () => {
    const ledgerRes = await request('/api/pricing/ledger', {
      headers: { 'Authorization': 'Bearer ' + adminToken }
    });
    assert.strictEqual(ledgerRes.data.success, true);
    assert.ok(Array.isArray(ledgerRes.data.entries), 'Entries array returned');
    assert.ok(ledgerRes.data.total >= 1, 'Total ledger entries > 0');
  });

  await asyncTest('Admin can query monetization KPIs and take-rate analytics', async () => {
    const kpiRes = await request('/api/pricing/analytics', {
      headers: { 'Authorization': 'Bearer ' + adminToken }
    });
    assert.strictEqual(kpiRes.data.success, true);
    const kpis = kpiRes.data.kpis;
    assert.ok(kpis.active_rules_count >= 14, 'Active rules >= 14');
    assert.ok(typeof kpis.take_rate_pct === 'number', 'Take-rate pct is number');
    assert.ok(kpis.breakdown, 'Revenue breakdown object present');
  });

  console.log('\n================================================================');
  console.log(`🏁 VERIFICATION SUITE COMPLETED: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runVerification().catch(err => {
  console.error('Unhandled verification error:', err);
  process.exit(1);
});
