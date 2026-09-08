/**
 * XtraEarn Dynamic Task Posting System - Comprehensive Verification Suite
 * Tests dynamic template lookup, immutable snapshot versioning, dual draft persistence,
 * non-authoritative AI scoping assistant, task quality inspector, pricing/escrow calculations,
 * and the complete 15-state task lifecycle finite state machine.
 */

const assert = require('assert');

const BASE = 'http://localhost:3000';
let clientToken, workerToken, adminToken;
let clientUserId, workerUserId;

const j = async (path, opts = {}) => {
  const res = await fetch(BASE + path, {
    method: opts.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {})
    },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined
  });
  return { status: res.status, data: await res.json().catch(() => null) };
};

let passedCount = 0;
let totalCount = 0;

async function test(name, fn) {
  totalCount++;
  try {
    await fn();
    console.log(`PASS  ${name}`);
    passedCount++;
  } catch (err) {
    console.error(`FAIL  ${name}`);
    console.error(err);
  }
}

(async () => {
  console.log('================================================================');
  console.log('  XTRAEARN DYNAMIC TASK POSTING SYSTEM VERIFICATION SUITE');
  console.log('================================================================\n');

  // 1. Auth Setup
  await test('Login Client, Worker, and Admin accounts', async () => {
    const cRes = await j('/api/auth/login', { method: 'POST', body: { username: 'bdshop', password: 'password123' } });
    assert.strictEqual(cRes.status, 200);
    clientToken = cRes.data.token;
    clientUserId = cRes.data.user.id;

    const wRes = await j('/api/auth/login', { method: 'POST', body: { username: 'rakib', password: 'password123' } });
    assert.strictEqual(wRes.status, 200);
    workerToken = wRes.data.token;
    workerUserId = wRes.data.user.id;

    const aRes = await j('/api/auth/login', { method: 'POST', body: { username: 'superadmin', password: 'password123' } });
    assert.strictEqual(aRes.status, 200);
    adminToken = aRes.data.token;
  });

  // 2. Pricing & Currency Engine
  await test('GET /api/pricing/currencies returns supported multi-currency list', async () => {
    const res = await j('/api/pricing/currencies');
    assert.strictEqual(res.status, 200);
    assert(Array.isArray(res.data.currencies));
    assert(res.data.currencies.some(c => c.code === 'BDT'));
    assert(res.data.currencies.some(c => c.code === 'USD'));
  });

  await test('POST /api/pricing/calculate-escrow computes platform commission and worker net', async () => {
    const res = await j('/api/pricing/calculate-escrow', { method: 'POST', body: { budget: 1000, currency: 'BDT' } });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.budget, 1000);
    assert.strictEqual(res.data.platform_commission, 100); // 10%
    assert.strictEqual(res.data.estimated_worker_payout, 900);
  });

  // 3. Dynamic Template Lookup for Domain Seeds
  await test('Dynamic Template Lookup: E-commerce Product Listing template', async () => {
    const res = await j('/api/tasks/template-lookup?categoryId=11&subcategory=Product%20Listing');
    assert.strictEqual(res.status, 200);
    assert(res.data.template);
    assert.strictEqual(res.data.template.category_name, 'E-commerce');
    assert(res.data.template.fields.some(f => f.field_key === 'number_of_products'));
    assert(res.data.template.fields.some(f => f.field_key === 'platform'));
  });

  await test('Dynamic Template Lookup: Logo & Branding Design template with conditional rules', async () => {
    const res = await j('/api/tasks/template-lookup?categoryId=1&subcategory=Logo%20%26%20Branding');
    assert.strictEqual(res.status, 200);
    assert(res.data.template);
    assert(res.data.template.fields.some(f => f.field_key === 'brand_name'));
    assert(res.data.template.fields.some(f => f.field_key === 'source_files_required'));
  });

  await test('Dynamic Template Lookup: AI Image Annotation template with conditional target labels', async () => {
    const res = await j('/api/tasks/template-lookup?categoryId=6&subcategory=Image%20Annotation');
    assert.strictEqual(res.status, 200);
    assert(res.data.template);
    assert(res.data.template.fields.some(f => f.field_key === 'annotation_type'));
    assert(res.data.template.fields.some(f => f.field_key === 'dataset_volume'));
  });

  await test('Dynamic Template Lookup: Home Plumbing & Handyman Physical template', async () => {
    const res = await j('/api/tasks/template-lookup?categoryId=12&subcategory=Plumbing%20%26%20Pipes');
    assert.strictEqual(res.status, 200);
    assert(res.data.template);
    assert.strictEqual(res.data.template.task_type, 'physical');
    assert(res.data.template.fields.some(f => f.field_key === 'issue_type'));
  });

  // 4. Draft Persistence API (Dual Draft Store)
  await test('POST /api/tasks/drafts saves server draft for logged-in client', async () => {
    const draftPayload = {
      title: 'E-commerce Catalog Upload Draft',
      categoryId: 11,
      subcategory: 'Product Listing',
      budget: 500,
      dynamicData: { number_of_products: 50, platform: 'Shopify' }
    };
    const res = await j('/api/tasks/drafts', { method: 'POST', body: draftPayload, token: clientToken });
    assert.strictEqual(res.status, 200);
    assert(res.data.success);
    assert.strictEqual(res.data.draft.draft_data.title, 'E-commerce Catalog Upload Draft');
  });

  await test('GET /api/tasks/drafts/current retrieves saved client draft', async () => {
    const res = await j('/api/tasks/drafts/current', { token: clientToken });
    assert.strictEqual(res.status, 200);
    assert(res.data.draft);
    assert.strictEqual(res.data.draft.draft_data.dynamicData.number_of_products, 50);
  });

  // 5. Non-authoritative AI Scoping Assistant
  await test('POST /api/tasks/ai-assist provides non-destructive suggestions with confidence score', async () => {
    const res = await j('/api/tasks/ai-assist', {
      method: 'POST',
      body: {
        title: 'Design a modern minimalist vector logo for my tech coffee shop',
        description: 'Need brand identity with source vector AI and transparent PNG files'
      }
    });
    assert.strictEqual(res.status, 200);
    assert(res.data.success);
    assert(res.data.suggestions.suggested_skills.includes('logo'));
    assert(res.data.suggestions.suggested_budget_range.min > 0);
    assert(res.data.suggestions.confidence_score >= 80);
  });

  // 6. Pre-Publication Quality Inspector
  await test('POST /api/tasks/quality-check scores task readiness and flags missing parameters', async () => {
    // Incomplete task
    const incompleteRes = await j('/api/tasks/quality-check', {
      method: 'POST',
      body: { title: 'Help', description: 'Short', budget: 10 }
    });
    assert.strictEqual(incompleteRes.status, 200);
    assert.strictEqual(incompleteRes.data.analysis.is_ready, false);
    assert(incompleteRes.data.analysis.score < 50);
    assert(incompleteRes.data.analysis.warnings.length > 0);

    // Complete task
    const completeRes = await j('/api/tasks/quality-check', {
      method: 'POST',
      body: {
        title: 'Upload 100 Products to Daraz Marketplace with SEO descriptions',
        description: 'Detailed description with all requirements, CSV format and image links provided.',
        budget: 800,
        categoryId: 11,
        taskType: 'online',
        dynamicData: { number_of_products: 100, platform: 'Daraz' }
      }
    });
    assert.strictEqual(completeRes.status, 200);
    assert.strictEqual(completeRes.data.analysis.is_ready, true);
    assert(completeRes.data.analysis.score >= 80);
  });

  // 7. Dynamic Task Creation & Immutable Template Snapshot
  let createdTaskId = null;
  await test('POST /api/tasks creates task with dynamic_data and immutable template snapshot', async () => {
    const tmplRes = await j('/api/tasks/template-lookup?categoryId=1&subcategory=Logo%20%26%20Branding');
    const tmpl = tmplRes.data.template;

    const taskPayload = {
      title: 'Minimalist Vector Logo for Fintech App',
      description: 'Need a modern, premium logo with vector source files and brand guidelines.',
      categoryId: 1,
      subcategory: 'Logo & Branding',
      budget: 1500,
      durationMinutes: 60,
      deliveryHours: 48,
      taskType: 'online',
      templateId: tmpl.id,
      templateVersion: tmpl.version,
      templateSchemaSnapshot: tmpl.fields,
      dynamicData: {
        brand_name: 'PayFlow BD',
        industry: 'Fintech',
        source_files_required: true,
        number_of_concepts: 3
      },
      skills: ['logo', 'branding', 'vector', 'figma'],
      workerCriteria: { minRating: 4.5, verificationRequired: true },
      currency: 'BDT'
    };

    const res = await j('/api/tasks', { method: 'POST', body: taskPayload, token: clientToken });
    assert.strictEqual(res.status, 201);
    assert(res.data.task);
    assert.strictEqual(res.data.task.template_version, tmpl.version);
    assert.deepStrictEqual(res.data.task.dynamic_data.brand_name, 'PayFlow BD');
    assert(Array.isArray(res.data.task.template_schema_snapshot));
    assert(res.data.task.template_schema_snapshot.length > 0);
    createdTaskId = res.data.task.id;
  });

  // 8. 15-State Task Lifecycle Finite State Machine
  await test('Task Lifecycle FSM: Applications -> Worker Selection -> In Progress -> Submission -> Delivery -> Completion', async () => {
    // 1. Worker applies
    const applyRes = await j(`/api/tasks/${createdTaskId}/apply`, { method: 'POST', body: { message: 'I am an expert logo designer.' }, token: workerToken });
    assert.strictEqual(applyRes.status, 201);

    // 2. Client transitions task to WORKER_SELECTED
    const selectRes = await j(`/api/tasks/${createdTaskId}/transition`, {
      method: 'POST',
      body: { targetStatus: 'worker_selected', note: 'Selected Rakib for this project' },
      token: clientToken
    });
    assert.strictEqual(selectRes.status, 200);
    assert.strictEqual(selectRes.data.task.status, 'worker_selected');

    // 3. Move to IN_PROGRESS
    const startRes = await j(`/api/tasks/${createdTaskId}/transition`, {
      method: 'POST',
      body: { targetStatus: 'in_progress', note: 'Work commenced' },
      token: clientToken
    });
    assert.strictEqual(startRes.status, 200);
    assert.strictEqual(startRes.data.task.status, 'in_progress');

    // 4. Worker submits work (SUBMITTED)
    const subRes = await j(`/api/tasks/${createdTaskId}/transition`, {
      method: 'POST',
      body: { targetStatus: 'submitted', note: 'Submitted 3 logo concepts in vector SVG and PNG' },
      token: workerToken
    });
    assert.strictEqual(subRes.status, 200);
    assert.strictEqual(subRes.data.task.status, 'submitted');

    // 5. Client requests revision (REVISION_REQUESTED)
    const revRes = await j(`/api/tasks/${createdTaskId}/transition`, {
      method: 'POST',
      body: { targetStatus: 'revision_requested', note: 'Please adjust color palette to darker emerald' },
      token: clientToken
    });
    assert.strictEqual(revRes.status, 200);
    assert.strictEqual(revRes.data.task.status, 'revision_requested');

    // 6. Worker resubmits (RESUBMITTED)
    const resubRes = await j(`/api/tasks/${createdTaskId}/transition`, {
      method: 'POST',
      body: { targetStatus: 'resubmitted', note: 'Updated emerald color palette as requested' },
      token: workerToken
    });
    assert.strictEqual(resubRes.status, 200);
    assert.strictEqual(resubRes.data.task.status, 'resubmitted');

    // 7. Client approves (APPROVED)
    const appRes = await j(`/api/tasks/${createdTaskId}/transition`, {
      method: 'POST',
      body: { targetStatus: 'approved', note: 'Work approved! Looks fantastic.' },
      token: clientToken
    });
    assert.strictEqual(appRes.status, 200);
    assert.strictEqual(appRes.data.task.status, 'approved');

    // 8. Escrow release & completion (COMPLETED)
    const compRes = await j(`/api/tasks/${createdTaskId}/transition`, {
      method: 'POST',
      body: { targetStatus: 'completed', note: 'Payment released from escrow vault. Task finalized.' },
      token: clientToken
    });
    assert.strictEqual(compRes.status, 200);
    assert.strictEqual(compRes.data.task.status, 'completed');
  });

  // 9. Invalid State Transition Rejection
  await test('Task Lifecycle FSM: Reject invalid state transitions', async () => {
    // Attempting to move completed task directly back to in_progress should fail
    const invalidRes = await j(`/api/tasks/${createdTaskId}/transition`, {
      method: 'POST',
      body: { targetStatus: 'in_progress' },
      token: clientToken
    });
    assert.strictEqual(invalidRes.status, 400);
  });

  // 10. Admin Template CRUD & Version Snapshotting
  await test('Admin Template Builder: Create, Update with dynamic fields, and Version bump', async () => {
    // 1. Create template
    const createRes = await j('/api/admin/templates', {
      method: 'POST',
      body: {
        title: 'Mobile App Wireframing Pack',
        category_id: 1,
        subcategory: 'UI/UX Design',
        default_budget: 3500,
        fields: [
          { field_key: 'screen_count', label: 'Number of Screens', type: 'number', required: true },
          { field_key: 'target_os', label: 'Platform', type: 'dropdown', options: [{ value: 'iOS' }, { value: 'Android' }] }
        ]
      },
      token: adminToken
    });
    assert.strictEqual(createRes.status, 200);
    const tmplId = createRes.data.template.id;
    assert.strictEqual(createRes.data.template.version, 1);

    // 2. Version bump snapshot
    const verRes = await j(`/api/admin/templates/${tmplId}/version`, {
      method: 'POST',
      body: { change_summary: 'Added Figma prototype delivery options' },
      token: adminToken
    });
    assert.strictEqual(verRes.data.template.version, 2);
    assert(verRes.data.template.version_history.length >= 2);
  });

  // 11. Fee Rules Configuration
  await test('GET /api/pricing/fee-rules returns tier commission structure', async () => {
    const res = await j('/api/pricing/fee-rules');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.standard_worker_commission_pct, 10.0);
    assert(res.data.tier_discounts);
    assert.strictEqual(res.data.tier_discounts.vip, 5.0);
  });

  // 12. Draft Deletion API
  await test('DELETE /api/tasks/drafts/current clears server draft', async () => {
    const delRes = await j('/api/tasks/drafts/current', { method: 'DELETE', token: clientToken });
    assert.strictEqual(delRes.status, 200);
    const getRes = await j('/api/tasks/drafts/current', { token: clientToken });
    assert.strictEqual(getRes.status, 200);
    assert.strictEqual(getRes.data.draft, null);
  });

  // 13. Hardened File Upload Security
  await test('POST /api/tasks/upload enforces security restrictions and generates safe token', async () => {
    const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
    const bodyContent = [
      `--${boundary}`,
      'Content-Disposition: form-data; name="access_level"',
      '',
      'public_view',
      `--${boundary}`,
      'Content-Disposition: form-data; name="file"; filename="sample_brief.pdf"',
      'Content-Type: application/pdf',
      '',
      '%PDF-1.4 Mock PDF file content for task verification',
      `--${boundary}--`
    ].join('\r\n');

    const res = await fetch(BASE + '/api/tasks/upload', {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        Authorization: `Bearer ${clientToken}`
      },
      body: bodyContent
    });
    const data = await res.json();
    assert.strictEqual(res.status, 201);
    assert(data.success);
    assert(data.file.token);
    assert(data.file.url.startsWith('/uploads/tasks/'));
    assert.strictEqual(data.file.access_level, 'public_view');

    // Test rejection of unsafe file extension (.exe)
    const badContent = [
      `--${boundary}`,
      'Content-Disposition: form-data; name="file"; filename="malicious_payload.exe"',
      'Content-Type: application/octet-stream',
      '',
      'Binary executable payload',
      `--${boundary}--`
    ].join('\r\n');

    const badRes = await fetch(BASE + '/api/tasks/upload', {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        Authorization: `Bearer ${clientToken}`
      },
      body: badContent
    });
    assert.strictEqual(badRes.status, 400);
  });

  console.log('\n================================================================');
  console.log(`  VERIFICATION RESULTS: ${passedCount} passed, ${totalCount - passedCount} failed  (${totalCount} total)`);
  console.log('================================================================\n');

  if (passedCount !== totalCount) {
    process.exit(1);
  }
})();
