const express = require('express');
const router = express.Router();
const { authRequired } = require('../middleware/auth');
const notificationService = require('../notificationService');

// GET /api/notifications - List current user's notification feed
router.get('/', authRequired, (req, res) => {
  const data = notificationService.getUserNotifications(req.user.id);
  res.json(data);
});

// POST /api/notifications/:id/read - Mark single notification as read
router.post('/:id/read', authRequired, (req, res) => {
  const result = notificationService.markAsRead(req.params.id, req.user.id);
  res.json(result);
});

// POST /api/notifications/read-all - Mark all user notifications as read
router.post('/read-all', authRequired, (req, res) => {
  const result = notificationService.markAllAsRead(req.user.id);
  res.json(result);
});

// POST /api/notifications/test - Trigger a test notification for debugging
router.post('/test', authRequired, async (req, res) => {
  const { title = 'Test Alert', message = 'This is a test notification from XtraEarn engine.', type = 'system' } = req.body || {};
  const result = await notificationService.dispatchNotification({
    userId: req.user.id,
    userEmail: req.user.email,
    userPhone: req.user.phone,
    userName: req.user.name,
    type,
    icon: type === 'payment' ? '💰' : type === 'kyc' ? '🛡️' : '🔔',
    title,
    message,
    link: '/wallet'
  });
  res.json(result);
});

module.exports = router;
