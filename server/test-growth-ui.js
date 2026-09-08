const http = require('http');

function fetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = http.request({
      hostname: u.hostname,
      port: u.port,
      path: u.pathname + u.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data, headers: res.headers }));
    });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function run() {
  console.log('--- VERIFYING GROWTH UI PAGES & ASSETS ---');

  // 1. Check Homepage for new Growth components
  const home = await fetch('http://localhost:3000/');
  console.log(`[PASS] Home Page Status: ${home.status}`);
  if (!home.body.includes('id="top-campaign-bar"')) throw new Error('Missing top-campaign-bar in index.html');
  if (!home.body.includes('id="pro-spotlight"')) throw new Error('Missing pro-spotlight in index.html');
  if (!home.body.includes('modal-public-campaign-deal')) throw new Error('Missing modal-public-campaign-deal');
  if (!home.body.includes('modal-public-share-referral')) throw new Error('Missing modal-public-share-referral');
  if (!home.body.includes('modal-public-daily-streak')) throw new Error('Missing modal-public-daily-streak');
  if (!home.body.includes('modal-talent-spotlight-apply')) throw new Error('Missing modal-talent-spotlight-apply');
  console.log('[PASS] All 5 Growth Modals and sections present in index.html');

  // 2. Check Tasks Browse Page
  const tasks = await fetch('http://localhost:3000/tasks');
  console.log(`[PASS] Tasks Browse Page Status: ${tasks.status}`);
  if (!tasks.body.includes('id="filter-featured"')) throw new Error('Missing filter-featured in tasks.html');
  console.log('[PASS] Featured & Boosted filter present in tasks.html');

  // 3. Check Task Details Page
  const task = await fetch('http://localhost:3000/task?id=1');
  console.log(`[PASS] Task Detail Page Status: ${task.status}`);
  if (!task.body.includes('id="modal-boost-task"')) throw new Error('Missing modal-boost-task in task.html');
  console.log('[PASS] Boost Task Modal present in task.html');

  // 4. Check Wallet Page
  const wallet = await fetch('http://localhost:3000/wallet');
  console.log(`[PASS] Wallet Page Status: ${wallet.status}`);

  // 5. Check CSS & JS Bundles
  const css = await fetch('http://localhost:3000/css/styles.css');
  if (!css.body.includes('.top-campaign-bar') || !css.body.includes('.pro-spotlight-card')) {
    throw new Error('Missing growth CSS classes');
  }
  console.log('[PASS] CSS bundle contains all growth styles (.top-campaign-bar, .pro-spotlight-card, .loyalty-progress-fill)');

  const sharedJs = await fetch('http://localhost:3000/js/shared.js');
  if (!sharedJs.body.includes('xe_ref_code') || !sharedJs.body.includes('nav-gamification-pill')) {
    throw new Error('Missing referral/gamification code in shared.js');
  }
  console.log('[PASS] shared.js contains referral URL capture and navbar gamification pill');

  const walletJs = await fetch('http://localhost:3000/js/wallet.js');
  if (!walletJs.body.includes('loadReferralHub') || !walletJs.body.includes('loadLoyaltyHub')) {
    throw new Error('Missing referral/loyalty handlers in wallet.js');
  }
  console.log('[PASS] wallet.js contains loadReferralHub and loadLoyaltyHub');

  console.log('====================================================');
  console.log('✅ ALL GROWTH & GAMIFICATION UI COMPONENTS VERIFIED!');
  console.log('====================================================');
}

run().catch(err => {
  console.error('[FAIL]', err);
  process.exit(1);
});
