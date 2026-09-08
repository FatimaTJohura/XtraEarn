/**
 * XtraEarn Monetization, Commission & Pricing Store Layer
 * 
 * Manages pricing rules persistence, double-entry financial ledger,
 * immutable pricing snapshots, memberships, credits, leads, and idempotency guards.
 */

const fs = require('fs');
const path = require('path');
const { pricingEngine } = require('./pricingEngine');

const DEFAULT_MEMBERSHIP_PLANS = [
  {
    id: 'free',
    name: 'Free Starter',
    role: 'worker',
    price_bdt: 0,
    billing_period: 'monthly',
    commission_rate_pct: 10.0,
    proposal_quota: 15,
    active_task_limit: 3,
    featured_credits: 0,
    ai_matching: false,
    badge_label: 'Standard Freelancer',
    support_level: 'standard',
    status: 'active'
  },
  {
    id: 'starter',
    name: 'Freelancer Starter',
    role: 'worker',
    price_bdt: 199,
    billing_period: 'monthly',
    commission_rate_pct: 7.0,
    proposal_quota: 40,
    active_task_limit: 8,
    featured_credits: 1,
    ai_matching: false,
    badge_label: 'Rising Talent',
    support_level: 'priority',
    status: 'active'
  },
  {
    id: 'pro',
    name: 'Pro Freelancer Plus',
    role: 'worker',
    price_bdt: 499,
    billing_period: 'monthly',
    commission_rate_pct: 5.0,
    proposal_quota: 120,
    active_task_limit: 20,
    featured_credits: 3,
    ai_matching: true,
    badge_label: 'Pro Verified',
    support_level: 'priority',
    status: 'active'
  },
  {
    id: 'expert',
    name: 'Expert Elite VIP',
    role: 'worker',
    price_bdt: 999,
    billing_period: 'monthly',
    commission_rate_pct: 2.0,
    proposal_quota: 9999,
    active_task_limit: 50,
    featured_credits: 10,
    ai_matching: true,
    badge_label: 'Top Expert',
    support_level: 'dedicated_vip',
    status: 'active'
  },
  {
    id: 'partner',
    name: 'Strategic Agency Partner',
    role: 'worker',
    price_bdt: 2499,
    billing_period: 'monthly',
    commission_rate_pct: 1.0,
    proposal_quota: 99999,
    active_task_limit: 100,
    featured_credits: 25,
    ai_matching: true,
    badge_label: 'Strategic Partner',
    support_level: 'dedicated_manager',
    status: 'active'
  },
  // Client Plans
  {
    id: 'client_free',
    name: 'Client Standard',
    role: 'client',
    price_bdt: 0,
    billing_period: 'monthly',
    client_fee_pct: 0.0,
    active_job_posts: 5,
    featured_credits: 0,
    nda_support: false,
    status: 'active'
  },
  {
    id: 'client_pro',
    name: 'Client Business Pro',
    role: 'client',
    price_bdt: 999,
    billing_period: 'monthly',
    client_fee_pct: 0.0,
    active_job_posts: 25,
    featured_credits: 5,
    nda_support: true,
    status: 'active'
  },
  {
    id: 'enterprise',
    name: 'Enterprise Custom Contract',
    role: 'client',
    price_bdt: 4999,
    billing_period: 'monthly',
    client_fee_pct: 0.0,
    commission_rate_pct: 1.0,
    active_job_posts: 9999,
    featured_credits: 20,
    nda_support: true,
    status: 'active'
  }
];

const DEFAULT_CREDIT_PACKAGES = [
  { id: 'cred_100', credits: 100, price_bdt: 100, bonus_credits: 0, badge: 'Standard' },
  { id: 'cred_500', credits: 500, price_bdt: 450, bonus_credits: 50, badge: 'Popular' },
  { id: 'cred_1000', credits: 1000, price_bdt: 800, bonus_credits: 200, badge: 'Best Value' }
];

const DEFAULT_LEAD_PRODUCTS = [
  { id: 'lead_plumbing', title: 'Emergency Plumbing Repair Lead', category: 'Handyman & Repairs', price_bdt: 20, currency: 'BDT', status: 'active' },
  { id: 'lead_electrical', title: 'Home Electrical Wiring Lead', category: 'Handyman & Repairs', price_bdt: 25, currency: 'BDT', status: 'active' },
  { id: 'lead_legal', title: 'Business Contract & Legal Consultation', category: 'Expert Help', price_bdt: 100, currency: 'BDT', status: 'active' },
  { id: 'lead_engineering', title: 'Architectural & Engineering Plan Review', category: 'Expert Help', price_bdt: 75, currency: 'BDT', status: 'active' }
];

