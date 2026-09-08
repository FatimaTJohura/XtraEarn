const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const express = require('express');
const multer = require('multer');
const store = require('../store');
const { authRequired, authOptional } = require('../middleware/auth');

const router = express.Router();

const TASK_UPLOADS_DIR = path.join(__dirname, '..', '..', 'public', 'uploads', 'tasks');
fs.mkdirSync(TASK_UPLOADS_DIR, { recursive: true });

const ALLOWED_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.webp', '.svg', '.gif',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.csv', '.txt',
  '.zip', '.mp4', '.mp3', '.wav'
]);

function sanitizeFilename(originalName) {
  const base = path.basename(originalName || 'file');
  const ext = path.extname(base).toLowerCase();
  const nameOnly = base.slice(0, base.length - ext.length)
    .replace(/[^a-zA-Z0-9_\-\.]/g, '_')
    .slice(0, 50);
  return `${nameOnly || 'attachment'}_${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}${ext}`;
}

const taskUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, TASK_UPLOADS_DIR),
    filename: (req, file, cb) => cb(null, sanitizeFilename(file.originalname))
  }),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      const err = new Error(`File extension '${ext}' is not permitted for security reasons.`);
      err.status = 400;
      return cb(err, false);
    }
    cb(null, true);
  }
});

// GET /api/tasks?q=&category=&subcategory=&quickJob=&urgency=&proLevel=&taskType=&type=&maxDuration=&minBudget=&maxBudget=&sort=...
router.get('/', authOptional, async (req, res, next) => {
  try {
    const { q, category, subcategory, quickJob, urgency, proLevel, maxDuration, minBudget, maxBudget, sort = 'budget_high', featured, status, district, area, clientId, client_id, mine } = req.query;
    const taskType = req.query.taskType || req.query.type; // accept both spellings
    const limit = Math.min(Number(req.query.limit) || 24, 200);
    const offset = Math.max(Number(req.query.offset) || 0, 0);
    const resolvedClientId = clientId || client_id || (mine && req.user ? req.user.id : (status === '' && req.user && req.query.clientId === undefined ? req.user.id : undefined));
    const result = await store.listTasks({ q, category, subcategory, quickJob, urgency, proLevel, taskType, maxDuration, minBudget, maxBudget, sort, featured, status, district, area, limit, offset, clientId: resolvedClientId });
    res.json(result);
  } catch (err) { next(err); }
});

// GET /api/tasks/featured - Get spotlighted/featured tasks
router.get('/featured', async (req, res, next) => {
  try {
    const limit = Number(req.query.limit) || 8;
    const items = await store.getFeaturedTasksList(limit);
    res.json({ items, total: items.length });
  } catch (err) { next(err); }
});

// GET /api/tasks/boost-plans - Get promotional boost plans
router.get('/boost-plans', async (req, res, next) => {
  try {
    const items = await store.getTaskBoostPlans();
    res.json({ items, total: items.length });
  } catch (err) { next(err); }
});

// GET /api/tasks/template-lookup - Category + Subcategory dynamic template lookup
router.get('/template-lookup', async (req, res, next) => {
  try {
    const { categoryId, subcategory, taskType } = req.query;
    const template = await store.getTemplateByCategoryAndSubcategory(categoryId, subcategory, taskType);
    res.json({ template });
  } catch (err) { next(err); }
});

// GET /api/tasks/pricing-config - Backwards-compatible pricing & escrow config
router.get('/pricing-config', async (req, res, next) => {
  try {
    res.json({
      feeRate: 0.10,
      clientFeePct: 0.0,
      currencies: [
        { code: 'BDT', symbol: '৳', rate: 1.0, min_budget: 20 },
        { code: 'USD', symbol: '$', rate: 120.0, min_budget: 1 },
        { code: 'EUR', symbol: '€', rate: 130.5, min_budget: 1 },
        { code: 'GBP', symbol: '£', rate: 152.0, min_budget: 1 }
      ]
    });
  } catch (err) { next(err); }
});

// Draft Persistence Endpoints
// GET /api/tasks/drafts/current - Fetch user's server draft
router.get('/drafts/current', authRequired, async (req, res, next) => {
  try {
    const draft = await store.getTaskDraft(req.user.id);
    res.json({ draft });
  } catch (err) { next(err); }
});

// POST /api/tasks/drafts - Save/sync user's draft to server
router.post('/drafts', authRequired, async (req, res, next) => {
  try {
    const draft = await store.saveTaskDraft(req.user.id, req.body || {});
    res.json({ success: true, draft });
  } catch (err) { next(err); }
});

// DELETE /api/tasks/drafts/current - Delete current draft
router.delete('/drafts/current', authRequired, async (req, res, next) => {
  try {
    const result = await store.deleteTaskDraft(req.user.id);
    res.json(result);
  } catch (err) { next(err); }
});

