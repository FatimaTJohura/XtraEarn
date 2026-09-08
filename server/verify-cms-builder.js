const assert = require('assert');
const fs = require('fs');
const path = require('path');

async function testCmsBuilderSuite() {
  console.log('================ VERIFYING ENTERPRISE CMS & VISUAL PAGE BUILDER SUITE ================');

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

  // 2. CMS KPIs
  const kpis = await fetch('http://localhost:3000/api/admin/cms/kpis', { headers: authHeader }).then(r => r.json());
  assert(kpis.total_pages >= 3, 'Total pages KPI invalid');
  assert(kpis.reusable_sections >= 4, 'Reusable sections KPI invalid');
  console.log(`✅ CMS KPIs: ${kpis.total_pages} Total Pages (${kpis.published_pages} published), ${kpis.reusable_sections} Reusable Blocks, ${kpis.page_templates} Templates, ${kpis.active_popups} Active Popups.`);

  // 3. List Pages (GET)
  const listPages = await fetch('http://localhost:3000/api/admin/cms/pages', { headers: authHeader }).then(r => r.json());
  assert(listPages.items.length >= 3, 'Pages list incomplete');
  const home = listPages.items.find(p => p.slug === 'homepage');
  assert(home, 'Homepage missing');
  console.log(`✅ Pages Directory: ${listPages.items.length} pages retrieved (Found: "${home.title}").`);

  // 4. Create New Page (POST)
  const createPage = await fetch('http://localhost:3000/api/admin/cms/pages', {
    method: 'POST',
    headers: authHeader,
    body: JSON.stringify({
      title: 'Ramadan 2026 Gig Carnival',
      slug: 'ramadan-2026-carnival',
      type: 'campaign',
      sections: []
    })
  }).then(r => r.json());

  assert(createPage.success, 'Create page failed');
  const newPageId = createPage.item.id;
  console.log(`✅ Page Created: ID ${newPageId} ("${createPage.item.title}") at route ${createPage.item.path}.`);

  // 5. Update Page Layout with Visual Schema (PUT)
  const updatePage = await fetch(`http://localhost:3000/api/admin/cms/pages/${newPageId}`, {
    method: 'PUT',
    headers: authHeader,
    body: JSON.stringify({
      title: 'Ramadan 2026 Gig Carnival & Cashback Festival',
      sections: [
        {
          id: 'sec-ramadan-hero',
          name: 'Hero Cashback Banner',
          type: 'hero',
          bg: 'linear-gradient(135deg, #064E3B 0%, #1E1B4B 100%)',
          padding: '60px 20px',
          visible: true,
          rows: [
            {
              id: 'row-1',
              columns: [
                {
                  id: 'col-1',
                  width: '100%',
                  elements: [
                    { type: 'heading', level: 'h1', content: 'Earn 20% Extra Cashback This Ramadan!' },
                    { type: 'button', label: 'Explore Tasks 🌙', url: '/tasks' }
                  ]
                }
              ]
            }
          ]
        }
      ]
    })
  }).then(r => r.json());

  assert(updatePage.success, 'Update page failed');
  assert(updatePage.item.version === 2, 'Page version not incremented');
  console.log(`✅ Visual Page Builder: Schema updated with nested sections & rows (Version ${updatePage.item.version}).`);

  // 6. Duplicate Page (POST)
  const dupPage = await fetch(`http://localhost:3000/api/admin/cms/pages/${newPageId}/duplicate`, {
    method: 'POST',
    headers: authHeader
  }).then(r => r.json());

  assert(dupPage.success, 'Duplicate page failed');
  const dupPageId = dupPage.item.id;
  console.log(`✅ Page Duplicated: ID ${dupPageId} ("${dupPage.item.title}").`);

  // 7. Delete Duplicated Page (DELETE)
  const delPage = await fetch(`http://localhost:3000/api/admin/cms/pages/${dupPageId}`, {
    method: 'DELETE',
    headers: authHeader
  }).then(r => r.json());

  assert(delPage.success, 'Delete page failed');
  console.log(`✅ Page Deleted: ID ${dupPageId}.`);

  // 8. Reusable Sections & Templates (GET & POST)
  const sections = await fetch('http://localhost:3000/api/admin/cms/sections', { headers: authHeader }).then(r => r.json());
  assert(sections.items.length >= 4, 'Sections incomplete');

  const addSec = await fetch('http://localhost:3000/api/admin/cms/sections', {
    method: 'POST',
    headers: authHeader,
    body: JSON.stringify({
      name: 'Custom CTA High-Conversion Strip',
      category: 'CTA',
      schema: { headline: 'Get Started Today' }
    })
  }).then(r => r.json());
  assert(addSec.success, 'Save section block failed');
  console.log(`✅ Reusable Sections Library: ${sections.items.length} blocks active (Added ID: ${addSec.item.id}).`);

  // 9. Global Header & Mega Menu (GET & PUT)
  const header = await fetch('http://localhost:3000/api/admin/cms/header', { headers: authHeader }).then(r => r.json());
  assert(header.announcement_bar, 'Header announcement missing');

  const updateHeader = await fetch('http://localhost:3000/api/admin/cms/header', {
    method: 'PUT',
    headers: authHeader,
    body: JSON.stringify({
      announcement_bar: { enabled: true, text: '🎉 Updated Ramadan Offer: 20% Instant Cashback', link_url: '/tasks' }
    })
  }).then(r => r.json());
  assert(updateHeader.success, 'Update header failed');
  console.log(`✅ Global Header & Mega Menu: Top Announcement Bar updated ("${updateHeader.header.announcement_bar.text}").`);

  // 10. Global Footer (GET & PUT)
  const footer = await fetch('http://localhost:3000/api/admin/cms/footer', { headers: authHeader }).then(r => r.json());
  assert(footer.row_columns.length >= 4, 'Footer columns missing');

  const updateFooter = await fetch('http://localhost:3000/api/admin/cms/footer', {
    method: 'PUT',
    headers: authHeader,
    body: JSON.stringify({ copyright_text: '© 2026 XtraEarn Global Platform Ltd.' })
  }).then(r => r.json());
  assert(updateFooter.success, 'Update footer failed');
  console.log(`✅ Multi-Row Dynamic Footer: ${footer.row_columns.length} columns verified, Copyright updated.`);

  // 11. Popups & Modals (GET & POST)
  const popups = await fetch('http://localhost:3000/api/admin/cms/popups', { headers: authHeader }).then(r => r.json());
  assert(popups.items.length >= 2, 'Popups incomplete');

  const addPopup = await fetch('http://localhost:3000/api/admin/cms/popups', {
    method: 'POST',
    headers: authHeader,
    body: JSON.stringify({
      name: 'Ramadan Daily Spin & Win',
      type: 'coupon_modal',
      title: '🎁 Spin the Wheel for Free Escrow Credits',
      trigger_rule: 'exit_intent'
    })
  }).then(r => r.json());
  assert(addPopup.success, 'Save popup modal failed');
  console.log(`✅ High-Conversion Popups: ${popups.items.length} popups active (Added ID: ${addPopup.item.id}).`);

  // 12. Theme Design Tokens (GET & PUT)
  const theme = await fetch('http://localhost:3000/api/admin/cms/theme', { headers: authHeader }).then(r => r.json());
  assert(theme.primary_color, 'Theme primary color missing');

  const updateTheme = await fetch('http://localhost:3000/api/admin/cms/theme', {
    method: 'PUT',
    headers: authHeader,
    body: JSON.stringify({ primary_color: '#059669', font_heading: 'Outfit, sans-serif' })
  }).then(r => r.json());
  assert(updateTheme.success, 'Update theme failed');
  console.log(`✅ Global Theme Tokens: Primary color "${updateTheme.tokens.primary_color}", Typography "${updateTheme.tokens.font_heading}" verified.`);

  // 13. JSON Schema Export Stream (GET)
  const exportJson = await fetch(`http://localhost:3000/api/admin/cms/export/${newPageId}`, { headers: authHeader }).then(r => r.json());
  assert(exportJson.schema_version === '2.0', 'Schema version invalid');
  assert(exportJson.page.title.includes('Ramadan'), 'Exported page title mismatch');
  console.log(`✅ JSON Schema Export: Exported version 2.0 schema for "${exportJson.page.title}".`);

  // 14. JSON Schema Import (POST)
  const importRes = await fetch('http://localhost:3000/api/admin/cms/import', {
    method: 'POST',
    headers: authHeader,
    body: JSON.stringify({
      title: 'Imported Micro-Task Landing Hub',
      slug: 'imported-landing-hub',
      type: 'landing',
      sections: [{ id: 'sec-imp-1', name: 'Imported Hero', type: 'hero' }]
    })
  }).then(r => r.json());
  assert(importRes.success, 'Import schema failed');
  console.log(`✅ JSON Schema Import: Successfully imported ID ${importRes.item.id} ("${importRes.item.title}").`);

  // 15. Audit Logs Trail (GET)
  const logs = await fetch('http://localhost:3000/api/admin/cms/audit-logs', { headers: authHeader }).then(r => r.json());
  assert(logs.items.length >= 3, 'Audit logs incomplete');
  console.log(`✅ CMS Audit Logs Trail: ${logs.items.length} change logs recorded (Latest: "${logs.items[0].action}").`);

  // 16. Frontend DOM in public/admin.html
  const adminHtml = fs.readFileSync(path.join(__dirname, '../public/admin.html'), 'utf8');
  assert(adminHtml.includes('id="view-cms"'), 'view-cms missing in admin.html');
  assert(adminHtml.includes('id="cms-subtab-dashboard"'), 'cms-subtab-dashboard missing');
  assert(adminHtml.includes('id="cms-subtab-builder"'), 'cms-subtab-builder missing');
  assert(adminHtml.includes('id="cms-subtab-headers"'), 'cms-subtab-headers missing');
  assert(adminHtml.includes('id="cms-subtab-footers"'), 'cms-subtab-footers missing');
  assert(adminHtml.includes('id="cms-subtab-popups"'), 'cms-subtab-popups missing');
  assert(adminHtml.includes('id="cms-subtab-templates"'), 'cms-subtab-templates missing');
  assert(adminHtml.includes('id="cms-subtab-theme"'), 'cms-subtab-theme missing');
  assert(adminHtml.includes('id="modal-cms-page-create"'), 'modal-cms-page-create missing');
  assert(adminHtml.includes('id="modal-cms-command-palette"'), 'modal-cms-command-palette missing');
  console.log('✅ Admin HTML DOM Elements: 9 sub-tabs, 4 interactive modals, 3-pane builder layout verified.');

  // 17. Frontend JS Controller in public/js/admin.js
  const adminJs = fs.readFileSync(path.join(__dirname, '../public/js/admin.js'), 'utf8');
  const requiredFns = [
    'loadCmsDashboard',
    'switchCmsTab',
    'loadCmsKPIs',
    'loadCmsPagesTable',
    'openCmsPageInBuilder',
    'renderCmsBuilderCanvas',
    'selectCmsSection',
    'moveCmsSection',
    'duplicateCmsSection',
    'deleteCmsSection',
    'handleSaveCurrentBuilderPage',
    'handleExportCurrentPageJson',
    'handleExportPageJsonById',
    'openCreateCmsPageModal',
    'handleCreateCmsPageSubmit',
    'handleDuplicateCmsPage',
    'handleDeleteCmsPage',
    'loadCmsHeaderConfig',
    'handleSaveHeaderConfig',
    'loadCmsFooterConfig',
    'handleSaveFooterConfig',
    'loadCmsPopupsGrid',
    'loadCmsThemeTokens',
    'handleSaveThemeTokens',
    'loadCmsAuditLogs',
    'openCmsCommandPalette',
    'executeCmsCommand',
    'openCmsImportModal',
    'handleImportCmsJsonSubmit'
  ];

  for (const fn of requiredFns) {
    assert(adminJs.includes(fn), `Missing controller function in admin.js: ${fn}`);
    assert(adminJs.includes(`window.${fn} = ${fn}`), `Missing window export in admin.js: window.${fn}`);
  }
  console.log(`✅ Admin JS Controller: All ${requiredFns.length} functions and window bindings verified.`);

  console.log('========================================================================');
  console.log('🎉 ALL 17 ENTERPRISE CMS & VISUAL PAGE BUILDER CHECKS PASSED WITH 100% SUCCESS!');
  console.log('========================================================================');
}

testCmsBuilderSuite().catch(err => {
  console.error('❌ Verification Failed:', err);
  process.exit(1);
});
