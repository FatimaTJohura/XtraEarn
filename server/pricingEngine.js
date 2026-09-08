/**
 * XtraEarn Centralized Pricing & Monetization Engine
 * 
 * Core architectural service responsible for all marketplace take-rate calculations,
 * multi-tier commission rules, condition evaluations, deterministic rule priorities,
 * immutable pricing snapshot generation, and audit lineage tracing.
 */

class PricingEngine {
  constructor() {
    // Deterministic Rule Priority Hierarchy:
    // 1000 -> Transaction Override (Specific ad-hoc or promotion parameter on transaction)
    // 900  -> Promotional Campaign (Time-limited platform campaigns)
    // 800  -> User Specific Override (Rahim 5%, Karim 1%, Strategic Partner 0%)
    // 700  -> Membership Tier (Free 10%, Starter 7%, Pro 5%, Expert 2%, Partner 0-1%)
    // 650  -> User Group (New Worker 0%, Verified 8%, Top Worker 3%, Professional 2%, Partner 1%)
    // 600  -> Enterprise Contract
    // 500  -> Subcategory Rule
    // 400  -> Category Rule (Design 7%, Programming 5%, Medical 15%)
    // 300  -> Task Type (Online vs Physical vs Hybrid)
    // 200  -> Country / Region (BD, US, UK, etc.)
    // 100  -> Global Marketplace Baseline (10%)
    this.PRIORITY_LEVELS = {
      transaction: 1000,
      campaign: 900,
      promotion: 900,
      user: 800,
      membership: 700,
      user_group: 650,
      enterprise: 600,
      subcategory: 500,
      category: 400,
      task_type: 300,
      country: 200,
      global: 100
    };

    this.DEFAULT_CURRENCIES = [
      { code: 'BDT', symbol: '৳', rate: 1.0, is_default: true, min_budget: 20 },
      { code: 'USD', symbol: '$', rate: 120.0, is_default: false, min_budget: 1 },
      { code: 'EUR', symbol: '€', rate: 130.5, is_default: false, min_budget: 1 },
      { code: 'GBP', symbol: '£', rate: 152.0, is_default: false, min_budget: 1 }
    ];
    this.rules = [];
  }

  setRules(rules) {
    this.rules = Array.isArray(rules) ? rules : [];
  }

  getRules() {
    return this.rules || [];
  }