const SEED_PRICING_RULES = [
  {
    id: 1,
    rule_code: 'RUL-001',
    name: 'Global Marketplace Baseline Commission',
    scope_type: 'global',
    target: 'all',
    target_label: 'All Tasks',
    fee_side: 'worker',
    fee_type: 'percentage',
    rate_pct: 10.0,
    priority: 100,
    status: 'active',
    stackable: false,
    description: 'Standard 10% marketplace baseline take-rate.'
  },
  {
    id: 2,
    rule_code: 'RUL-002',
    name: 'Design & Creative Category Incentive',
    scope_type: 'category',
    target: 'design',
    target_label: 'Design & Creative',
    fee_side: 'worker',
    fee_type: 'percentage',
    rate_pct: 7.0,
    priority: 400,
    status: 'active',
    stackable: false,
    description: 'Discounted 7% rate for graphic, logo, and multimedia design tasks.'
  },
  {
    id: 3,
    rule_code: 'RUL-003',
    name: 'Web & Software Development Category Incentive',
    scope_type: 'category',
    target: 'programming',
    target_label: 'Web & Software Development',
    fee_side: 'worker',
    fee_type: 'percentage',
    rate_pct: 5.0,
    priority: 400,
    status: 'active',
    stackable: false,
    description: 'Competitive 5% take-rate for tech and full-stack development jobs.'
  },
  {
    id: 4,
    rule_code: 'RUL-004',
    name: 'Health & Medical Expert Consultation Take-Rate',
    scope_type: 'category',
    target: 'health & medical',
    target_label: 'Health & Medical',
    fee_side: 'worker',
    fee_type: 'percentage',
    rate_pct: 15.0,
    min_cap_bdt: 100,
    priority: 400,
    status: 'active',
    stackable: false,
    description: 'Premium 15% rate for verified healthcare and medical consultations.'
  },
  {
    id: 5,
    rule_code: 'RUL-005',
    name: 'Gold Member Commission Benefit',
    scope_type: 'membership',
    target: 'gold',
    target_label: 'Gold Tier Workers',
    fee_side: 'worker',
    fee_type: 'percentage',
    rate_pct: 5.0,
    priority: 700,
    status: 'active',
    stackable: false,
    description: 'Reduced 5% take-rate for Gold tier members.'
  },
  {
    id: 6,
    rule_code: 'RUL-006',
    name: 'Pro Freelancer Plus Membership Rate',
    scope_type: 'membership',
    target: 'pro',
    target_label: 'Pro Subscribers',
    fee_side: 'worker',
    fee_type: 'percentage',
    rate_pct: 5.0,
    priority: 700,
    status: 'active',
    stackable: false,
    description: '5% take-rate for Pro Freelancer Plus members.'
  },
  {
    id: 7,
    rule_code: 'RUL-007',
    name: 'Top Worker Group Commission',
    scope_type: 'user_group',
    target: 'top_worker',
    target_label: 'Top Worker Group',
    fee_side: 'worker',
    fee_type: 'percentage',
    rate_pct: 3.0,
    priority: 650,
    status: 'active',
    stackable: false,
    description: 'Top-tier worker cohort 3% rate.'
  },
  {
    id: 8,
    rule_code: 'RUL-008',
    name: 'New Worker Onboarding Promotion',
    scope_type: 'user_group',
    target: 'new_worker',
    target_label: 'New Freelancers',
    fee_side: 'worker',
    fee_type: 'zero_fee',
    rate_pct: 0.0,
    priority: 650,
    status: 'active',
    stackable: false,
    description: '0% commission incentive for new worker accounts on early completions.'
  },
  {
    id: 9,
    rule_code: 'RUL-009',
    name: 'High-Volume Contract Sliding Scale (>৳50k)',
    scope_type: 'volume_bracket',
    target: '50000+',
    target_label: 'Contracts > ৳50,000',
    fee_side: 'worker',
    fee_type: 'percentage',
    rate_pct: 6.0,
    priority: 600,
    status: 'active',
    stackable: false,
    description: '6% volume bracket rate for contracts exceeding ৳50,000.'
  },
  {
    id: 10,
    rule_code: 'RUL-010',
    name: 'User Rahim Ahmed Custom Rate (5%)',
    scope_type: 'user',
    target: '10',
    target_user_id: 10,
    target_label: 'Rahim Ahmed (User #10)',
    fee_side: 'worker',
    fee_type: 'percentage',
    rate_pct: 5.0,
    priority: 800,
    status: 'active',
    stackable: false,
    description: 'Custom 5% override for high-volume worker Rahim Ahmed.'
  },
  {
    id: 11,
    rule_code: 'RUL-011',
    name: 'User Karim Strategic Override (1%)',
    scope_type: 'user',
    target: '11',
    target_user_id: 11,
    target_label: 'Karim Ullah (User #11)',
    fee_side: 'worker',
    fee_type: 'percentage',
    rate_pct: 1.0,
    priority: 800,
    status: 'active',
    stackable: false,
    description: 'Custom 1% VIP rate for strategic contributor Karim Ullah.'
  },
  {
    id: 12,
    rule_code: 'RUL-012',
    name: 'Strategic Enterprise Partner Zero Take-Rate (0%)',
    scope_type: 'user',
    target: '12',
    target_user_id: 12,
    target_label: 'Partner Agency (User #12)',
    fee_side: 'worker',
    fee_type: 'zero_fee',
    rate_pct: 0.0,
    priority: 800,
    status: 'active',
    stackable: false,
    description: '0% first-class zero take-rate for strategic agency partner.'
  },
  {
    id: 13,
    rule_code: 'RUL-013',
    name: 'Eid 2026 Festive 0% Commission Campaign',
    scope_type: 'campaign',
    target: 'eid2026',
    campaign_code: 'eid2026',
    target_label: 'Eid Festive Season Promo',
    fee_side: 'worker',
    fee_type: 'zero_fee',
    rate_pct: 0.0,
    priority: 900,
    status: 'active',
    stackable: false,
    description: '0% platform take-rate during active Eid promotional campaign.'
  },
  {
    id: 14,
    rule_code: 'RUL-014',
    name: 'Standard Client Service Fee (0% Promo)',
    scope_type: 'global',
    target: 'all',
    target_label: 'All Task Postings',
    fee_side: 'client',
    fee_type: 'percentage',
    client_fee_pct: 0.0,
    priority: 100,
    status: 'active',
    stackable: false,
    description: 'Free client posting fee under current promotional campaign.'
  }
];