// POST /api/tasks/ai-assist - Non-authoritative AI Scoping Assistant
router.post('/ai-assist', async (req, res, next) => {
  try {
    const { title = '', description = '', categoryId = null, subcategory = null } = req.body || {};
    const suggestions = await store.aiAssistTaskScoping({ title, description, categoryId, subcategory });
    res.json({ success: true, suggestions });
  } catch (err) { next(err); }
});

// POST /api/tasks/quality-check - Pre-publication Task Quality Inspector
router.post('/quality-check', async (req, res, next) => {
  try {
    const analysis = await store.checkTaskQuality(req.body || {});
    res.json({ success: true, analysis });
  } catch (err) { next(err); }
});

// POST /api/tasks/:id/boost - Task creator promotes their task
router.post('/:id/boost', authRequired, async (req, res, next) => {
  try {
    const planKey = (req.body && req.body.plan) || 'category_spotlight';
    const result = await store.boostTask(req.params.id, req.user.id, planKey);
    res.json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message, needed: err.needed, balance: err.balance });
    next(err);
  }
});

// POST /api/tasks/upload - Hardened file upload for task attachments & deliverables
router.post('/upload', authOptional, (req, res, next) => {
  taskUpload.single('file')(req, res, err => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File exceeds 25 MB limit' });
      }
      return res.status(err.status || 400).json({ error: err.message || 'File upload failed' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const accessLevel = ['public_view', 'proposal_only', 'post_hire_private'].includes(req.body.access_level)
      ? req.body.access_level
      : 'public_view';

    const fileMeta = {
      token: crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex'),
      original_name: req.file.originalname,
      filename: req.file.filename,
      url: `/uploads/tasks/${req.file.filename}`,
      size: req.file.size,
      mimetype: req.file.mimetype,
      access_level: accessLevel,
      uploaded_at: new Date().toISOString()
    };

    res.status(201).json({ success: true, file: fileMeta });
  });
});

