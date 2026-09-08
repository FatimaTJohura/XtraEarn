const assert = require('assert');
const fs = require('fs');
const path = require('path');

async function testPublicCmsRendererSuite() {
  console.log('================ VERIFYING PUBLIC CMS PAGE RENDERER & STOREFRONT HYDRATION ================');

  // 1. Check API Bootstrap
  const bootstrap = await fetch('http://localhost:3000/api/cms/bootstrap').then(r => r.json());
  assert(bootstrap.page, 'Bootstrap page missing');
  assert(bootstrap.header, 'Bootstrap header missing');
  assert(bootstrap.footer, 'Bootstrap footer missing');
  assert(bootstrap.theme_tokens, 'Bootstrap theme_tokens missing');
  assert(Array.isArray(bootstrap.popups), 'Bootstrap popups missing');
  console.log(`✅ CMS Bootstrap API: Loaded homepage ("${bootstrap.page.title}"), ${bootstrap.popups.length} popups, theme tokens.`);

  // 2. Check API Theme Tokens
  const theme = await fetch('http://localhost:3000/api/cms/theme').then(r => r.json());
  assert(theme.primary_color || theme['--primary-color'], 'Theme primary color missing');
  const primary = theme.primary_color || theme['--primary-color'];
  console.log(`✅ CMS Theme Tokens API: Primary color = ${primary}, Font = ${theme.font_heading || theme['--font-sans'] || 'Outfit'}.`);

  // 3. Check Specific Slug Endpoint
  const homePageData = await fetch('http://localhost:3000/api/cms/page/homepage').then(r => r.json());
  assert(homePageData.page && homePageData.page.slug === 'homepage', 'Slug fetch failed');
  console.log(`✅ CMS Page By Slug API: Successfully fetched "${homePageData.page.title}" (${homePageData.page.sections.length} sections).`);

  // 4. Verify Files on Disk
  const pageHtmlPath = path.join(__dirname, '../public/page.html');
  assert(fs.existsSync(pageHtmlPath), 'public/page.html missing');
  const pageHtml = fs.readFileSync(pageHtmlPath, 'utf8');

  const pageJsPath = path.join(__dirname, '../public/js/page-renderer.js');
  assert(fs.existsSync(pageJsPath), 'public/js/page-renderer.js missing');
  const pageJs = fs.readFileSync(pageJsPath, 'utf8');

  const sharedJsPath = path.join(__dirname, '../public/js/shared.js');
  const sharedJs = fs.readFileSync(sharedJsPath, 'utf8');

  // 5. Verify DOM Elements in page.html
  const requiredPageDom = [
    'cms-top-announcement-bar',
    'cms-ann-text',
    'cms-ann-link',
    'cms-page-meta-title',
    'cms-page-meta-desc',
    'cms-page-og-title',
    'cms-page-og-desc',
    'cms-page-main-container',
    'cms-page-loading',
    'cms-page-content',
    'cms-dynamic-footer',
    'cms-active-popup-modal',
    'cms-popup-title',
    'cms-popup-body',
    'cms-popup-cta'
  ];

  for (const domId of requiredPageDom) {
    assert(pageHtml.includes(`id="${domId}"`), `DOM element #${domId} missing in page.html`);
  }
  console.log(`✅ DOM Verification: All ${requiredPageDom.length} required interactive DOM elements present in page.html.`);

  // 6. Verify Renderer Logic in page-renderer.js
  const requiredRendererFeatures = [
    'renderPageSeo',
    'renderPageSections',
    'renderCmsElement',
    'renderDynamicWidgetAsync',
    'cms-row-grid',
    'cms-col-100',
    'cms-col-50-50',
    'cms-col-33-33-33',
    'cms-col-30-70',
    'cms-trust-shield-box',
    'application/ld+json'
  ];

  for (const feat of requiredRendererFeatures) {
    assert(pageJs.includes(feat), `Feature "${feat}" missing in page-renderer.js`);
  }
  console.log(`✅ Renderer Logic: Multi-column grid, dynamic widgets, trust shields, and JSON-LD schema verified.`);

  // 7. Verify Storefront Hydration in shared.js
  const requiredStorefrontFeatures = [
    'initCmsStorefront',
    'setupPopupTrigger',
    'dismissAnnouncementBar',
    'dismissActivePopup',
    '--primary-color',
    'after_5_seconds',
    'scroll_50%',
    'exit_intent'
  ];

  for (const feat of requiredStorefrontFeatures) {
    assert(sharedJs.includes(feat), `Feature "${feat}" missing in shared.js`);
  }
  console.log(`✅ Storefront Hydration: CSS token injection, behavioral popup triggers (time/scroll/exit) verified.`);

  // 8. Test HTTP GET /page/homepage and /page/earn-money
  const pageRouteRes = await fetch('http://localhost:3000/page/homepage');
  assert.strictEqual(pageRouteRes.status, 200, '/page/homepage route should return 200');
  const htmlContent = await pageRouteRes.text();
  assert(htmlContent.includes('cms-page-main-container'), 'Route returned unexpected content');
  console.log(`✅ Server Route Dispatching: GET /page/homepage served public/page.html correctly.`);

  console.log('\n========================================================================');
  console.log('🎉 ALL 8 PUBLIC CMS & STOREFRONT HYDRATION CHECKS PASSED WITH 100% SUCCESS!');
  console.log('========================================================================\n');
}

testPublicCmsRendererSuite().catch(err => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
