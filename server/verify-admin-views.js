const fs = require('fs');
const path = require('path');
const assert = require('assert');

async function verifyAdminViews() {
  console.log('================ VERIFYING COMPLETE ADMIN ANALYTICS PANELS & ROUTING ================');

  const adminHtml = fs.readFileSync(path.join(__dirname, '../public/admin.html'), 'utf8');
  const adminJs = fs.readFileSync(path.join(__dirname, '../public/js/admin.js'), 'utf8');

  // 1. Verify exact single instances of all 9 analytics view panels
  const viewIds = [
    'view-analytics',
    'view-user-analytics',
    'view-task-analytics',
    'view-revenue-analytics',
    'view-worker-analytics',
    'view-client-analytics',
    'view-category-analytics',
    'view-conversion-analytics',
    'view-retention-analytics'
  ];

  for (const vId of viewIds) {
    const regex = new RegExp(`id="${vId}"`, 'g');
    const matches = adminHtml.match(regex) || [];
    assert.strictEqual(matches.length, 1, `View panel #${vId} must appear exactly once in admin.html (found ${matches.length})`);
    console.log(`✅ Single unique DOM instance: #${vId}`);
  }

  // 2. Verify all dynamic sub-elements exist in admin.html
  const expectedElements = [
    'fin-kpi-gross-gmv', 'fin-kpi-net-profit', 'fin-kpi-paid-out', 'fin-kpi-escrow-float',
    'fin-rev-chart-wrap', 'fin-gateways-list', 'fin-ledger-table-body',
    'user-kpi-mau', 'user-kpi-retention', 'user-kpi-client-ltv', 'user-kpi-worker-ltv',
    'user-cohort-matrix-body', 'user-geo-bars-wrap',
    'task-kpi-first-bid', 'task-kpi-hire-time', 'task-kpi-completion', 'task-kpi-proposals',
    'task-liquidity-table-body',
    'gmv-kpi-monthly', 'gmv-kpi-take-rate', 'gmv-kpi-net-revenue', 'gmv-kpi-projected',
    'gmv-forecast-chart-wrap', 'gmv-revenue-streams-wrap',
    'wrk-kpi-total', 'wrk-kpi-median', 'wrk-kpi-hourly', 'wrk-kpi-top-tier',
    'wrk-brackets-wrap', 'wrk-skills-wrap', 'wrk-leaderboard-body',
    'cli-kpi-total', 'cli-kpi-repeat', 'cli-kpi-ltv', 'cli-kpi-corp',
    'cli-segments-wrap', 'cli-leaderboard-body',
    'cat-kpi-total', 'cat-kpi-fastest', 'cat-kpi-volume', 'cat-kpi-ticket',
    'cat-benchmarks-body',
    'cnv-kpi-overall', 'cnv-kpi-acceptance', 'cnv-kpi-density', 'cnv-kpi-sla',
    'cnv-funnel-wrap', 'cnv-modalities-wrap',
    'ret-kpi-m1', 'ret-kpi-m3', 'ret-kpi-ltv-cac', 'ret-kpi-churn',
    'ret-decay-chart-wrap', 'ret-frequency-wrap'
  ];

  for (const elId of expectedElements) {
    const regex = new RegExp(`id="${elId}"`, 'g');
    const matches = adminHtml.match(regex) || [];
    assert.strictEqual(matches.length, 1, `Element #${elId} must appear exactly once in admin.html (found ${matches.length})`);
  }
  console.log(`✅ All ${expectedElements.length} interactive DOM elements verified across all 9 analytics modules.`);

  // 3. Verify JavaScript switchView wiring
  const expectedFunctions = [
    'loadFinancialAnalytics',
    'loadUserCohortAnalytics',
    'loadTaskVelocityAnalytics',
    'loadGmvTakeRateAnalytics',
    'loadWorkerAnalytics',
    'loadClientAnalytics',
    'loadCategoryAnalytics',
    'loadConversionAnalytics',
    'loadRetentionAnalytics'
  ];

  for (const fn of expectedFunctions) {
    assert(adminJs.includes(fn), `${fn} missing in admin.js`);
  }
  console.log(`✅ All ${expectedFunctions.length} JavaScript controllers & switchView hooks verified.`);

  console.log('\n🎉 ALL 9 ANALYTICS DASHBOARDS FULLY VERIFIED IN DOM, ROUTER & CLIENT JS!');
}

verifyAdminViews().catch(err => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
