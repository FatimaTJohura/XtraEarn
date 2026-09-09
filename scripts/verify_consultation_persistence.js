/**
 * Verification Script for Spec Kit Tasks T019 & T020
 * Verifies MySQL-backed consultation room dossier, message storage, and digital advice notes.
 */

const db = require('../server/db');

(async () => {
  console.log('================ T019 & T020 CONSULTATION PERSISTENCE VERIFICATION ================\n');

  let passed = 0;
  let failed = 0;
  const failures = [];

  function assert(name, condition, extra = '') {
    if (condition) {
      passed++;
      console.log(`PASS  ${name}${extra ? ' -> ' + extra : ''}`);
    } else {
      failed++;
      failures.push(name + (extra ? ` [${extra}]` : ''));
      console.log(`FAIL  ${name}${extra ? ' -> ' + extra : ''}`);
    }
  }

  try {
    await db.init();
    assert('Database mode is MySQL', !db.isMemory());

    // 1. Resolve a real consultation booking
    const [bookings] = await db.pool.query('SELECT id, booking_code, meeting_link FROM consultation_bookings ORDER BY id ASC LIMIT 1');
    assert('A real consultation booking is resolved in MySQL', bookings && bookings.length > 0, `id=${bookings[0]?.id}, code=${bookings[0]?.booking_code}`);

    const testBooking = bookings[0];
    const testBookingId = testBooking.id;
    const roomId = testBooking.meeting_link.split('/consult/')[1] || testBooking.booking_code;

    // Clean up previous test messages/notes for this booking to start clean
    await db.pool.query('DELETE FROM consultation_messages WHERE booking_id = ?', [testBookingId]);
    await db.pool.query('DELETE FROM consultation_notes WHERE booking_id = ?', [testBookingId]);

    // Test HTTP API request helper
    const BASE = 'http://localhost:3000';
    async function apiRequest(path, opts = {}) {
      const res = await fetch(BASE + path, {
        method: opts.method || 'GET',
        headers: { 'Content-Type': 'application/json' },
        body: opts.body ? JSON.stringify(opts.body) : undefined
      });
      let data = null;
      try { data = await res.json(); } catch (e) {}
      return { status: res.status, data };
    }

    // 2. GET /api/consult/room/:roomId - Initial state (empty messages)
    const initialRoom = await apiRequest(`/api/consult/room/${roomId}`);
    assert('getConsultationRoom returns 200 for real booking', initialRoom.status === 200);
    assert('getConsultationRoom returns empty messages array initially', Array.isArray(initialRoom.data?.messages) && initialRoom.data.messages.length === 0);
    assert('getConsultationRoom returns default structured notes', initialRoom.data?.notes !== undefined && typeof initialRoom.data.notes === 'object');

    // 3. T019: addConsultationRoomMessage inserts into consultation_messages
    const msg1Res = await apiRequest(`/api/consult/room/${roomId}/message`, {
      method: 'POST',
      body: {
        sender_name: 'Dr. Test Specialist',
        sender_role: 'specialist',
        text: 'Hello, I have reviewed your report.'
      }
    });
    assert('First message posted successfully (HTTP 201)', msg1Res.status === 201 && msg1Res.data?.success);
    const msg1Id = msg1Res.data?.message?.id;
    assert('Message returns authoritative database ID', Number(msg1Id) > 0);

    // Wait 50ms then insert second message
    await new Promise(r => setTimeout(r, 50));
    const msg2Res = await apiRequest(`/api/consult/room/${roomId}/message`, {
      method: 'POST',
      body: {
        sender_name: 'Client User',
        sender_role: 'client',
        text: 'Thank you doctor, what is the next step?'
      }
    });
    assert('Second message posted successfully (HTTP 201)', msg2Res.status === 201 && msg2Res.data?.success);

    // 4. Verify message rows exist in MySQL directly
    const [dbMsgs] = await db.pool.query(
      'SELECT id, booking_id, sender_name, sender_role, text FROM consultation_messages WHERE booking_id = ? ORDER BY created_at ASC, id ASC',
      [testBookingId]
    );
    assert('Direct MySQL query confirms 2 messages stored in consultation_messages', dbMsgs.length === 2);
    assert('Chronological ordering verified (message 1 text matches)', dbMsgs[0].text === 'Hello, I have reviewed your report.');
    assert('Chronological ordering verified (message 2 text matches)', dbMsgs[1].text === 'Thank you doctor, what is the next step?');

    // 5. Verify getConsultationRoom returns the MySQL messages
    const roomWithMsgs = await apiRequest(`/api/consult/room/${roomId}`);
    assert('getConsultationRoom returns exactly 2 persisted messages', roomWithMsgs.data?.messages?.length === 2);
    assert('First message has correct sender and text', roomWithMsgs.data.messages[0].sender_name === 'Dr. Test Specialist');

    // 6. Verify orphan message rejection on invalid roomId
    const orphanMsgRes = await apiRequest(`/api/consult/room/INVALID_ROOM_ID_999999/message`, {
      method: 'POST',
      body: { sender_name: 'Hacker', text: 'Orphan message attempt' }
    });
    assert('addConsultationRoomMessage rejects invalid booking with 404', orphanMsgRes.status === 404);
    const [orphanRows] = await db.pool.query("SELECT * FROM consultation_messages WHERE text = 'Orphan message attempt'");
    assert('No orphan message row inserted into consultation_messages', orphanRows.length === 0);

    // 7. T020: saveConsultationRoomNotes writes structured fields
    const notesPayload = {
      diagnosis: 'Mild hypertension & seasonal allergic rhinitis',
      observations: 'BP 130/85 mmHg, clear lungs, mild nasal congestion',
      prescriptions: 'Tab. Amlodipine 5mg 1+0+0, Tab. Fexofenadine 120mg 0+0+1',
      follow_up: 'Review blood pressure log in 3 weeks'
    };
    const saveNotesRes = await apiRequest(`/api/consult/room/${roomId}/notes`, {
      method: 'POST',
      body: notesPayload
    });
    assert('saveConsultationRoomNotes returns 200 with success', saveNotesRes.status === 200 && saveNotesRes.data?.success);
    assert('Returned notes object has structured fields matching payload',
      saveNotesRes.data?.notes?.diagnosis === notesPayload.diagnosis &&
      saveNotesRes.data?.notes?.prescriptions === notesPayload.prescriptions
    );

    // 8. Direct MySQL verification of consultation_notes
    const [dbNotes] = await db.pool.query('SELECT * FROM consultation_notes WHERE booking_id = ?', [testBookingId]);
    assert('Direct MySQL query confirms exactly 1 row in consultation_notes for booking', dbNotes.length === 1);
    assert('MySQL consultation_notes contains correct diagnosis', dbNotes[0].diagnosis === notesPayload.diagnosis);
    assert('MySQL consultation_notes contains correct prescriptions', dbNotes[0].prescriptions === notesPayload.prescriptions);
    assert('MySQL consultation_notes contains correct observations', dbNotes[0].observations === notesPayload.observations);
    assert('MySQL consultation_notes contains correct follow_up', dbNotes[0].follow_up === notesPayload.follow_up);
    assert('MySQL consultation_notes contains non-null updated_at timestamp', dbNotes[0].updated_at !== null);

    // 9. Idempotent Update: calling saveConsultationRoomNotes again updates existing row without duplicate
    const updatedNotesPayload = {
      diagnosis: 'Hypertension controlled',
      observations: 'BP 120/80 mmHg, improved symptoms',
      prescriptions: 'Continue Tab. Amlodipine 5mg 1+0+0',
      follow_up: 'Routine annual check-up'
    };
    const updateNotesRes = await apiRequest(`/api/consult/room/${roomId}/notes`, {
      method: 'POST',
      body: updatedNotesPayload
    });
    assert('Second saveConsultationRoomNotes returns 200', updateNotesRes.status === 200 && updateNotesRes.data?.success);

    const [dbNotesAfterUpdate] = await db.pool.query('SELECT * FROM consultation_notes WHERE booking_id = ?', [testBookingId]);
    assert('consultation_notes still has strictly 1 row (no duplicate on re-save)', dbNotesAfterUpdate.length === 1);
    assert('consultation_notes diagnosis updated to new value', dbNotesAfterUpdate[0].diagnosis === 'Hypertension controlled');
    assert('consultation_notes prescriptions updated to new value', dbNotesAfterUpdate[0].prescriptions === 'Continue Tab. Amlodipine 5mg 1+0+0');

    // 10. getConsultationRoom returns the updated structured notes
    const roomWithNotes = await apiRequest(`/api/consult/room/${roomId}`);
    assert('getConsultationRoom returns authoritative updated diagnosis', roomWithNotes.data?.notes?.diagnosis === 'Hypertension controlled');
    assert('getConsultationRoom returns authoritative updated prescriptions', roomWithNotes.data?.notes?.prescriptions === 'Continue Tab. Amlodipine 5mg 1+0+0');

    // 11. Verify orphan notes rejection on invalid roomId
    const orphanNotesRes = await apiRequest(`/api/consult/room/INVALID_ROOM_ID_999999/notes`, {
      method: 'POST',
      body: { diagnosis: 'Orphan diagnosis' }
    });
    assert('saveConsultationRoomNotes rejects invalid booking with 404', orphanNotesRes.status === 404);
    const [orphanNoteRows] = await db.pool.query("SELECT * FROM consultation_notes WHERE diagnosis = 'Orphan diagnosis'");
    assert('No orphan notes row inserted into consultation_notes', orphanNoteRows.length === 0);

    // 12. Durability: reload store module in fresh process context and verify persistence
    const storeFresh = require('../server/store');
    const freshRoom = await storeFresh.getConsultationRoom(roomId);
    assert('Fresh module read returns exactly 2 persisted messages', freshRoom.messages?.length === 2);
    assert('Fresh module read returns updated structured notes', freshRoom.notes?.diagnosis === 'Hypertension controlled');

    // Clean up test records
    await db.pool.query('DELETE FROM consultation_messages WHERE booking_id = ?', [testBookingId]);
    await db.pool.query('DELETE FROM consultation_notes WHERE booking_id = ?', [testBookingId]);

    console.log(`\n========================================================`);
    console.log(`Results: ${passed} Passed, ${failed} Failed`);
    if (failures.length > 0) {
      console.log('Failures:\n - ' + failures.join('\n - '));
    }
    console.log(`========================================================\n`);

    if (failed > 0) {
      process.exit(1);
    }
    process.exit(0);
  } catch (err) {
    console.error('Test Suite Error:', err);
    process.exit(1);
  }
})();