  /**
   * Build a standardized, normalized pricing context object
   */
  buildContext(input = {}) {
    const user = input.user || {};
    const client = input.client || {};
    const task = input.task || {};
    const transaction = input.transaction || {};
    const campaign = input.campaign || input.campaign_code || (task ? task.campaign_code : null) || null;

    const amount = Number(
      transaction.amount !== undefined ? transaction.amount : (task.budget !== undefined ? task.budget : (input.amount || 0))
    );

    const currency = (
      transaction.currency || task.currency || input.currency || 'BDT'
    ).toUpperCase();

    return {
      user: {
        id: user.id || input.userId || null,
        email: (user.email || input.userEmail || '').toLowerCase(),
        name: user.name || '',
        role: user.role || 'freelancer',
        membership: (user.membership || input.membership || 'free').toLowerCase(),
        group: (user.group || user.user_group || input.userGroup || 'standard').toLowerCase(),
        verified: Boolean(user.verified || user.is_verified || false),
        country: (user.country || input.country || 'BD').toUpperCase(),
        rating: Number(user.rating || 0),
        tasks_completed: Number(user.tasks_completed || user.completed_tasks || 0),
        account_age_months: Number(user.account_age_months || 0)
      },
      client: {
        id: client.id || task.clientId || input.clientId || null,
        email: (client.email || input.clientEmail || '').toLowerCase(),
        name: client.name || '',
        membership: (client.membership || 'free').toLowerCase(),
        group: (client.group || 'standard').toLowerCase(),
        country: (client.country || 'BD').toUpperCase(),
        is_enterprise: Boolean(client.is_enterprise || false)
      },
      task: {
        id: task.id || input.taskId || null,
        title: task.title || '',
        type: (task.taskType || task.task_type || task.type || input.taskType || 'online').toLowerCase(),
        task_type: (task.taskType || task.task_type || task.type || input.taskType || 'online').toLowerCase(),
        category_id: task.categoryId || task.category_id || input.categoryId || null,
        category: task.categoryName || task.category || input.category || 'General',
        subcategory: task.subcategory || input.subcategory || null,
        budget: amount,
        currency: currency,
        campaign_code: campaign
      },
      _is_built_context: true,
      transaction: {
        type: transaction.type || input.transactionType || 'task_payment',
        amount: amount,
        currency: currency,
        override_rule_id: transaction.override_rule_id || input.overrideRuleId || null,
        custom_rate: (transaction.custom_rate !== undefined && transaction.custom_rate !== null)
          ? Number(transaction.custom_rate)
          : (input.customRate !== undefined && input.customRate !== null ? Number(input.customRate) : null)
      },
      campaign: campaign,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Evaluate a single condition against the context
   */
  evaluateCondition(cond, context) {
    if (!cond || !cond.field) return true;

    // Resolve field path (e.g. 'user.membership', 'task.category', 'transaction.amount')
    const parts = cond.field.split('.');
    let actual = context;
    for (const p of parts) {
      if (actual === null || actual === undefined) {
        actual = undefined;
        break;
      }
      actual = actual[p];
    }

    const op = cond.operator || 'equals';
    const expected = cond.value;

    // Normalizers
    const strActual = actual !== undefined && actual !== null ? String(actual).toLowerCase() : '';
    const strExpected = expected !== undefined && expected !== null ? String(expected).toLowerCase() : '';
    const numActual = Number(actual);
    const numExpected = Number(expected);

    switch (op) {
      case 'equals':
        if (typeof expected === 'boolean') return Boolean(actual) === expected;
        if (typeof expected === 'number' && !isNaN(numActual)) return numActual === numExpected;
        return strActual === strExpected;

      case 'not_equals':
        if (typeof expected === 'boolean') return Boolean(actual) !== expected;
        if (typeof expected === 'number' && !isNaN(numActual)) return numActual !== numExpected;
        return strActual !== strExpected;

      case 'greater_than':
        return !isNaN(numActual) && numActual > numExpected;

      case 'greater_or_equal':
        return !isNaN(numActual) && numActual >= numExpected;

      case 'less_than':
        return !isNaN(numActual) && numActual < numExpected;

      case 'less_or_equal':
        return !isNaN(numActual) && numActual <= numExpected;

      case 'contains':
        if (Array.isArray(actual)) {
          return actual.map(x => String(x).toLowerCase()).includes(strExpected);
        }
        return strActual.includes(strExpected);

      case 'not_contains':
        if (Array.isArray(actual)) {
          return !actual.map(x => String(x).toLowerCase()).includes(strExpected);
        }
        return !strActual.includes(strExpected);

      case 'in':
        const inArray = Array.isArray(expected) ? expected : String(expected).split(',').map(s => s.trim().toLowerCase());
        return inArray.includes(strActual);

      case 'not_in':
        const notInArray = Array.isArray(expected) ? expected : String(expected).split(',').map(s => s.trim().toLowerCase());
        return !notInArray.includes(strActual);

      case 'between':
        if (Array.isArray(expected) && expected.length === 2) {
          return numActual >= Number(expected[0]) && numActual <= Number(expected[1]);
        }
        return true;

      case 'empty':
        return actual === null || actual === undefined || strActual === '' || (Array.isArray(actual) && actual.length === 0);

      case 'not_empty':
        return actual !== null && actual !== undefined && strActual !== '' && (!Array.isArray(actual) || actual.length > 0);

      default:
        return true;
    }
  }

  /**
   * Evaluate a rule's full condition set ('all' and 'any')
   */
  evaluateRuleConditions(rule, context) {
    if (!rule.conditions) return true;

    // Direct array of conditions implies 'all'
    if (Array.isArray(rule.conditions)) {
      return rule.conditions.every(c => this.evaluateCondition(c, context));
    }

    if (typeof rule.conditions === 'object') {
      if (Array.isArray(rule.conditions.all) && rule.conditions.all.length) {
        const allPass = rule.conditions.all.every(c => this.evaluateCondition(c, context));
        if (!allPass) return false;
      }
      if (Array.isArray(rule.conditions.any) && rule.conditions.any.length) {
        const anyPass = rule.conditions.any.some(c => this.evaluateCondition(c, context));
        if (!anyPass) return false;
      }
    }

    return true;
  }

  /**
   * Check whether a rule matches the scope of the context
   */
  matchesScope(rule, context) {
    // 1. Status and Date validity
    if (rule.status && rule.status !== 'active') return false;
    const now = new Date();
    if (rule.starts_at && new Date(rule.starts_at) > now) return false;
    if (rule.expires_at && new Date(rule.expires_at) < now) return false;

    // 2. Scope type matching
    const scopeType = (rule.scope_type || rule.rule_type || 'global').toLowerCase();
    const target = rule.target !== undefined && rule.target !== null ? String(rule.target).toLowerCase() : null;

    switch (scopeType) {
      case 'global':
        return true;

      case 'transaction':
        if (context.transaction.override_rule_id && String(rule.id) === String(context.transaction.override_rule_id)) return true;
        return false;

      case 'campaign':
      case 'promotion':
        const camp = context.campaign || (context.task && context.task.campaign_code);
        if (camp) {
          const normCamp = String(camp).toLowerCase();
          if (target && (target === normCamp || target.includes(normCamp) || normCamp.includes(target))) return true;
          if (rule.campaign_code && String(rule.campaign_code).toLowerCase() === normCamp) return true;
        }
        if (target === 'all' || target === 'any') return true;
        return false;

      case 'user':
        if (rule.target_user_id && context.user.id && String(rule.target_user_id) === String(context.user.id)) return true;
        if (rule.target_user_email && context.user.email && String(rule.target_user_email).toLowerCase() === String(context.user.email).toLowerCase()) return true;
        if (target) {
          if (context.user.id && target === String(context.user.id).toLowerCase()) return true;
          if (context.user.email && target === String(context.user.email).toLowerCase()) return true;
          if (context.user.name && String(context.user.name).toLowerCase().includes(target)) return true;
        }
        return false;

      case 'user_group':
        return target === context.user.group;

      case 'membership':
      case 'subscription':
        return target === context.user.membership;

      case 'enterprise':
        return context.client.is_enterprise || target === context.client.group;

      case 'category':
        if (!context.task.category) return false;
        const taskCat = String(context.task.category).toLowerCase();
        if (target === taskCat || taskCat.includes(target) || target.includes(taskCat)) return true;
        if (rule.target_label) {
          const targetLbl = String(rule.target_label).toLowerCase();
          if (targetLbl === taskCat || taskCat.includes(targetLbl) || targetLbl.includes(taskCat)) return true;
        }
        if (rule.category_id && String(rule.category_id) === String(context.task.category_id)) return true;
        return false;

      case 'subcategory':
        if (!context.task.subcategory) return false;
        const taskSub = String(context.task.subcategory).toLowerCase();
        return target === taskSub || taskSub.includes(target) || target.includes(taskSub);

      case 'task_type':
        const tType = String(context.task.task_type || context.task.type || 'standard').toLowerCase();
        return target === tType || tType.includes(target) || target.includes(tType);

      case 'country':
        return target === context.user.country.toLowerCase() || target === context.client.country.toLowerCase();

      case 'volume_bracket':
        if (target && target.endsWith('+')) {
          const minVol = Number(target.slice(0, -1));
          return context.transaction.amount >= minVol;
        }
        return true;

      default:
        return true;
    }
  }

  /**
   * Filter and order applicable rules by priority
   */
  getApplicableRules(rulesList = [], context) {
    const applicable = [];

    for (const r of rulesList) {
      if (this.matchesScope(r, context) && this.evaluateRuleConditions(r, context)) {
        const scopeType = (r.scope_type || r.rule_type || 'global').toLowerCase();
        // Resolve priority: explicit rule priority takes precedence, else fallback to canonical hierarchy
        const priority = r.priority !== undefined && r.priority !== null
          ? Number(r.priority)
          : (this.PRIORITY_LEVELS[scopeType] || 100);

        applicable.push({
          ...r,
          computed_priority: priority
        });
      }
    }

    // Sort descending by computed_priority (higher priority wins)
    applicable.sort((a, b) => b.computed_priority - a.computed_priority);
    return applicable;
  }

  /**
   * Centralized Authoritative Pricing Calculation
   */
  calculate(rawContext, rulesList = null) {
    const rules = (rulesList && rulesList.length) ? rulesList : (this.rules || []);
    const context = rawContext?._is_built_context ? rawContext : this.buildContext(rawContext);
    const amount = Math.max(0, Number(context.transaction.amount || 0));
    const currency = context.transaction.currency;

    // Currency configuration lookup
    const curObj = this.DEFAULT_CURRENCIES.find(c => c.code === currency) || this.DEFAULT_CURRENCIES[0];

    // Find and resolve applicable rules
    const applicableRules = this.getApplicableRules(rules, context);

    // Initial default values (Baseline 10% worker commission, 0% client service fee)
    let workerCommissionRate = 10.0;
    let clientFeeRate = 0.0;
    let fixedWorkerFee = 0.0;
    let fixedClientFee = 0.0;
    let paymentProcessingFee = 0.0;

    let appliedWorkerRule = null;
    let appliedClientRule = null;
    const rulesApplied = [];
    const overriddenRules = [];

    // Check for direct transaction custom rate override (e.g. Ad-hoc contract)
    if (context.transaction.custom_rate !== null && context.transaction.custom_rate !== undefined) {
      workerCommissionRate = Math.max(0, Math.min(100, Number(context.transaction.custom_rate)));
      appliedWorkerRule = {
        id: 'TX-CUSTOM',
        name: 'Transaction Custom Override',
        scope_type: 'transaction',
        rate_pct: workerCommissionRate,
        computed_priority: 1000
      };
      rulesApplied.push(appliedWorkerRule);
    } else if (applicableRules.length > 0) {
      // 1. Resolve Worker Commission Rule
      const workerRules = applicableRules.filter(r => (!r.fee_side || r.fee_side === 'worker' || r.fee_side === 'both'));
      if (workerRules.length > 0) {
        // Highest priority non-stackable rule is the base
        const primary = workerRules[0];
        appliedWorkerRule = primary;
        rulesApplied.push(primary);

        // Record overridden rules for explanation
        for (let i = 1; i < workerRules.length; i++) {
          if (!workerRules[i].stackable) {
            overriddenRules.push(workerRules[i]);
          }
        }

        // Determine rate / fee based on fee_type
        const feeType = primary.fee_type || 'percentage';
        if (feeType === 'zero_fee') {
          workerCommissionRate = 0.0;
        } else if (feeType === 'percentage') {
          workerCommissionRate = primary.rate_pct !== undefined ? Number(primary.rate_pct) : Number(primary.value || 0);
        } else if (feeType === 'fixed') {
          workerCommissionRate = 0.0;
          fixedWorkerFee = Number(primary.fixed_amount || primary.value || 0);
        } else if (feeType === 'percentage_plus_fixed') {
          workerCommissionRate = primary.rate_pct !== undefined ? Number(primary.rate_pct) : 0.0;
          fixedWorkerFee = Number(primary.fixed_amount || 0);
        } else if (feeType === 'volume_based' || feeType === 'tiered') {
          workerCommissionRate = primary.rate_pct !== undefined ? Number(primary.rate_pct) : 10.0;
        }

        // Process stackable discount / surcharge adjustments
        for (let i = 1; i < workerRules.length; i++) {
          const rule = workerRules[i];
          if (rule.stackable) {
            const mode = rule.calculation_mode || 'add';
            const val = Number(rule.rate_pct !== undefined ? rule.rate_pct : (rule.value || 0));
            if (mode === 'discount' || mode === 'subtract') {
              workerCommissionRate = Math.max(0, workerCommissionRate - val);
              rulesApplied.push({ ...rule, effect: `Discount -${val}%` });
            } else if (mode === 'surcharge' || mode === 'add') {
              workerCommissionRate = Math.min(100, workerCommissionRate + val);
              rulesApplied.push({ ...rule, effect: `Surcharge +${val}%` });
            }
          }
        }
      }

      // 2. Resolve Client Service Fee Rule
      const clientRules = applicableRules.filter(r => (r.fee_side === 'client' || r.fee_side === 'both'));
      if (clientRules.length > 0) {
        const clientPrimary = clientRules[0];
        appliedClientRule = clientPrimary;
        if (!rulesApplied.some(r => r.id === clientPrimary.id)) {
          rulesApplied.push(clientPrimary);
        }
        if (clientPrimary.fee_type === 'fixed') {
          fixedClientFee = Number(clientPrimary.fixed_amount || clientPrimary.value || 0);
        } else {
          clientFeeRate = Number(clientPrimary.client_fee_pct !== undefined ? clientPrimary.client_fee_pct : (clientPrimary.rate_pct || 0));
        }
      }
    }

    // Ensure 0% is treated with exact precision (not null or fallback)
    workerCommissionRate = Math.max(0, Math.min(100, workerCommissionRate));
    clientFeeRate = Math.max(0, Math.min(100, clientFeeRate));

    // Calculate component amounts with 2-decimal monetary precision
    let workerCommission = Math.round(((amount * (workerCommissionRate / 100)) + fixedWorkerFee) * 100) / 100;
    
    // Apply min / max caps if specified on the winning rule
    if (appliedWorkerRule) {
      if (appliedWorkerRule.min_cap_bdt && workerCommission < appliedWorkerRule.min_cap_bdt) {
        workerCommission = appliedWorkerRule.min_cap_bdt;
      }
      if (appliedWorkerRule.max_cap_bdt && workerCommission > appliedWorkerRule.max_cap_bdt) {
        workerCommission = appliedWorkerRule.max_cap_bdt;
      }
    }

    // Client Fee calculations
    const clientServiceFee = Math.round(((amount * (clientFeeRate / 100)) + fixedClientFee) * 100) / 100;

    // Payment Processing Fee (separated from marketplace commission)
    if (context.transaction.include_payment_fee) {
      paymentProcessingFee = Math.round((amount * 0.015) * 100) / 100; // 1.5% gateway cost
    }

    // Final Net Calculations
    const workerNet = Math.max(0, Math.round((amount - workerCommission) * 100) / 100);
    const clientTotal = Math.round((amount + clientServiceFee + paymentProcessingFee) * 100) / 100;
    const platformGrossRevenue = Math.round((workerCommission + clientServiceFee) * 100) / 100;
    const platformNetRevenue = Math.max(0, Math.round((platformGrossRevenue - paymentProcessingFee) * 100) / 100);
    const takeRatePct = amount > 0 ? Math.round(((platformGrossRevenue / amount) * 100) * 100) / 100 : 0.0;

    // Human-readable explanation
    let explanation = `Applied ${appliedWorkerRule ? appliedWorkerRule.name : 'Standard Global Base'} (${workerCommissionRate}%).`;
    if (workerCommissionRate === 0) {
      explanation = `0% zero-fee take-rate applied via "${appliedWorkerRule ? appliedWorkerRule.name : 'Promotional Incentive'}". Worker receives 100% of contract amount.`;
    }

    return {
      base_amount: amount,
      currency: currency,
      currency_symbol: curObj.symbol,
      worker: {
        commission_rate: workerCommissionRate,
        effective_rate_percent: workerCommissionRate,
        fee_amount: workerCommission,
        commission_amount: workerCommission,
        fixed_fee: fixedWorkerFee,
        net_amount: workerNet,
        is_zero_fee: workerCommissionRate === 0 && fixedWorkerFee === 0
      },
      client: {
        service_fee_rate: clientFeeRate,
        effective_rate_percent: clientFeeRate,
        fee_amount: clientServiceFee,
        service_fee_amount: clientServiceFee,
        fixed_fee: fixedClientFee,
        payment_processing_fee: paymentProcessingFee,
        total_amount: clientTotal
      },
      platform: {
        gross_revenue: platformGrossRevenue,
        net_revenue: platformNetRevenue,
        take_rate_pct: takeRatePct
      },
      rules_applied: rulesApplied.map(r => ({
        id: r.id,
        rule_code: r.rule_code || `RUL-${r.id}`,
        name: r.name,
        scope_type: r.scope_type,
        rate_pct: r.rate_pct !== undefined ? r.rate_pct : workerCommissionRate,
        priority: r.computed_priority
      })),
      applied_rules: rulesApplied.map(r => ({
        id: r.id,
        rule_code: r.rule_code || `RUL-${r.id}`,
        name: r.name,
        scope_type: r.scope_type,
        rate_pct: r.rate_pct !== undefined ? r.rate_pct : workerCommissionRate,
        priority: r.computed_priority
      })),
      explanation: explanation,
      overridden_rules: overriddenRules.map(r => ({
        id: r.id,
        name: r.name,
        scope_type: r.scope_type,
        priority: r.computed_priority
      })),
      calculated_at: new Date().toISOString()
    };
  }

  /**
   * Generate an immutable Pricing Snapshot for a finalized transaction
   */
  createSnapshot(calculationResult, context) {
    const snapshotId = `SNP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    return {
      snapshot_id: snapshotId,
      task_id: context.task.id,
      client_id: context.client.id,
      worker_id: context.user.id,
      currency: calculationResult.currency,
      currency_symbol: calculationResult.currency_symbol,
      base_amount: calculationResult.base_amount,
      worker: { ...calculationResult.worker },
      client: { ...calculationResult.client },
      platform: { ...calculationResult.platform },
      rules_applied: [...calculationResult.rules_applied],
      explanation: calculationResult.explanation,
      created_at: new Date().toISOString(),
      is_immutable: true
    };
  }

  /**
   * Run a comprehensive live simulation showing detailed rule-by-rule match trace
   */
  simulate(rawContext, rulesList = null) {
    const rules = (rulesList && rulesList.length) ? rulesList : (this.rules || []);
    const context = this.buildContext(rawContext);
    const calculation = this.calculate(context, rules);

    const matchTrace = [];
    for (const rule of rules) {
      const scopeMatch = this.matchesScope(rule, context);
      const conditionsMatch = this.evaluateRuleConditions(rule, context);
      const priority = rule.priority !== undefined
        ? Number(rule.priority)
        : (this.PRIORITY_LEVELS[rule.scope_type] || 100);

      matchTrace.push({
        id: rule.id,
        rule_code: rule.rule_code || `RUL-${rule.id}`,
        name: rule.name,
        scope_type: rule.scope_type,
        target: rule.target,
        rate_pct: rule.rate_pct,
        priority: priority,
        scope_matched: scopeMatch,
        conditions_matched: conditionsMatch,
        eligible: scopeMatch && conditionsMatch,
        is_selected: calculation.rules_applied.some(r => String(r.id) === String(rule.id))
      });
    }

    matchTrace.sort((a, b) => b.priority - a.priority);

    return {
      simulation_id: `SIM-${Date.now()}`,
      context: context,
      calculation: calculation,
      rule_hierarchy_trace: matchTrace,
      decision_summary: {
        winning_rule: calculation.rules_applied[0] || null,
        effective_worker_rate_percent: calculation.worker.commission_rate,
        final_worker_commission_pct: calculation.worker.commission_rate,
        final_worker_payout: calculation.worker.net_amount,
        final_client_total: calculation.client.total_amount,
        platform_gross_revenue: calculation.platform.gross_revenue,
        take_rate_pct: calculation.platform.take_rate_pct,
        why_selected: calculation.explanation
      }
    };
  }
}

// Export singleton instance and class definition
const pricingEngineInstance = new PricingEngine();

module.exports = {
  PricingEngine,
  pricingEngine: pricingEngineInstance
};
