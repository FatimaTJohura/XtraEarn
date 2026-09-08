const express = require('express');
const store = require('../store');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

// POST /api/applications/:id/accept | /reject - task owner reviews an application
// Accept also moves the budget into platform escrow (§37): client wallet -> held
async function decide(req, res, next, decision) {
  try {
    const application = await store.getApplicationById(req.params.id);
    if (!application) return res.status(404).json({ error: 'Application not found' });
    const task = await store.getTask(application.task_id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    if (task.clientId !== req.user.id) {
      return res.status(403).json({ error: 'Only the task owner can review applications' });
    }
    if (application.status !== 'pending') {
      return res.status(400).json({ error: `This application was already ${application.status}` });
    }
    if (decision === 'accepted') {
      // escrow first: the client must be able to fund the task
      let escrow;
      try {
        const workerId = application.freelancer_id || application.user_id;
        const idempotencyKey = req.headers['idempotency-key'] || req.body?.idempotency_key;
        escrow = await store.holdEscrow(task, req.user.id, {
          workerId,
          idempotency_key: idempotencyKey,
          campaign_code: req.body?.campaign_code || task.campaign_code
        });
      } catch (err) {
        if (err.status === 402) return res.status(402).json({ error: err.error || err.message, needed: err.needed, balance: err.balance });
        throw err;
      }
      await store.setTaskStatus(task.id, 'in_progress', application.freelancer_id || application.user_id);
      await store.rejectOtherApplications(task.id, application.id);
      await store.setApplicationStatus(application.id, 'accepted');
      const updated = await store.getTask(task.id);

      // Trigger automatic Notification & Email Alert to worker
      try {
        const notifService = require('../notificationService');
        const workerUser = await store.getUserById(application.freelancer_id || application.user_id);
        if (workerUser) {
          notifService.dispatchNotification({
            userId: workerUser.id,
            userEmail: workerUser.email,
            userPhone: workerUser.phone,
            userName: workerUser.name,
            type: 'task',
            icon: '🎉',
            title: 'Proposal Accepted!',
            message: `${req.user.name || 'Client'} accepted your proposal on "${task.title}". ৳${task.budget} is safely secured in escrow.`,
            link: `/task?id=${task.id}`,
            actionLabel: 'Open Task'
          });
        }
      } catch (err) {
        console.warn('Could not dispatch proposal accepted notification:', err);
      }

      return res.json({ ok: true, status: 'accepted', escrow, task: updated });
    }
    await store.setApplicationStatus(application.id, decision);
    res.json({ ok: true, status: decision });
  } catch (err) { next(err); }
}

router.post('/:id/accept', authRequired, (req, res, next) => decide(req, res, next, 'accepted'));
router.post('/:id/reject', authRequired, (req, res, next) => decide(req, res, next, 'rejected'));

module.exports = router;
