const express = require('express');
const store = require('../store');

const router = express.Router();

// GET /api/cms/bootstrap - Full dynamic site hydration
router.get('/bootstrap', async (req, res, next) => {
  try {
    const data = await store.getPublicCmsBootstrap();
    res.json(data);
  } catch (err) { next(err); }
});

// GET /api/cms/homepage - Homepage layout & sections
router.get('/homepage', async (req, res, next) => {
  try {
    const data = await store.getPublicCmsBootstrap();
    res.json(data);
  } catch (err) { next(err); }
});

// GET /api/cms/theme - Global CSS tokens
router.get('/theme', async (req, res, next) => {
  try {
    const tokens = await store.adminGetCmsThemeTokens();
    res.json(tokens);
  } catch (err) { next(err); }
});

// GET /api/cms/page/:slug - Specific page schema
router.get('/page/:slug', async (req, res, next) => {
  try {
    const data = await store.getPublicCmsPageBySlug(req.params.slug);
    res.json(data);
  } catch (err) { next(err); }
});

module.exports = router;
