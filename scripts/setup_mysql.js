require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function setup() {
  const host = process.env.DB_HOST || 'localhost';
  const port = Number(process.env.DB_PORT || 3306);
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '';
  const dbName = process.env.DB_NAME || 'xtraearn';

  console.log(`\n======================================================`);
  console.log(`🚀 XtraEarn MySQL Database Automatic Provisioning Tool`);
  console.log(`Connecting to MySQL at ${host}:${port} as ${user}...`);
  console.log(`======================================================\n`);

  let connection;
  try {
    connection = await mysql.createConnection({
      host,
      port,
      user,
      password,
      multipleStatements: true
    });
  } catch (err) {
    console.error(`\n❌ Could not connect to MySQL server at ${host}:${port}`);
    console.error(`Error details: ${err.message}\n`);
    console.log(`💡 How to resolve:`);
    console.log(`1. Make sure your local MySQL service is running (e.g. start MySQL in XAMPP or Laragon Control Panel).`);
    console.log(`2. Verify your .env credentials:`);
    console.log(`   DB_HOST=${host}`);
    console.log(`   DB_PORT=${port}`);
    console.log(`   DB_USER=${user}`);
    console.log(`   DB_PASSWORD=${password ? '******' : '(empty)'}`);
    console.log(`   DB_NAME=${dbName}\n`);
    process.exit(1);
  }

  try {
    console.log(`1. Creating database "${dbName}" if it does not exist...`);
    await connection.query(`DROP DATABASE IF EXISTS \`${dbName}\`;`);
    await connection.query(`CREATE DATABASE \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await connection.query(`USE \`${dbName}\`;`);
    console.log(`   ✓ Database "${dbName}" is ready.`);

    console.log(`2. Executing schema from database/schema.sql...`);
    const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      await connection.query(schemaSql);
      console.log(`   ✓ All tables, indices, and views created successfully.`);
    }

    console.log(`3. Populating MySQL tables with live JSON seed data...`);
    await connection.query('SET FOREIGN_KEY_CHECKS = 0;');
    const jsonPath = path.join(__dirname, '..', 'database', 'xtraearn_db.json');
    if (fs.existsSync(jsonPath)) {
      const dbData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

      // Populate Categories
      if (dbData.categories && dbData.categories.length) {
        console.log(`   - Inserting ${dbData.categories.length} categories...`);
        for (const cat of dbData.categories) {
          await connection.query(
            `INSERT INTO categories (id, name, slug, icon, color, task_count, sort_order)
             VALUES (?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE name=VALUES(name), slug=VALUES(slug), icon=VALUES(icon), color=VALUES(color), task_count=VALUES(task_count), sort_order=VALUES(sort_order)`,
            [cat.id, cat.name, cat.slug, cat.icon || '✅', cat.color || '#22C55E', cat.task_count || 0, cat.sort_order || cat.id]
          );
        }
      }

      // Populate Users
      if (dbData.users && dbData.users.length) {
        console.log(`   - Inserting ${dbData.users.length} users (including all 30 verified doctors & specialists)...`);
        for (const u of dbData.users) {
          await connection.query(
            `INSERT INTO users (id, name, username, email, password_hash, phone, role, user_type, profession, languages, skills, bio, avatar_color, location, availability, is_verified, verified_as, rating, rating_count, tasks_completed, success_rate, response_minutes, total_earned, month_earned, wallet_balance, is_top_earner)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
             name=VALUES(name), username=VALUES(username), email=VALUES(email), password_hash=VALUES(password_hash),
             phone=VALUES(phone), role=VALUES(role), user_type=VALUES(user_type), profession=VALUES(profession),
             languages=VALUES(languages), skills=VALUES(skills), bio=VALUES(bio), avatar_color=VALUES(avatar_color),
             location=VALUES(location), availability=VALUES(availability), is_verified=VALUES(is_verified),
             verified_as=VALUES(verified_as), rating=VALUES(rating), rating_count=VALUES(rating_count),
             tasks_completed=VALUES(tasks_completed), success_rate=VALUES(success_rate), response_minutes=VALUES(response_minutes),
             total_earned=VALUES(total_earned), month_earned=VALUES(month_earned), wallet_balance=VALUES(wallet_balance),
             is_top_earner=VALUES(is_top_earner)`,
            [
              u.id, u.name, u.username || null, u.email, u.password_hash || '$2a$10$Z.ZiSSLFTDNo5GmE4xIvYeTIu9MF6FNqrydtJyS3mUB.ByExRICrC',
              u.phone || null, u.role || 'freelancer', u.user_type || 'regular', u.profession || null,
              u.languages || 'Bengali, English', u.skills || '', u.bio || '', u.avatar_color || '#22C55E',
              u.location || 'Dhaka', u.availability || 'available', u.is_verified ? 1 : 0, u.verified_as || null,
              u.rating || 0.0, u.rating_count || 0, u.tasks_completed || 0, u.success_rate || 100.0,
              u.response_minutes || 30, u.total_earned || 0.0, u.month_earned || 0.0, u.wallet_balance || 0.0,
              u.is_top_earner ? 1 : 0
            ]
          );
        }
      }

      // Populate Experts
      if (dbData.experts && dbData.experts.length) {
        console.log(`   - Inserting ${dbData.experts.length} verified experts & doctors...`);
        for (const exp of dbData.experts) {
          await connection.query(
            `INSERT INTO experts (id, expert_code, name, title, profession, domain, license_number, rating, reviews_count, hourly_rate, packages, total_sessions_completed, total_earnings, response_time_mins, avatar_color, district, languages, education, experience_years, bio, is_verified, verified_badge, availability_status, status, expert_user_id, email, username)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
             name=VALUES(name), title=VALUES(title), profession=VALUES(profession), domain=VALUES(domain),
             license_number=VALUES(license_number), rating=VALUES(rating), reviews_count=VALUES(reviews_count),
             hourly_rate=VALUES(hourly_rate), packages=VALUES(packages), total_sessions_completed=VALUES(total_sessions_completed),
             total_earnings=VALUES(total_earnings), response_time_mins=VALUES(response_time_mins), avatar_color=VALUES(avatar_color),
             district=VALUES(district), languages=VALUES(languages), education=VALUES(education), experience_years=VALUES(experience_years),
             bio=VALUES(bio), is_verified=VALUES(is_verified), verified_badge=VALUES(verified_badge),
             availability_status=VALUES(availability_status), status=VALUES(status), expert_user_id=VALUES(expert_user_id),
             email=VALUES(email), username=VALUES(username)`,
            [
              exp.id, exp.expert_code || `EXP-${500 + exp.id}`, exp.name, exp.title || exp.profession || '',
              exp.profession || exp.title || '', exp.domain || 'Medical & Health', exp.license_number || null,
              exp.rating || 5.0, exp.reviews_count || 0, exp.hourly_rate || 2000,
              JSON.stringify(exp.packages || {}), exp.total_sessions_completed || 0, exp.total_earnings || 0,
              exp.response_time_mins || 15, exp.avatar_color || '#4F46E5', exp.district || 'Dhaka',
              exp.languages || 'English, Bengali', exp.education || null, exp.experience_years || 5,
              exp.bio || null, exp.is_verified ? 1 : 0, exp.verified_badge || 'Verified Specialist',
              exp.availability_status || 'online', exp.status || 'active', exp.expert_user_id || null,
              exp.email || null, exp.username || null
            ]
          );
        }
      }

      // Populate Consultation Bookings
      if (dbData.consultation_bookings && dbData.consultation_bookings.length) {
        console.log(`   - Inserting ${dbData.consultation_bookings.length} consultation appointments...`);
        for (const cb of dbData.consultation_bookings) {
          await connection.query(
            `INSERT INTO consultation_bookings (id, booking_code, expert_id, expert_user_id, expert_name, expert_domain, expert_title, package_name, package_duration, user_id, user_name, user_email, user_phone, client_notes, topic, scheduled_date, scheduled_time, slot, mode, fee, escrow_status, meeting_link, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
             status=VALUES(status), escrow_status=VALUES(escrow_status), meeting_link=VALUES(meeting_link)`,
            [
              cb.id, cb.booking_code, cb.expert_id, cb.expert_user_id || null, cb.expert_name || 'Specialist', cb.expert_domain || 'General',
              cb.expert_title || 'Consultant', cb.package_name || 'Consultation Session', cb.package_duration || '30 mins', cb.user_id || null, cb.user_name || 'Client',
              cb.user_email || 'client@example.com', cb.user_phone || null, cb.client_notes || null, cb.topic || null, cb.scheduled_date || null,
              cb.scheduled_time || null, cb.slot || null, cb.mode || 'video', cb.fee || 0, cb.escrow_status || 'held_in_escrow',
              cb.meeting_link || null, cb.status || 'confirmed'
            ]
          );
        }
      }

      // Populate Tasks
      if (dbData.tasks && dbData.tasks.length) {
        console.log(`   - Inserting ${dbData.tasks.length} marketplace tasks...`);
        for (const t of dbData.tasks) {
          await connection.query(
            `INSERT INTO tasks (id, title, description, category_id, client_id, task_type, location_text, area, district, budget, duration_minutes, platform_fee, worker_payout, accepted_freelancer_id, rating, rating_count, emoji, tags, status, is_featured, is_urgent, delivery_hours)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
             title=VALUES(title), description=VALUES(description), budget=VALUES(budget), status=VALUES(status),
             is_featured=VALUES(is_featured), is_urgent=VALUES(is_urgent)`,
            [
              t.id, t.title, t.description || '', t.category_id || 1, t.client_id || 1,
              t.task_type || 'online', t.location_text || null, t.area || null, t.district || 'Dhaka',
              t.budget || 500, t.duration_minutes || 60, t.platform_fee || 50, t.worker_payout || 450,
              t.accepted_freelancer_id || null, t.rating || 0.0, t.rating_count || 0, t.emoji || '✅',
              t.tags || '', t.status || 'open', t.is_featured ? 1 : 0, t.is_urgent ? 1 : 0, t.delivery_hours || 24
            ]
          );
        }
      }

      // Populate Services
      if (dbData.services && dbData.services.length) {
        console.log(`   - Inserting ${dbData.services.length} services...`);
        for (const s of dbData.services) {
          await connection.query(
            `INSERT INTO services (id, user_id, title, category, price, delivery_days, revisions, rating, review_count, sales_count, description, tags, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE title=VALUES(title), price=VALUES(price), status=VALUES(status)`,
            [
              s.id, s.user_id || 1, s.title, s.category || 'General', s.price || 1000,
              s.delivery_days || 3, s.revisions || 2, s.rating || 5.0, s.review_count || 0,
              s.sales_count || 0, s.description || '', s.tags || '', s.status || 'active'
            ]
          );
        }
      }

      // Populate Businesses
      if (dbData.businesses && dbData.businesses.length) {
        console.log(`   - Inserting ${dbData.businesses.length} businesses...`);
        for (const b of dbData.businesses) {
          await connection.query(
            `INSERT INTO businesses (id, name, slug, domain, contact_name, email, phone, district, address, credit_balance, is_verified, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE name=VALUES(name), email=VALUES(email), credit_balance=VALUES(credit_balance)`,
            [
              b.id,
              b.company_name || b.name || `Business ${b.id}`,
              b.slug || (b.company_code ? b.company_code.toLowerCase() : `biz-${b.id}`),
              b.domain || b.industry || 'General',
              b.contact_name || (b.contact_person && b.contact_person.name) || b.company_name || 'Business Contact',
              b.email || (b.contact_person && b.contact_person.email) || `contact@biz${b.id}.com`,
              b.phone || (b.contact_person && b.contact_person.phone) || null,
              b.district || 'Dhaka',
              b.address || '',
              b.credit_balance || b.escrow_deposit_balance || 0,
              b.is_verified ? 1 : 0,
              b.status || 'active'
            ]
          );
        }
      }

      // Populate Wallets
      if (dbData.users && dbData.users.length) {
        console.log(`   - Creating ${dbData.users.length} member wallets...`);
        for (const u of dbData.users) {
          await connection.query(
            `INSERT INTO wallets (user_id, balance, pending_escrow, frozen_balance, currency, is_frozen)
             VALUES (?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE balance=VALUES(balance)`,
            [u.id, u.wallet_balance || 0.0, 0.0, 0.0, 'BDT', 0]
          );
        }
      }

      // Populate Task Applications
      if (dbData.applications && dbData.applications.length) {
        console.log(`   - Inserting ${dbData.applications.length} task applications...`);
        for (const app of dbData.applications) {
          await connection.query(
            `INSERT INTO task_applications (id, task_id, freelancer_id, bid_amount, cover_letter, delivery_days, status)
             VALUES (?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE status=VALUES(status)`,
            [
              app.id, app.task_id, app.freelancer_id || app.user_id, app.bid_amount || app.budget || 500,
              app.cover_letter || app.message || 'I can complete this task professionally.',
              app.delivery_days || 1, app.status || 'pending'
            ]
          );
        }
      }

      // Populate Task Deliveries
      if (dbData.deliveries && dbData.deliveries.length) {
        console.log(`   - Inserting ${dbData.deliveries.length} task deliveries...`);
        for (const del of dbData.deliveries) {
          await connection.query(
            `INSERT INTO task_deliveries (id, task_id, freelancer_id, delivery_notes, attachments_json, status, revision_count)
             VALUES (?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE status=VALUES(status)`,
            [
              del.id,
              del.task_id,
              del.freelancer_id || del.worker_id || del.user_id || 1,
              del.delivery_notes || del.note || del.notes || 'Deliverable uploaded.',
              JSON.stringify(del.attachments || del.files || (del.file_path ? [{ path: del.file_path, name: del.file_name || 'attachment' }] : [])),
              del.status || 'submitted',
              del.revision_count || 0
            ]
          );
        }
      }

      // Populate Transactions
      if (dbData.transactions && dbData.transactions.length) {
        console.log(`   - Inserting ${dbData.transactions.length} wallet transactions...`);
        for (const tx of dbData.transactions) {
          await connection.query(
            `INSERT INTO transactions (id, transaction_code, wallet_id, user_id, amount, fee, type, reference_id, reference_type, status, description, balance_before, balance_after)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE status=VALUES(status)`,
            [
              tx.id,
              tx.transaction_code || `TX-${1000 + tx.id}`,
              tx.wallet_id || tx.user_id || 1,
              tx.user_id || 1,
              tx.amount || 0,
              tx.fee || 0,
              tx.type || 'deposit',
              tx.reference_id ? String(tx.reference_id) : (tx.task_id ? String(tx.task_id) : null),
              tx.reference_type || (tx.task_id ? 'task' : 'system'),
              tx.status || 'completed',
              tx.description || tx.note || 'Transaction record',
              tx.balance_before || 0,
              tx.balance_after || tx.amount || 0
            ]
          );
        }
      }

      // Populate Withdrawals
      if (dbData.withdrawals && dbData.withdrawals.length) {
        console.log(`   - Inserting ${dbData.withdrawals.length} withdrawal payouts...`);
        for (const w of dbData.withdrawals) {
          await connection.query(
            `INSERT INTO withdrawals (id, withdrawal_code, user_id, amount, fee, net_amount, method, account_number, gateway, status, admin_notes)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE status=VALUES(status)`,
            [
              w.id,
              w.withdrawal_code || `WDR-${1000 + w.id}`,
              w.user_id || 1,
              w.amount || 0,
              w.fee || 0,
              w.net_amount || (w.amount - (w.fee || 0)),
              w.method || 'bkash',
              w.account_number || '01700000000',
              w.gateway || 'bKash Direct',
              w.status || 'pending',
              w.admin_notes || w.admin_note || null
            ]
          );
        }
      }

      // Populate Commission Rules
      if (dbData.commission_rules && dbData.commission_rules.length) {
        console.log(`   - Inserting ${dbData.commission_rules.length} commission rules...`);
        for (const cr of dbData.commission_rules) {
          await connection.query(
            `INSERT INTO commission_rules (id, rule_code, name, category_slug, tier_min, tier_max, commission_pct, fixed_fee, is_active)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE name=VALUES(name), commission_pct=VALUES(commission_pct)`,
            [
              cr.id, cr.rule_code || `RULE-${cr.id}`, cr.name, cr.category_slug || null,
              cr.tier_min || 0, cr.tier_max || 999999, cr.commission_pct || 10.0, cr.fixed_fee || 0,
              cr.is_active !== undefined ? (cr.is_active ? 1 : 0) : 1
            ]
          );
        }
      }

      // Populate Expert Applications
      if (dbData.expert_applications && dbData.expert_applications.length) {
        console.log(`   - Inserting ${dbData.expert_applications.length} doctor & expert applications...`);
        for (const ea of dbData.expert_applications) {
          await connection.query(
            `INSERT INTO expert_applications (id, application_code, user_id, name, email, phone, domain, profession, title, license_number, education, experience_years, hourly_rate, bio, district, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE status=VALUES(status)`,
            [
              ea.id, ea.application_code, ea.user_id || null, ea.name, ea.email, ea.phone,
              ea.domain || 'Medical & Health', ea.profession, ea.title || ea.profession,
              ea.license_number, ea.education || null, ea.experience_years || 3, ea.hourly_rate || 2000,
              ea.bio || null, ea.district || 'Dhaka', ea.status || 'pending'
            ]
          );
        }
      }

      // Populate Notifications
      if (dbData.notifications && dbData.notifications.length) {
        console.log(`   - Inserting ${dbData.notifications.length} notifications...`);
        for (const n of dbData.notifications) {
          await connection.query(
            `INSERT INTO notifications (id, user_id, title, message, type, is_read, link)
             VALUES (?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE is_read=VALUES(is_read)`,
            [
              n.id, n.user_id, n.title, n.message, n.type || 'system', n.is_read ? 1 : 0, n.link || null
            ]
          );
        }
      }

      // Populate Reviews
      if (dbData.reviews && dbData.reviews.length) {
        console.log(`   - Inserting ${dbData.reviews.length} user reviews...`);
        for (const rev of dbData.reviews) {
          await connection.query(
            `INSERT INTO reviews (id, review_code, task_id, reviewer_id, reviewee_id, rating, comment)
             VALUES (?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE rating=VALUES(rating), comment=VALUES(comment)`,
            [
              rev.id,
              rev.review_code || `REV-${1000 + rev.id}`,
              rev.task_id || null,
              rev.reviewer_id || 1,
              rev.reviewee_id || 1,
              rev.rating || 5.0,
              rev.comment || 'Great experience!'
            ]
          );
        }
      }

      // Populate Default Site Settings
      console.log(`   - Initializing site_settings CMS record...`);
      const [existingSettings] = await connection.query(`SELECT id FROM site_settings LIMIT 1`);
      if (!existingSettings || !existingSettings.length) {
        await connection.query(`
          INSERT INTO site_settings (hero_title, hero_subtitle, announcement_pill, popular_tags, time_chips, stats_trust_badge, cta_title, cta_subtitle)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          "Turn your spare time into real income",
          "Get paid for quick micro tasks, surveys, freelance gigs, verified professional help and on-site neighborhood support.",
          "⚡ Over ৳97 Lakhs paid out to Bangladeshi workers this month!",
          "#Logo Design, #Instagram Post, #Translation, #Data Entry, #Video Editing",
          "5 min, 10 min, 15 min, 30 min, 1 hour, 2+ hours",
          "4.8/5 · Trusted by 50K+ users",
          "Ready to turn your time into income?",
          "Join thousands of people who are earning with XtraEarn every day."
        ]);
      }
    }

    await connection.query('SET FOREIGN_KEY_CHECKS = 1;');

    console.log(`\n======================================================`);
    console.log(`🎉 SUCCESS: MySQL Database "${dbName}" is fully provisioned!`);
    console.log(`The entire platform is now 100% dynamic via MySQL.`);
    console.log(`Restart your Node server to connect automatically.`);
    console.log(`======================================================\n`);
  } finally {
    await connection.end();
  }
}

setup().catch(err => {
  console.error('\n❌ Error during setup:', err.message);
  process.exit(1);
});
