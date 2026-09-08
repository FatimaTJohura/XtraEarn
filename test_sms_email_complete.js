const http = require('http');

function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(body); } catch(e) { json = body; }
        resolve({ status: res.statusCode, headers: res.headers, body: json });
      });
    });
    req.on('error', reject);
    if (data) req.write(typeof data === 'string' ? data : JSON.stringify(data));
    req.end();
  });
}

async function runTests() {
  console.log('=== XTRAEARN SMS & EMAIL COMPLETE INTEGRATION TEST SUITE ===\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${message}`);
      failed++;
    }
  }

  // 1. Health check
  console.log('--- TEST GROUP 1: Core Server Health ---');
  const healthRes = await request({ hostname: 'localhost', port: 3000, path: '/api/health', method: 'GET' });
  assert(healthRes.status === 200 && healthRes.body.ok === true, 'Server API is live and healthy');

  // 2. Admin Login
  console.log('\n--- TEST GROUP 2: Admin Authentication ---');
  const adminLogin = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: 'admin@xtraearn.com', password: 'Password123!' });

  const adminToken = adminLogin.body?.token;
  assert(adminLogin.status === 200 && Boolean(adminToken), 'Superadmin authenticated successfully');
  const adminHeaders = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` };

  // 3. User Register & Authentication
  console.log('\n--- TEST GROUP 3: User Registration & Notification Profile ---');
  const testEmail = `smstest_${Date.now()}@example.com`;
  const regRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/register',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    name: 'Sms Email Tester',
    email: testEmail,
    password: 'SecurePassword123!',
    role: 'worker'
  });
  const userToken = regRes.body?.token;
  const userId = regRes.body?.user?.id;
  assert(regRes.status === 201 && Boolean(userToken), `Registered test user: ${testEmail} (ID: ${userId})`);
  const userHeaders = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userToken}` };

  // 4. User Notification Preferences GET & PATCH
  console.log('\n--- TEST GROUP 4: User Notification Preferences ---');
  const getPrefs = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/users/me/notification-preferences',
    method: 'GET',
    headers: userHeaders
  });
  assert(getPrefs.status === 200 && getPrefs.body.preferences.email_notifications === true, 'Default email_notifications is enabled');
  assert(getPrefs.body.preferences.sms_notifications === true, 'Default sms_notifications is enabled');

  const updatePrefs = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/users/me/notification-preferences',
    method: 'PATCH',
    headers: userHeaders
  }, {
    email_notifications: true,
    sms_notifications: true,
    marketing_emails: true
  });
  assert(updatePrefs.status === 200 && updatePrefs.body.preferences.marketing_emails === true, 'Successfully updated user notification preferences');

  // 5. Verification OTPs: Email OTP & Phone OTP
  console.log('\n--- TEST GROUP 5: Email & Phone OTP Dispatch & Verification ---');
  const store = require('./server/store');
  
  // Email OTP
  const emailOtpRes = await store.sendEmailOtp(userId);
  assert(emailOtpRes.success && Boolean(emailOtpRes.otp), `Email OTP generated & dispatched (${emailOtpRes.otp})`);

  const verifyEmailRes = await store.verifyEmailOtp(userId, emailOtpRes.otp);
  assert(verifyEmailRes.success && verifyEmailRes.message.includes('verified'), 'Email OTP successfully verified');

  // Phone OTP
  const testPhone = '01712345678';
  const phoneOtpRes = await store.sendPhoneOtp(userId, testPhone);
  assert(phoneOtpRes.success && Boolean(phoneOtpRes.otp), `Mobile SMS OTP generated & dispatched to ${testPhone} (${phoneOtpRes.otp})`);

  const verifyPhoneRes = await store.verifyPhoneOtp(userId, phoneOtpRes.otp);
  assert(verifyPhoneRes.success && verifyPhoneRes.message.includes('verified'), 'Phone SMS OTP successfully verified');

  // 6. Forgot Password OTP via Email and SMS
  console.log('\n--- TEST GROUP 6: Password Reset Multi-Channel OTP Flow ---');
  const forgotRes = await store.requestPasswordResetOtp(testEmail);
  assert(forgotRes.success && Boolean(forgotRes.otp), `Password reset OTP dispatched: ${forgotRes.otp} to ${forgotRes.masked_email}`);

  const resetRes = await store.verifyAndResetPassword(testEmail, forgotRes.otp, 'NewSecurePassword123!');
  assert(resetRes.success && resetRes.message.includes('successfully'), 'Password reset verified and updated');

  // 7. Multi-Channel Lifecycle Notifications
  console.log('\n--- TEST GROUP 7: Multi-Channel Event Dispatch (Task, Escrow, KYC) ---');
  const notifService = require('./server/notificationService');

  const dispatchResult = await notifService.dispatchNotification({
    userId,
    type: 'payment',
    title: '💰 Escrow Funded for Task',
    message: 'Client deposited ৳2,500.00 in escrow for your logo design task. Safe to proceed!',
    channels: ['inApp', 'email', 'sms'],
    data: { taskId: 101, amount: 2500 }
  });

  assert(dispatchResult.inApp === true, 'In-App notification recorded');
  assert(dispatchResult.email === true, 'Email notification dispatched via templating engine');
  assert(dispatchResult.sms === true, 'SMS notification dispatched to verified phone');

  // 8. Admin SMS KPIs API
  console.log('\n--- TEST GROUP 8: Admin SMS KPIs API ---');
  const kpiRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/admin/sms/kpis',
    method: 'GET',
    headers: adminHeaders
  });
  assert(kpiRes.status === 200, 'Admin SMS KPIs returned status 200');
  assert(kpiRes.body.active_provider !== undefined, `Active provider reported: ${kpiRes.body.active_provider}`);
  assert(Number(kpiRes.body.balance_bdt) > 0, `Prepaid SMS balance available: ৳${kpiRes.body.balance_bdt}`);
  assert(Number(kpiRes.body.total_24h_sent) > 0, `24h dispatch volume tracked: ${kpiRes.body.total_24h_sent}`);

  // 9. Admin SMS Config API (GET & POST)
  console.log('\n--- TEST GROUP 9: Admin SMS Config Endpoints ---');
  const getConfigRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/admin/sms/config',
    method: 'GET',
    headers: adminHeaders
  });
  assert(getConfigRes.status === 200 && Boolean(getConfigRes.body.sender_id), `Retrieved SMS config (Sender ID: ${getConfigRes.body.sender_id})`);

  const updateConfigRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/admin/sms/config',
    method: 'POST',
    headers: adminHeaders
  }, {
    active_provider: 'greenweb',
    sender_id: 'XtraEarn',
    cost_per_sms: 0.35,
    fallback_to_simulator: true
  });
  assert(updateConfigRes.status === 200 && updateConfigRes.body.success === true, 'Updated SMS Gateway configuration successfully');

  // 10. Admin SMS Send Test
  console.log('\n--- TEST GROUP 10: Admin SMS Test Dispatch Console ---');
  const sendTestRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/admin/sms/send-test',
    method: 'POST',
    headers: adminHeaders
  }, {
    phone: '01822334455',
    message: 'Admin Test SMS from XtraEarn Studio! Verification complete. 🚀',
    senderId: 'XtraEarn'
  });
  assert(sendTestRes.status === 200 && sendTestRes.body.success === true, `Test SMS dispatched: ${sendTestRes.body.message_id} (Cost: ৳${sendTestRes.body.cost_bdt}, Latency: ${sendTestRes.body.latency_ms}ms)`);

  // 11. Admin SMS Logs & CSV Export
  console.log('\n--- TEST GROUP 11: Admin SMS Logs & CSV Audit Trail ---');
  const logsRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/admin/sms/logs?limit=10',
    method: 'GET',
    headers: adminHeaders
  });
  assert(logsRes.status === 200 && Array.isArray(logsRes.body.items), 'Retrieved SMS transmission logs table');
  assert(logsRes.body.items.length > 0, `Audit trail contains ${logsRes.body.items.length} verified logs`);

  const exportRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/admin/sms/export/logs',
    method: 'GET',
    headers: adminHeaders
  });
  assert(exportRes.status === 200 && typeof exportRes.body === 'string' && exportRes.body.includes('Message ID'), 'Exported SMS logs CSV file successfully');

  // Summary
  console.log('\n=============================================================');
  console.log(`TEST SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log('=============================================================');

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
