const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const express = require('express');
const multer = require('multer');
const store = require('../store');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

const KYC_UPLOADS_DIR = path.join(__dirname, '..', '..', 'public', 'uploads', 'kyc');
fs.mkdirSync(KYC_UPLOADS_DIR, { recursive: true });

const ALLOWED_KYC_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.pdf']);

function sanitizeFilename(originalName) {
  const base = path.basename(originalName || 'document');
  const ext = path.extname(base).toLowerCase();
  const nameOnly = base.slice(0, base.length - ext.length)
    .replace(/[^a-zA-Z0-9_\-\.]/g, '_')
    .slice(0, 40);
  return `${nameOnly || 'kyc'}_${Date.now().toString(36)}_${crypto.randomBytes(3).toString('hex')}${ext}`;
}

const kycUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, KYC_UPLOADS_DIR),
    filename: (req, file, cb) => cb(null, sanitizeFilename(file.originalname))
  }),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_KYC_EXTENSIONS.has(ext)) {
      const err = new Error(`File extension '${ext}' not supported for identity proof. Please upload JPG, PNG, WEBP, or PDF.`);
      err.status = 400;
      return cb(err, false);
    }
    cb(null, true);
  }
});

// GET /api/users/check-username?username=xyz&exclude_id=123
router.get('/check-username', async (req, res, next) => {
  try {
    const raw = req.query.username;
    const excludeUserId = req.query.exclude_id || null;
    const result = await store.checkUsernameAvailability(raw, excludeUserId);
    res.json(result);
  } catch (err) { next(err); }
});

// GET /api/users/me - current authenticated user profile
router.get('/me', authRequired, async (req, res, next) => {
  try {
    const profile = await store.getPublicProfile(req.user.id);
    if (!profile) return res.status(404).json({ error: 'User not found' });
    res.json({ ...profile, user: profile.user });
  } catch (err) { next(err); }
});

// GET /api/users/me/verification-status - status of all verification pillars
router.get('/me/verification-status', authRequired, async (req, res, next) => {
  try {
    const status = await store.getUserVerificationStatus(req.user.id);
    res.json(status);
  } catch (err) { next(err); }
});

