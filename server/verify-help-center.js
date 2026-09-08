const assert = require('assert');
const fs = require('fs');
const path = require('path');

async function testHelpCenterSuite() {
  console.log('================ VERIFYING ENTERPRISE HELP CENTER & SUPPORT DESK SUITE ================');

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

  // 2. Help Center KPIs
  const kpis = await fetch('http://localhost:3000/api/admin/help-center/kpis', { headers: authHeader }).then(r => r.json());
  assert(kpis.total_articles >= 6, 'Total articles KPI invalid');
  assert(kpis.total_categories >= 8, 'Total categories KPI invalid');
  assert(kpis.self_service_deflection_rate === '72.8%', 'Deflection rate KPI invalid');
  console.log(`✅ Help Center KPIs: ${kpis.total_articles} articles (${kpis.published_articles} published), ${kpis.total_categories} taxonomy categories, ${kpis.monthly_views.toLocaleString()} reads, ${kpis.csat_helpful_ratio} CSAT, ${kpis.open_tickets} open tickets (${kpis.urgent_tickets} urgent), ${kpis.avg_first_response_minutes}m SLA response.`);

  // 3. List Knowledge Articles (GET)
  const articlesList = await fetch('http://localhost:3000/api/admin/help-center/articles', { headers: authHeader }).then(r => r.json());
  assert(articlesList.items.length >= 6, 'Articles list incomplete');
  const escrowArticle = articlesList.items.find(a => a.slug === 'how-escrow-payment-protection-works');
  assert(escrowArticle, 'Default escrow guide missing');
  assert(escrowArticle.status === 'published', 'Default escrow article should be published');
  console.log(`✅ Knowledge Articles List: ${articlesList.items.length} articles retrieved with full metadata.`);

  // 4. Create New Knowledge Article (POST)
  const newArtRes = await fetch('http://localhost:3000/api/admin/help-center/articles', {
    method: 'POST',
    headers: authHeader,
    body: JSON.stringify({
      title: 'How to Submit Bank Transfer Deposit Proof via NPSB / BEFTN',
      slug: 'bank-transfer-deposit-proof-guide',
      category_slug: 'wallet-payments',
      audience: 'clients',
      language: 'en',
      status: 'published',
      tags: ['bank', 'deposit', 'npsb', 'beftn', 'payout'],
      meta_description: 'Instructions on uploading direct bank transaction slips for instant wallet crediting.',
      content_markdown: '### Bank Transfer Deposit Guide\n\n1. Transfer funds to XtraEarn City Bank Account.\n2. Note down the 16-digit Bank Voucher Reference.\n3. Upload photo slip in Wallet -> Deposits.\n4. Escrow finance team credits within 15 minutes.'
    })
  }).then(r => r.json());

  assert(newArtRes.success, 'Create help article failed');
  assert(newArtRes.item.id, 'Article ID missing');
  const createdArtId = newArtRes.item.id;
  console.log(`✅ Knowledge Article Created: ID ${createdArtId} ("${newArtRes.item.title}").`);

  // 5. Update Knowledge Article (PUT)
  const updateArtRes = await fetch(`http://localhost:3000/api/admin/help-center/articles/${createdArtId}`, {
    method: 'PUT',
    headers: authHeader,
    body: JSON.stringify({
      title: 'How to Submit Bank Transfer Deposit Proof (NPSB, BEFTN & RTGS Instant Guide)',
      tags: ['bank', 'deposit', 'rtgs', 'npsb', 'instant']
    })
  }).then(r => r.json());

  assert(updateArtRes.success, 'Update help article failed');
  assert(updateArtRes.item.title.includes('RTGS Instant Guide'), 'Article update not reflected');
  console.log(`✅ Knowledge Article Updated: ID ${createdArtId} renamed to "${updateArtRes.item.title}".`);

  // 6. Duplicate Knowledge Article (POST)
  const dupArtRes = await fetch(`http://localhost:3000/api/admin/help-center/articles/${createdArtId}/duplicate`, {
    method: 'POST',
    headers: authHeader
  }).then(r => r.json());

  assert(dupArtRes.success, 'Duplicate help article failed');
  assert(dupArtRes.item.title.includes('Copy'), 'Duplicate title missing Copy suffix');
  assert(dupArtRes.item.status === 'draft', 'Duplicate should be draft');
  const dupArtId = dupArtRes.item.id;
  console.log(`✅ Knowledge Article Duplicated: ID ${dupArtId} ("${dupArtRes.item.title}").`);

  // 7. Toggle Article Status (PATCH)
  const toggleArtRes = await fetch(`http://localhost:3000/api/admin/help-center/articles/${dupArtId}/toggle`, {
    method: 'PATCH',
    headers: authHeader
  }).then(r => r.json());

  assert(toggleArtRes.success, 'Toggle article status failed');
  assert(toggleArtRes.item.status === 'published' || toggleArtRes.item.status === 'draft', 'Invalid toggle status');
  console.log(`✅ Knowledge Article Status Toggled: ID ${dupArtId} is now "${toggleArtRes.item.status}".`);

  // 8. Delete Custom Article (DELETE)
  const deleteArtRes = await fetch(`http://localhost:3000/api/admin/help-center/articles/${dupArtId}`, {
    method: 'DELETE',
    headers: authHeader
  }).then(r => r.json());

  assert(deleteArtRes.success, 'Delete article failed');
  console.log(`✅ Knowledge Article Deleted: ID ${dupArtId}.`);

  // 9. Taxonomy Categories (GET, POST, PUT, DELETE)
  const catList = await fetch('http://localhost:3000/api/admin/help-center/categories', { headers: authHeader }).then(r => r.json());
  assert(catList.items.length >= 8, 'Taxonomy categories incomplete');

  const newCat = await fetch('http://localhost:3000/api/admin/help-center/categories', {
    method: 'POST',
    headers: authHeader,
    body: JSON.stringify({
      icon: '📱',
      name: 'Mobile App & APK Troubleshooting',
      slug: 'mobile-app-troubleshooting',
      description: 'Android APK installation, push notification permissions, background battery whitelist'
    })
  }).then(r => r.json());

  assert(newCat.success, 'Create category failed');
  const catId = newCat.item.id;
  console.log(`✅ Knowledge Category Created: ID ${catId} ("${newCat.item.name}").`);

  const updateCat = await fetch(`http://localhost:3000/api/admin/help-center/categories/${catId}`, {
    method: 'PUT',
    headers: authHeader,
    body: JSON.stringify({ name: 'Mobile App & Push Notification Setup' })
  }).then(r => r.json());
  assert(updateCat.success, 'Update category failed');

  const deleteCat = await fetch(`http://localhost:3000/api/admin/help-center/categories/${catId}`, {
    method: 'DELETE',
    headers: authHeader
  }).then(r => r.json());
  assert(deleteCat.success, 'Delete category failed');
  console.log(`✅ Knowledge Category Lifecycle (Create, Update, Delete) verified.`);

  // 10. Support Tickets Queue (GET, Detail, Reply, Status)
  const ticketsList = await fetch('http://localhost:3000/api/admin/help-center/tickets', { headers: authHeader }).then(r => r.json());
  assert(ticketsList.items.length >= 4, 'Support tickets list incomplete');
  const targetTicket = ticketsList.items[0];

  const ticketDetail = await fetch(`http://localhost:3000/api/admin/help-center/tickets/${targetTicket.id}`, { headers: authHeader }).then(r => r.json());
  assert(ticketDetail.ticket_code && ticketDetail.replies.length >= 1, 'Ticket detail schema invalid');

  const replyRes = await fetch(`http://localhost:3000/api/admin/help-center/tickets/${targetTicket.id}/reply`, {
    method: 'POST',
    headers: authHeader,
    body: JSON.stringify({
      sender: 'Super Admin Agent',
      text: 'Your bKash transaction has been manually verified and approved in our payout float. Funds are now available.',
      status: 'resolved'
    })
  }).then(r => r.json());

  assert(replyRes.success, 'Reply to ticket failed');
  assert(replyRes.ticket.status === 'resolved', 'Ticket status should be updated to resolved');
  console.log(`✅ Support Ticket Reply Dispatched: Ticket ${replyRes.ticket.ticket_code} resolved with multi-turn reply.`);

  // 11. Canned Macro Presets (GET, POST, DELETE)
  const cannedList = await fetch('http://localhost:3000/api/admin/help-center/canned-responses', { headers: authHeader }).then(r => r.json());
  assert(cannedList.items.length >= 5, 'Canned responses list incomplete');

  const newCanned = await fetch('http://localhost:3000/api/admin/help-center/canned-responses', {
    method: 'POST',
    headers: authHeader,
    body: JSON.stringify({
      code: 'MACRO-VAT-RECEIPT',
      title: 'Corporate Tax Invoice Download',
      category: 'billing',
      content: 'Hello {{name}}, You can download your official stamped VAT invoice directly from the Invoices tab in your dashboard.'
    })
  }).then(r => r.json());

  assert(newCanned.success, 'Create canned response failed');
  const cannedId = newCanned.item.id;

  const deleteCanned = await fetch(`http://localhost:3000/api/admin/help-center/canned-responses/${cannedId}`, {
    method: 'DELETE',
    headers: authHeader
  }).then(r => r.json());
  assert(deleteCanned.success, 'Delete canned response failed');
  console.log(`✅ Canned Macro Presets Engine verified (${cannedList.items.length} default presets, Create & Delete validated).`);

  // 12. Feedback & Search Gap Intelligence (GET)
  const analyticsRes = await fetch('http://localhost:3000/api/admin/help-center/analytics', { headers: authHeader }).then(r => r.json());
  assert(analyticsRes.top_helpful_articles.length > 0, 'Top helpful analytics missing');
  assert(analyticsRes.category_distribution.length > 0, 'Category distribution missing');
  assert(analyticsRes.search_gaps.length > 0, 'Zero-result search gaps missing');
  console.log(`✅ Help Center Feedback Intelligence: Top articles CSAT (${analyticsRes.top_helpful_articles[0].title} - ${analyticsRes.top_helpful_articles[0].csat}), ${analyticsRes.search_gaps.length} zero-result search gaps analyzed.`);

  // 13. CSV Export Streams (GET)
  const csvArticles = await fetch('http://localhost:3000/api/admin/help-center/export/articles', { headers: authHeader }).then(r => r.text());
  assert(csvArticles.startsWith('ID,Slug,Title') && csvArticles.includes('how-escrow-payment-protection-works'), 'Articles CSV format invalid');

  const csvTickets = await fetch('http://localhost:3000/api/admin/help-center/export/tickets', { headers: authHeader }).then(r => r.text());
  assert(csvTickets.startsWith('Code,Requester,Email') && csvTickets.includes('TCK-8841'), 'Tickets CSV format invalid');

  const csvGaps = await fetch('http://localhost:3000/api/admin/help-center/export/search-gaps', { headers: authHeader }).then(r => r.text());
  assert(csvGaps.startsWith('Keyword,Searches Count'), 'Search gaps CSV format invalid');
  console.log('✅ CSV Export Streams: Knowledge Articles, Support Tickets, and Search Gaps CSV streams verified.');

  // 14. Frontend DOM Verification in public/admin.html
  const adminHtml = fs.readFileSync(path.join(__dirname, '../public/admin.html'), 'utf8');
  assert(adminHtml.includes('id="view-help-center"'), 'view-help-center missing in admin.html');
  assert(adminHtml.includes('id="help-subtab-articles"'), 'help-subtab-articles missing');
  assert(adminHtml.includes('id="help-subtab-editor"'), 'help-subtab-editor missing');
  assert(adminHtml.includes('id="help-subtab-categories"'), 'help-subtab-categories missing');
  assert(adminHtml.includes('id="help-subtab-tickets"'), 'help-subtab-tickets missing');
  assert(adminHtml.includes('id="help-subtab-canned"'), 'help-subtab-canned missing');
  assert(adminHtml.includes('id="help-subtab-feedback"'), 'help-subtab-feedback missing');
  assert(adminHtml.includes('id="help-subtab-portal-preview"'), 'help-subtab-portal-preview missing');
  assert(adminHtml.includes('id="modal-help-article-create"'), 'modal-help-article-create missing');
  assert(adminHtml.includes('id="modal-help-ticket-reply"'), 'modal-help-ticket-reply missing');
  assert(adminHtml.includes('id="modal-help-category-create"'), 'modal-help-category-create missing');
  assert(adminHtml.includes('id="modal-help-canned-create"'), 'modal-help-canned-create missing');
  console.log('✅ Admin HTML DOM Elements: 7 sub-tabs, 4 interactive modals, live portal simulator verified.');

  // 15. Frontend JS Controller Verification in public/js/admin.js
  const adminJs = fs.readFileSync(path.join(__dirname, '../public/js/admin.js'), 'utf8');
  const requiredFns = [
    'loadHelpCenterDashboard',
    'switchHelpTab',
    'loadHelpKPIs',
    'loadHelpArticlesList',
    'openHelpArticleEditor',
    'updateLiveArticlePreview',
    'insertMarkdownTag',
    'handleSaveHelpArticle',
    'handleDuplicateHelpArticle',
    'handleToggleHelpArticleStatus',
    'handleDeleteHelpArticle',
    'openCreateHelpArticleModal',
    'handleCreateHelpArticleSubmit',
    'loadHelpCategoriesList',
    'openCreateHelpCategoryModal',
    'handleCreateHelpCategorySubmit',
    'handleDeleteHelpCategory',
    'loadHelpTicketsList',
    'openHelpTicketReplyModal',
    'insertMacroIntoTicketReply',
    'handleSendTicketReplySubmit',
    'loadHelpCannedList',
    'copyCannedMacro',
    'openCreateHelpCannedModal',
    'handleCreateHelpCannedSubmit',
    'handleDeleteHelpCanned',
    'loadHelpAnalytics',
    'updateLivePortalPreview',
    'exportHelpCenterCsv'
  ];

  for (const fn of requiredFns) {
    assert(adminJs.includes(fn), `Missing controller function in admin.js: ${fn}`);
    assert(adminJs.includes(`window.${fn} = ${fn}`), `Missing window export in admin.js: window.${fn}`);
  }
  console.log(`✅ Admin JS Controller: All ${requiredFns.length} functions and window bindings verified.`);

  console.log('========================================================================');
  console.log('🎉 ALL 15 HELP CENTER & SUPPORT DESK CHECKS PASSED WITH 100% SUCCESS!');
  console.log('========================================================================');
}

testHelpCenterSuite().catch(err => {
  console.error('❌ Verification Failed:', err);
  process.exit(1);
});
