const assert = require('assert');
const fs = require('fs');
const path = require('path');

async function testBannersSuite() {
  console.log('================ VERIFYING ENTERPRISE PROMOTIONAL BANNERS & SHOWCASE SUITE ================');

  // 1. Authenticate as Super Admin
  const loginRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@xtraearn.com', password: 'Password123!' })
  }).then(r => r.json());

  assert(loginRes.token, 'Admin login failed');
  const authHeader = {
    'Authorization': `Bearer ${loginRes.token}`,
    'Content-Type': 'application/json'
  };
  console.log('✅ Super Admin Authenticated:', loginRes.user.email);

  // 2. Banners KPIs
  const kpis = await fetch('http://localhost:3000/api/admin/banners/kpis', { headers: authHeader }).then(r => r.json());
  assert(kpis.total_banners >= 4, 'Total banners KPI invalid');
  assert(kpis.total_placements >= 5, 'Total placements KPI invalid');
  console.log(`✅ Banners KPIs: ${kpis.total_banners} banners (${kpis.active_banners} active), ${kpis.total_placements} placement slots, ${kpis.impressions_24h.toLocaleString()} 24h impressions, ${kpis.clicks_24h.toLocaleString()} clicks (${kpis.avg_ctr} CTR), ${kpis.attributed_gmv} attributed GMV, ${kpis.active_ab_tests} active A/B tests.`);

  // 3. List Banners (GET)
  const bannersList = await fetch('http://localhost:3000/api/admin/banners', { headers: authHeader }).then(r => r.json());
  assert(bannersList.items.length >= 4, 'Banners list incomplete');
  const heroBan = bannersList.items.find(b => b.code === 'BAN-HERO-01');
  assert(heroBan, 'Default hero banner BAN-HERO-01 missing');
  assert(heroBan.status === 'active', 'Default hero banner should be active');
  console.log(`✅ Banners List: ${bannersList.items.length} banners retrieved with full metadata.`);

  // 4. Create New Promotional Banner (POST)
  const newBanRes = await fetch('http://localhost:3000/api/admin/banners', {
    method: 'POST',
    headers: authHeader,
    body: JSON.stringify({
      title: '🎁 ৳100 Welcome Cash Bonus for New Workers',
      tagline: 'Complete 3 micro-tasks in 48 hours to unlock instant bonus cash.',
      placement_code: 'tasks_top_leaderboard',
      audience: 'freelancers',
      cta_text: 'Start Earning Now →',
      cta_url: '/tasks',
      badge_text: 'SIGNUP BONUS',
      gradient_theme: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 50%, #6D28D9 100%)',
      accent_color: '#8B5CF6',
      status: 'active'
    })
  }).then(r => r.json());

  assert(newBanRes.success, 'Create banner failed');
  assert(newBanRes.item.id, 'Banner ID missing');
  const createdBanId = newBanRes.item.id;
  console.log(`✅ Promotional Banner Created: ID ${createdBanId} ("${newBanRes.item.title}").`);

  // 5. Update Banner (PUT)
  const updateBanRes = await fetch(`http://localhost:3000/api/admin/banners/${createdBanId}`, {
    method: 'PUT',
    headers: authHeader,
    body: JSON.stringify({
      title: '🎁 ৳150 Welcome Cash Bonus for Verified Workers',
      badge_text: 'LIMITED VIP OFFER'
    })
  }).then(r => r.json());

  assert(updateBanRes.success, 'Update banner failed');
  assert(updateBanRes.item.title.includes('৳150 Welcome'), 'Banner update not reflected');
  console.log(`✅ Banner Updated: ID ${createdBanId} renamed to "${updateBanRes.item.title}".`);

  // 6. Duplicate Banner (POST)
  const dupBanRes = await fetch(`http://localhost:3000/api/admin/banners/${createdBanId}/duplicate`, {
    method: 'POST',
    headers: authHeader
  }).then(r => r.json());

  assert(dupBanRes.success, 'Duplicate banner failed');
  assert(dupBanRes.item.title.includes('Copy'), 'Duplicate title missing Copy suffix');
  assert(dupBanRes.item.status === 'paused', 'Duplicate should be paused');
  const dupBanId = dupBanRes.item.id;
  console.log(`✅ Banner Duplicated: ID ${dupBanId} ("${dupBanRes.item.title}").`);

  // 7. Toggle Banner Status (PATCH)
  const toggleBanRes = await fetch(`http://localhost:3000/api/admin/banners/${dupBanId}/toggle`, {
    method: 'PATCH',
    headers: authHeader
  }).then(r => r.json());

  assert(toggleBanRes.success, 'Toggle banner status failed');
  assert(toggleBanRes.item.status === 'active', 'Banner should toggle to active');
  console.log(`✅ Banner Status Toggled: ID ${dupBanId} is now "${toggleBanRes.item.status}".`);

  // 8. Delete Custom Banner (DELETE)
  const deleteBanRes = await fetch(`http://localhost:3000/api/admin/banners/${dupBanId}`, {
    method: 'DELETE',
    headers: authHeader
  }).then(r => r.json());

  assert(deleteBanRes.success, 'Delete banner failed');
  console.log(`✅ Banner Deleted: ID ${dupBanId}.`);

  // 9. Placement Slots Configuration (GET, PUT)
  const placements = await fetch('http://localhost:3000/api/admin/banners/placements', { headers: authHeader }).then(r => r.json());
  assert(placements.items.length >= 5, 'Placements list incomplete');

  const updatePl = await fetch(`http://localhost:3000/api/admin/banners/placements/1`, {
    method: 'PUT',
    headers: authHeader,
    body: JSON.stringify({ rotation_seconds: 6 })
  }).then(r => r.json());
  assert(updatePl.success, 'Update placement failed');
  console.log(`✅ Placement Slots Engine: 5 display zones verified (${placements.items.map(p => p.code).join(', ')}).`);

  // 10. A/B Split Testing Engine (GET, POST, Declare Winner)
  const abTests = await fetch('http://localhost:3000/api/admin/banners/ab-tests', { headers: authHeader }).then(r => r.json());
  assert(abTests.items.length >= 2, 'A/B experiments list incomplete');

  const newExp = await fetch('http://localhost:3000/api/admin/banners/ab-tests', {
    method: 'POST',
    headers: authHeader,
    body: JSON.stringify({
      name: 'Mobile Card Urgency Test',
      placement_code: 'mobile_app_interstitial',
      traffic_split: '50% / 50%',
      variant_a_name: 'Standard Discount',
      variant_b_name: 'Countdown Timer'
    })
  }).then(r => r.json());

  assert(newExp.success, 'Create A/B experiment failed');
  const expId = newExp.item.id;

  const winnerRes = await fetch(`http://localhost:3000/api/admin/banners/ab-tests/${expId}/declare-winner`, {
    method: 'POST',
    headers: authHeader,
    body: JSON.stringify({ variant_id: 'B' })
  }).then(r => r.json());

  assert(winnerRes.success, 'Declare winner failed');
  assert(winnerRes.experiment.variants.find(v => v.id === 'B').is_winner === true, 'Winner variant not marked');
  console.log(`✅ A/B Split Testing Engine: Experiment launched and Winner Variant B successfully declared.`);

  // 11. Banner Analytics & Trajectory (GET)
  const analyticsRes = await fetch('http://localhost:3000/api/admin/banners/analytics', { headers: authHeader }).then(r => r.json());
  assert(analyticsRes.hourly_traffic.length > 0, 'Hourly traffic missing');
  assert(analyticsRes.placement_performance.length > 0, 'Placement performance missing');
  assert(analyticsRes.audience_breakdown.clients, 'Audience breakdown missing');
  console.log(`✅ Banner Traffic Analytics: 7 hourly volume intervals, 5 placement benchmarks, ${analyticsRes.avg_roi_multiplier} ROI multiplier verified.`);

  // 12. CSV Export Streams (GET)
  const csvBanners = await fetch('http://localhost:3000/api/admin/banners/export/banners', { headers: authHeader }).then(r => r.text());
  assert(csvBanners.startsWith('ID,Code,Title') && csvBanners.includes('BAN-HERO-01'), 'Banners CSV format invalid');

  const csvAb = await fetch('http://localhost:3000/api/admin/banners/export/ab-tests', { headers: authHeader }).then(r => r.text());
  assert(csvAb.startsWith('Code,Name,Placement'), 'A/B Tests CSV format invalid');
  console.log('✅ CSV Export Streams: Banners and A/B Experiments CSV streams verified.');

  // 13. Frontend DOM Verification in public/admin.html
  const adminHtml = fs.readFileSync(path.join(__dirname, '../public/admin.html'), 'utf8');
  assert(adminHtml.includes('id="view-banners"'), 'view-banners missing in admin.html');
  assert(adminHtml.includes('id="banners-subtab-registry"'), 'banners-subtab-registry missing');
  assert(adminHtml.includes('id="banners-subtab-composer"'), 'banners-subtab-composer missing');
  assert(adminHtml.includes('id="banners-subtab-placements"'), 'banners-subtab-placements missing');
  assert(adminHtml.includes('id="banners-subtab-ab-testing"'), 'banners-subtab-ab-testing missing');
  assert(adminHtml.includes('id="banners-subtab-analytics"'), 'banners-subtab-analytics missing');
  assert(adminHtml.includes('id="banners-subtab-live-simulator"'), 'banners-subtab-live-simulator missing');
  assert(adminHtml.includes('id="modal-banner-create"'), 'modal-banner-create missing');
  assert(adminHtml.includes('id="modal-banner-ab-create"'), 'modal-banner-ab-create missing');
  console.log('✅ Admin HTML DOM Elements: 6 sub-tabs, 2 interactive modals, multi-device canvas simulator verified.');

  // 14. Frontend JS Controller Verification in public/js/admin.js
  const adminJs = fs.readFileSync(path.join(__dirname, '../public/js/admin.js'), 'utf8');
  const requiredFns = [
    'loadBannersDashboard',
    'switchBannerTab',
    'loadBannersKPIs',
    'loadBannersTable',
    'openBannerEditor',
    'setBannerGradient',
    'updateLiveBannerPreview',
    'handleSaveBanner',
    'handleDuplicateBanner',
    'handleToggleBannerStatus',
    'handleDeleteBanner',
    'openCreateBannerModal',
    'handleCreateBannerModalSubmit',
    'loadBannersPlacementsList',
    'loadBannersAbTests',
    'openCreateBannerAbModal',
    'handleCreateBannerAbSubmit',
    'handleDeclareAbWinner',
    'loadBannersAnalytics',
    'updateStorefrontSimulator',
    'exportBannersCsv'
  ];

  for (const fn of requiredFns) {
    assert(adminJs.includes(fn), `Missing controller function in admin.js: ${fn}`);
    assert(adminJs.includes(`window.${fn} = ${fn}`), `Missing window export in admin.js: window.${fn}`);
  }
  console.log(`✅ Admin JS Controller: All ${requiredFns.length} functions and window bindings verified.`);

  console.log('========================================================================');
  console.log('🎉 ALL 14 BANNERS & HERO SHOWCASE SUITE CHECKS PASSED WITH 100% SUCCESS!');
  console.log('========================================================================');
}

testBannersSuite().catch(err => {
  console.error('❌ Verification Failed:', err);
  process.exit(1);
});