// POST /api/users/me/change-password - change password
router.post('/me/change-password', authRequired, async (req, res, next) => {
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

// POST /api/users/me/verify-email/send-otp
router.post('/me/verify-email/send-otp', authRequired, async (req, res, next) => {
  try {
    const result = await store.sendEmailOtp(req.user.id);
    const notifService = require('../notificationService');
    const smsCfg = notifService ? notifService.getSmsConfig() : null;
    const showDemo = Boolean(smsCfg && smsCfg.show_demo_otp);
    const clientResponse = { ...result };
    if (!showDemo) {
      delete clientResponse.otp;
      clientResponse.message = `Verification code sent to ${result.email || 'your email'}. Valid for 10 minutes.`;
    }
    res.json(clientResponse);
  } catch (err) { next(err); }
});

// POST /api/users/me/verify-email/confirm
router.post('/me/verify-email/confirm', authRequired, async (req, res, next) => {
  try {
    const { otp } = req.body || {};
    if (!otp) return res.status(400).json({ error: 'Verification code is required.' });
    const result = await store.verifyEmailOtp(req.user.id, otp);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/users/me/verify-phone/send-otp
router.post('/me/verify-phone/send-otp', authRequired, async (req, res, next) => {
  try {
    const { phone } = req.body || {};
    if (!phone) return res.status(400).json({ error: 'Mobile phone number is required.' });
    const result = await store.sendPhoneOtp(req.user.id, phone);
    const notifService = require('../notificationService');
    const smsCfg = notifService ? notifService.getSmsConfig() : null;
    const showDemo = Boolean(smsCfg && smsCfg.show_demo_otp);
    const clientResponse = { ...result };
    if (!showDemo) {
      delete clientResponse.otp;
      clientResponse.message = `6-digit SMS code sent to ${phone}. Valid for 10 minutes.`;
    }
    res.json(clientResponse);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/users/me/verify-phone/confirm
router.post('/me/verify-phone/confirm', authRequired, async (req, res, next) => {
  try {
    const { otp } = req.body || {};
    if (!otp) return res.status(400).json({ error: 'SMS OTP code is required.' });
    const result = await store.verifyPhoneOtp(req.user.id, otp);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/users/me/kyc - upload identity documents, passport, educational or professional certificates
router.post(
  '/me/kyc',
  authRequired,
  kycUpload.fields([
    { name: 'front_image', maxCount: 1 },
    { name: 'back_image', maxCount: 1 },
    { name: 'certificate_file', maxCount: 1 }
  ]),
  async (req, res, next) => {
    try {
      const {
        doc_type,
        doc_type_label,
        doc_number,
        degree_name,
        institution_name,
        passing_year,
        cert_title,
        council_name,
        notes
      } = req.body || {};

      let frontImage = req.body.front_image_url || null;
      let backImage = req.body.back_image_url || null;

      if (req.files) {
        if (req.files.front_image && req.files.front_image[0]) {
          frontImage = `/uploads/kyc/${req.files.front_image[0].filename}`;
        } else if (req.files.certificate_file && req.files.certificate_file[0]) {
          frontImage = `/uploads/kyc/${req.files.certificate_file[0].filename}`;
        }
        if (req.files.back_image && req.files.back_image[0]) {
          backImage = `/uploads/kyc/${req.files.back_image[0].filename}`;
        }
      }

      const result = await store.submitUserKyc(req.user.id, {
        doc_type: doc_type || 'nid',
        doc_type_label,
        doc_number,
        degree_name,
        institution_name,
        passing_year,
        cert_title,
        council_name,
        front_image: frontImage,
        back_image: backImage,
        notes
      });
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }
);

// POST /api/users/me/payout-method - link bKash, Nagad, Rocket, or Bank
router.post('/me/payout-method', authRequired, async (req, res, next) => {
  try {
    const { method, account_number, account_name, bank_name, branch_name } = req.body || {};
    const result = await store.linkPayoutAccount(req.user.id, {
      method,
      account_number,
      account_name,
      bank_name,
      branch_name
    });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/users/me/complete-onboarding - mark wizard finished
router.post('/me/complete-onboarding', authRequired, async (req, res, next) => {
  try {
    await store.updateUser(req.user.id, { onboarding_completed: true });
    res.json({ success: true, message: 'Onboarding completed successfully!' });
  } catch (err) { next(err); }
});

// GET /api/users/:id - public profile with level, badges and reviews (§28-29, §35, §48)
// Accepts numeric ID or unique username handle (e.g. rahat_hasan)
router.get('/:id', async (req, res, next) => {
  try {
    const profile = await store.getPublicProfile(req.params.id);
    if (!profile) return res.status(404).json({ error: 'User not found' });
    res.json(profile);
  } catch (err) { next(err); }
});

// PATCH /api/users/me - update my profile / availability / unique username (§30)
router.patch('/me', authRequired, async (req, res, next) => {
  try {
    const user = await store.updateUser(req.user.id, req.body || {});
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    res.status(400).json({ error: err.message });
  }
});

// POST /api/users/me/portfolio - add portfolio project
router.post('/me/portfolio', authRequired, async (req, res, next) => {
  try {
    const item = await store.addUserPortfolioItem(req.user.id, req.body || {});
    res.json({ success: true, item });
  } catch (err) { next(err); }
});

// PUT /api/users/me/portfolio/:itemId - update portfolio project
router.put('/me/portfolio/:itemId', authRequired, async (req, res, next) => {
  try {
    const item = await store.updateUserPortfolioItem(req.user.id, req.params.itemId, req.body || {});
    res.json({ success: true, item });
  } catch (err) { next(err); }
});

// PATCH /api/users/me/portfolio/:itemId - patch portfolio project
router.patch('/me/portfolio/:itemId', authRequired, async (req, res, next) => {
  try {
    const item = await store.updateUserPortfolioItem(req.user.id, req.params.itemId, req.body || {});
    res.json({ success: true, item });
  } catch (err) { next(err); }
});

// PATCH /api/users/me/portfolio/:itemId/visibility - toggle visibility of portfolio item
router.patch('/me/portfolio/:itemId/visibility', authRequired, async (req, res, next) => {
  try {
    const item = await store.toggleUserPortfolioVisibility(req.user.id, req.params.itemId);
    res.json({ success: true, item });
  } catch (err) { next(err); }
});

const PORTFOLIO_UPLOADS_DIR = path.join(__dirname, '..', '..', 'public', 'uploads', 'portfolio');
fs.mkdirSync(PORTFOLIO_UPLOADS_DIR, { recursive: true });

const ALLOWED_PORTFOLIO_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg']);

const portfolioUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, PORTFOLIO_UPLOADS_DIR),
    filename: (req, file, cb) => cb(null, sanitizeFilename(file.originalname))
  }),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_PORTFOLIO_EXTENSIONS.has(ext)) {
      const err = new Error(`File extension '${ext}' not supported for portfolio images. Please upload JPG, PNG, WEBP, GIF, or SVG.`);
      err.status = 400;
      return cb(err, false);
    }
    cb(null, true);
  }
});

// POST /api/users/me/portfolio/upload - upload portfolio project image
router.post('/me/portfolio/upload', authRequired, (req, res, next) => {
  portfolioUpload.single('file')(req, res, err => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'Image exceeds 15 MB limit' });
      }
      return res.status(err.status || 400).json({ error: err.message || 'Image upload failed' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }
    const url = `/uploads/portfolio/${req.file.filename}`;
    res.json({ success: true, url, filename: req.file.filename });
  });
});

// DELETE /api/users/me/portfolio/:itemId - delete portfolio project
router.delete('/me/portfolio/:itemId', authRequired, async (req, res, next) => {
  try {
    const deleted = await store.deleteUserPortfolioItem(req.user.id, req.params.itemId);
    res.json({ success: deleted });
  } catch (err) { next(err); }
});

// ---------- Certificate Management Routes ----------
const CERT_UPLOADS_DIR = path.join(__dirname, '..', '..', 'public', 'uploads', 'certificates');
fs.mkdirSync(CERT_UPLOADS_DIR, { recursive: true });

const certUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, CERT_UPLOADS_DIR),
    filename: (req, file, cb) => cb(null, sanitizeFilename(file.originalname))
  }),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!['.jpg', '.jpeg', '.png', '.webp', '.pdf'].includes(ext)) {
      const err = new Error(`File format '${ext}' not supported. Please upload JPG, PNG, WEBP, or PDF.`);
      err.status = 400;
      return cb(err, false);
    }
    cb(null, true);
  }
});

