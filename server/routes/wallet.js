const express = require('express');
const store = require('../store');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

// GET /api/wallet - balance + transaction ledger
router.get('/', authRequired, async (req, res, next) => {
  try { res.json(await store.getWallet(req.user.id)); }
  catch (err) { next(err); }
});

// POST /api/wallet/deposit { amount, method } - simulated bKash/Nagad/Card top-up
router.post('/deposit', authRequired, async (req, res, next) => {
  try {
    const amount = Number(req.body && req.body.amount);
    const method = ['bkash', 'nagad', 'bank', 'card'].includes(req.body.method) ? req.body.method : 'bkash';
    if (!amount || amount < 20) return res.status(400).json({ error: 'Minimum deposit is ৳20' });
    if (amount > 100000) return res.status(400).json({ error: 'Maximum deposit is ৳100,000' });
    const result = await store.deposit(req.user.id, amount, method);

    // Notify user of successful deposit
    try {
      const notifService = require('../notificationService');
      const user = await store.getUserById(req.user.id);
      if (user) {
        notifService.dispatchNotification({
          userId: user.id,
          userEmail: user.email,
          userPhone: user.phone,
          userName: user.name,
          type: 'payment',
          icon: '⬇️',
          title: 'Wallet Deposit Credited',
          message: `৳${amount.toLocaleString()} deposited via ${method.toUpperCase()}. New balance: ৳${result.balance?.toLocaleString() || amount}.`,
          link: '/wallet',
          actionLabel: 'View Wallet'
        });
      }
    } catch (e) {
      console.warn('Could not dispatch deposit notification:', e);
    }

    res.json({ ok: true, ...result });
  } catch (err) { next(err); }
});

// POST /api/wallet/withdraw { amount, method, account } - payout request (§36)
router.post('/withdraw', authRequired, async (req, res, next) => {
  try {
    const amount = Number(req.body && req.body.amount);
    const method = ['bkash', 'nagad', 'bank'].includes(req.body.method) ? req.body.method : null;
    const account = (req.body.account || req.body.account_number || '').trim();
    if (!method) return res.status(400).json({ error: 'Choose bKash, Nagad or Bank' });
    if (!account || account.length < 5) return res.status(400).json({ error: 'Enter a valid account number' });
    if (!amount || amount < 100) return res.status(400).json({ error: 'Minimum withdrawal is ৳100' });
    const result = await store.requestWithdrawal(req.user.id, amount, method, account);

    // Notify user of withdrawal request
    try {
      const notifService = require('../notificationService');
      const user = await store.getUserById(req.user.id);
      if (user) {
        notifService.dispatchNotification({
          userId: user.id,
          userEmail: user.email,
          userPhone: user.phone,
          userName: user.name,
          type: 'payment',
          icon: '⬆️',
          title: 'Withdrawal Requested',
          message: `৳${amount.toLocaleString()} withdrawal submitted via ${method.toUpperCase()} (${account}). Disbursing within 2-4 hours.`,
          link: '/wallet',
          actionLabel: 'View Wallet'
        });
      }
    } catch (e) {
      console.warn('Could not dispatch withdrawal notification:', e);
    }

    res.json({ ok: true, ...result });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

// POST /api/wallet/transfer - P2P Instant Transfer between XtraEarn users
router.post('/transfer', authRequired, async (req, res, next) => {
  try {
    const { recipient, amount, note } = req.body || {};
    if (!recipient) return res.status(400).json({ error: 'Recipient email or phone number is required' });
    if (!amount || Number(amount) < 10) return res.status(400).json({ error: 'Minimum transfer amount is ৳10' });

    const result = await store.transferWalletFunds(req.user.id, { recipient, amount, note });
    res.json(result);
  } catch (err) { next(err); }
});

// GET /api/wallet/payout-methods - Get saved payout accounts
router.get('/payout-methods', authRequired, async (req, res, next) => {
  try {
    const user = await store.getUserById(req.user.id);
    res.json(user?.payout_accounts || {});
  } catch (err) { next(err); }
});

// POST /api/wallet/payout-methods - Save/update payout accounts
router.post('/payout-methods', authRequired, async (req, res, next) => {
  try {
    const accounts = await store.saveUserPayoutMethod(req.user.id, req.body);
    res.json({ success: true, payout_accounts: accounts });
  } catch (err) { next(err); }
});

module.exports = router;
