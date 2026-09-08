const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database', 'xtraearn_db.json');
const outPath = path.join(__dirname, '..', 'database', 'seed.sql');

if (!fs.existsSync(dbPath)) {
  console.error('database/xtraearn_db.json not found');
  process.exit(1);
}

const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

let sql = '-- ================================================================\n';
sql += '-- XtraEarn Production Seed Data (Full utf8mb4 Unicode)\n';
sql += '-- ================================================================\n\n';
sql += 'SET NAMES utf8mb4;\n';
sql += 'SET TIME_ZONE = "+06:00";\n';
sql += 'SET FOREIGN_KEY_CHECKS = 0;\n\n';

function esc(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return val;
  if (typeof val === 'boolean') return val ? 1 : 0;
  if (typeof val === 'object') val = JSON.stringify(val);
  const s = String(val)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r');
  return `'${s}'`;
}

// 1. Categories
if (db.categories && db.categories.length) {
  sql += '-- 1. CATEGORIES\n';
  sql += 'INSERT INTO categories (id, name, slug, icon, color, task_count, sort_order) VALUES\n';
  const seenCatIds = new Set();
  const uniqueCats = db.categories.filter(c => {
    if (seenCatIds.has(c.id)) return false;
    seenCatIds.add(c.id);
    return true;
  });
  sql += uniqueCats.map(c => `(${c.id}, ${esc(c.name)}, ${esc(c.slug)}, ${esc(c.icon || '✅')}, ${esc(c.color || '#22C55E')}, ${c.task_count || 0}, ${c.sort_order || c.id})`).join(',\n');
  sql += '\nON DUPLICATE KEY UPDATE name=VALUES(name);\n\n';
}

// 2. Users
if (db.users && db.users.length) {
  sql += '-- 2. USERS\n';
  sql += 'INSERT INTO users (id, name, username, email, password_hash, phone, role, user_type, profession, languages, skills, bio, avatar_color, location, availability, is_verified, verified_as, rating, rating_count, tasks_completed, success_rate, response_minutes, total_earned, month_earned, wallet_balance, is_top_earner) VALUES\n';
  sql += db.users.map(u => `(${u.id}, ${esc(u.name)}, ${esc(u.username)}, ${esc(u.email)}, ${esc(u.password_hash || '$2a$10$Z.ZiSSLFTDNo5GmE4xIvYeTIu9MF6FNqrydtJyS3mUB.ByExRICrC')}, ${esc(u.phone)}, ${esc(u.role || 'freelancer')}, ${esc(u.user_type || 'regular')}, ${esc(u.profession)}, ${esc(u.languages || 'Bengali, English')}, ${esc(u.skills || '')}, ${esc(u.bio || '')}, ${esc(u.avatar_color || '#22C55E')}, ${esc(u.location || 'Dhaka')}, ${esc(u.availability || 'available')}, ${u.is_verified ? 1 : 0}, ${esc(u.verified_as)}, ${u.rating || 5.0}, ${u.rating_count || 0}, ${u.tasks_completed || 0}, ${u.success_rate || 100}, ${u.response_minutes || 15}, ${u.total_earned || 0}, ${u.month_earned || 0}, ${u.wallet_balance || 0}, ${u.is_top_earner ? 1 : 0})`).join(',\n');
  sql += '\nON DUPLICATE KEY UPDATE name=VALUES(name);\n\n';

  sql += '-- 3. WALLETS\n';
  sql += 'INSERT INTO wallets (user_id, balance, pending_escrow, frozen_balance, currency, is_frozen) VALUES\n';
  sql += db.users.map(u => `(${u.id}, ${u.wallet_balance || 0.0}, 0.0, 0.0, 'BDT', 0)`).join(',\n');
  sql += '\nON DUPLICATE KEY UPDATE balance=VALUES(balance);\n\n';
}

// 4. Experts
if (db.experts && db.experts.length) {
  sql += '-- 4. EXPERTS\n';
  sql += 'INSERT INTO experts (id, expert_code, name, title, profession, domain, license_number, rating, reviews_count, hourly_rate, packages, total_sessions_completed, total_earnings, response_time_mins, avatar_color, district, languages, education, experience_years, bio, is_verified, verified_badge, availability_status, status, expert_user_id, email, username) VALUES\n';
  sql += db.experts.map(e => `(${e.id}, ${esc(e.expert_code || ('EXP-' + (500 + e.id)))}, ${esc(e.name)}, ${esc(e.title || e.profession)}, ${esc(e.profession || e.title)}, ${esc(e.domain)}, ${esc(e.license_number)}, ${e.rating || 5.0}, ${e.reviews_count || 0}, ${e.hourly_rate || 2000}, ${esc(e.packages || {})}, ${e.total_sessions_completed || 0}, ${e.total_earnings || 0}, ${e.response_time_mins || 15}, ${esc(e.avatar_color || '#4F46E5')}, ${esc(e.district || 'Dhaka')}, ${esc(e.languages || 'English, Bengali')}, ${esc(e.education)}, ${e.experience_years || 5}, ${esc(e.bio)}, ${e.is_verified ? 1 : 0}, ${esc(e.verified_badge || 'Verified Specialist')}, ${esc(e.availability_status || 'online')}, ${esc(e.status || 'active')}, ${e.expert_user_id || 'NULL'}, ${esc(e.email)}, ${esc(e.username)})`).join(',\n');
  sql += '\nON DUPLICATE KEY UPDATE name=VALUES(name);\n\n';
}

