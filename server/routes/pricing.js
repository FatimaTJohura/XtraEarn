const express = require('express');
const router = express.Router();
const store = require('../store');
const { authRequired, adminRequired, authOptional } = require('../middleware/auth');
const { pricingEngine } = require('../pricingEngine');
const { monetizationStore } = require('../monetizationStore');

// Supported Currencies Configuration & Exchange Rates
const CURRENCIES = [
  { code: 'BDT', symbol: '৳', name: 'Bangladeshi Taka', rate: 1.0, is_default: true, min_budget: 20 },
  { code: 'USD', symbol: '$', name: 'US Dollar', rate: 120.0, is_default: false, min_budget: 1 },
  { code: 'EUR', symbol: '€', name: 'Euro', rate: 130.5, is_default: false, min_budget: 1 },
  { code: 'GBP', symbol: '£', name: 'British Pound', rate: 152.0, is_default: false, min_budget: 1 }
];

// Legacy Fee Rules Configuration (maintained for backward compatibility)
const FEE_RULES = {
  client_posting_fee_pct: 0.0,
  standard_worker_commission_pct: 10.0,
  tier_discounts: {
    bronze: 0.0,
    silver: 1.5,
    gold: 3.0,
    platinum: 4.0,
    vip: 5.0
  },
  escrow_policy: {
    title: 'XtraEarn Secure Escrow Guarantee',
    description: 'Your payment is safely held in XtraEarn Escrow and only released when you approve the completed delivery. 100% money-back guarantee in case of unresolved dispute.'
  }
};

// GET /api/pricing/currencies (Backward compatible)
router.get('/currencies', (req, res) => {
  res.json({ currencies: CURRENCIES, base: 'BDT' });
});

// GET /api/pricing/fee-rules (Backward compatible)
router.get('/fee-rules', (req, res) => {
  res.json(FEE_RULES);
});

