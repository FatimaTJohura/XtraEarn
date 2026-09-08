const express = require('express');
const store = require('../store');
const { authRequired } = require('../middleware/auth');
const { requireParticipant } = require('./deliveries');

const router = express.Router({ mergeParams: true });

// GET /api/tasks/:taskId/messages - chat history (participants only)
router.get('/', authRequired, requireParticipant, async (req, res, next) => {
  try { res.json({ items: await store.listMessages(req.task.id) }); }
  catch (err) { next(err); }
});

// POST /api/tasks/:taskId/messages { body }
router.post('/', authRequired, requireParticipant, async (req, res, next) => {
  try {
    const body = (req.body && req.body.body || '').trim();
    if (!body) return res.status(400).json({ error: 'Message cannot be empty' });
    const message = await store.addMessage(req.task.id, req.user.id, body.slice(0, 2000));
    res.status(201).json({ message });
  } catch (err) { next(err); }
});

module.exports = router;