// POST /api/users/me/certificates - add verified certificate/degree
router.post('/me/certificates', authRequired, async (req, res, next) => {
  try {
    const cert = await store.addUserCertificate(req.user.id, req.body || {});
    res.status(201).json({ success: true, certificate: cert, message: 'Certificate added successfully! 🎓' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/users/me/certificates/:certId - remove certificate
router.delete('/me/certificates/:certId', authRequired, async (req, res, next) => {
  try {
    const deleted = await store.deleteUserCertificate(req.user.id, req.params.certId);
    res.json({ success: deleted, message: deleted ? 'Certificate removed.' : 'Certificate not found.' });
  } catch (err) { next(err); }
});

// POST /api/users/me/certificates/upload - upload document proof
router.post('/me/certificates/upload', authRequired, (req, res) => {
  certUpload.single('file')(req, res, (err) => {
    if (err) return res.status(err.status || 400).json({ error: err.message || 'File upload failed' });
    if (!req.file) return res.status(400).json({ error: 'No certificate file provided' });
    const url = `/uploads/certificates/${req.file.filename}`;
    res.json({ success: true, url, filename: req.file.filename });
  });
});

// PUT /api/users/me/profile - profile update compatibility route
router.put('/me/profile', authRequired, async (req, res, next) => {
  try {
    const body = req.body || {};
    if (body.professional_cert_title) {
      await store.addUserCertificate(req.user.id, {
        name: body.professional_cert_title,
        issuer: body.professional_cert_authority || 'Official Authority',
        year: body.year || '2026'
      });
    }
    const user = await store.updateUser(req.user.id, body);
    res.json({ success: true, user });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/users/me/notification-preferences - retrieve user notification preferences
router.get('/me/notification-preferences', authRequired, async (req, res, next) => {
  try {
    const user = await store.getUserById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({
      success: true,
      preferences: {
        email_notifications: user.email_notifications !== false,
        sms_notifications: user.sms_notifications !== false,
        marketing_emails: Boolean(user.marketing_emails),
        security_alerts: user.security_alerts !== false
      }
    });
  } catch (err) { next(err); }
});

// PATCH /api/users/me/notification-preferences - update preferences
router.patch('/me/notification-preferences', authRequired, async (req, res, next) => {
  try {
    const { email_notifications, sms_notifications, marketing_emails, security_alerts } = req.body || {};
    const updates = {};
    if (email_notifications !== undefined) updates.email_notifications = Boolean(email_notifications);
    if (sms_notifications !== undefined) updates.sms_notifications = Boolean(sms_notifications);
    if (marketing_emails !== undefined) updates.marketing_emails = Boolean(marketing_emails);
    if (security_alerts !== undefined) updates.security_alerts = Boolean(security_alerts);

    const updated = await store.updateUser(req.user.id, updates);
    res.json({
      success: true,
      message: 'Notification preferences updated successfully',
      preferences: {
        email_notifications: updated.email_notifications !== false,
        sms_notifications: updated.sms_notifications !== false,
        marketing_emails: Boolean(updated.marketing_emails),
        security_alerts: updated.security_alerts !== false
      }
    });
  } catch (err) { next(err); }
});

module.exports = router;



