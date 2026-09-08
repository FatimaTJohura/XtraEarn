const express = require('express');
const store = require('../store');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

// GET /api/campaigns/active - List active public marketing campaigns & promo deals
router.get('/active', async (req, res, next) => {
  try {
    const items = await store.getActiveCampaigns();
    res.json({ items, total: items.length });
  } catch (err) { next(err); }
});

// POST /api/campaigns/:id/track - Track campaign click or impression
router.post('/:id/track', async (req, res, next) => {
  try {
    const result = await store.trackCampaignClick(req.params.id);
    res.json(result);
  } catch (err) { next(err); }
});

// POST /api/campaigns/claim-offer - Authenticated claim of promotional voucher or flash XP
router.post('/claim-offer', authRequired, async (req, res, next) => {
  try {
    const { campaignId } = req.body || {};
    const result = await store.claimCampaignOffer(req.user.id, campaignId);
    res.json(result);
  } catch (err) { next(err); }
});

module.exports = router;
