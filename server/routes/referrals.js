const express = require('express');
const store = require('../store');
const { authRequired, authOptional } = require('../middleware/auth');

const router = express.Router();

// GET /api/referrals/me - Get logged-in user's referral stats, code, link, invites
router.get('/me', authRequired, async (req, res, next) => {
  try {
    const profile = await store.getUserReferralProfile(req.user.id);
    res.json(profile);
  } catch (err) { next(err); }
});

// POST /api/referrals/custom-code - Update vanity referral code
router.post('/custom-code', authRequired, async (req, res, next) => {
  try {
    const { code } = req.body || {};
    const result = await store.updateUserReferralCode(req.user.id, code);
    res.json(result);
  } catch (err) { next(err); }
});

// POST /api/referrals/claim - Claim approved referral bonuses into wallet
router.post('/claim', authRequired, async (req, res, next) => {
  try {
    const result = await store.claimReferralBonus(req.user.id);
    res.json(result);
  } catch (err) { next(err); }
});

// GET /api/referrals/validate/:code - Public validation of a referral code for signup
router.get('/validate/:code', async (req, res, next) => {
  try {
    const result = await store.validateReferralCode(req.params.code);
    res.json(result);
  } catch (err) { next(err); }
});

module.exports = router;
