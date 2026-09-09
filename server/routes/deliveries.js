const path = require('path');
const fs = require('fs');
const express = require('express');
const multer = require('multer');
const store = require('../store');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'public', 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).slice(0, 10) || '';
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
    }
  }),
  limits: { fileSize: 10 * 1024 * 1024 } // 10 MB
});

// who may see/participate in a task's workspace: owner, hired worker, or admin
async function requireParticipant(req, res, next) {
  try {
    const task = await store.getTask(req.params.taskId || req.body.taskId || req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    const isOwner = Number(task.clientId) === Number(req.user.id);
    const isHired = Number(task.acceptedFreelancerId) === Number(req.user.id);
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isHired && !isAdmin) {
      return res.status(403).json({ error: 'Only the client and the hired worker can access this workspace' });
    }
    req.task = task;
    next();
  } catch (err) { next(err); }
}

// POST /api/deliveries - hired worker submits work (multipart: task + note + file/link)
router.post('/', authRequired, upload.single('file'), async (req, res, next) => {
  try {
    const taskId = Number(req.body.taskId);
    const task = await store.getTask(taskId);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    if (Number(task.acceptedFreelancerId) !== Number(req.user.id)) {
      return res.status(403).json({ error: 'Only the hired worker can submit a delivery' });
    }
    if (!['in_progress', 'delivered'].includes(task.status)) {
      return res.status(400).json({ error: 'This task is not open for delivery' });
    }
    const note = req.body.note || null;
    const link = req.body.link || null;
    if (!note && !link && !req.file) {
      return res.status(400).json({ error: 'Add a note, a link or a file' });
    }
    const filePath = req.file ? `/uploads/${req.file.filename}` : null;
    const fileName = req.file ? req.file.originalname : null;
    const delivery = await store.createDelivery({ taskId, workerId: req.user.id, note, filePath, fileName, link });

    // Notify task owner (client) that work is submitted
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
          icon: '📤',
          title: 'Work Delivered for Review',
          message: `${req.user.name || 'Freelancer'} submitted deliverables for task "${task.title}". Please review and approve.`,
          link: `/task?id=${task.id}`,
          actionLabel: 'Review Deliverable'
        });
      }
    } catch (e) {
      console.warn('Could not dispatch delivery notification:', e);
    }

    res.status(201).json({ delivery });
  } catch (err) { next(err); }
});

// POST /api/deliveries/:id/approve - client approves → escrow released (§37-38)
router.post('/:id/approve', authRequired, async (req, res, next) => {
  try {
    const delivery = await store.getDeliveryById(req.params.id);
    if (!delivery) return res.status(404).json({ error: 'Delivery not found' });
    const task = await store.getTask(delivery.task_id);
    if (task.clientId !== req.user.id) return res.status(403).json({ error: 'Only the task owner can approve' });
    if (delivery.status !== 'submitted') return res.status(400).json({ error: `This delivery was already ${delivery.status}` });
    const result = await store.approveDelivery(delivery.id);

    // Gamification & Referral Hooks
    try {
      await store.awardUserXP(delivery.worker_id, 100, 50, `Completed task "${task.title}"`);
      await store.awardUserXP(req.user.id, 50, 25, `Approved delivery for "${task.title}"`);
      await store.checkAndQualifyReferral(delivery.worker_id, task.budget, task.id);
      await store.checkAndQualifyReferral(req.user.id, task.budget, task.id);
    } catch (e) {
      console.warn('Could not run gamification/referral hook:', e.message);
    }

    // Notify freelancer that escrow payment is released to wallet
    try {
      const notifService = require('../notificationService');
      const workerUser = await store.getUserById(delivery.worker_id);
      if (workerUser) {
        notifService.dispatchNotification({
          userId: workerUser.id,
          userEmail: workerUser.email,
          userPhone: workerUser.phone,
          userName: workerUser.name,
          type: 'payment',
          icon: '💰',
          title: 'Payment Credited to Wallet!',
          message: `৳${result.payout || Math.round(task.budget * 0.9)} has been credited to your wallet for completing "${task.title}".`,
          link: '/wallet',
          actionLabel: 'Check Wallet Balance'
        });
      }
    } catch (e) {
      console.warn('Could not dispatch payment release notification:', e);
    }

    res.json({ ok: true, payout: result.payout, balance: result.balance, task: result.task });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

// POST /api/deliveries/:id/reject - client sends it back for rework
router.post('/:id/reject', authRequired, async (req, res, next) => {
  try {
    const delivery = await store.getDeliveryById(req.params.id);
    if (!delivery) return res.status(404).json({ error: 'Delivery not found' });
    const task = await store.getTask(delivery.task_id);
    if (task.clientId !== req.user.id) return res.status(403).json({ error: 'Only the task owner can reject' });
    if (delivery.status !== 'submitted') return res.status(400).json({ error: `This delivery was already ${delivery.status}` });
    await store.setDeliveryStatus(delivery.id, 'rejected');
    await store.setTaskStatus(task.id, 'in_progress'); // worker can resubmit

    // Notify worker of rework request
    try {
      const notifService = require('../notificationService');
      const workerUser = await store.getUserById(delivery.worker_id);
      if (workerUser) {
        notifService.dispatchNotification({
          userId: workerUser.id,
          userEmail: workerUser.email,
          userPhone: workerUser.phone,
          userName: workerUser.name,
          type: 'task',
          icon: '⚠️',
          title: 'Rework Requested',
          message: `Client requested revisions on task "${task.title}". Please check notes and resubmit.`,
          link: `/task?id=${task.id}`,
          actionLabel: 'Open Task'
        });
      }
    } catch (e) {
      console.warn('Could not dispatch rework notification:', e);
    }

    res.json({ ok: true, task: await store.getTask(task.id) });
  } catch (err) { next(err); }
});

module.exports = router;
module.exports.requireParticipant = requireParticipant;
