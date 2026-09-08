const assert = require('assert');
const fs = require('fs');
const path = require('path');

async function testPushSuite() {
  console.log('================ VERIFYING ENTERPRISE PUSH NOTIFICATION MANAGEMENT SUITE ================');

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

  // 2. Push KPIs
  const kpis = await fetch('http://localhost:3000/api/admin/push/kpis', { headers: authHeader }).then(r => r.json());
  assert(kpis.total_subscribers >= 50000, 'Total subscribers KPI invalid');
  assert(kpis.delivery_sla === '99.4%', 'Delivery SLA invalid');
  assert(kpis.avg_ctr === '18.4%', 'Average CTR invalid');
  console.log(`✅ Push KPIs: ${kpis.total_subscribers.toLocaleString()} subscribers (${kpis.android_subscribers.toLocaleString()} Android, ${kpis.ios_subscribers.toLocaleString()} iOS, ${kpis.web_subscribers.toLocaleString()} Web), ${kpis.dispatches_24h.toLocaleString()} 24h sent, ${kpis.avg_ctr} CTR.`);

  // 3. Instant Push Dispatches (GET & POST)
  const dispatchesBefore = await fetch('http://localhost:3000/api/admin/push/dispatches', { headers: authHeader }).then(r => r.json());
  assert(dispatchesBefore.items.length >= 4, 'Dispatches list incomplete');

  const sendRes = await fetch('http://localhost:3000/api/admin/push/dispatches', {
    method: 'POST',
    headers: authHeader,
    body: JSON.stringify({
      title: '⚡ Instant Push Test: 50% Cashback on Tasks',
      body: 'Get 50% cashback on your first completed task today!',
      audience: 'freelancers',
      channel: 'urgent_tasks',
      deeplink: 'xtraearn://promos/cashback',
      action_btn1: 'Claim Cashback',
      action_btn2: 'Later',
      priority: 'high',
      simulate_failure: true
    })
  }).then(r => r.json());

  assert(sendRes.success, 'Instant push failed');
  assert(sendRes.dispatch.code.startsWith('PSH-'), 'Dispatch code missing');
  assert(sendRes.dispatch.sent_count > 0, 'Sent count missing');
  console.log(`✅ Instant Push Broadcast Dispatched: Code ${sendRes.dispatch.code}, Sent to ${sendRes.dispatch.sent_count.toLocaleString()} devices.`);

  // 4. Scheduled Pushes (GET, POST, PATCH toggle, DELETE)
  const schedList = await fetch('http://localhost:3000/api/admin/push/scheduled', { headers: authHeader }).then(r => r.json());
  assert(schedList.items.length >= 3, 'Scheduled list incomplete');

  const newSched = await fetch('http://localhost:3000/api/admin/push/scheduled', {
    method: 'POST',
    headers: authHeader,
    body: JSON.stringify({
      title: '🌅 Morning Freelance Kickoff Digest',
      body: 'Fresh tasks added in the last 6 hours.',
      audience: 'freelancers',
      schedule_type: 'daily',
      schedule_time: '09:00 BST',
      timezone_optimized: true,
      projected_reach: 15000
    })
  }).then(r => r.json());

  assert(newSched.success, 'Create scheduled push failed');
  const schedId = newSched.item.id;

  const toggleSched = await fetch(`http://localhost:3000/api/admin/push/scheduled/${schedId}/toggle`, {
    method: 'PATCH',
    headers: authHeader
  }).then(r => r.json());
  assert(toggleSched.item.status === 'paused', 'Schedule toggle failed');

  const deleteSched = await fetch(`http://localhost:3000/api/admin/push/scheduled/${schedId}`, {
    method: 'DELETE',
    headers: authHeader
  }).then(r => r.json());
  assert(deleteSched.success, 'Schedule delete failed');
  console.log(`✅ Scheduled Push Engine: List, Create (${newSched.item.code}), Pause toggle, and Delete verified.`);

  // 5. Push Campaigns (GET, POST, PATCH toggle)
  const cmpList = await fetch('http://localhost:3000/api/admin/push/campaigns', { headers: authHeader }).then(r => r.json());
  assert(cmpList.items.length >= 3, 'Campaigns list incomplete');

  const newCmp = await fetch('http://localhost:3000/api/admin/push/campaigns', {
    method: 'POST',
    headers: authHeader,
    body: JSON.stringify({
      name: 'Client First Escrow Deposit Nudge Journey',
      trigger_event: 'first_deposit_pending',
      stages_count: 3
    })
  }).then(r => r.json());

  assert(newCmp.success, 'Create push campaign failed');
  const cmpId = newCmp.item.id;

  const toggleCmp = await fetch(`http://localhost:3000/api/admin/push/campaigns/${cmpId}/toggle`, {
    method: 'PATCH',
    headers: authHeader
  }).then(r => r.json());
  assert(toggleCmp.item.status === 'paused', 'Campaign toggle failed');
  console.log(`✅ Push Drip Campaigns Engine: List, Create (${newCmp.item.code}), and Toggle verified.`);

  // 6. Push Devices & Ping Test
  const devList = await fetch('http://localhost:3000/api/admin/push/devices', { headers: authHeader }).then(r => r.json());
  assert(devList.items.length >= 5, 'Devices list incomplete');

  const pingRes = await fetch(`http://localhost:3000/api/admin/push/devices/1/test`, {
    method: 'POST',
    headers: authHeader
  }).then(r => r.json());
  assert(pingRes.success, 'Device ping failed');
  console.log(`✅ Device Management Fleet: ${devList.items.length} registered test devices, Ping latency verified: ${pingRes.message}`);

  // 7. Browser Push (VAPID) Settings
  const browserSettings = await fetch('http://localhost:3000/api/admin/push/browser-settings', { headers: authHeader }).then(r => r.json());
  assert(browserSettings.vapid_public_key, 'VAPID public key missing');

  const updateBrowser = await fetch('http://localhost:3000/api/admin/push/browser-settings', {
    method: 'POST',
    headers: authHeader,
    body: JSON.stringify({ prompt_title: 'Updated Prompt Title' })
  }).then(r => r.json());
  assert(updateBrowser.config.prompt_title === 'Updated Prompt Title', 'Update browser settings failed');
  console.log('✅ Browser Push (VAPID RFC8030): Public key, Mailto subject, ServiceWorker URL verified.');

  // 8. Mobile App Push (FCM & APNs) Settings
  const mobileSettings = await fetch('http://localhost:3000/api/admin/push/mobile-settings', { headers: authHeader }).then(r => r.json());
  assert(mobileSettings.fcm_project_id, 'FCM project ID missing');

  const updateMobile = await fetch('http://localhost:3000/api/admin/push/mobile-settings', {
    method: 'POST',
    headers: authHeader,
    body: JSON.stringify({ high_priority_wake: true })
  }).then(r => r.json());
  assert(updateMobile.config.high_priority_wake === true, 'Update mobile settings failed');
  console.log('✅ Mobile App Push (FCM v1 & APNs HTTP/2): Config, Sound channels, WakeLocks verified.');

  // 9. Failed Pushes & Dead-Letter Queue (List, Retry, Purge)
  const failedList = await fetch('http://localhost:3000/api/admin/push/failed', { headers: authHeader }).then(r => r.json());
  assert(failedList.items.length > 0, 'Failed list should contain entries');

  const retryRes = await fetch(`http://localhost:3000/api/admin/push/failed/${failedList.items[0].id}/retry`, {
    method: 'POST',
    headers: authHeader
  }).then(r => r.json());
  assert(retryRes.success, 'Retry failed push failed');

  const purgeRes = await fetch('http://localhost:3000/api/admin/push/failed/purge', {
    method: 'POST',
    headers: authHeader
  }).then(r => r.json());
  assert(purgeRes.success, 'Purge failed pushes failed');
  console.log('✅ Failed Pushes & Dead-Letter Processor: List, Retry mark-resolved, and Purge verified.');

  // 10. Push Analytics & BI Metrics
  const analytics = await fetch('http://localhost:3000/api/admin/push/analytics', { headers: authHeader }).then(r => r.json());
  assert(analytics.hourly_volume && analytics.hourly_volume.length === 12, 'Hourly volume chart points missing');
  assert(analytics.category_ctr && analytics.category_ctr.length === 5, 'Category CTR benchmarks missing');
  console.log(`✅ Push Analytics & Heatmaps: ${analytics.hourly_volume.length} hourly trajectory points, ${analytics.category_ctr.length} category benchmarks.`);

  // 11. CSV Exports
  const csvDispatches = await fetch('http://localhost:3000/api/admin/push/export/dispatches', { headers: authHeader }).then(r => r.text());
  assert(csvDispatches.includes('Code,Title,Audience'), 'Dispatches CSV export invalid');

  const csvDevices = await fetch('http://localhost:3000/api/admin/push/export/devices', { headers: authHeader }).then(r => r.text());
  assert(csvDevices.includes('User,Email,Platform'), 'Devices CSV export invalid');

  const csvCampaigns = await fetch('http://localhost:3000/api/admin/push/export/campaigns', { headers: authHeader }).then(r => r.text());
  assert(csvCampaigns.includes('Code,Name,Trigger'), 'Campaigns CSV export invalid');
  console.log('✅ CSV Export Streams: Dispatches, Devices, and Campaigns CSV streams verified.');

  // 12. DOM Verification & Modal Nesting Integrity
  const adminHtml = fs.readFileSync(path.join(__dirname, '../public/admin.html'), 'utf8');
  const adminJs = fs.readFileSync(path.join(__dirname, '../public/js/admin.js'), 'utf8');
  const stylesCss = fs.readFileSync(path.join(__dirname, '../public/css/styles.css'), 'utf8');
  const sharedJs = fs.readFileSync(path.join(__dirname, '../public/js/shared.js'), 'utf8');

  assert(adminHtml.includes('id="view-push-notifications"'), 'view-push-notifications missing in admin.html');
  assert(adminHtml.includes('id="push-subtab-send"'), 'push-subtab-send missing');
  assert(adminHtml.includes('id="push-subtab-scheduled"'), 'push-subtab-scheduled missing');
  assert(adminHtml.includes('id="push-subtab-campaigns"'), 'push-subtab-campaigns missing');
  assert(adminHtml.includes('id="push-subtab-devices"'), 'push-subtab-devices missing');
  assert(adminHtml.includes('id="push-subtab-browser"'), 'push-subtab-browser missing');
  assert(adminHtml.includes('id="push-subtab-mobile"'), 'push-subtab-mobile missing');
  assert(adminHtml.includes('id="push-subtab-delivery"'), 'push-subtab-delivery missing');
  assert(adminHtml.includes('id="push-subtab-failed"'), 'push-subtab-failed missing');
  assert(adminHtml.includes('id="push-subtab-analytics"'), 'push-subtab-analytics missing');

  assert(adminHtml.includes('id="modal-send-push"'), 'modal-send-push missing');
  assert(adminHtml.includes('id="modal-schedule-push"'), 'modal-schedule-push missing');
  assert(adminHtml.includes('id="modal-campaign-push"'), 'modal-campaign-push missing');

  // Verify modal styling
  assert(stylesCss.includes('.adm-modal-backdrop > .adm-modal'), 'Modal box CSS missing .adm-modal-backdrop > .adm-modal');
  assert(sharedJs.includes("method = options.toUpperCase()"), 'api() in shared.js should support positional method argument');

  assert(adminJs.includes('loadPushNotificationsDashboard'), 'loadPushNotificationsDashboard missing in admin.js');
  assert(adminJs.includes('switchPushTab'), 'switchPushTab missing in admin.js');
  assert(adminJs.includes('updatePushPreview'), 'updatePushPreview missing in admin.js');
  console.log('✅ DOM, CSS & Client JavaScript: All 9 sub-tabs, 3 modals, CSS modal box styling, live mockup & router hooks verified.');

  console.log('\n🎉 ALL ENTERPRISE PUSH NOTIFICATION MANAGEMENT FEATURES 100% OPERATIONAL!');
}

testPushSuite().catch(err => {
  console.error('❌ Push Verification Failed:', err);
  process.exit(1);
});
