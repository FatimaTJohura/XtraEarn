const db = require('../server/db');

(async () => {
  await db.init();
  await db.pool.query(`
    CREATE TABLE IF NOT EXISTS messages (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      task_id     INT          NOT NULL,
      sender_id   INT          NOT NULL,
      body        TEXT         NOT NULL,
      created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_msg_task (task_id),
      INDEX idx_msg_sender (sender_id),
      CONSTRAINT fk_msg_task FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE CASCADE,
      CONSTRAINT fk_msg_sender FOREIGN KEY (sender_id) REFERENCES users (id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await db.pool.query(`
    CREATE TABLE IF NOT EXISTS deliveries (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      task_id     INT          NOT NULL,
      worker_id   INT          NOT NULL,
      note        TEXT         DEFAULT NULL,
      file_path   VARCHAR(255) DEFAULT NULL,
      file_name   VARCHAR(255) DEFAULT NULL,
      link        VARCHAR(255) DEFAULT NULL,
      status      ENUM('submitted','approved','revision_requested','rejected') NOT NULL DEFAULT 'submitted',
      created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_deliv_task (task_id),
      INDEX idx_deliv_worker (worker_id),
      CONSTRAINT fk_deliv_task_rel FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE CASCADE,
      CONSTRAINT fk_deliv_worker_rel FOREIGN KEY (worker_id) REFERENCES users (id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  console.log('✅ messages and deliveries tables created successfully.');
  process.exit(0);
})();