// 5. Tasks
if (db.tasks && db.tasks.length) {
  sql += '-- 5. TASKS\n';
  sql += 'INSERT INTO tasks (id, title, description, category_id, client_id, task_type, location_text, area, district, budget, duration_minutes, platform_fee, worker_payout, accepted_freelancer_id, rating, rating_count, emoji, tags, status, is_featured, is_urgent, delivery_hours) VALUES\n';
  sql += db.tasks.map(t => `(${t.id}, ${esc(t.title)}, ${esc(t.description || '')}, ${t.category_id || 1}, ${t.client_id || 1}, ${esc(t.task_type || 'online')}, ${esc(t.location_text)}, ${esc(t.area)}, ${esc(t.district || 'Dhaka')}, ${t.budget || 500}, ${t.duration_minutes || 60}, ${t.platform_fee || 50}, ${t.worker_payout || 450}, ${t.accepted_freelancer_id || 'NULL'}, ${t.rating || 0}, ${t.rating_count || 0}, ${esc(t.emoji || '✅')}, ${esc(t.tags || '')}, ${esc(t.status || 'open')}, ${t.is_featured ? 1 : 0}, ${t.is_urgent ? 1 : 0}, ${t.delivery_hours || 24})`).join(',\n');
  sql += '\nON DUPLICATE KEY UPDATE title=VALUES(title);\n\n';
}

// 6. Consultation Bookings
if (db.consultation_bookings && db.consultation_bookings.length) {
  sql += '-- 6. CONSULTATION BOOKINGS\n';
  sql += 'INSERT INTO consultation_bookings (id, booking_code, expert_id, expert_user_id, expert_name, expert_domain, expert_title, package_name, package_duration, user_id, user_name, user_email, user_phone, client_notes, topic, scheduled_date, scheduled_time, slot, mode, fee, escrow_status, meeting_link, status) VALUES\n';
  sql += db.consultation_bookings.map(cb => `(${cb.id}, ${esc(cb.booking_code)}, ${cb.expert_id}, ${cb.expert_user_id || 'NULL'}, ${esc(cb.expert_name)}, ${esc(cb.expert_domain)}, ${esc(cb.expert_title)}, ${esc(cb.package_name)}, ${esc(cb.package_duration || '30 mins')}, ${cb.user_id || 'NULL'}, ${esc(cb.user_name)}, ${esc(cb.user_email)}, ${esc(cb.user_phone)}, ${esc(cb.client_notes)}, ${esc(cb.topic)}, ${esc(cb.scheduled_date)}, ${esc(cb.scheduled_time)}, ${esc(cb.slot)}, ${esc(cb.mode || 'video')}, ${cb.fee || 0}, ${esc(cb.escrow_status || 'held_in_escrow')}, ${esc(cb.meeting_link)}, ${esc(cb.status || 'confirmed')})`).join(',\n');
  sql += '\nON DUPLICATE KEY UPDATE status=VALUES(status);\n\n';
}

// 7. Services
if (db.services && db.services.length) {
  sql += '-- 7. SERVICES\n';
  sql += 'INSERT INTO services (id, user_id, title, category, price, delivery_days, revisions, rating, review_count, sales_count, description, tags, status) VALUES\n';
  sql += db.services.map(s => `(${s.id}, ${s.user_id || 1}, ${esc(s.title)}, ${esc(s.category || 'General')}, ${s.price || 1000}, ${s.delivery_days || 3}, ${s.revisions || 2}, ${s.rating || 5.0}, ${s.review_count || 0}, ${s.sales_count || 0}, ${esc(s.description || '')}, ${esc(s.tags || '')}, ${esc(s.status || 'active')})`).join(',\n');
  sql += '\nON DUPLICATE KEY UPDATE title=VALUES(title);\n\n';
}

// 8. Commission Rules
if (db.commission_rules && db.commission_rules.length) {
  sql += '-- 8. COMMISSION RULES\n';
  sql += 'INSERT INTO commission_rules (id, rule_code, name, category_slug, tier_min, tier_max, commission_pct, fixed_fee, is_active) VALUES\n';
  sql += db.commission_rules.map(cr => `(${cr.id}, ${esc(cr.rule_code || ('RULE-' + cr.id))}, ${esc(cr.name)}, ${esc(cr.category_slug)}, ${cr.tier_min || 0}, ${cr.tier_max || 999999}, ${cr.commission_pct || 10.0}, ${cr.fixed_fee || 0}, ${cr.is_active !== undefined ? (cr.is_active ? 1 : 0) : 1})`).join(',\n');
  sql += '\nON DUPLICATE KEY UPDATE name=VALUES(name);\n\n';
}

sql += 'SET FOREIGN_KEY_CHECKS = 1;\n';
fs.writeFileSync(outPath, sql, 'utf8');
console.log('✓ Successfully exported database/seed.sql! Size:', fs.statSync(outPath).size, 'bytes');
