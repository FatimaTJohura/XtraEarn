const assert = require('assert');
const fs = require('fs');
const path = require('path');

async function testEmailTemplatesSuite() {
  console.log('================ VERIFYING ENTERPRISE EMAIL TEMPLATES MANAGEMENT SUITE ================');

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

  // 2. Email Templates KPIs
  const kpis = await fetch('http://localhost:3000/api/admin/email-templates/kpis', { headers: authHeader }).then(r => r.json());
  assert(kpis.total_templates >= 6, 'Total templates KPI invalid');
  assert(kpis.deliverability_sla === '99.8%', 'Deliverability SLA invalid');
  assert(kpis.smtp_status === 'online', 'SMTP status invalid');
  console.log(`✅ Email KPIs: ${kpis.total_templates} templates (${kpis.active_templates} active), ${kpis.volume_24h.toLocaleString()} 24h sent, ${kpis.deliverability_sla} deliverability SLA, ${kpis.avg_open_rate} open rate, ${kpis.avg_click_rate} click rate, ${kpis.smtp_latency_ms}ms SMTP latency.`);

  // 3. List Email Templates (GET)
  const templatesList = await fetch('http://localhost:3000/api/admin/email-templates', { headers: authHeader }).then(r => r.json());
  assert(templatesList.items.length >= 6, 'Templates list incomplete');
  const welcomeTpl = templatesList.items.find(t => t.slug === 'welcome_verify');
  assert(welcomeTpl, 'Default welcome_verify template missing');
  assert(welcomeTpl.is_system === true, 'welcome_verify should be system template');
  console.log(`✅ Email Templates List: ${templatesList.items.length} templates retrieved with full metadata.`);

  // 4. Create New Email Template (POST)
  const newTplRes = await fetch('http://localhost:3000/api/admin/email-templates', {
    method: 'POST',
    headers: authHeader,
    body: JSON.stringify({
      slug: 'freelancer_weekly_digest',
      name: 'Freelancer Weekly Earnings Digest',
      category: 'notifications',
      subject: '📊 Your Weekly Earnings Digest: ৳{{weeklyEarnings}} Earned!',
      preheader: 'See how much you earned this week and discover top trending micro-tasks.',
      from_name: 'XtraEarn Analytics',
      from_email: 'analytics@xtraearn.com',
      reply_to: 'support@xtraearn.com',
      accent_color: '#3B82F6',
      html_content: '<div style="font-family:sans-serif;padding:20px;background:#0f172a;color:#fff;"><h2>Hi {{userName}},</h2><p>You earned <strong>৳{{weeklyEarnings}}</strong> this week!</p><a href="{{walletUrl}}" style="background:#3b82f6;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;">View Wallet</a></div>',
      text_content: 'Hi {{userName}},\n\nYou earned ৳{{weeklyEarnings}} this week!\nView Wallet: {{walletUrl}}'
    })
  }).then(r => r.json());

  assert(newTplRes.success, 'Create email template failed');
  assert(newTplRes.template.id, 'Template ID missing');
  const createdId = newTplRes.template.id;
  console.log(`✅ New Email Template Created: ID ${createdId} ("${newTplRes.template.name}").`);

  // 5. Update Email Template (PUT)
  const updateTplRes = await fetch(`http://localhost:3000/api/admin/email-templates/${createdId}`, {
    method: 'PUT',
    headers: authHeader,
    body: JSON.stringify({
      name: 'Freelancer Weekly Earnings & Bonus Digest',
      accent_color: '#8B5CF6'
    })
  }).then(r => r.json());

  assert(updateTplRes.success, 'Update email template failed');
  assert(updateTplRes.template.name.includes('Bonus Digest'), 'Template update not reflected');
  assert(updateTplRes.template.accent_color === '#8B5CF6', 'Template color not updated');
  console.log(`✅ Email Template Updated: ID ${createdId} renamed to "${updateTplRes.template.name}".`);

  // 6. Duplicate Email Template (POST)
  const dupTplRes = await fetch(`http://localhost:3000/api/admin/email-templates/${createdId}/duplicate`, {
    method: 'POST',
    headers: authHeader
  }).then(r => r.json());

  assert(dupTplRes.success, 'Duplicate email template failed');
  assert(dupTplRes.template.name.includes('Copy'), 'Duplicate name missing Copy prefix/suffix');
  const dupId = dupTplRes.template.id;
  console.log(`✅ Email Template Duplicated: ID ${dupId} ("${dupTplRes.template.name}").`);

  // 7. Toggle Email Template Status (PATCH)
  const toggleRes = await fetch(`http://localhost:3000/api/admin/email-templates/${dupId}/toggle`, {
    method: 'PATCH',
    headers: authHeader
  }).then(r => r.json());

  assert(toggleRes.success, 'Toggle email template failed');
  assert(toggleRes.template.status === 'paused' || toggleRes.template.status === 'inactive' || toggleRes.template.status === 'active', 'Invalid toggle status');
  console.log(`✅ Email Template Status Toggled: ID ${dupId} is now "${toggleRes.template.status}".`);

  // 8. Delete Custom Email Template (DELETE)
  const deleteRes = await fetch(`http://localhost:3000/api/admin/email-templates/${dupId}`, {
    method: 'DELETE',
    headers: authHeader
  }).then(r => r.json());

  assert(deleteRes.success, 'Delete email template failed');
  console.log(`✅ Email Template Deleted: ID ${dupId}.`);

  // 9. Send Test Email (POST)
  const testSendRes = await fetch('http://localhost:3000/api/admin/email-templates/send-test', {
    method: 'POST',
    headers: authHeader,
    body: JSON.stringify({
      template_id: createdId,
      recipient: 'admin@xtraearn.com',
      test_variables: {
        userName: 'Admin Supervisor',
        weeklyEarnings: '12,500',
        walletUrl: 'http://localhost:3000/wallet'
      }
    })
  }).then(r => r.json());

  assert(testSendRes.success, 'Send test email failed');
  assert(testSendRes.log.id.startsWith('EML-') || testSendRes.log.id.startsWith('MSG-'), 'Log ID prefix invalid');
  assert(testSendRes.log.status === 'delivered', 'Log status invalid');
  console.log(`✅ Test Email Dispatched: Log ${testSendRes.log.id} sent to ${testSendRes.log.recipient} with simulated delivery latency ${testSendRes.log.latency_ms}ms.`);

  // 10. SMTP Gateway Configuration (GET & POST)
  const smtpGet = await fetch('http://localhost:3000/api/admin/email-templates/smtp-config', { headers: authHeader }).then(r => r.json());
  assert(smtpGet.provider, 'SMTP provider missing');
  assert(smtpGet.status === 'online', 'SMTP status not online');

  const smtpPost = await fetch('http://localhost:3000/api/admin/email-templates/smtp-config', {
    method: 'POST',
    headers: authHeader,
    body: JSON.stringify({
      provider: 'Amazon SES (Production)',
      host: 'email-smtp.us-east-1.amazonaws.com',
      port: 587,
      security: 'STARTTLS',
      daily_quota: 100000,
      default_from_name: 'XtraEarn Official',
      default_from_email: 'no-reply@xtraearn.com'
    })
  }).then(r => r.json());

  assert(smtpPost.success, 'Update SMTP config failed');
  assert(smtpPost.config.daily_quota === 100000, 'Daily quota update failed');
  console.log(`✅ SMTP Gateway Configured: Provider ${smtpPost.config.provider}, Port ${smtpPost.config.port}, Quota ${smtpPost.config.daily_quota.toLocaleString()}/day.`);

  // 11. Delivery Logs Ledger (GET)
  const logsRes = await fetch('http://localhost:3000/api/admin/email-templates/logs', { headers: authHeader }).then(r => r.json());
  assert(logsRes.items.length > 0, 'Email delivery logs empty');
  const firstLog = logsRes.items[0];
  assert(firstLog.id && firstLog.recipient && firstLog.status, 'Log item schema invalid');
  console.log(`✅ Delivery Logs Ledger: ${logsRes.items.length} delivery records inspected (Latest: ${firstLog.id} to ${firstLog.recipient} [${firstLog.status}]).`);

  // 12. Email Funnel & Analytics (GET)
  const analyticsRes = await fetch('http://localhost:3000/api/admin/email-templates/analytics', { headers: authHeader }).then(r => r.json());
  assert(analyticsRes.hourly_volume.length > 0, 'Hourly volume analytics missing');
  assert(analyticsRes.funnel.sent > 0, 'Email funnel sent count invalid');
  assert(analyticsRes.domain_reputation.length > 0, 'Domain reputation stats missing');
  console.log(`✅ Email Analytics: Funnel (${analyticsRes.funnel.sent.toLocaleString()} sent -> ${analyticsRes.funnel.delivered.toLocaleString()} delivered -> ${analyticsRes.funnel.opened.toLocaleString()} opened -> ${analyticsRes.funnel.clicked.toLocaleString()} clicked), ${analyticsRes.domain_reputation.length} domain reputations monitored.`);

  // 13. CSV Export Streams (GET)
  const csvTemplates = await fetch('http://localhost:3000/api/admin/email-templates/export/templates', { headers: authHeader }).then(r => r.text());
  assert(csvTemplates.includes('welcome_verify') && csvTemplates.startsWith('ID,Slug,Name'), 'Templates CSV format invalid');

  const csvLogs = await fetch('http://localhost:3000/api/admin/email-templates/export/logs', { headers: authHeader }).then(r => r.text());
  assert(csvLogs.startsWith('Message ID,Template,Recipient'), 'Logs CSV format invalid');
  console.log('✅ CSV Export Streams: Templates and Delivery Logs CSV streams verified.');

  // 14. Frontend DOM Verification in public/admin.html
  const adminHtml = fs.readFileSync(path.join(__dirname, '../public/admin.html'), 'utf8');
  assert(adminHtml.includes('id="view-email-templates"'), 'view-email-templates missing in admin.html');
  assert(adminHtml.includes('id="email-subtab-registry"'), 'email-subtab-registry missing');
  assert(adminHtml.includes('id="email-subtab-editor"'), 'email-subtab-editor missing');
  assert(adminHtml.includes('id="email-subtab-preview"'), 'email-subtab-preview missing');
  assert(adminHtml.includes('id="email-subtab-test"'), 'email-subtab-test missing');
  assert(adminHtml.includes('id="email-subtab-smtp"'), 'email-subtab-smtp missing');
  assert(adminHtml.includes('id="email-subtab-logs"'), 'email-subtab-logs missing');
  assert(adminHtml.includes('id="email-subtab-analytics"'), 'email-subtab-analytics missing');
  assert(adminHtml.includes('id="modal-email-template-create"'), 'modal-email-template-create missing');
  assert(adminHtml.includes('id="modal-email-test-send"'), 'modal-email-test-send missing');
  assert(adminHtml.includes('id="mock-email-body-desktop"'), 'mock-email-body-desktop missing');
  assert(adminHtml.includes('id="mock-email-body-mobile"'), 'mock-email-body-mobile missing');
  console.log('✅ Admin HTML DOM Elements: 7 sub-tabs, 2 modals, desktop & mobile frames verified.');

  // 15. Frontend JS Controller Verification in public/js/admin.js
  const adminJs = fs.readFileSync(path.join(__dirname, '../public/js/admin.js'), 'utf8');
  const requiredFns = [
    'loadEmailTemplatesDashboard',
    'switchEmailTab',
    'loadEmailKPIs',
    'loadEmailTemplatesList',
    'openEmailEditor',
    'updateLiveEmailPreview',
    'insertVariableTag',
    'handleSaveEmailTemplate',
    'handleDuplicateEmailTemplate',
    'handleDeleteEmailTemplate',
    'openCreateEmailTemplateModal',
    'handleCreateEmailTemplateSubmit',
    'openTestEmailModal',
    'handleQuickTestEmailSubmit',
    'handleSendTestEmailSubmit',
    'dispatchTestFromEditor',
    'handleSaveSmtpConfig',
    'loadEmailLogsTable',
    'loadEmailAnalytics',
    'exportEmailTemplatesCsv'
  ];

  for (const fn of requiredFns) {
    assert(adminJs.includes(fn), `Missing controller function in admin.js: ${fn}`);
    assert(adminJs.includes(`window.${fn} = ${fn}`), `Missing window export in admin.js: window.${fn}`);
  }
  console.log(`✅ Admin JS Controller: All ${requiredFns.length} functions and window bindings verified.`);

  console.log('========================================================================');
  console.log('🎉 ALL 15 EMAIL TEMPLATES ENTERPRISE MODULE CHECKS PASSED WITH 100% SUCCESS!');
  console.log('========================================================================');
}

testEmailTemplatesSuite().catch(err => {
  console.error('❌ Verification Failed:', err);
  process.exit(1);
});
