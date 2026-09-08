const express = require('express');
const store = require('../store');
const { authOptional } = require('../middleware/auth');
const router = express.Router();

// GET /api/experts (List experts with domain, q, limit, sortBy)
router.get('/', async (req, res, next) => {
  try {
    const items = await store.listExperts(req.query);
    res.json({ items, total: items.length });
  } catch (err) { next(err); }
});

// GET /api/experts/domains (List dynamic expert domains with counts and metadata)
router.get('/domains', async (req, res, next) => {
  try {
    const domains = await store.getExpertDomains();
    res.json({ items: domains, total: domains.length });
  } catch (err) { next(err); }
});

// GET /api/experts/:id (Get single expert public details & packages)
router.get('/:id', async (req, res, next) => {
  try {
    const expert = await store.getExpertPublicDetail(req.params.id);
    if (!expert) return res.status(404).json({ error: 'Expert not found' });
    res.json(expert);
  } catch (err) { next(err); }
});

// POST /api/experts/:id/book (Book 1-on-1 consultation session)
router.post('/:id/book', authOptional, async (req, res, next) => {
  try {
    const user = req.user || null;
    const booking = await store.bookExpertConsultation(req.params.id, user, req.body);
    res.status(201).json({ success: true, booking });
  } catch (err) { next(err); }
});

// POST /api/experts/apply (Apply to become a verified expert specialist / doctor)
router.post('/apply', authOptional, async (req, res, next) => {
  try {
    const user = req.user || null;
    const application = await store.applyAsExpert(req.body, user);
    res.status(201).json({ success: true, application });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/experts/applications (List specialist applications)
router.get('/applications', async (req, res, next) => {
  try {
    const items = await store.listExpertApplications(req.query);
    res.json({ items, total: items.length });
  } catch (err) { next(err); }
});

module.exports = router;
