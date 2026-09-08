const express = require('express');
const store = require('../store');
const router = express.Router();

router.get('/', async (req, res, next) => {
  try { res.json({ items: await store.listCategories() }); }
  catch (err) { next(err); }
});

module.exports = router;