class MonetizationStore {
  constructor() {
    this.memoryRef = null;
    this.saveDiskFn = null;
    this.idempotencyMap = new Map();
  }

  init(memAccessor, saveDiskAccessor) {
    this.getMem = memAccessor;
    this.saveDisk = saveDiskAccessor;
    this.ensureInitialized();
  }

  _m() {
    if (typeof this.getMem === 'function') {
      const m = this.getMem();
      if (m) return m;
    }
    if (!this._fallbackMemory) {
      this._fallbackMemory = {
        pricing_rules: SEED_PRICING_RULES.map(r => ({ ...r })),
        membership_plans: DEFAULT_MEMBERSHIP_PLANS.map(p => ({ ...p })),
        credit_packages: DEFAULT_CREDIT_PACKAGES.map(c => ({ ...c })),
        lead_products: DEFAULT_LEAD_PRODUCTS.map(l => ({ ...l })),
        pricing_snapshots: [],
        financial_ledger: [],
        user_memberships: [],
        user_credits: [],
        credit_transactions: [],
        lead_purchases: [],
        user_commission_overrides: []
      };
    }
    return this._fallbackMemory;
  }

  ensureInitialized() {
    const m = this._m();
    if (!m) return;

    if (!m.pricing_rules || !m.pricing_rules.length) {
      m.pricing_rules = SEED_PRICING_RULES.map(r => ({ ...r }));
    } else {
      // Merge in any missing canonical seed rules
      SEED_PRICING_RULES.forEach(seedRule => {
        if (!m.pricing_rules.some(r => r.rule_code === seedRule.rule_code)) {
          m.pricing_rules.push({ ...seedRule });
        }
      });
    }

    if (!m.membership_plans || !m.membership_plans.length) {
      m.membership_plans = DEFAULT_MEMBERSHIP_PLANS.map(p => ({ ...p }));
    }

    if (!m.user_memberships) {
      m.user_memberships = [];
    }

    if (!m.user_commission_overrides) {
      m.user_commission_overrides = [];
    }

    if (!m.pricing_snapshots) {
      m.pricing_snapshots = [];
    }

    if (!m.financial_ledger) {
      m.financial_ledger = [];
    }

    if (!m.credit_packages || !m.credit_packages.length) {
      m.credit_packages = DEFAULT_CREDIT_PACKAGES.map(p => ({ ...p }));
    }

    if (!m.user_credits) {
      m.user_credits = [];
    }

    if (!m.lead_products || !m.lead_products.length) {
      m.lead_products = DEFAULT_LEAD_PRODUCTS.map(l => ({ ...l }));
    }

    if (!m.lead_transactions) {
      m.lead_transactions = [];
    }

    if (!m.seq) m.seq = {};
    if (!m.seq.pricing_rules) m.seq.pricing_rules = 50;
    if (!m.seq.financial_ledger) m.seq.financial_ledger = 100;
    if (!m.seq.pricing_snapshots) m.seq.pricing_snapshots = 100;
  }

  // --- IDEMPOTENCY ---
  checkIdempotency(key) {
    if (!key) return null;
    const item = this.idempotencyMap.get(String(key));
    if (item && item.expiresAt > Date.now()) {
      return item.result;
    }
    return null;
  }

  recordIdempotency(key, result, ttlMs = 3600000) {
    if (!key) return;
    this.idempotencyMap.set(String(key), {
      result,
      expiresAt: Date.now() + ttlMs
    });
  }

