const express = require('express');
const store = require('../store');
const router = express.Router();

router.get('/', async (req, res, next) => {
  try { res.json({ items: await store.listTopEarners(Number(req.query.limit) || 5) }); }
  catch (err) { next(err); }
});

module.exports = router;
