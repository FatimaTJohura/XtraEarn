const assert = require('assert');
const fs = require('fs');
const path = require('path');

async function testAiEngineSuite() {
  console.log('================ VERIFYING ENTERPRISE AI INTELLIGENCE & AUTOMATED QC SUITE ================');

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

  // 2. AI KPIs
  const kpis = await fetch('http://localhost:3000/api/admin/ai/kpis', { headers: authHeader }).then(r => r.json());
  assert(kpis.automated_actions_24h > 0, 'Automated actions KPI invalid');
  assert(kpis.match_accuracy === '97.4%', 'Match accuracy invalid');
  console.log(`✅ AI KPIs: ${kpis.automated_actions_24h.toLocaleString()} ops (24h), ${kpis.match_accuracy} match precision, ${kpis.avg_inference_latency} latency, ${kpis.threats_prevented_24h} threats prevented, ${kpis.active_model} (${kpis.vector_dimension}).`);

  // 3. List AI Matches (GET)
  const listMatches = await fetch('http://localhost:3000/api/admin/ai/matches', { headers: authHeader }).then(r => r.json());
  assert(listMatches.items.length >= 3, 'AI matches incomplete');
  console.log(`✅ AI Semantic Matchmaker: ${listMatches.items.length} match vectors retrieved (Top match: ${listMatches.items[0].match_percentage} for "${listMatches.items[0].task_title}").`);

  // 4. Simulate Real-Time Match (POST)
  const simMatch = await fetch('http://localhost:3000/api/admin/ai/match-simulate', {
    method: 'POST',
    headers: authHeader,
    body: JSON.stringify({ task_id: 101, worker_id: 2 })
  }).then(r => r.json());

  assert(simMatch.success, 'Simulate match failed');
  assert(simMatch.match.similarity_score > 0.85, 'Similarity score too low');
  console.log(`✅ AI Match Simulated: ${simMatch.match.worker_name} matched with ${simMatch.match.match_percentage} cosine similarity.`);

  // 5. AI Moderation Logs (GET)
  const modLogs = await fetch('http://localhost:3000/api/admin/ai/moderation', { headers: authHeader }).then(r => r.json());
  assert(modLogs.items.length >= 3, 'Moderation logs incomplete');
  const bypassMod = modLogs.items.find(m => m.violation_type === 'off_platform_bypass');
  assert(bypassMod, 'Off-platform bypass alert missing');
  console.log(`✅ AI Anti-Scam Shield: ${modLogs.items.length} real-time violation records active.`);

  // 6. Action AI Moderation (POST)
  const actionRes = await fetch(`http://localhost:3000/api/admin/ai/moderation/${bypassMod.id}/action`, {
    method: 'POST',
    headers: authHeader,
    body: JSON.stringify({ action: 'dismiss' })
  }).then(r => r.json());

  assert(actionRes.success, 'Action moderation failed');
  console.log(`✅ Moderation Action: Record ID ${bypassMod.id} marked as "${actionRes.item.status}".`);

  // 7. Generate AI Task Brief & Budget Estimator (POST)
  const briefRes = await fetch('http://localhost:3000/api/admin/ai/task-gen', {
    method: 'POST',
    headers: authHeader,
    body: JSON.stringify({ prompt: 'Build a pharmacy delivery app with bKash API checkout in Dhaka' })
  }).then(r => r.json());

  assert(briefRes.success, 'Generate task brief failed');
  assert(briefRes.brief.generated_title, 'Title missing in brief');
  assert(briefRes.brief.budget_range, 'Budget range missing in brief');
  assert(briefRes.brief.extracted_skills.length > 0, 'Skill tags missing in brief');
  console.log(`✅ AI Prompt-to-Task Brief: Synthesized "${briefRes.brief.generated_title}" (Est. Budget: ${briefRes.brief.budget_range}).`);

  // 8. Automated QC Delivery Inspector (POST)
  const qcRes = await fetch('http://localhost:3000/api/admin/ai/delivery-inspect', {
    method: 'POST',
    headers: authHeader,
    body: JSON.stringify({ delivery_id: 42 })
  }).then(r => r.json());

  assert(qcRes.success, 'Delivery QC failed');
  assert(qcRes.inspection.quality_score >= 90, 'QC score invalid');
  console.log(`✅ Automated QC Delivery Inspector: Score ${qcRes.inspection.quality_score}/100, Verdict: ${qcRes.inspection.ai_verdict}.`);

  // 9. AI Engine Configuration (GET & PUT)
  const configRes = await fetch('http://localhost:3000/api/admin/ai/config', { headers: authHeader }).then(r => r.json());
  assert(configRes.model_provider, 'Model provider missing');

  const updateConfig = await fetch('http://localhost:3000/api/admin/ai/config', {
    method: 'PUT',
    headers: authHeader,
    body: JSON.stringify({ matching_similarity_threshold: 0.75 })
  }).then(r => r.json());

  assert(updateConfig.success, 'Update config failed');
  assert(updateConfig.config.matching_similarity_threshold === 0.75, 'Config threshold not updated');
  console.log(`✅ AI Model Configuration: Provider "${configRes.model_provider}", Threshold: 0.75 saved.`);

  // 10. CSV Export Streams (GET)
  const csvMatches = await fetch('http://localhost:3000/api/admin/ai/export/matches', { headers: authHeader }).then(r => r.text());
  assert(csvMatches.startsWith('ID,Task,Worker') && csvMatches.includes('Rakib Hasan'), 'Matches CSV format invalid');

  const csvMod = await fetch('http://localhost:3000/api/admin/ai/export/moderation', { headers: authHeader }).then(r => r.text());
  assert(csvMod.startsWith('ID,Code,Source'), 'Moderation CSV format invalid');
  console.log('✅ CSV Export Streams: AI Matches and Moderation Logs CSV streams verified.');

  // 11. Frontend DOM Verification in public/admin.html
  const adminHtml = fs.readFileSync(path.join(__dirname, '../public/admin.html'), 'utf8');
  assert(adminHtml.includes('id="view-ai-matching"'), 'view-ai-matching missing in admin.html');
  assert(adminHtml.includes('id="ai-subtab-matching"'), 'ai-subtab-matching missing');
  assert(adminHtml.includes('id="ai-subtab-moderation"'), 'ai-subtab-moderation missing');
  assert(adminHtml.includes('id="ai-subtab-task-gen"'), 'ai-subtab-task-gen missing');
  assert(adminHtml.includes('id="ai-subtab-qc"'), 'ai-subtab-qc missing');
  assert(adminHtml.includes('id="ai-subtab-config"'), 'ai-subtab-config missing');
  assert(adminHtml.includes('id="modal-ai-match-simulate"'), 'modal-ai-match-simulate missing');
  console.log('✅ Admin HTML DOM Elements: 5 sub-tabs, 1 interactive modal, task brief synthesizer & QC audit box verified.');

  // 12. Frontend JS Controller Verification in public/js/admin.js
  const adminJs = fs.readFileSync(path.join(__dirname, '../public/js/admin.js'), 'utf8');
  const requiredFns = [
    'loadAiDashboard',
    'switchAiTab',
    'loadAiKPIs',
    'loadAiMatchesTable',
    'openSimulateMatchModal',
    'handleSimulateMatchSubmit',
    'loadAiModerationTable',
    'handleActionAiModeration',
    'setAiPromptPreset',
    'handleGenerateAiTaskBrief',
    'handleRunQcAudit',
    'loadAiConfig',
    'handleSaveAiConfig',
    'exportAiCsv'
  ];

  for (const fn of requiredFns) {
    assert(adminJs.includes(fn), `Missing controller function in admin.js: ${fn}`);
    assert(adminJs.includes(`window.${fn} = ${fn}`), `Missing window export in admin.js: window.${fn}`);
  }
  console.log(`✅ Admin JS Controller: All ${requiredFns.length} functions and window bindings verified.`);

  console.log('========================================================================');
  console.log('🎉 ALL 12 ENTERPRISE AI INTELLIGENCE CHECKS PASSED WITH 100% SUCCESS!');
  console.log('========================================================================');
}

testAiEngineSuite().catch(err => {
  console.error('❌ Verification Failed:', err);
  process.exit(1);
});
