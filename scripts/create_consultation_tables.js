const db = require('../server/db');

(async () => {
  try {
    await db.init();

    await db.pool.query(`
      CREATE TABLE IF NOT EXISTS consultation_messages (
        id          INT AUTO_INCREMENT PRIMARY KEY,
        booking_id  INT          NOT NULL,
        sender_id   INT          DEFAULT NULL,
        sender_name VARCHAR(150) DEFAULT NULL,
        sender_role VARCHAR(50)  DEFAULT 'client',
        text        TEXT         NOT NULL,
        attachment  TEXT         DEFAULT NULL,
        created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_cm_booking (booking_id),
        INDEX idx_cm_sender (sender_id),
        INDEX idx_cm_created (created_at),
        CONSTRAINT fk_cm_booking FOREIGN KEY (booking_id) REFERENCES consultation_bookings (id) ON DELETE CASCADE,
        CONSTRAINT fk_cm_sender FOREIGN KEY (sender_id) REFERENCES users (id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await db.pool.query(`
      CREATE TABLE IF NOT EXISTS consultation_notes (
        id            INT AUTO_INCREMENT PRIMARY KEY,
        booking_id    INT          NOT NULL UNIQUE,
        diagnosis     TEXT         DEFAULT NULL,
        observations  TEXT         DEFAULT NULL,
        prescriptions TEXT         DEFAULT NULL,
        follow_up     TEXT         DEFAULT NULL,
        created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_cn_booking FOREIGN KEY (booking_id) REFERENCES consultation_bookings (id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    console.log('✅ consultation_messages and consultation_notes tables created successfully.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error creating consultation tables:', err);
    process.exit(1);
  }
})();
