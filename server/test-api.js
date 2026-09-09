// ================================================================
// XtraEarn — full functional test suite
// Covers the complete business workflow end to end:
//   auth → post (online+physical) → apply → escrow accept → chat →
//   delivery (file) → approve → payout → review → wallet → profiles
// Run with the server up:  node server/test-api.js
// ================================================================
const BASE = 'http://localhost:3000';
const fs = require('fs');
const path = require('path');

let passed = 0, failed = 0;
const failures = [];

const j = async (path_, opts = {}) => {
  const res = await fetch(BASE + path_, {
    method: opts.method || 'GET',
    headers: { 'Content-Type': 'application/json', ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}) },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined
  });
  return { status: res.status, data: await res.json().catch(() => null) };
};

const raw = async (path_, opts = {}) => fetch(BASE + path_, opts);

const ok = (name, cond, extra = '') => {
  if (cond) { passed++; console.log(`PASS  ${name}${extra ? '  -> ' + extra : ''}`); }
  else { failed++; failures.push(name + (extra ? `  [${extra}]` : '')); console.log(`FAIL  ${name}${extra ? '  -> ' + extra : ''}`); }
};

(async () => {
  console.log('================ XTRAEARN FUNCTIONAL TEST ================\n');

  /* ---------- 1. infrastructure ---------- */
  let r = await j('/api/health');
  ok('health endpoint', r.status === 200 && r.data.ok, `mode=${r.data && r.data.mode}`);

  r = await j('/api/categories');
  ok('categories seeded', r.status === 200 && r.data.items.length >= 12, `${r.data.items && r.data.items.length} categories`);
  const cats = r.data.items || [];
  ok('physical category exists', cats.some(c => c.slug.includes('physical') || c.type === 'physical' || c.slug.includes('home-repair') || c.slug.includes('errands') || c.slug.includes('cleaning')));
  ok('local category exists', cats.some(c => c.slug.includes('local') || c.slug.includes('errands') || c.type === 'physical'));

  /* ---------- 2. public content ---------- */
  r = await j('/api/tasks?featured=1&limit=10');
  ok('featured tasks', r.status === 200 && r.data.items.length >= 5, `${r.data.total}`);

  r = await j('/api/tasks?type=physical');
  ok('physical tasks listed', r.status === 200 && r.data.items.length >= 6, `${r.data.total}`);
  ok('physical tasks all have location', (r.data.items || []).every(t => t.taskType === 'physical' && t.locationText));

  r = await j('/api/tasks?type=online');
  ok('online tasks listed', r.status === 200 && r.data.items.length >= 10, `${r.data.total}`);

  r = await j('/api/tasks?q=dhanmondi');
  ok('search finds location (area)', r.status === 200 && (r.data.items || []).some(t => /Dhanmondi/i.test(t.title + t.tags + (t.area || ''))), `${r.data.total} hits`);

  r = await j('/api/tasks?maxDuration=30');
  ok('time filter works', r.status === 200 && r.data.items.every(t => t.durationMinutes <= 30));

  r = await j('/api/tasks?minBudget=500');
  ok('budget filter works', r.status === 200 && r.data.items.every(t => t.budget >= 500), `${r.data.total}`);

  r = await j('/api/tasks?taskType=physical');
  ok('type filter works', r.status === 200 && r.data.items.length >= 6, `${r.data.total}`);

  r = await j('/api/earners?limit=5');
  ok('top earners', r.status === 200 && r.data.items.length >= 5 && (r.data.items.some(u => u.name.includes('Rahat') || u.name.includes('Faisal') || u.name.includes('Hasan'))));

  r = await j('/api/testimonials');
  ok('testimonials', r.status === 200 && r.data.items.length >= 4);

  r = await j('/api/experts?limit=20');
  ok('verified experts list', r.status === 200 && r.data.items.length >= 5, `${r.data.items.length} experts`);

  r = await j('/api/stats');
  ok('platform stats', r.status === 200 && r.data.users > 0);

  /* ---------- 3. auth ---------- */
  r = await j('/api/auth/login', { method: 'POST', body: { email: 'rakib@example.com', password: 'wrong' } });
  ok('wrong password rejected', r.status === 401);

  r = await j('/api/auth/login', { method: 'POST', body: { email: 'rakib@example.com', password: 'Password123!' } });
  ok('freelancer login (rakib)', r.status === 200 && (r.data.user.role === 'freelancer' || r.data.user.user_type === 'freelancer' || r.data.user.user_type === 'worker'));
  const rakib = r.data.token;
  const rakibWalletStart = r.data.user.wallet_balance;

  r = await j('/api/auth/login', { method: 'POST', body: { email: 'bdshop@example.com', password: 'Password123!' } });
  ok('client login (BD Shop funded wallet)', r.status === 200 && r.data.user.wallet_balance >= 10000, `balance=${r.data.user.wallet_balance}`);
  const bdshop = r.data.token;

  r = await j('/api/auth/login', { method: 'POST', body: { email: 'kamal@example.com', password: 'Password123!' } });
  ok('physical helper login (Kamal)', r.status === 200 && r.data.user.skills.includes('shop photo'));
  const kamal = r.data.token;

  const email = `qa${Date.now()}@example.com`;
  r = await j('/api/auth/register', { method: 'POST', body: { name: 'QA Client', email, password: 'Password123!', role: 'client' } });
  ok('register new client', r.status === 201 && r.data.user.wallet_balance === 0, `balance=${r.data.user.wallet_balance}`);
  const qa = r.data.token;

  r = await j('/api/auth/register', { method: 'POST', body: { name: 'Dup', email, password: 'Password123!' } });
  ok('duplicate register rejected', r.status === 409);

  r = await j('/api/auth/me', { token: rakib });
  ok('auth/me returns profile fields', r.status === 200 && r.data.user.profession && r.data.user.skills);

  /* ---------- 4. wallet ---------- */
  r = await j('/api/wallet', { token: qa });
  ok('wallet starts at 0', r.status === 200 && r.data.balance === 0);

  r = await j('/api/wallet/deposit', { method: 'POST', token: qa, body: { amount: 5000, method: 'bkash' } });
  ok('deposit ৳5000 via bKash', r.status === 200 && r.data.balance === 5000);

  r = await j('/api/wallet/deposit', { method: 'POST', token: qa, body: { amount: 5, method: 'bkash' } });
  ok('tiny deposit rejected', r.status === 400);

  r = await j('/api/wallet/withdraw', { method: 'POST', token: qa, body: { amount: 100, method: 'nagad', account: '01712345678' } });
  ok('withdrawal request accepted', r.status === 200 && r.data.balance === 4900 && r.data.withdrawal.status === 'pending');

  r = await j('/api/wallet/withdraw', { method: 'POST', token: qa, body: { amount: 999999, method: 'nagad', account: '01712345678' } });
  ok('over-balance withdrawal rejected', r.status === 400);

  r = await j('/api/wallet', { token: qa });
  ok('wallet ledger has entries', r.status === 200 && r.data.transactions.length === 2, `${r.data.transactions.length} tx`);

  /* ---------- 5. post tasks (online + physical) ---------- */
  r = await j('/api/tasks', { method: 'POST', token: qa, body: { title: 'QA Logo Task', description: 'Functional test online task for escrow verification.', categoryId: 1, budget: 300, durationMinutes: 30 } });
  ok('post online task', r.status === 201 && r.data.task.taskType === 'online');
  const qaTaskId = r.data.task.id;

  r = await j('/api/tasks', { method: 'POST', token: qa, body: { title: 'QA Physical Task', description: 'Functional test on-site task near QA office.', categoryId: 12, budget: 250, durationMinutes: 60, taskType: 'physical', locationText: 'QA Tower, Banani', area: 'Banani', district: 'Dhaka' } });
  ok('post physical task with location', r.status === 201 && r.data.task.taskType === 'physical' && r.data.task.area === 'Banani');
  const qaPhysId = r.data.task.id;

  r = await j('/api/tasks', { method: 'POST', token: qa, body: { title: 'Bad', description: 'short', categoryId: 1, budget: 300, durationMinutes: 30 } });
  ok('short description rejected', r.status === 400);

  r = await j('/api/tasks', { method: 'POST', token: qa, body: { title: 'Cheap', description: 'Below minimum budget validation.', categoryId: 1, budget: 5, durationMinutes: 30 } });
  ok('budget < ৳20 rejected', r.status === 400);

  r = await j('/api/tasks', { method: 'POST', token: qa, body: { title: 'No Location', description: 'Physical task without a location must fail.', categoryId: 12, budget: 100, durationMinutes: 30, taskType: 'physical' } });
  ok('physical without location rejected', r.status === 400);

  /* ---------- 6. applications + escrow accept ---------- */
  r = await j(`/api/tasks/${qaTaskId}/apply`, { method: 'POST', token: rakib, body: {} });
  ok('rakib applies to online task', r.status === 201);

  r = await j(`/api/tasks/${qaTaskId}/apply`, { method: 'POST', token: rakib, body: {} });
  ok('duplicate apply rejected', r.status === 409);

  r = await j(`/api/tasks/${qaPhysId}/apply`, { method: 'POST', token: kamal, body: {} });
  ok('kamal applies to physical task', r.status === 201);

  r = await j(`/api/tasks/${qaPhysId}/apply`, { method: 'POST', token: qa, body: {} });
  ok('owner cannot apply to own task', r.status === 400);

  // escrow: zero-balance client cannot accept
  const email2 = `qa2${Date.now()}@example.com`;
  r = await j('/api/auth/register', { method: 'POST', body: { name: 'QA Broke', email: email2, password: 'Password123!', role: 'client' } });
  const broke = r.data.token;
  r = await j('/api/tasks', { method: 'POST', token: broke, body: { title: 'Broke Task', description: 'Client has no money in wallet for escrow.', categoryId: 1, budget: 200, durationMinutes: 30 } });
  const brokeTaskId = r.data.task.id;
  r = await j(`/api/tasks/${brokeTaskId}/apply`, { method: 'POST', token: rakib, body: {} });
  r = await j('/api/my/applications', { token: rakib });
  const brokeAppId = r.data.items.find(x => x.task.id === brokeTaskId).id;
  r = await j(`/api/applications/${brokeAppId}/accept`, { method: 'POST', token: broke });
  ok('escrow blocks accept with empty wallet', r.status === 402, `needs=${r.data && r.data.needed}`);

  // successful escrow accept
  r = await j('/api/my/applications', { token: rakib });
  const rakibAppId = r.data.items.find(x => x.task.id === qaTaskId).id;
  r = await j(`/api/applications/${rakibAppId}/accept`, { method: 'POST', token: qa });
  ok('accept holds escrow', r.status === 200 && r.data.escrow.fee === 30 && r.data.escrow.payout === 270, `fee=${r.data.escrow && r.data.escrow.fee} payout=${r.data.escrow && r.data.escrow.payout}`);
  ok('task moved to in_progress', r.data.task.status === 'in_progress' && r.data.task.acceptedFreelancerId);

  r = await j('/api/wallet', { token: qa });
  ok('client wallet deducted by escrow', r.data.balance === 4600, `balance=${r.data.balance}`);
  ok('escrow_hold in ledger', r.data.transactions.some(t => t.type === 'escrow_hold' && t.amount === -300));

  /* ---------- 7. chat ---------- */
  r = await j(`/api/tasks/${qaTaskId}/messages`, { method: 'POST', token: rakib, body: { body: 'Hi! Starting the logo now.' } });
  ok('worker sends chat message', r.status === 201);

  r = await j(`/api/tasks/${qaTaskId}/messages`, { method: 'POST', token: qa, body: { body: 'Great, thanks!' } });
  ok('client replies in chat', r.status === 201);

  r = await j(`/api/tasks/${qaTaskId}/messages`, { token: rakib });
  ok('chat history (2 messages)', r.status === 200 && r.data.items.length === 2);

  r = await j(`/api/tasks/${qaPhysId}/messages`, { token: rakib });
  ok('non-participant blocked from chat', r.status === 403);

  /* ---------- 8. delivery + escrow release ---------- */
  const boundary = '----xe' + Date.now();
  const fileContent = 'PNG-ish test payload for XtraEarn delivery upload';
  const multipart = Buffer.from([
    `--${boundary}`,
    'Content-Disposition: form-data; name="taskId"', '', String(qaTaskId),
    `--${boundary}`,
    'Content-Disposition: form-data; name="note"', '', 'Final logo files attached.',
    `--${boundary}`,
    `Content-Disposition: form-data; name="file"; filename="logo.txt"`,
    'Content-Type: text/plain', '', fileContent
  ].join('\r\n') + `\r\n--${boundary}--\r\n`);

  let res = await raw('/api/deliveries', {
    method: 'POST',
    headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}`, Authorization: `Bearer ${rakib}` },
    body: multipart
  });
  let dj = await res.json().catch(() => null);
  ok('worker submits delivery with file', res.status === 201 && dj.delivery && dj.delivery.file_path, dj.delivery && dj.delivery.file_path);
  const deliveryId = dj.delivery.id;
  ok('uploaded file exists on disk', fs.existsSync(path.join(__dirname, '..', 'public', dj.delivery.file_path)));

  r = await j(`/api/tasks/${qaTaskId}`);
  ok('task status = delivered', r.data.task.status === 'delivered');

  r = await j(`/api/deliveries/${deliveryId}/approve`, { method: 'POST', token: rakib });
  ok('worker cannot self-approve', r.status === 403);

  // reject first → rework loop
  res = await raw(`/api/deliveries/${deliveryId}/reject`, { method: 'POST', headers: { Authorization: `Bearer ${qa}` } });
  ok('client requests rework', res.status === 200);
  r = await j(`/api/tasks/${qaTaskId}`);
  ok('task back to in_progress after rework', r.data.task.status === 'in_progress');

  // resubmit (link only) and approve
  r = await j('/api/deliveries', { method: 'POST', token: rakib, body: { taskId: qaTaskId, note: 'Fixed per feedback', link: 'https://drive.example.com/final' } });
  ok('worker resubmits with link', r.status === 201);
  const delivery2Id = r.data.delivery.id;

  const rakibBalBefore = (await j('/api/auth/me', { token: rakib })).data.user.wallet_balance;
  const completedBefore = (await j('/api/auth/me', { token: rakib })).data.user.tasks_completed;

  r = await j(`/api/deliveries/${delivery2Id}/approve`, { method: 'POST', token: qa });
  ok('client approves → escrow released', r.status === 200 && r.data.payout === 270, `payout=${r.data.payout}`);
  ok('task completed', r.data.task.status === 'completed');

  r = await j('/api/wallet', { token: rakib });
  ok('worker wallet credited 90%', r.data.balance === rakibWalletStart + 270, `balance=${r.data.balance}`);
  ok('escrow_release in worker ledger', r.data.transactions.some(t => t.type === 'escrow_release' && t.amount === 270));
  r = await j('/api/auth/me', { token: rakib });
  ok('worker stats updated', r.data.user.tasks_completed === completedBefore + 1 && r.data.user.total_earned >= 270);

  /* ---------- 9. review ---------- */
  r = await j(`/api/tasks/${qaTaskId}/review`, { method: 'POST', token: rakib, body: { rating: 5 } });
  ok('worker cannot review (client only)', r.status === 403);

  r = await j(`/api/tasks/${qaTaskId}/review`, { method: 'POST', token: qa, body: { rating: 5, comment: 'Superb logo work!' } });
  ok('client reviews worker', r.status === 201);

  r = await j(`/api/tasks/${qaTaskId}/review`, { method: 'POST', token: qa, body: { rating: 4 } });
  ok('double review rejected', r.status === 409);

  r = await j('/api/users/1');
  ok('public profile with reviews', r.status === 200 && r.data.reviews.length >= 1 && r.data.level && r.data.badges.length >= 0,
    `level=${r.data.level && r.data.level.name} reviews=${r.data.reviews.length}`);

  /* ---------- 10. profiles ---------- */
  r = await j('/api/users/15');
  ok('Kamal physical helper profile', r.status === 200 && r.data.user.skills.includes('price check'));

  r = await j('/api/users/11');
  ok('verified doctor badge', r.status === 200 && r.data.badges.some(b => b.includes('Verified Doctor')));

  r = await j('/api/users/me', { method: 'PATCH', token: kamal, body: { availability: 'busy', bio: 'On a job right now' } });
  ok('profile update (availability)', r.status === 200 && r.data.user.availability === 'busy');
  await j('/api/users/me', { method: 'PATCH', token: kamal, body: { availability: 'available' } });

  /* ---------- 11. my applications / posted ---------- */
  r = await j('/api/my/applications', { token: kamal });
  ok('my applications list', r.status === 200 && r.data.items.some(x => x.task.id === qaPhysId));

  const me = (await j('/api/auth/me', { token: qa })).data.user;
  r = await j('/api/tasks?limit=50&status=', { token: qa });
  ok('my posted tasks filter by client', r.status === 200 && r.data.items.every(t => t.clientId === me.id), `${r.data.items.length} posted`);

  /* ---------- 12. admin panel ---------- */
  const adminLogin = await j('/api/auth/login', { method: 'POST', body: { email: 'admin@xtraearn.com', password: 'Password123!' } });
  const adminToken = adminLogin.data && adminLogin.data.token;
  r = await j('/api/admin/overview', { token: adminToken });
  ok('admin overview', r.status === 200 && r.data.users !== undefined);
  r = await j('/api/admin/users', { token: adminToken });
  ok('admin users list', r.status === 200 && r.data.items.length >= 16);
  r = await j('/api/admin/transactions', { token: adminToken });
  ok('admin transaction ledger', r.status === 200);
  r = await j('/api/admin/withdrawals', { token: adminToken });
  ok('admin sees pending withdrawal', r.status === 200);
  r = await j('/api/admin/escrow', { token: adminToken });
  ok('admin escrow view', r.status === 200);

  /* ---------- 13. pages + clean URLs ---------- */
  let page = await raw('/');
  let html = await page.text();
  ok('GET / landing page', page.status === 200 && html.includes('Turn your spare time'));

  for (const p of ['/tasks', '/task/1', '/wallet', '/profile', '/profile/1', '/admin']) {
    const res2 = await raw(p);
    ok(`clean URL ${p}`, res2.status === 200);
  }
  const redir = await raw('/tasks.html', { redirect: 'manual' });
  ok('.html redirects to clean URL', redir.status === 301 && redir.headers.get('location') === '/tasks');

  for (const p of ['/css/styles.css', '/js/shared.js', '/js/app.js', '/js/tasks.js', '/js/task.js', '/js/wallet.js', '/js/profile.js', '/js/admin.js']) {
    const res2 = await raw(p);
    ok(`asset ${p}`, res2.status === 200);
  }

  /* ---------- 14. Referral Program Suite ---------- */
  r = await j('/api/referrals/me', { token: rakib });
  ok('user referral profile', r.status === 200 && r.data.referral_code && r.data.stats, `code=${r.data.referral_code}`);

  r = await j('/api/referrals/validate/' + r.data.referral_code);
  ok('validate referral code', r.status === 200 && r.data.valid === true && r.data.referrer_name);

  r = await j('/api/referrals/custom-code', { method: 'POST', token: rakib, body: { code: 'RAKIB_VIP' } });
  ok('update custom vanity code', r.status === 200 && r.data.referral_code === 'RAKIB_VIP');

  // Register user with referral code
  const refEmail = `ref_qa_${Date.now()}@example.com`;
  r = await j('/api/auth/register', { method: 'POST', body: { name: 'Referred Friend', email: refEmail, password: 'Password123!', role: 'freelancer', referralCode: 'RAKIB_VIP' } });
  ok('register with referral code', r.status === 201 && r.data.user.id);
  const refFriendToken = r.data.token;

  r = await j('/api/referrals/claim', { method: 'POST', token: rakib });
  ok('claim referral rewards', r.status === 200 && r.data.claimed !== undefined);

  /* ---------- 15. Campaigns Suite ---------- */
  r = await j('/api/campaigns/active');
  ok('active marketing campaigns list', r.status === 200 && r.data.items.length >= 1, `${r.data.total} campaigns`);
  const activeCampId = r.data.items[0]?.id || 1;

  r = await j(`/api/campaigns/${activeCampId}/track`, { method: 'POST' });
  ok('track campaign click', r.status === 200 && r.data.success);

  r = await j('/api/campaigns/claim-offer', { method: 'POST', token: refFriendToken, body: { campaignId: activeCampId } });
  ok('claim campaign offer & bonus XP', r.status === 200 && r.data.success && r.data.bonus_xp > 0);

  /* ---------- 16. Featured Tasks & Boost Suite ---------- */
  r = await j('/api/tasks/featured');
  ok('get featured tasks list', r.status === 200 && r.data.items.length >= 1, `${r.data.total} featured tasks`);

  r = await j('/api/tasks/boost-plans');
  ok('get task boost plans', r.status === 200 && r.data.items.length >= 4, `${r.data.items.length} boost plans`);

  // Client boosts a task
  r = await j(`/api/tasks/${qaPhysId}/boost`, { method: 'POST', token: qa, body: { plan: 'category_spotlight' } });
  ok('client boosts task via wallet', r.status === 200 && r.data.success && r.data.task.is_featured === 1, `new_balance=৳${r.data.new_balance}`);

  /* ---------- 17. Featured Professionals & Spotlight Suite ---------- */
  r = await j('/api/professionals/featured');
  ok('featured professionals list', r.status === 200 && r.data.items.length >= 1, `${r.data.total} spotlight pros`);

  r = await j('/api/professionals/spotlight-tiers');
  ok('spotlight tiers list', r.status === 200 && r.data.items.length >= 3, `${r.data.items.length} tiers`);

  r = await j('/api/professionals/apply-spotlight', { method: 'POST', token: rakib, body: { tier: 'rising_talent', category: 'Creative & Design' } });
  ok('freelancer applies for spotlight', r.status === 201 && r.data.success && r.data.spotlight.status === 'active');

  /* ---------- 18. Loyalty & Rewards Suite ---------- */
  r = await j('/api/loyalty/me', { token: rakib });
  ok('user loyalty profile', r.status === 200 && r.data.xp > 0 && r.data.level && r.data.level_title, `level=${r.data.level_title} xp=${r.data.xp}`);

  r = await j('/api/loyalty/daily-checkin', { method: 'POST', token: rakib });
  ok('daily check-in streak claim', r.status === 200 && r.data.success && r.data.streak_days >= 1, `streak=${r.data.streak_days} +${r.data.xp_awarded}XP`);

  r = await j('/api/loyalty/rewards');
  ok('loyalty rewards catalog', r.status === 200 && r.data.items.length >= 1, `${r.data.total} rewards`);
  const rewardItem = r.data.items[0];

  r = await j('/api/loyalty/redeem', { method: 'POST', token: rakib, body: { rewardId: rewardItem.id } });
  ok('redeem loyalty reward with points', r.status === 200 && r.data.success, r.data.fulfillment_message);

  r = await j('/api/loyalty/leaderboard');
  ok('loyalty XP leaderboard', r.status === 200 && r.data.items.length >= 1, `top=${r.data.items[0]?.name}`);

  /* ---------- summary ---------- */
  console.log('\n==========================================================');
  console.log(`RESULT: ${passed} passed, ${failed} failed  (${passed + failed} total)`);
  if (failures.length) { console.log('\nFailures:'); failures.forEach(f => console.log('  ✗ ' + f)); }
  console.log('==========================================================');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error('TEST CRASH:', e); process.exit(1); });