// POST /api/tasks/:id/transition - Finite State Machine lifecycle transition
router.post('/:id/transition', authRequired, async (req, res, next) => {
  try {
    const { targetStatus, note } = req.body || {};
    if (!targetStatus) return res.status(400).json({ error: 'Target status is required' });

    const task = await store.getTask(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const isClient = task.clientId === req.user.id;
    const isWorker = task.acceptedFreelancerId === req.user.id;
    const isAdmin = req.user.role === 'admin';

    let hasWorkerApp = false;
    if (!isClient && !isWorker && !isAdmin) {
      const applications = await store.applicationsForTask(task.id);
      hasWorkerApp = (applications || []).some(a => a.freelancer_id === req.user.id || a.freelancerId === req.user.id);
    }

    if (!isClient && !isWorker && !isAdmin && !hasWorkerApp) {
      return res.status(403).json({ error: 'Unauthorized to transition this task state' });
    }

    const actorRole = isAdmin ? 'admin' : (isClient ? 'client' : 'worker');
    const updatedTask = await store.transitionTaskStatus(task.id, targetStatus, req.user.id, actorRole, note);
    res.json({ success: true, task: updatedTask });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

// GET /api/tasks/:id
router.get('/:id', authOptional, async (req, res, next) => {
  try {
    const task = await store.getTask(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    const applications = await store.applicationsForTask(task.id);
    const applied = req.user ? await store.hasApplied(task.id, req.user.id) : false;
    const accepted = applications.find(a => a.status === 'accepted') || null;
    const [deliveries, review, messages] = await Promise.all([
      store.listDeliveries(task.id),
      store.getReviewForTask(task.id),
      store.listMessages(task.id)
    ]);
    res.json({
      task, applications, applied: !!applied, applicationCount: applications.length,
      acceptedFreelancer: accepted ? accepted.user : null,
      deliveries, review, messages
    });
  } catch (err) { next(err); }
});

// POST /api/tasks - any logged-in user can post (online OR physical)
router.post('/', authRequired, async (req, res, next) => {
  try {
    const {
      title, description, categoryId, subcategory, budget, durationMinutes, emoji, tags, deliveryHours,
      taskType, locationText, area, district, isUrgent, proLevel,
      templateId, templateVersion, templateSchemaSnapshot, dynamicData,
      skills, workerCriteria, files, schedule, workMode, communicationPref,
      budgetType, currency, escrowBreakdown, exactLocationPrivacy, mapCoordinates, initialStatus
    } = req.body || {};

    if (!title || !String(title).trim()) return res.status(400).json({ error: 'Task title is required' });
    if (!description || String(description).trim().length < 20) return res.status(400).json({ error: 'Description must be at least 20 characters' });
    if (!categoryId) return res.status(400).json({ error: 'Please choose a category' });
    if (!budget || Number(budget) < 20) return res.status(400).json({ error: 'Budget must be at least ৳20' });
    if (!durationMinutes || Number(durationMinutes) < 5) return res.status(400).json({ error: 'Duration must be at least 5 minutes' });

    const type = ['online', 'physical', 'hybrid'].includes(taskType) ? taskType : 'online';
    if (type === 'physical' && (!locationText || !String(locationText).trim())) {
      return res.status(400).json({ error: 'Physical tasks need a meeting location' });
    }

    const tagList = Array.isArray(tags)
      ? tags
      : String(tags || '').split(',').map(t => t.trim()).filter(Boolean).slice(0, 8);

    const task = await store.createTask({
      title: String(title).trim(),
      description: String(description).trim(),
      categoryId: Number(categoryId),
      subcategory: subcategory ? String(subcategory).trim() : null,
      clientId: req.user.id,
      budget: Number(budget),
      durationMinutes: Number(durationMinutes),
      emoji: emoji || '✅',
      tags: tagList,
      deliveryHours: Number(deliveryHours) || 24,
      taskType: type,
      locationText: type === 'physical' ? String(locationText).trim() : null,
      area: area ? String(area).trim() : null,
      district: district ? String(district).trim() : null,
      isUrgent: !!isUrgent,
      proLevel: proLevel || 'beginner',
      // Dynamic Engine Fields
      templateId: templateId ? Number(templateId) : null,
      templateVersion: templateVersion ? Number(templateVersion) : 1,
      templateSchemaSnapshot: templateSchemaSnapshot || null,
      dynamicData: dynamicData && typeof dynamicData === 'object' ? dynamicData : {},
      skills: Array.isArray(skills) ? skills : tagList,
      workerCriteria: workerCriteria || null,
      files: Array.isArray(files) ? files : [],
      schedule: schedule || null,
      workMode: workMode || 'remote',
      communicationPref: communicationPref || 'xtraearn_chat',
      budgetType: budgetType || 'fixed',
      currency: currency || 'BDT',
      escrowBreakdown: escrowBreakdown || null,
      exactLocationPrivacy: exactLocationPrivacy || 'hired_only',
      mapCoordinates: mapCoordinates || null,
      initialStatus: initialStatus || 'open'
    });

    // Clear saved server draft upon successful publish
    try {
      await store.deleteTaskDraft(req.user.id);
    } catch (e) {
      console.warn('Could not auto-clear server draft:', e);
    }

    res.status(201).json({ task });
  } catch (err) { next(err); }
});

// DELETE /api/tasks/:id - task owner removes their open task
router.delete('/:id', authRequired, async (req, res, next) => {
  try {
    const task = await store.getTask(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    if (task.clientId !== req.user.id) return res.status(403).json({ error: 'You can only delete your own tasks' });
    if (task.status !== 'open' && task.status !== 'published' && task.status !== 'applications_open') {
      return res.status(400).json({ error: 'Only open tasks can be deleted' });
    }
    await store.deleteTask(task.id);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// POST /api/tasks/:id/apply - freelancers apply to a task
router.post('/:id/apply', authRequired, async (req, res, next) => {
  try {
    const task = await store.getTask(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    if (task.status !== 'open' && task.status !== 'published' && task.status !== 'applications_open') {
      return res.status(400).json({ error: 'This task is no longer open' });
    }
    if (task.clientId === req.user.id) {
      return res.status(400).json({ error: 'You cannot apply to your own task' });
    }
    const message = (req.body && req.body.message) || null;
    const application = await store.applyToTask(task.id, req.user.id, message);

    // Notify task owner (client)
    try {
      const notifService = require('../notificationService');
      const clientUser = await store.getUserById(task.clientId);
      if (clientUser) {
        notifService.dispatchNotification({
          userId: clientUser.id,
          userEmail: clientUser.email,
          userPhone: clientUser.phone,
          userName: clientUser.name,
          type: 'task',
          icon: '👤',
          title: 'New Proposal Received',
          message: `${req.user.name || 'A freelancer'} submitted a proposal on your task "${task.title}".`,
          link: `/task?id=${task.id}`,
          actionLabel: 'Review Proposals'
        });
      }
    } catch (e) {
      console.warn('Could not dispatch new proposal notification:', e);
    }

    res.status(201).json({ application });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

// DELETE /api/tasks/:id/apply - withdraw application
router.delete('/:id/apply', authRequired, async (req, res, next) => {
  try {
    const removed = await store.withdrawApplication(req.params.id, req.user.id);
    if (!removed) return res.status(404).json({ error: 'No application found for this task' });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// POST /api/tasks/:id/review - client reviews the worker after completion (§35)
router.post('/:id/review', authRequired, async (req, res, next) => {
  try {
    const task = await store.getTask(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    if (task.clientId !== req.user.id) return res.status(403).json({ error: 'Only the task owner can review' });
    if (task.status !== 'completed') return res.status(400).json({ error: 'You can review after the task is completed' });
    if (!task.acceptedFreelancerId) return res.status(400).json({ error: 'No worker to review' });
    const rating = Number(req.body && req.body.rating);
    if (!rating || rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating must be 1-5' });
    const comment = (req.body && req.body.comment) || null;
    const result = await store.addReview({ taskId: task.id, reviewerId: req.user.id, revieweeId: task.acceptedFreelancerId, rating, comment });
    res.status(201).json({ ok: true, ...result });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

module.exports = router;
