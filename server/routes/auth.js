const express = require('express');
const bcrypt = require('bcryptjs');
const store = require('../store');
const { signToken, authRequired } = require('../middleware/auth');

const router = express.Router();

router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password, role, referralCode, ref, username } = req.body || {};
    if (!name || !String(name).trim()) return res.status(400).json({ error: 'Name is required' });
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'A valid email is required' });
    if (!password || String(password).length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
    const safeRole = ['freelancer', 'client'].includes(role) ? role : 'freelancer';

    const existing = await store.findUserByEmail(email);
    if (existing) return res.status(409).json({ error: 'An account with this email already exists' });

    if (username) {
      const uCheck = await store.checkUsernameAvailability(username);
      if (!uCheck.available) return res.status(uCheck.status || 409).json({ error: uCheck.error });
    }

    const passwordHash = await bcrypt.hash(String(password), 10);
    const user = await store.createUser({ name: String(name).trim(), email, passwordHash, role: safeRole, username });

    // Handle referral registration if code provided
    const appliedRefCode = referralCode || ref;
    if (appliedRefCode) {
      try {
        await store.recordReferralRegistration(appliedRefCode, user.id);
      } catch (e) {
        console.warn('Could not record referral registration:', e.message);
      }
    }

    res.status(201).json({ token: signToken(user), user, require_onboarding: true });
  } catch (err) { next(err); }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, username, password } = req.body || {};
    const identifier = (email || username || '').trim();
    if (!identifier || !password) return res.status(400).json({ error: 'Email or username and password are required' });
    const user = await store.findUserByEmailOrUsername(identifier);
    if (!user) {
      return res.status(401).json({ error: 'Incorrect email or password' });
    }
    const isMatch = user.password_hash ? await bcrypt.compare(String(password), user.password_hash).catch(() => false) : false;
    if (!isMatch) {
      return res.status(401).json({ error: 'Incorrect email or password' });
    }
    res.json({ token: signToken(user), user: store.publicUser(user) });
  } catch (err) { next(err); }
});

router.get('/me', authRequired, async (req, res, next) => {
  try {
    const user = await store.getUserById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (err) { next(err); }
});

// POST /api/auth/change-password - authenticated password change
router.post('/change-password', authRequired, async (req, res, next) => {
  try {
    const { current_password, new_password, confirm_password } = req.body || {};
    if (!current_password) return res.status(400).json({ error: 'Current password is required.' });
    if (!new_password || String(new_password).length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters long.' });
    }
    if (confirm_password !== undefined && new_password !== confirm_password) {
      return res.status(400).json({ error: 'New password and confirmation do not match.' });
    }
    if (current_password === new_password) {
      return res.status(400).json({ error: 'New password must be different from current password.' });
    }

    await store.changeUserPassword(req.user.id, current_password, new_password);
    res.json({ success: true, message: 'Password updated successfully! 🔐' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/auth/forgot-password/request-code - Request password reset OTP
router.post('/forgot-password/request-code', async (req, res, next) => {
  try {
    const { email, identifier, username } = req.body || {};
    const target = (email || identifier || username || '').trim();
    if (!target) return res.status(400).json({ error: 'Please enter your registered email or username.' });
    
    const result = await store.requestPasswordResetOtp(target);
    const notifService = require('../notificationService');
    const smsCfg = notifService ? notifService.getSmsConfig() : null;
    const showDemo = Boolean(smsCfg && smsCfg.show_demo_otp);
    const clientResponse = { ...result };
    if (!showDemo) {
      delete clientResponse.otp;
    }
    res.json(clientResponse);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/auth/forgot-password/reset - Verify OTP and set new password
router.post('/forgot-password/reset', async (req, res, next) => {
  try {
    const { email, identifier, username, otp, code, new_password, newPassword, confirm_password, confirmPassword } = req.body || {};
    const target = (email || identifier || username || '').trim();
    const tokenOtp = (otp || code || '').trim();
    const nextPassword = (new_password || newPassword || '');
    const confirm = (confirm_password !== undefined ? confirm_password : confirmPassword);

    if (!target) return res.status(400).json({ error: 'Email or username is required.' });
    if (!tokenOtp) return res.status(400).json({ error: '6-digit verification code is required.' });
    if (!nextPassword || String(nextPassword).length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters long.' });
    }
    if (confirm !== undefined && nextPassword !== confirm) {
      return res.status(400).json({ error: 'New password and confirmation do not match.' });
    }

    const result = await store.verifyAndResetPassword(target, tokenOtp, nextPassword);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;

