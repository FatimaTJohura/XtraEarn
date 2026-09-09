const db = require('../server/db');

(async () => {
  await db.init();
  await db.pool.query(`
    CREATE TABLE IF NOT EXISTS applications (
      id              INT AUTO_INCREMENT PRIMARY KEY,
      task_id         INT           NOT NULL,
      freelancer_id   INT           NOT NULL,
      message         TEXT          DEFAULT NULL,
      status          ENUM('pending','accepted','rejected','withdrawn') NOT NULL DEFAULT 'pending',
      created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_app_task_free (task_id, freelancer_id),
      INDEX idx_app_task (task_id),
      INDEX idx_app_free (freelancer_id),
      CONSTRAINT fk_app_tasks FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE CASCADE,
      CONSTRAINT fk_app_freelancers FOREIGN KEY (freelancer_id) REFERENCES users (id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  console.log('✅ applications table created successfully in MySQL.');
  process.exit(0);
})();
