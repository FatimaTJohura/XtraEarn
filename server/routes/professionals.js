const express = require('express');
const store = require('../store');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

// GET /api/professionals/featured - List spotlight professionals with category filters & booking packages
router.get('/featured', async (req, res, next) => {
  try {
    const items = await store.getFeaturedProfessionalsList(req.query);
    res.json({ items, total: items.length });
  } catch (err) { next(err); }
});

// GET /api/professionals/spotlight-tiers - List available spotlight tiers
router.get('/spotlight-tiers', async (req, res, next) => {
  try {
    const tiers = await store.getSpotlightTiers();
    res.json({ items: tiers, total: tiers.length });
  } catch (err) { next(err); }
});

// POST /api/professionals/apply-spotlight - Freelancer application/purchase for profile spotlight
router.post('/apply-spotlight', authRequired, async (req, res, next) => {
  try {
    const result = await store.applyForProfessionalSpotlight(req.user.id, req.body || {});
    res.status(201).json(result);
  } catch (err) { next(err); }
});

module.exports = router;
