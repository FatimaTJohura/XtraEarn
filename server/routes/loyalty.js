const express = require('express');
const store = require('../store');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

// GET /api/loyalty/me - Get current user's loyalty profile, XP, tier perks, streak, points
router.get('/me', authRequired, async (req, res, next) => {
  try {
    const profile = await store.getUserLoyaltyProfile(req.user.id);
    res.json(profile);
  } catch (err) { next(err); }
});

// POST /api/loyalty/daily-checkin - Daily check-in streak claim
router.post('/daily-checkin', authRequired, async (req, res, next) => {
  try {
    const result = await store.performDailyCheckin(req.user.id);
    res.json(result);
  } catch (err) { next(err); }
});

// GET /api/loyalty/rewards - List active rewards in the exchange shop
router.get('/rewards', async (req, res, next) => {
  try {
    const items = await store.listAvailableLoyaltyRewards();
    res.json({ items, total: items.length });
  } catch (err) { next(err); }
});

// POST /api/loyalty/redeem - Redeem points for reward item
router.post('/redeem', authRequired, async (req, res, next) => {
  try {
    const { rewardId } = req.body || {};
    const result = await store.redeemLoyaltyReward(req.user.id, rewardId);
    res.json(result);
  } catch (err) { next(err); }
});

// GET /api/loyalty/leaderboard - Top XP earners leaderboard
router.get('/leaderboard', async (req, res, next) => {
  try {
    const period = req.query.period || 'all';
    const limit = Number(req.query.limit) || 10;
    const items = await store.getLoyaltyLeaderboard(period, limit);
    res.json({ items, total: items.length });
  } catch (err) { next(err); }
});

module.exports = router;
