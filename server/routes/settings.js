const express = require('express');
const store = require('../store');

const router = express.Router();

// GET /api/settings - public dynamic homepage configuration
router.get('/', async (req, res, next) => {
  try {
    const settings = await store.getSiteSettings();
    res.json({ settings });
  } catch (err) { next(err); }
});

module.exports = router;
