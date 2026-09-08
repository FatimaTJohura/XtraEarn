const express = require('express');
const router = express.Router();
const store = require('../store');
const { authOptional, authRequired } = require('../middleware/auth');

// GET /api/consult/my - Fetch consultations for logged-in client or consultant
router.get('/my', authOptional, async (req, res, next) => {
  try {
    const user = req.user;
    if (!user) {
      return res.json({
        client_bookings: [],
        consultant_bookings: [],
        total_client_sessions: 0,
        total_consultant_sessions: 0,
        is_guest: true
      });
    }
    const data = store.getUserConsultationBookings(user);
    res.json(data);
  } catch (err) { next(err); }
});

// POST /api/consult/booking/:id/complete - Mark consultation completed & release escrow
router.post('/booking/:id/complete', authOptional, async (req, res, next) => {
  try {
    const booking = store.completeConsultationBooking(req.params.id, req.user);
    res.json({ success: true, booking });
  } catch (err) { next(err); }
});

// POST /api/consult/booking/:id/cancel - Cancel consultation & refund client escrow
router.post('/booking/:id/cancel', authOptional, async (req, res, next) => {
  try {
    const reason = req.body.reason || 'Cancelled by client/consultant';
    const booking = store.cancelConsultationBooking(req.params.id, req.user, reason);
    res.json({ success: true, booking });
  } catch (err) { next(err); }
});

// GET /api/consult/room/:roomId - Fetch full room dossier & state
router.get('/room/:roomId', async (req, res, next) => {
  try {
    const room = store.getConsultationRoom(req.params.roomId);
    if (!room) return res.status(404).json({ error: 'Consultation room not found' });
    res.json(room);
  } catch (err) { next(err); }
});

// POST /api/consult/room/:roomId/message - Send in-meeting chat message or file
router.post('/room/:roomId/message', async (req, res, next) => {
  try {
    const msg = store.addConsultationRoomMessage(req.params.roomId, req.body);
    res.status(201).json({ success: true, message: msg });
  } catch (err) { next(err); }
});

// POST /api/consult/room/:roomId/notes - Save digital prescription / advice pad notes
router.post('/room/:roomId/notes', async (req, res, next) => {
  try {
    const notes = store.saveConsultationRoomNotes(req.params.roomId, req.body);
    res.json({ success: true, notes });
  } catch (err) { next(err); }
});

// POST /api/consult/room/:roomId/complete - End session & release escrow
router.post('/room/:roomId/complete', async (req, res, next) => {
  try {
    const result = store.completeConsultationSession(req.params.roomId, req.body);
    res.json(result);
  } catch (err) { next(err); }
});

// POST /api/consult/room/:roomId/extend - Request 15-min extension
router.post('/room/:roomId/extend', async (req, res, next) => {
  try {
    const m = store.mem();
    const cleanId = String(req.params.roomId || '').replace(/^(https?:\/\/[^\/]+)?(\/consult\/|\/meet\/)?/, '');
    const booking = (m.consultation_bookings || []).find(b =>
      (b.meeting_link && b.meeting_link.includes(cleanId)) ||
      (b.booking_code && b.booking_code.includes(cleanId))
    );

    const extMinutes = Number(req.body.minutes) || 15;
    const extFee = Number(req.body.fee) || 600;

    if (booking) {
      booking.fee = (booking.fee || 0) + extFee;
      booking.duration = `${parseInt(booking.duration || '30') + extMinutes} mins`;
      store.saveDbToDisk();
    }

    res.json({
      success: true,
      added_minutes: extMinutes,
      additional_fee: extFee,
      new_duration: booking?.duration || '45 mins'
    });
  } catch (err) { next(err); }
});

module.exports = router;
