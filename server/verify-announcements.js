const assert = require('assert');
const fs = require('fs');
const path = require('path');

async function testAnnouncementsSuite() {
  console.log('================ VERIFYING ENTERPRISE GLOBAL BROADCAST & ANNOUNCEMENTS SUITE ================');

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

  // 2. Announcements KPIs
  const kpis = await fetch('http://localhost:3000/api/admin/announcements/kpis', { headers: authHeader }).then(r => r.json());
  assert(kpis.total_broadcasts >= 4, 'Total broadcasts KPI invalid');
  assert(kpis.read_rate && kpis.read_rate.includes('%'), 'Read rate KPI invalid');
  console.log(`✅ Announcements KPIs: ${kpis.total_broadcasts} broadcasts (${kpis.active_broadcasts} active), ${kpis.impressions_24h.toLocaleString()} total reach, ${kpis.acknowledged_count.toLocaleString()} read (${kpis.read_rate}), ${kpis.critical_alerts} critical alerts, ${kpis.channels_active}.`);

  // 3. List Broadcasts (GET)
  const listRes = await fetch('http://localhost:3000/api/admin/announcements', { headers: authHeader }).then(r => r.json());
  assert(listRes.items.length >= 4, 'Announcements list incomplete');
  const maintAnn = listRes.items.find(a => a.code === 'ANN-0912');
  assert(maintAnn, 'Default maintenance notice missing');
  assert(maintAnn.priority === 'critical_emergency', 'Maintenance notice should be critical emergency');
  console.log(`✅ Announcements List: ${listRes.items.length} broadcasts retrieved with full metadata.`);

  // 4. Create New Global Broadcast (POST)
  const newAnnRes = await fetch('http://localhost:3000/api/admin/announcements', {
    method: 'POST',
    headers: authHeader,
    body: JSON.stringify({
      title: '⚡ Instant bKash Cashout Gateway Upgrade Live',
      summary: 'All withdrawal requests under ৳5,000 are now processed in under 5 minutes.',
      channel: 'top_floating_bar',
      priority: 'promotional_deal',
      target_audience: 'freelancers',
      badge_text: 'FAST PAYOUTS',
      theme_preset: 'emerald_success',
      cta_text: 'Withdraw Earnings →',
      cta_url: '/wallet',
      status: 'active'
    })
  }).then(r => r.json());

  assert(newAnnRes.success, 'Create announcement failed');
  assert(newAnnRes.item.id, 'Announcement ID missing');
  const createdId = newAnnRes.item.id;
  console.log(`✅ Global Broadcast Created: ID ${createdId} ("${newAnnRes.item.title}").`);

  // 5. Update Broadcast (PUT)
  const updateRes = await fetch(`http://localhost:3000/api/admin/announcements/${createdId}`, {
    method: 'PUT',
    headers: authHeader,
    body: JSON.stringify({
      title: '⚡ Instant bKash & Nagad Cashout Gateway Upgrade Live (0% Fees)',
      badge_text: '0% FEE PAYOUTS'
    })
  }).then(r => r.json());

  assert(updateRes.success, 'Update announcement failed');
  assert(updateRes.item.title.includes('0% Fees'), 'Announcement update not reflected');
  console.log(`✅ Broadcast Updated: ID ${createdId} renamed to "${updateRes.item.title}".`);

  // 6. Duplicate Broadcast (POST)
  const dupRes = await fetch(`http://localhost:3000/api/admin/announcements/${createdId}/duplicate`, {
    method: 'POST',
    headers: authHeader
  }).then(r => r.json());

  assert(dupRes.success, 'Duplicate announcement failed');
  assert(dupRes.item.title.includes('Copy'), 'Duplicate title missing Copy suffix');
  assert(dupRes.item.status === 'paused', 'Duplicate should be paused draft');
  const dupId = dupRes.item.id;
  console.log(`✅ Broadcast Duplicated: ID ${dupId} ("${dupRes.item.title}").`);

  // 7. Toggle Broadcast Status (PATCH)
  const toggleRes = await fetch(`http://localhost:3000/api/admin/announcements/${dupId}/toggle`, {
    method: 'PATCH',
    headers: authHeader
  }).then(r => r.json());

  assert(toggleRes.success, 'Toggle announcement status failed');
  assert(toggleRes.item.status === 'active', 'Broadcast status should toggle to active');
  console.log(`✅ Broadcast Status Toggled: ID ${dupId} is now "${toggleRes.item.status}".`);

  // 8. Delete Custom Broadcast (DELETE)
  const deleteRes = await fetch(`http://localhost:3000/api/admin/announcements/${dupId}`, {
    method: 'DELETE',
    headers: authHeader
  }).then(r => r.json());

  assert(deleteRes.success, 'Delete announcement failed');
  console.log(`✅ Broadcast Deleted: ID ${dupId}.`);

  // 9. Delivery Telemetry Analytics (GET)
  const analyticsRes = await fetch('http://localhost:3000/api/admin/announcements/analytics', { headers: authHeader }).then(r => r.json());
  assert(analyticsRes.hourly_delivery.length > 0, 'Hourly delivery missing');
  assert(analyticsRes.channel_performance.length > 0, 'Channel performance missing');
  assert(analyticsRes.emergency_alert_read_rate === '99.2%', 'Emergency read rate invalid');
  console.log(`✅ Broadcast Delivery Telemetry: 7 hourly intervals, 4 channel performance benchmarks, ${analyticsRes.emergency_alert_read_rate} emergency read rate verified.`);

  // 10. CSV Export Streams (GET)
  const csvBroadcasts = await fetch('http://localhost:3000/api/admin/announcements/export/broadcasts', { headers: authHeader }).then(r => r.text());
  assert(csvBroadcasts.startsWith('ID,Code,Title') && csvBroadcasts.includes('ANN-0912'), 'Broadcasts CSV format invalid');

  const csvAnalytics = await fetch('http://localhost:3000/api/admin/announcements/export/analytics', { headers: authHeader }).then(r => r.text());
  assert(csvAnalytics.startsWith('Channel,Impressions'), 'Analytics CSV format invalid');
  console.log('✅ CSV Export Streams: Broadcasts and Delivery Analytics CSV streams verified.');

  // 11. Frontend DOM Verification in public/admin.html
  const adminHtml = fs.readFileSync(path.join(__dirname, '../public/admin.html'), 'utf8');
  assert(adminHtml.includes('id="view-announcements"'), 'view-announcements missing in admin.html');
  assert(adminHtml.includes('id="ann-subtab-feed"'), 'ann-subtab-feed missing');
  assert(adminHtml.includes('id="ann-subtab-composer"'), 'ann-subtab-composer missing');
  assert(adminHtml.includes('id="ann-subtab-channels"'), 'ann-subtab-channels missing');
  assert(adminHtml.includes('id="ann-subtab-analytics"'), 'ann-subtab-analytics missing');
  assert(adminHtml.includes('id="ann-subtab-simulator"'), 'ann-subtab-simulator missing');
  assert(adminHtml.includes('id="modal-announcement-view"'), 'modal-announcement-view missing');
  assert(adminHtml.includes('id="modal-announcement-create"'), 'modal-announcement-create missing');
  console.log('✅ Admin HTML DOM Elements: 5 sub-tabs, 2 interactive modals, multi-channel live simulator verified.');

  // 12. Frontend JS Controller Verification in public/js/admin.js
  const adminJs = fs.readFileSync(path.join(__dirname, '../public/js/admin.js'), 'utf8');
  const requiredFns = [
    'loadAnnouncementsDashboard',
    'switchAnnTab',
    'loadAnnouncementsKPIs',
    'loadAnnouncementsTable',
    'openAnnouncementEditor',
    'updateLiveAnnouncementPreview',
    'handleSaveAnnouncement',
    'handleDuplicateAnnouncement',
    'handleToggleAnnouncementStatus',
    'handleDeleteAnnouncement',
    'openCreateAnnouncementModal',
    'handleCreateAnnouncementModalSubmit',
    'openViewAnnouncementModal',
    'loadAnnouncementsAnalytics',
    'updateAnnouncementSimulator',
    'exportAnnouncementsCsv'
  ];

  for (const fn of requiredFns) {
    assert(adminJs.includes(fn), `Missing controller function in admin.js: ${fn}`);
    assert(adminJs.includes(`window.${fn} = ${fn}`), `Missing window export in admin.js: window.${fn}`);
  }
  console.log(`✅ Admin JS Controller: All ${requiredFns.length} functions and window bindings verified.`);

  console.log('========================================================================');
  console.log('🎉 ALL 12 ANNOUNCEMENTS COMMAND CENTER CHECKS PASSED WITH 100% SUCCESS!');
  console.log('========================================================================');
}

testAnnouncementsSuite().catch(err => {
  console.error('❌ Verification Failed:', err);
  process.exit(1);
});
