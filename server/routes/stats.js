const express = require('express');
const store = require('../store');
const router = express.Router();

router.get('/', async (req, res, next) => {
  try { res.json(await store.platformStats()); }
  catch (err) { next(err); }
});

module.exports = router;
