// MySQL connection. If MySQL is unreachable the app transparently
// falls back to in-memory data (same seed) so it always runs.
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'xtraearn',
  waitForConnections: true,
  connectionLimit: 15,
  charset: 'utf8mb4',
  timezone: '+06:00',
  namedPlaceholders: false
});

let mode = 'memory'; // default to 'memory' until init() successfully connects to MySQL

async function init() {
  try {
    await pool.query('SELECT 1');
    mode = 'mysql';
    console.log(`[db] ✅ Successfully connected to MySQL (database: ${process.env.DB_NAME || 'xtraearn'}) - mode: mysql (Persistent & Dynamic)`);
  } catch (err) {
    mode = 'memory';
    console.warn(`[db] ⚠️ MySQL not detected on port ${process.env.DB_PORT || 3306} (${err.code || err.message}).`);
    console.warn(`[db] 💾 Running in persistent JSON database mode (all live changes auto-saved to database/xtraearn_db.json).`);
    console.warn(`[db] 👉 To switch to MySQL: Start MySQL in XAMPP or Laragon, then run "npm run db:setup".`);
  }
  return mode;
}

function isMemory() {
  return mode === 'memory';
}

module.exports = { pool, init, isMemory, mode: () => mode };