  // --- PRICING RULES CRUD ---
  getRules(filters = {}) {
    this.ensureInitialized();
    const m = this._m();
    let rules = (m.pricing_rules || []).map(r => ({ ...r }));

    if (filters.status) {
      rules = rules.filter(r => r.status === filters.status);
    }
    if (filters.scope_type) {
      rules = rules.filter(r => (r.scope_type || r.rule_type) === filters.scope_type);
    }
    if (filters.fee_side) {
      rules = rules.filter(r => r.fee_side === filters.fee_side || r.fee_side === 'both');
    }
    if (filters.q) {
      const q = String(filters.q).toLowerCase();
      rules = rules.filter(r => r.name.toLowerCase().includes(q) || (r.description && r.description.toLowerCase().includes(q)) || r.rule_code.toLowerCase().includes(q));
    }

    // Sort by priority descending (higher priority first)
    rules.sort((a, b) => (b.priority || 100) - (a.priority || 100));
    return rules;
  }

  getRuleById(id) {
    this.ensureInitialized();
    const m = this._m();
    return (m.pricing_rules || []).find(r => String(r.id) === String(id) || r.rule_code === String(id)) || null;
  }

  createRule(ruleData = {}, adminUser = null) {
    this.ensureInitialized();
    const m = this._m();
    const nextSeq = ++m.seq.pricing_rules;
    const ruleCode = ruleData.rule_code || `RUL-${String(nextSeq).padStart(3, '0')}`;

    const newRule = {
      id: nextSeq,
      rule_code: ruleCode,
      name: String(ruleData.name || 'New Custom Pricing Rule').trim(),
      scope_type: ruleData.scope_type || ruleData.rule_type || 'global',
      target: ruleData.target || 'all',
      target_user_id: ruleData.target_user_id ? Number(ruleData.target_user_id) : null,
      target_label: ruleData.target_label || ruleData.target || 'All',
      fee_side: ruleData.fee_side || 'worker',
      fee_type: ruleData.fee_type || 'percentage',
      calculation_mode: ruleData.calculation_mode || 'override',
      rate_pct: ruleData.rate_pct !== undefined ? Number(ruleData.rate_pct) : 10.0,
      client_fee_pct: ruleData.client_fee_pct !== undefined ? Number(ruleData.client_fee_pct) : 0.0,
      fixed_amount: ruleData.fixed_amount !== undefined ? Number(ruleData.fixed_amount) : 0.0,
      min_cap_bdt: ruleData.min_cap_bdt ? Number(ruleData.min_cap_bdt) : 0,
      max_cap_bdt: ruleData.max_cap_bdt ? Number(ruleData.max_cap_bdt) : null,
      currency: (ruleData.currency || 'BDT').toUpperCase(),
      priority: ruleData.priority !== undefined ? Number(ruleData.priority) : 100,
      stackable: Boolean(ruleData.stackable || false),
      conditions: ruleData.conditions || null,
      starts_at: ruleData.starts_at || null,
      expires_at: ruleData.expires_at || null,
      status: ruleData.status || 'active',
      description: String(ruleData.description || 'Configured via Pricing Engine.').trim(),
      created_by: adminUser ? adminUser.id : 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    m.pricing_rules.push(newRule);
    this.saveDisk();
    return newRule;
  }

  updateRule(id, ruleData = {}, adminUser = null) {
    this.ensureInitialized();
    const m = this._m();
    const rule = (m.pricing_rules || []).find(r => String(r.id) === String(id) || r.rule_code === String(id));
    if (!rule) throw new Error(`Pricing rule with ID ${id} not found`);

    const oldValues = { ...rule };

    if (ruleData.name !== undefined) rule.name = String(ruleData.name).trim();
    if (ruleData.scope_type !== undefined) rule.scope_type = ruleData.scope_type;
    if (ruleData.target !== undefined) rule.target = ruleData.target;
    if (ruleData.target_user_id !== undefined) rule.target_user_id = ruleData.target_user_id ? Number(ruleData.target_user_id) : null;
    if (ruleData.target_label !== undefined) rule.target_label = ruleData.target_label;
    if (ruleData.fee_side !== undefined) rule.fee_side = ruleData.fee_side;
    if (ruleData.fee_type !== undefined) rule.fee_type = ruleData.fee_type;
    if (ruleData.calculation_mode !== undefined) rule.calculation_mode = ruleData.calculation_mode;
    if (ruleData.rate_pct !== undefined) rule.rate_pct = Math.max(0, Math.min(100, Number(ruleData.rate_pct)));
    if (ruleData.client_fee_pct !== undefined) rule.client_fee_pct = Math.max(0, Math.min(100, Number(ruleData.client_fee_pct)));
    if (ruleData.fixed_amount !== undefined) rule.fixed_amount = Math.max(0, Number(ruleData.fixed_amount));
    if (ruleData.min_cap_bdt !== undefined) rule.min_cap_bdt = Math.max(0, Number(ruleData.min_cap_bdt));
    if (ruleData.max_cap_bdt !== undefined) rule.max_cap_bdt = ruleData.max_cap_bdt ? Number(ruleData.max_cap_bdt) : null;
    if (ruleData.priority !== undefined) rule.priority = Number(ruleData.priority);
    if (ruleData.stackable !== undefined) rule.stackable = Boolean(ruleData.stackable);
    if (ruleData.conditions !== undefined) rule.conditions = ruleData.conditions;
    if (ruleData.starts_at !== undefined) rule.starts_at = ruleData.starts_at;
    if (ruleData.expires_at !== undefined) rule.expires_at = ruleData.expires_at;
    if (ruleData.status !== undefined) rule.status = ruleData.status;
    if (ruleData.description !== undefined) rule.description = String(ruleData.description).trim();

    rule.updated_at = new Date().toISOString();
    rule.updated_by = adminUser ? adminUser.id : null;

    this.saveDisk();
    return { rule, old_values: oldValues };
  }

  toggleRule(id) {
    this.ensureInitialized();
    const m = this._m();
    const rule = (m.pricing_rules || []).find(r => String(r.id) === String(id) || r.rule_code === String(id));
    if (!rule) throw new Error(`Pricing rule with ID ${id} not found`);

    rule.status = rule.status === 'active' ? 'inactive' : 'active';
    rule.updated_at = new Date().toISOString();
    this.saveDisk();
    return rule;
  }

  deleteRule(id) {
    this.ensureInitialized();
    const m = this._m();
    const idx = (m.pricing_rules || []).findIndex(r => String(r.id) === String(id) || r.rule_code === String(id));
    if (idx === -1) throw new Error(`Pricing rule with ID ${id} not found`);

    const deleted = m.pricing_rules.splice(idx, 1)[0];
    this.saveDisk();
    return deleted;
  }

  // --- USER SPECIFIC OVERRIDES ---
  setUserOverride(userIdOrObj, opts = {}) {
    this.ensureInitialized();
    const m = this._m();
    let userId, rate_pct, reason, expires_at, adminId;
    if (typeof userIdOrObj === 'object' && userIdOrObj !== null) {
      userId = userIdOrObj.userId || userIdOrObj.user_id;
      rate_pct = userIdOrObj.rate_pct !== undefined ? userIdOrObj.rate_pct : (userIdOrObj.ratePercent !== undefined ? userIdOrObj.ratePercent : userIdOrObj.rate);
      reason = userIdOrObj.reason || '';
      expires_at = userIdOrObj.expires_at || userIdOrObj.expiresAt || null;
      adminId = userIdOrObj.adminId || userIdOrObj.admin_id || 1;
    } else {
      userId = userIdOrObj;
      rate_pct = opts.rate_pct !== undefined ? opts.rate_pct : (opts.ratePercent !== undefined ? opts.ratePercent : opts.rate);
      reason = opts.reason || '';
      expires_at = opts.expires_at || opts.expiresAt || null;
      adminId = opts.adminId || opts.admin_id || 1;
    }
    const uId = Number(userId);

    const existingIdx = (m.pricing_rules || []).findIndex(r => r.scope_type === 'user' && String(r.target_user_id || r.target) === String(uId));
    const rate = Math.max(0, Math.min(100, Number(rate_pct)));

    if (existingIdx !== -1) {
      m.pricing_rules[existingIdx].rate_pct = rate;
      m.pricing_rules[existingIdx].expires_at = expires_at;
      m.pricing_rules[existingIdx].description = reason || m.pricing_rules[existingIdx].description;
      m.pricing_rules[existingIdx].status = 'active';
      m.pricing_rules[existingIdx].updated_at = new Date().toISOString();
      this.saveDisk();
      return m.pricing_rules[existingIdx];
    } else {
      const nextSeq = ++m.seq.pricing_rules;
      const newRule = {
        id: nextSeq,
        rule_code: `RUL-USR-${uId}`,
        name: `User #${uId} Custom Commission Override (${rate}%)`,
        scope_type: 'user',
        target: String(uId),
        target_user_id: uId,
        target_label: `User ID #${uId}`,
        fee_side: 'worker',
        fee_type: rate === 0 ? 'zero_fee' : 'percentage',
        calculation_mode: 'override',
        rate_pct: rate,
        priority: 800,
        stackable: false,
        expires_at: expires_at,
        status: 'active',
        description: reason || `Admin customized take-rate for User #${uId}.`,
        created_by: adminId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      m.pricing_rules.push(newRule);
      this.saveDisk();
      return newRule;
    }
  }

  getUserPricing(userId) {
    this.ensureInitialized();
    const m = this._m();
    const uId = Number(userId);
    const user = (m.users || []).find(u => u.id === uId) || { id: uId, membership: 'free', group: 'standard' };

    const overrideRule = (m.pricing_rules || []).find(r => r.status === 'active' && r.scope_type === 'user' && String(r.target_user_id || r.target) === String(uId));
    const membership = (m.user_memberships || []).find(um => um.user_id === uId && um.status === 'active') || null;

    // Simulate baseline task (৳10,000)
    const preview = pricingEngine.calculate({
      user: {
        id: user.id,
        membership: user.membership || 'free',
        group: user.group || 'standard',
        verified: !!user.is_verified
      },
      amount: 10000,
      currency: 'BDT'
    }, m.pricing_rules);

    return {
      user_id: uId,
      user_name: user.name || '',
      active_membership: membership ? membership.plan_id : (user.membership || 'free'),
      user_group: user.group || 'standard',
      custom_override: overrideRule || null,
      effective_baseline_commission_pct: preview.worker.commission_rate,
      preview_10k_calculation: preview
    };
  }

  // --- MEMBERSHIP PLANS & SUBSCRIPTION ---
  getMembershipPlans(role = null) {
    this.ensureInitialized();
    const m = this._m();
    let plans = (m.membership_plans || []).map(p => ({ ...p }));
    if (role) {
      plans = plans.filter(p => p.role === role);
    }
    return plans;
  }

  subscribeMembership(userId, planId, paymentMethod = 'wallet') {
    this.ensureInitialized();
    const m = this._m();
    const uId = Number(userId);
    const user = (m.users || []).find(u => u.id === uId);
    if (!user) throw new Error('User not found');

    const plan = (m.membership_plans || []).find(p => p.id === planId);
    if (!plan) throw new Error(`Membership plan ${planId} not found`);

    // If paid plan, verify and debit wallet
    if (plan.price_bdt > 0) {
      if (Number(user.wallet_balance || 0) < plan.price_bdt) {
        const err = new Error(`Insufficient wallet balance. You need ৳${plan.price_bdt} for ${plan.name}.`);
        err.status = 402;
        throw err;
      }
      user.wallet_balance = Math.round((Number(user.wallet_balance) - plan.price_bdt) * 100) / 100;
    }

    // Deactivate previous active memberships
    (m.user_memberships || []).forEach(um => {
      if (um.user_id === uId) um.status = 'cancelled';
    });

    const startsAt = new Date();
    const expiresAt = new Date(startsAt.getTime() + 30 * 24 * 3600 * 1000); // 30 days

    const membershipRecord = {
      id: `MEM-${Date.now()}-${uId}`,
      user_id: uId,
      plan_id: plan.id,
      plan_name: plan.name,
      role: plan.role,
      price_bdt: plan.price_bdt,
      commission_rate_pct: plan.commission_rate_pct,
      status: 'active',
      payment_method: paymentMethod,
      starts_at: startsAt.toISOString(),
      expires_at: expiresAt.toISOString(),
      auto_renew: true
    };

    m.user_memberships.push(membershipRecord);
    user.membership = plan.id;

    // Record double-entry financial ledger entry
    if (plan.price_bdt > 0) {
      this.recordLedgerEntry({
        transaction_id: `TX-SUB-${membershipRecord.id}`,
        user_id: uId,
        account: 'platform_revenue',
        type: 'subscription',
        direction: 'credit',
        amount: plan.price_bdt,
        currency: 'BDT',
        reference: `Subscription: ${plan.name}`,
        metadata: { plan_id: plan.id, membership_id: membershipRecord.id }
      });
    }

    this.saveDisk();
    return { success: true, membership: membershipRecord, subscription: membershipRecord, user_balance: user.wallet_balance };
  }

  // --- CREDITS SYSTEM ---
  getCreditPackages() {
    this.ensureInitialized();
    const m = this._m();
    return (m.credit_packages || []).map(p => ({ ...p }));
  }

  purchaseCredits(userId, packageId, paymentMethod = 'wallet') {
    this.ensureInitialized();
    const m = this._m();
    const uId = Number(userId);
    const user = (m.users || []).find(u => u.id === uId);
    if (!user) throw new Error('User not found');

    const pkg = (m.credit_packages || []).find(p => p.id === packageId);
    if (!pkg) throw new Error(`Credit package ${packageId} not found`);

    if (Number(user.wallet_balance || 0) < pkg.price_bdt) {
      const err = new Error(`Insufficient wallet balance. You need ৳${pkg.price_bdt} to purchase ${pkg.credits} credits.`);
      err.status = 402;
      throw err;
    }

    user.wallet_balance = Math.round((Number(user.wallet_balance) - pkg.price_bdt) * 100) / 100;
    const totalCreditsAdded = pkg.credits + (pkg.bonus_credits || 0);
    user.credits_balance = (user.credits_balance || 0) + totalCreditsAdded;

    this.recordLedgerEntry({
      transaction_id: `TX-CRED-${Date.now()}-${uId}`,
      user_id: uId,
      account: 'platform_revenue',
      type: 'credit_purchase',
      direction: 'credit',
      amount: pkg.price_bdt,
      currency: 'BDT',
      reference: `Credit Pack: ${totalCreditsAdded} Credits`,
      metadata: { package_id: pkg.id, credits: totalCreditsAdded }
    });

    this.saveDisk();
    return {
      success: true,
      credits_added: totalCreditsAdded,
      new_credit_balance: user.credits_balance,
      new_wallet_balance: user.wallet_balance
    };
  }

  // --- LEAD GENERATION MONETIZATION ---
  getLeadProducts(category = null) {
    this.ensureInitialized();
    const m = this._m();
    let leads = (m.lead_products || []).map(l => ({ ...l }));
    if (category) {
      leads = leads.filter(l => l.category.toLowerCase() === category.toLowerCase());
    }
    return leads;
  }

  purchaseLead(workerId, leadProductId) {
    this.ensureInitialized();
    const m = this._m();
    const uId = Number(workerId);
    const user = (m.users || []).find(u => u.id === uId);
    if (!user) throw new Error('Freelancer not found');

    const lead = (m.lead_products || []).find(l => l.id === leadProductId);
    if (!lead) throw new Error('Lead product not found');

    if (Number(user.wallet_balance || 0) < lead.price_bdt) {
      const err = new Error(`Insufficient balance. You need ৳${lead.price_bdt} to purchase this client lead.`);
      err.status = 402;
      throw err;
    }

    user.wallet_balance = Math.round((Number(user.wallet_balance) - lead.price_bdt) * 100) / 100;

    const txRecord = {
      id: `LEAD-TX-${Date.now()}-${uId}`,
      worker_id: uId,
      lead_id: lead.id,
      lead_title: lead.title,
      price_bdt: lead.price_bdt,
      status: 'converted',
      created_at: new Date().toISOString()
    };
    m.lead_transactions.push(txRecord);

    this.recordLedgerEntry({
      transaction_id: txRecord.id,
      user_id: uId,
      account: 'platform_revenue',
      type: 'lead_fee',
      direction: 'credit',
      amount: lead.price_bdt,
      currency: 'BDT',
      reference: `Qualified Lead: ${lead.title}`,
      metadata: { lead_id: lead.id }
    });

    this.saveDisk();
    return { success: true, transaction: txRecord, lead_id: lead.id, lead: lead, balance: user.wallet_balance };
  }

  // --- IMMUTABLE FINANCIAL LEDGER & SNAPSHOTS ---
  recordLedgerEntry(entry = {}) {
    this.ensureInitialized();
    const m = this._m();
    const nextSeq = ++m.seq.financial_ledger;

    const entryType = entry.entry_type || entry.type || 'worker_commission';
    const amountVal = entry.amount !== undefined ? Number(entry.amount) : (entry.net_amount !== undefined ? Number(entry.net_amount) : Number(entry.gross_amount || 0));

    const record = {
      id: nextSeq,
      transaction_id: entry.transaction_id || `TX-${Date.now()}-${nextSeq}`,
      task_id: entry.task_id !== undefined ? entry.task_id : (entry.taskId !== undefined ? entry.taskId : null),
      user_id: entry.user_id !== undefined ? entry.user_id : (entry.worker_id !== undefined ? entry.worker_id : (entry.client_id !== undefined ? entry.client_id : null)),
      client_id: entry.client_id || null,
      worker_id: entry.worker_id || null,
      account: entry.account || 'platform_revenue',
      type: entryType,
      entry_type: entryType,
      direction: entry.direction || 'credit', // 'debit' | 'credit'
      amount: Math.round(amountVal * 100) / 100,
      gross_amount: entry.gross_amount !== undefined ? Number(entry.gross_amount) : amountVal,
      fee_amount: entry.fee_amount !== undefined ? Number(entry.fee_amount) : 0,
      net_amount: entry.net_amount !== undefined ? Number(entry.net_amount) : amountVal,
      source_type: entry.source_type || null,
      source_id: entry.source_id || null,
      destination_type: entry.destination_type || null,
      destination_id: entry.destination_id || null,
      pricing_snapshot_id: entry.pricing_snapshot_id || null,
      currency: (entry.currency || 'BDT').toUpperCase(),
      reference: entry.reference || entry.notes || '',
      notes: entry.notes || entry.reference || '',
      metadata: entry.metadata || {},
      created_at: new Date().toISOString()
    };

    m.financial_ledger.push(record);
    this.saveDisk();
    return record;
  }

  getFinancialLedger(filters = {}) {
    this.ensureInitialized();
    const m = this._m();
    let ledger = (m.financial_ledger || []).map(l => ({ ...l }));

    const taskIdFilter = filters.task_id !== undefined ? filters.task_id : filters.taskId;
    const typeFilter = filters.type || filters.entry_type || filters.entryType;
    const userIdFilter = filters.user_id !== undefined ? filters.user_id : filters.userId;

    if (typeFilter) ledger = ledger.filter(l => l.type === typeFilter || l.entry_type === typeFilter);
    if (filters.account) ledger = ledger.filter(l => l.account === filters.account);
    if (userIdFilter) ledger = ledger.filter(l => String(l.user_id) === String(userIdFilter) || String(l.worker_id) === String(userIdFilter) || String(l.client_id) === String(userIdFilter));
    if (taskIdFilter) ledger = ledger.filter(l => String(l.task_id) === String(taskIdFilter));

    // Sort descending by id (latest events first)
    ledger.sort((a, b) => b.id - a.id);

    const limit = Math.min(Number(filters.limit) || 100, 500);
    const offset = Math.max(Number(filters.offset) || 0, 0);

    const sliced = ledger.slice(offset, offset + limit);
    return {
      total: ledger.length,
      items: sliced,
      entries: sliced
    };
  }

  savePricingSnapshot(snapshot) {
    this.ensureInitialized();
    const m = this._m();
    m.pricing_snapshots.push({ ...snapshot });
    this.saveDisk();
    return snapshot;
  }

  getPricingSnapshotByTask(taskId) {
    this.ensureInitialized();
    const m = this._m();
    const s = (m.pricing_snapshots || []).find(s => String(s.task_id) === String(taskId));
    return s || null;
  }

  // --- AUTHORITATIVE ESCROW CALCULATOR & DISBURSER ---
  calculateTaskEscrowHold(task, client, worker = null, opts = {}) {
    this.ensureInitialized();
    const m = this._m();

    const context = pricingEngine.buildContext({
      user: worker || { id: null, membership: 'free', group: 'standard' },
      client: client,
      task: task,
      transaction: {
        type: 'escrow_hold',
        amount: Number(task.budget),
        currency: task.currency || 'BDT',
        custom_rate: opts.custom_rate
      },
      campaign: opts.campaign || null
    });

    const calculation = pricingEngine.calculate(context, m.pricing_rules);
    const snapshot = pricingEngine.createSnapshot(calculation, context);

    return { calculation, snapshot };
  }

  // --- MONETIZATION OVERVIEW & KPIS ---
  getMonetizationKPIs() {
    this.ensureInitialized();
    const m = this._m();

    const ledger = m.financial_ledger || [];
    const tasks = m.tasks || [];
    const completedTasks = tasks.filter(t => t.status === 'completed');

    // Calculate GMV (Gross Merchandise Value)
    const totalGmv = completedTasks.reduce((sum, t) => sum + Number(t.budget || 0), 0);

    // Sum revenue streams from ledger
    const workerCommission = ledger.filter(l => l.type === 'worker_commission').reduce((sum, l) => sum + l.amount, 0);
    const clientFees = ledger.filter(l => l.type === 'client_fee').reduce((sum, l) => sum + l.amount, 0);
    const subscriptions = ledger.filter(l => l.type === 'subscription').reduce((sum, l) => sum + l.amount, 0);
    const featuredRevenue = ledger.filter(l => l.type === 'featured_task' || l.type === 'task_boost').reduce((sum, l) => sum + l.amount, 0);
    const leadRevenue = ledger.filter(l => l.type === 'lead_fee').reduce((sum, l) => sum + l.amount, 0);
    const creditRevenue = ledger.filter(l => l.type === 'credit_purchase').reduce((sum, l) => sum + l.amount, 0);

    const grossRevenue = workerCommission + clientFees + subscriptions + featuredRevenue + leadRevenue + creditRevenue;
    const paymentCosts = Math.round((grossRevenue * 0.015) * 100) / 100;
    const refunds = ledger.filter(l => l.type === 'refund').reduce((sum, l) => sum + l.amount, 0);
    const netRevenue = Math.max(0, Math.round((grossRevenue - paymentCosts - refunds) * 100) / 100);

    const takeRatePct = totalGmv > 0 ? Math.round(((grossRevenue / totalGmv) * 100) * 10) / 10 : 10.0;

    // Escrow held currently
    const inProgressTasks = tasks.filter(t => t.status === 'in_progress' || t.status === 'submitted' || t.status === 'delivered');
    const escrowAccrued = inProgressTasks.reduce((sum, t) => sum + Number(t.budget || 0), 0);

    return {
      gmv: totalGmv,
      gross_revenue: grossRevenue,
      net_revenue: netRevenue,
      take_rate_pct: takeRatePct,
      escrow_accrued: escrowAccrued,
      breakdown: {
        worker_commission: workerCommission,
        client_fees: clientFees,
        subscriptions: subscriptions,
        featured_tasks: featuredRevenue,
        lead_revenue: leadRevenue,
        credit_revenue: creditRevenue,
        payment_costs: paymentCosts,
        refunds: refunds
      },
      active_memberships_count: (m.user_memberships || []).filter(um => um.status === 'active').length,
      active_rules_count: (m.pricing_rules || []).filter(r => r.status === 'active').length,
      total_rules_count: (m.pricing_rules || []).length
    };
  }
}

const monetizationStoreInstance = new MonetizationStore();

module.exports = {
  MonetizationStore,
  monetizationStore: monetizationStoreInstance
};
