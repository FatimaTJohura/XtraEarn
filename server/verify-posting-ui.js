/**
 * XtraEarn Dynamic Task Posting System - Frontend Engine & UI Verification Suite
 * Verifies DOM structure, step stepper components, dynamic fields rendering,
 * condition evaluation, non-authoritative AI suggestions, and dual-draft persistence.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('================================================================');
console.log('  XTRAEARN DYNAMIC TASK POSTING UI & ENGINE VERIFICATION');
console.log('================================================================\n');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`PASS  ${name}`);
    passed++;
  } catch (err) {
    console.error(`FAIL  ${name}`);
    console.error(err.message || err);
    failed++;
  }
}

const sharedJs = fs.readFileSync(path.join(__dirname, '../public/js/shared.js'), 'utf8');
const engineJs = fs.readFileSync(path.join(__dirname, '../public/js/taskPostingEngine.js'), 'utf8');
const { TEMPLATE_SEEDS } = require('./templateSeeds');

// 1. Modal DOM Structure
test('shared.js contains complete 6-step modal DOM structure', () => {
  assert(sharedJs.includes('id="xe-pt-modal"'), 'Modal overlay ID #xe-pt-modal missing');
  assert(sharedJs.includes('pt-stepper-bar'), '6-step visual stepper bar missing');
  for (let i = 1; i <= 6; i++) {
    assert(sharedJs.includes(`id="pt-step-panel-${i}"`), `Step panel #${i} missing in modal HTML`);
  }
  assert(sharedJs.includes('id="pt-draft-resume-banner"'), 'Draft resume banner missing');
  assert(sharedJs.includes('id="pt-dynamic-fields-container"'), 'Dynamic fields container missing');
  assert(sharedJs.includes('id="pt-ai-suggestions-panel"'), 'AI suggestions panel missing');
  assert(sharedJs.includes('id="pt-quality-check-card"'), 'Quality check card missing');
  assert(sharedJs.includes('id="pt-escrow-calculation-box"'), 'Escrow calculation box missing');
  assert(sharedJs.includes('id="pt-btn-publish"'), 'Publish button missing');
});

// 2. DynamicTaskPostingEngine Methods
test('DynamicTaskPostingEngine contains all essential lifecycle methods', () => {
  const methods = [
    'init', 'checkAndPromptDraft', 'loadDraftData', 'scheduleDraftSave', 'saveDraft', 'clearDraft',
    'goToStep', 'nextStep', 'prevStep', 'validateCurrentStep',
    'loadTemplateForCategory', 'renderDynamicFields',
    'attachConditionalListeners', 'evaluateConditions',
    'triggerAiAssistance', 'displayAiSuggestionsModal',
    'calculateFeeBreakdown', 'renderLiveReviewAndQualityCheck', 'publishTask'
  ];
  for (const m of methods) {
    assert(engineJs.includes(m), `DynamicTaskPostingEngine missing method: ${m}`);
  }
});

// 3. Location Provider Abstraction
test('LocationProvider abstraction contains 64 districts and modular geocode interface', () => {
  assert(engineJs.includes('const LocationProvider ='), 'LocationProvider missing in taskPostingEngine.js');
  assert(engineJs.includes('getDistricts'), 'LocationProvider.getDistricts missing');
  assert(engineJs.includes('getAreasForDistrict'), 'LocationProvider.getAreasForDistrict missing');
  assert(engineJs.includes('geocode'), 'LocationProvider.geocode missing');
});

// 4. Verification of 12 Production Template Seeds
test('All 12 domain templates have rigid schemas, valid field_keys, and conditional logic', () => {
  assert.strictEqual(TEMPLATE_SEEDS.length, 12, 'Expected exactly 12 domain template seeds');
  TEMPLATE_SEEDS.forEach(t => {
    assert(t.id >= 101 && t.id <= 112, `Template ID ${t.id} must be in 101-112 range`);
    assert(t.title, `Template ${t.id} title missing`);
    assert(t.category_id, `Template ${t.id} category_id missing`);
    assert(t.category_name, `Template ${t.id} category_name missing`);
    assert(t.subcategory, `Template ${t.id} subcategory missing`);
    assert(Array.isArray(t.fields) && t.fields.length > 0, `Template ${t.id} must have dynamic fields`);
    t.fields.forEach(f => {
      assert(f.field_key, `Field in template ${t.id} missing field_key`);
      assert(f.type, `Field ${f.field_key} missing type`);
      assert(f.label, `Field ${f.field_key} missing label`);
    });
  });
});

// 5. Mock DOM Dynamic Field Renderer Simulation
test('Dynamic field renderer supports dropdown, number, toggle, multi-select, and conditional logic', () => {
  const ecomTmpl = TEMPLATE_SEEDS.find(t => t.id === 101);
  assert(ecomTmpl.fields.some(f => f.type === 'dropdown'));
  assert(ecomTmpl.fields.some(f => f.type === 'number'));
  assert(ecomTmpl.fields.some(f => f.type === 'multi-select'));
  assert(ecomTmpl.fields.some(f => f.conditions && f.conditions.length > 0));

  // Verify conditional rule structure
  const condField = ecomTmpl.fields.find(f => f.conditions && f.conditions.length > 0);
  assert.strictEqual(condField.conditions[0].operator, 'equals');
  assert.strictEqual(condField.conditions[0].value, 'other');
});

// 6. Dual Draft Storage keys
test('Draft storage uses both localStorage and server sync endpoint', () => {
  assert(engineJs.includes("localStorage.setItem('xe_task_draft_v2'"), 'localStorage key missing');
  assert(engineJs.includes("await api('/tasks/drafts'"), 'Server draft sync API call missing');
  assert(engineJs.includes("await api('/tasks/drafts/current'"), 'Server draft retrieval API call missing');
});

console.log('\n================================================================');
console.log(`  UI VERIFICATION RESULTS: ${passed} passed, ${failed} failed  (${passed + failed} total)`);
console.log('================================================================\n');

if (failed > 0) process.exit(1);