// POST /api/pricing/calculate-escrow (Backward compatible, backed by pricingEngine)
router.post('/calculate-escrow', (req, res) => {
  try {
    const { budget = 0, currency = 'BDT', workerTier = 'bronze', category, subcategory, user_id, client_id, campaign_code } = req.body || {};
    const numBudget = Math.max(Number(budget) || 0, 0);
    const curObj = CURRENCIES.find(c => c.code.toUpperCase() === String(currency).toUpperCase()) || CURRENCIES[0];

    // Ensure active rules are loaded into the engine
    pricingEngine.setRules(monetizationStore.getRules());

    // Resolve users if IDs provided
    let workerUser = null;
    let clientUser = null;
    if (user_id) {
      const m = store.mem();
      workerUser = (m.users || []).find(u => u.id === Number(user_id) || u.email === user_id);
    }
    if (client_id) {
      const m = store.mem();
      clientUser = (m.users || []).find(u => u.id === Number(client_id) || u.email === client_id);
    }

    const calc = pricingEngine.calculate({
      user: workerUser,
      client: clientUser,
      task: {
        category,
        subcategory,
        budget: numBudget,
        currency: curObj.code,
        campaign_code
      },
      amount: numBudget,
      feeSide: 'both'
    });

    const clientFee = calc.client.fee_amount;
    const clientFeePct = calc.client.effective_rate_percent;
    const totalEscrowDeposit = calc.client.total_amount;
    const platformCommission = calc.worker.fee_amount;
    const effectiveWorkerCommissionPct = calc.worker.effective_rate_percent;
    const estimatedWorkerPayout = calc.worker.net_amount;

    res.json({
      budget: numBudget,
      currency: curObj.code,
      currency_symbol: curObj.symbol,
      client_fee: clientFee,
      client_fee_pct: clientFeePct,
      total_escrow_deposit: totalEscrowDeposit,
      platform_commission: platformCommission,
      commission_pct: effectiveWorkerCommissionPct,
      estimated_worker_payout: estimatedWorkerPayout,
      applied_rules: calc.applied_rules,
      calculation: calc,
      escrow_policy: FEE_RULES.escrow_policy
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/pricing/calculate (Full Authoritative Pricing Calculation)
router.post('/calculate', authOptional, async (req, res) => {
  try {
    const { amount = 0, currency = 'BDT', task = {}, user = null, client = null, feeSide = 'both', campaign_code } = req.body;
    pricingEngine.setRules(monetizationStore.getRules());

    let resolvedUser = user;
    let resolvedClient = client;

    // Auto-resolve authenticated user if not explicitly passed
    if (!resolvedClient && req.user && req.user.role === 'client') {
      resolvedClient = await store.getUserById(req.user.id);
    } else if (!resolvedUser && req.user && req.user.role !== 'client') {
      resolvedUser = await store.getUserById(req.user.id);
    }

    if (task && task.id && !task.category) {
      const existingTask = await store.getTask(task.id);
      if (existingTask) {
        Object.assign(task, existingTask);
      }
    }

    const taskContext = {
      ...task,
      budget: Number(amount || task.budget || 0),
      currency: currency || task.currency || 'BDT',
      campaign_code: campaign_code || task.campaign_code || null
    };

    const calculation = pricingEngine.calculate({
      user: resolvedUser,
      client: resolvedClient,
      task: taskContext,
      amount: Number(amount || taskContext.budget || 0),
      feeSide
    });

    res.json({
      success: true,
      calculation,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/pricing/simulate (Simulation & Audit Trail for Admin & Devs)
router.post('/simulate', authOptional, async (req, res) => {
  try {
    const { amount = 1000, currency = 'BDT', task = {}, user = null, client = null, feeSide = 'both', campaign_code } = req.body;
    pricingEngine.setRules(monetizationStore.getRules());

    const result = pricingEngine.simulate({
      user,
      client,
      task: {
        ...task,
        budget: Number(amount || task.budget || 1000),
        currency,
        campaign_code
      },
      amount: Number(amount || 1000),
      feeSide
    });

    res.json({
      success: true,
      ...result
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/pricing/rules (List all configured rules)
router.get('/rules', (req, res) => {
  try {
    const filters = {
      scope: req.query.scope,
      fee_side: req.query.fee_side,
      status: req.query.status,
      category: req.query.category,
      task_type: req.query.task_type
    };
    const rules = monetizationStore.getRules(filters);
    res.json({ success: true, rules, total: rules.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/pricing/rules/:id (Get single rule)
router.get('/rules/:id', (req, res) => {
  try {
    const rule = monetizationStore.getRuleById(req.params.id);
    if (!rule) return res.status(404).json({ error: 'Pricing rule not found' });
    res.json({ success: true, rule });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/pricing/rules (Create new pricing rule - Admin Only)
router.post('/rules', adminRequired, (req, res) => {
  try {
    const ruleData = req.body;
    if (!ruleData.name) {
      return res.status(400).json({ error: 'Rule name is required' });
    }
    const rateVal = ruleData.rate_percent !== undefined ? ruleData.rate_percent : ruleData.rate_pct;
    // Note: rate_percent: 0 is completely valid!
    if (rateVal === undefined && ruleData.fixed_fee === undefined && ruleData.fee_type !== 'zero_fee') {
      return res.status(400).json({ error: 'rate_percent or fixed_fee is required' });
    }
    if (rateVal !== undefined) {
      ruleData.rate_percent = Number(rateVal);
      ruleData.rate_pct = Number(rateVal);
    }

    const created = monetizationStore.createRule(ruleData);
    pricingEngine.setRules(monetizationStore.getRules());

    res.status(201).json({ success: true, rule: created });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/pricing/rules/:id (Update pricing rule - Admin Only)
router.put('/rules/:id', adminRequired, (req, res) => {
  try {
    const updated = monetizationStore.updateRule(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Pricing rule not found' });
    pricingEngine.setRules(monetizationStore.getRules());

    res.json({ success: true, rule: updated });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PATCH /api/pricing/rules/:id/toggle (Toggle rule active status - Admin Only)
router.patch('/rules/:id/toggle', adminRequired, (req, res) => {
  try {
    const updated = monetizationStore.toggleRule(req.params.id);
    if (!updated) return res.status(404).json({ error: 'Pricing rule not found' });
    pricingEngine.setRules(monetizationStore.getRules());

    res.json({ success: true, rule: updated });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/pricing/rules/:id (Delete pricing rule - Admin Only)
router.delete('/rules/:id', adminRequired, (req, res) => {
  try {
    const ok = monetizationStore.deleteRule(req.params.id);
    if (!ok) return res.status(404).json({ error: 'Pricing rule not found' });
    pricingEngine.setRules(monetizationStore.getRules());

    res.json({ success: true, message: 'Rule deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/pricing/overrides (Set User Override Rule - Admin Only)
router.post('/overrides', adminRequired, (req, res) => {
  try {
    const { user_id, user_email, rate_percent, rate_pct, fixed_fee, fee_side = 'worker', reason, expires_at } = req.body;
    const rateVal = rate_percent !== undefined ? rate_percent : rate_pct;
    if (!user_id && !user_email) {
      return res.status(400).json({ error: 'user_id or user_email is required' });
    }
    if (rateVal === undefined && fixed_fee === undefined) {
      return res.status(400).json({ error: 'rate_percent or fixed_fee is required (0 is valid)' });
    }

    const rule = monetizationStore.setUserOverride({
      userId: user_id,
      email: user_email,
      ratePercent: Number(rateVal),
      rate_pct: Number(rateVal),
      fixedFee: fixed_fee,
      feeSide: fee_side,
      reason,
      expiresAt: expires_at
    });

    pricingEngine.setRules(monetizationStore.getRules());
    res.json({ success: true, rule });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/pricing/user/:userId (Get Effective User Pricing Profile)
router.get('/user/:userId', async (req, res) => {
  try {
    const profile = monetizationStore.getUserPricing(req.params.userId);
    res.json({ success: true, ...profile });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/pricing/memberships (List Available Membership Plans)
router.get('/memberships', (req, res) => {
  try {
    const plans = monetizationStore.getMembershipPlans();
    res.json({ success: true, plans });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/pricing/memberships/subscribe (Subscribe User to a Plan)
router.post('/memberships/subscribe', authRequired, async (req, res) => {
  try {
    const { plan_id, duration_months = 1, payment_method = 'wallet' } = req.body;
    if (!plan_id) return res.status(400).json({ error: 'plan_id is required' });

    const result = await monetizationStore.subscribeMembership(
      req.user.id,
      plan_id,
      Number(duration_months),
      payment_method
    );

    pricingEngine.setRules(monetizationStore.getRules());
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/pricing/credits/packages (List Credit Packages)
router.get('/credits/packages', (req, res) => {
  try {
    const packages = monetizationStore.getCreditPackages();
    res.json({ success: true, packages });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/pricing/credits/purchase (Purchase Credit Package)
router.post('/credits/purchase', authRequired, async (req, res) => {
  try {
    const { package_id, payment_method = 'wallet' } = req.body;
    if (!package_id) return res.status(400).json({ error: 'package_id is required' });

    const result = await monetizationStore.purchaseCredits(
      req.user.id,
      package_id,
      payment_method
    );

    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/pricing/leads (List Marketplace Leads for Expert/Physical Tasks)
router.get('/leads', (req, res) => {
  try {
    const leads = monetizationStore.getLeadProducts();
    res.json({ success: true, leads });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/pricing/leads/purchase (Purchase Lead Access)
router.post('/leads/purchase', authRequired, async (req, res) => {
  try {
    const { lead_id, task_id } = req.body;
    if (!lead_id) return res.status(400).json({ error: 'lead_id is required' });

    const result = await monetizationStore.purchaseLead(req.user.id, lead_id, task_id);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/pricing/ledger (Double-Entry Financial Ledger - Admin Only)
router.get('/ledger', adminRequired, (req, res) => {
  try {
    const filters = {
      task_id: req.query.task_id,
      entry_type: req.query.entry_type,
      source_type: req.query.source_type,
      destination_type: req.query.destination_type,
      user_id: req.query.user_id,
      limit: req.query.limit ? Number(req.query.limit) : 100,
      offset: req.query.offset ? Number(req.query.offset) : 0
    };
    const result = monetizationStore.getFinancialLedger(filters);
    res.json({ success: true, total: result.total, items: result.items, entries: result.items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/pricing/analytics (Revenue & Monetization Analytics - Admin Only)
router.get('/analytics', adminRequired, (req, res) => {
  try {
    const kpis = monetizationStore.getMonetizationKPIs();
    res.json({ success: true, kpis });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/pricing/snapshots/:id (Get Immutable Pricing Snapshot Details)
router.get('/snapshots/:id', (req, res) => {
  try {
    const snapshot = monetizationStore.getPricingSnapshot(req.params.id) || monetizationStore.getPricingSnapshotByTask(req.params.id);
    if (!snapshot) return res.status(404).json({ error: 'Pricing snapshot not found' });
    res.json({ success: true, snapshot });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
