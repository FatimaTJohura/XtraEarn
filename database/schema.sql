-- ================================================================
-- XtraEarn — PRODUCTION MYSQL RELATIONAL DATABASE SCHEMA
-- Full Unicode / Emoji / Bengali Support: utf8mb4 & utf8mb4_unicode_ci
-- Architecture: Node.js/Express Backend + Modern React/Frontend
--
-- Security:
--   All DB credentials (DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME)
--   are strictly loaded via environment variables (.env) and NEVER
--   exposed to the client or frontend.
-- ================================================================

SET NAMES utf8mb4;
SET TIME_ZONE = '+06:00'; -- Bangladesh Standard Time (BST)
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------------------------------------------
-- 1. USERS
-- Core identity table for Clients, Freelancers, Specialists & Admins
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  name             VARCHAR(100)  NOT NULL,
  username         VARCHAR(40)   DEFAULT NULL UNIQUE,
  email            VARCHAR(150)  NOT NULL UNIQUE,
  password_hash    VARCHAR(255)  NOT NULL,
  phone            VARCHAR(30)   DEFAULT NULL,
  role             VARCHAR(30)   NOT NULL DEFAULT 'freelancer',
  user_type        VARCHAR(50)   NOT NULL DEFAULT 'regular',
  profession       VARCHAR(100)  DEFAULT NULL,
  languages        VARCHAR(180)  DEFAULT 'Bengali, English',
  skills           TEXT          DEFAULT NULL,
  bio              TEXT          DEFAULT NULL,
  avatar_url       VARCHAR(255)  DEFAULT NULL,
  avatar_color     VARCHAR(20)   NOT NULL DEFAULT '#4F46E5',
  location         VARCHAR(120)  DEFAULT 'Dhaka',
  district         VARCHAR(80)   DEFAULT 'Dhaka',
  availability     ENUM('available','busy','away') NOT NULL DEFAULT 'available',
  is_verified      TINYINT(1)    NOT NULL DEFAULT 0,
  verified_as      VARCHAR(80)   DEFAULT NULL,
  email_verified   TINYINT(1)    NOT NULL DEFAULT 0,
  phone_verified   TINYINT(1)    NOT NULL DEFAULT 0,
  rating           DECIMAL(3,2)  NOT NULL DEFAULT 5.00,
  rating_count     INT           NOT NULL DEFAULT 0,
  tasks_completed  INT           NOT NULL DEFAULT 0,
  success_rate     DECIMAL(5,2)  NOT NULL DEFAULT 100.00,
  response_minutes INT           NOT NULL DEFAULT 15,
  total_earned     DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  month_earned     DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  wallet_balance   DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  is_top_earner    TINYINT(1)    NOT NULL DEFAULT 0,
  status           VARCHAR(30)   NOT NULL DEFAULT 'active',
  created_at       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_role (role),
  INDEX idx_users_email (email),
  INDEX idx_users_username (username),
  INDEX idx_users_phone (phone),
  INDEX idx_users_status (status),
  INDEX idx_users_top (is_top_earner, month_earned DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------
-- 2. AUTHENTICATION & SESSIONS
-- Persistent login tokens, device fingerprints & refresh tokens
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS auth_sessions (
  id            BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id       INT          NOT NULL,
  token_hash    VARCHAR(255) NOT NULL UNIQUE,
  ip_address    VARCHAR(45)  DEFAULT NULL,
  user_agent    VARCHAR(255) DEFAULT NULL,
  device_type   VARCHAR(40)  DEFAULT 'desktop',
  is_revoked    TINYINT(1)   NOT NULL DEFAULT 0,
  expires_at    DATETIME     NOT NULL,
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_used_at  DATETIME     DEFAULT NULL,
  INDEX idx_sessions_user (user_id),
  INDEX idx_sessions_expires (expires_at),
  CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------
-- 3. EMAIL VERIFICATIONS
-- Verification tokens for email activation
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS email_verifications (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  user_id       INT          NOT NULL,
  email         VARCHAR(150) NOT NULL,
  token         VARCHAR(128) NOT NULL UNIQUE,
  attempts      TINYINT      NOT NULL DEFAULT 0,
  expires_at    DATETIME     NOT NULL,
  verified_at   DATETIME     DEFAULT NULL,
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_ev_user (user_id),
  INDEX idx_ev_token (token),
  CONSTRAINT fk_ev_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------
-- 4. MOBILE OTP VERIFICATIONS
-- 6-digit SMS OTP verification (Registration, Login, Withdrawal, Phone bind)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mobile_otp_verifications (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  user_id       INT          DEFAULT NULL,
  phone         VARCHAR(30)  NOT NULL,
  otp_code      VARCHAR(10)  NOT NULL,
  purpose       ENUM('register','login','password_reset','phone_verify','withdrawal_auth') NOT NULL DEFAULT 'phone_verify',
  attempts      TINYINT      NOT NULL DEFAULT 0,
  max_attempts  TINYINT      NOT NULL DEFAULT 5,
  is_used       TINYINT(1)   NOT NULL DEFAULT 0,
  expires_at    DATETIME     NOT NULL,
  verified_at   DATETIME     DEFAULT NULL,
  ip_address    VARCHAR(45)  DEFAULT NULL,
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_otp_phone (phone),
  INDEX idx_otp_purpose (purpose, is_used),
  CONSTRAINT fk_otp_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------
-- 5. PASSWORD RESET TOKENS
-- Secure password recovery tokens & OTP codes
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  user_id       INT          NOT NULL,
  identifier    VARCHAR(150) NOT NULL, -- email or username
  token         VARCHAR(128) NOT NULL UNIQUE,
  otp_code      VARCHAR(10)  DEFAULT NULL,
  is_used       TINYINT(1)   NOT NULL DEFAULT 0,
  ip_address    VARCHAR(45)  DEFAULT NULL,
  expires_at    DATETIME     NOT NULL,
  used_at       DATETIME     DEFAULT NULL,
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_prt_user (user_id),
  INDEX idx_prt_token (token),
  CONSTRAINT fk_prt_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------
-- 6. WALLETS
-- Primary ledger account for each platform member (Clients, Workers, Experts)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS wallets (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  user_id         INT           NOT NULL UNIQUE,
  balance         DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  pending_escrow  DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  frozen_balance  DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  currency        VARCHAR(10)   NOT NULL DEFAULT 'BDT',
  is_frozen       TINYINT(1)    NOT NULL DEFAULT 0,
  freeze_reason   VARCHAR(255)  DEFAULT NULL,
  created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_wallets_user (user_id),
  CONSTRAINT fk_wallets_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------
-- 7. CATEGORIES
-- Hierarchical marketplace disciplines & micro-task categories
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  parent_id   INT          DEFAULT NULL,
  name        VARCHAR(80)  NOT NULL,
  slug        VARCHAR(80)  NOT NULL UNIQUE,
  icon        VARCHAR(20)  CHARACTER SET utf8mb4 NOT NULL DEFAULT '✅',
  color       VARCHAR(20)  NOT NULL DEFAULT '#22C55E',
  description VARCHAR(255) DEFAULT NULL,
  task_count  INT          NOT NULL DEFAULT 0,
  sort_order  INT          NOT NULL DEFAULT 0,
  is_active   TINYINT(1)   NOT NULL DEFAULT 1,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_categories_slug (slug),
  INDEX idx_categories_parent (parent_id),
  CONSTRAINT fk_categories_parent FOREIGN KEY (parent_id) REFERENCES categories (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------
-- 8. TASKS
-- Online remote jobs & physical on-site help orders with escrow protection
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tasks (
  id                     INT AUTO_INCREMENT PRIMARY KEY,
  title                  VARCHAR(200)  NOT NULL,
  description            TEXT          NOT NULL,
  category_id            INT           NOT NULL,
  client_id              INT           NOT NULL,
  task_type              ENUM('online','physical') NOT NULL DEFAULT 'online',
  location_text          VARCHAR(255)  DEFAULT NULL,
  area                   VARCHAR(80)   DEFAULT NULL,
  district               VARCHAR(80)   DEFAULT 'Dhaka',
  budget                 DECIMAL(10,2) NOT NULL,
  duration_minutes       INT           NOT NULL DEFAULT 60,
  platform_fee           DECIMAL(10,2) DEFAULT NULL,
  worker_payout          DECIMAL(10,2) DEFAULT NULL,
  accepted_freelancer_id INT           DEFAULT NULL,
  rating                 DECIMAL(3,2)  NOT NULL DEFAULT 0.00,
  rating_count           INT           NOT NULL DEFAULT 0,
  emoji                  VARCHAR(20)   CHARACTER SET utf8mb4 NOT NULL DEFAULT '✅',
  tags                   VARCHAR(255)  DEFAULT '',
  status                 ENUM('open','in_progress','delivered','completed','cancelled','disputed') NOT NULL DEFAULT 'open',
  is_featured            TINYINT(1)    NOT NULL DEFAULT 0,
  is_urgent              TINYINT(1)    NOT NULL DEFAULT 0,
  delivery_hours         INT           NOT NULL DEFAULT 24,
  created_at             TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at             TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_tasks_status (status),
  INDEX idx_tasks_client (client_id),
  INDEX idx_tasks_freelancer (accepted_freelancer_id),
  INDEX idx_tasks_category (category_id),
  INDEX idx_tasks_type (task_type, status),
  CONSTRAINT fk_tasks_client FOREIGN KEY (client_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_tasks_freelancer FOREIGN KEY (accepted_freelancer_id) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT fk_tasks_category FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------
-- 9. TASK APPLICATIONS & PROPOSALS
-- Worker bids, proposals & turnaround time estimates
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS task_applications (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  task_id       INT           NOT NULL,
  freelancer_id INT           NOT NULL,
  bid_amount    DECIMAL(10,2) NOT NULL,
  cover_letter  TEXT          NOT NULL,
  delivery_days INT           NOT NULL DEFAULT 1,
  status        ENUM('pending','accepted','rejected','withdrawn') NOT NULL DEFAULT 'pending',
  created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_task_freelancer (task_id, freelancer_id),
  INDEX idx_app_task (task_id),
  INDEX idx_app_freelancer (freelancer_id),
  INDEX idx_app_status (status),
  CONSTRAINT fk_app_task FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE CASCADE,
  CONSTRAINT fk_app_freelancer FOREIGN KEY (freelancer_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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

-- ----------------------------------------------------------------
-- 9b. TESTIMONIALS
-- Platform user reviews & verified endorsements
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS testimonials (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  user_id         INT          NOT NULL,
  quote           TEXT         NOT NULL,
  rating          INT          NOT NULL DEFAULT 5,
  created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_testim_user (user_id),
  CONSTRAINT fk_testim_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------
-- 10. TASK DELIVERIES & SUBMISSIONS
-- Finished deliverable uploads, work proofs, reviews & approvals
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS task_deliveries (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  task_id         INT          NOT NULL,
  freelancer_id   INT          NOT NULL,
  delivery_notes  TEXT         NOT NULL,
  attachments_json JSON        DEFAULT NULL,
  status          ENUM('submitted','approved','revision_requested','rejected') NOT NULL DEFAULT 'submitted',
  revision_count  INT          NOT NULL DEFAULT 0,
  client_feedback TEXT         DEFAULT NULL,
  submitted_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_at     DATETIME     DEFAULT NULL,
  INDEX idx_deliv_task (task_id),
  INDEX idx_deliv_freelancer (freelancer_id),
  INDEX idx_deliv_status (status),
  CONSTRAINT fk_deliv_task FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE CASCADE,
  CONSTRAINT fk_deliv_freelancer FOREIGN KEY (freelancer_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------
-- 11. COMMISSIONS & RULES
-- Dynamic commission rules, tier logic & revenue ledger
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS commission_rules (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  rule_code      VARCHAR(50)   NOT NULL UNIQUE,
  name           VARCHAR(120)  NOT NULL,
  category_slug  VARCHAR(80)   DEFAULT NULL,
  tier_min       DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  tier_max       DECIMAL(10,2) NOT NULL DEFAULT 999999.00,
  commission_pct DECIMAL(5,2)  NOT NULL DEFAULT 10.00,
  fixed_fee      DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  is_active      TINYINT(1)    NOT NULL DEFAULT 1,
  created_at     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS commission_ledger (
  id              BIGINT AUTO_INCREMENT PRIMARY KEY,
  task_id         INT           DEFAULT NULL,
  booking_id      INT           DEFAULT NULL,
  user_id         INT           NOT NULL,
  gross_amount    DECIMAL(12,2) NOT NULL,
  commission_pct  DECIMAL(5,2)  NOT NULL DEFAULT 10.00,
  fee_amount      DECIMAL(12,2) NOT NULL,
  net_payout      DECIMAL(12,2) NOT NULL,
  rule_applied    VARCHAR(80)   DEFAULT 'Standard 10%',
  created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_comm_user (user_id),
  INDEX idx_comm_task (task_id),
  INDEX idx_comm_booking (booking_id),
  CONSTRAINT fk_comm_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------
-- 12. TRANSACTIONS
-- Immutable financial audit ledger for deposits, escrows, releases, refunds
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS transactions (
  id               BIGINT AUTO_INCREMENT PRIMARY KEY,
  transaction_code VARCHAR(50)   NOT NULL UNIQUE,
  wallet_id        INT           NOT NULL,
  user_id          INT           NOT NULL,
  amount           DECIMAL(12,2) NOT NULL,
  fee              DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  type             VARCHAR(50)   NOT NULL,
  reference_id     VARCHAR(80)   DEFAULT NULL,
  reference_type   VARCHAR(50)   DEFAULT NULL,
  status           ENUM('pending','completed','failed','reversed') NOT NULL DEFAULT 'completed',
  description      VARCHAR(255)  NOT NULL,
  balance_before   DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  balance_after    DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  created_at       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_tx_user (user_id),
  INDEX idx_tx_wallet (wallet_id),
  INDEX idx_tx_type (type),
  INDEX idx_tx_code (transaction_code),
  CONSTRAINT fk_tx_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_tx_wallet FOREIGN KEY (wallet_id) REFERENCES wallets (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------
-- 13. WITHDRAWALS
-- Payout requests via bKash, Nagad, Rocket & Bank Transfer
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS withdrawals (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  withdrawal_code  VARCHAR(50)   NOT NULL UNIQUE,
  user_id          INT           NOT NULL,
  amount           DECIMAL(12,2) NOT NULL,
  fee              DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  net_amount       DECIMAL(12,2) NOT NULL,
  method           ENUM('bkash','nagad','rocket','bank') NOT NULL,
  account_number   VARCHAR(60)   NOT NULL,
  account_name     VARCHAR(100)  DEFAULT NULL,
  bank_name        VARCHAR(100)  DEFAULT NULL,
  branch_name      VARCHAR(100)  DEFAULT NULL,
  routing_number   VARCHAR(30)   DEFAULT NULL,
  gateway          VARCHAR(40)   DEFAULT 'bKash Merchant Direct',
  status           ENUM('pending','approved','processing','completed','rejected','held') NOT NULL DEFAULT 'pending',
  tx_id            VARCHAR(100)  DEFAULT NULL,
  admin_notes      TEXT          DEFAULT NULL,
  reviewed_by      INT           DEFAULT NULL,
  reviewed_at      DATETIME      DEFAULT NULL,
  created_at       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_w_user (user_id),
  INDEX idx_w_status (status),
  INDEX idx_w_code (withdrawal_code),
  CONSTRAINT fk_w_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_w_reviewer FOREIGN KEY (reviewed_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------
-- 14. NOTIFICATIONS
-- In-app alerts, consultation invites & transaction notifications
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
  id         BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT          NOT NULL,
  title      VARCHAR(200) NOT NULL,
  message    TEXT         NOT NULL,
  type       VARCHAR(50)  NOT NULL DEFAULT 'system',
  is_read    TINYINT(1)   NOT NULL DEFAULT 0,
  link       VARCHAR(255) DEFAULT NULL,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_notif_user (user_id, is_read),
  CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------
-- 15. AUDIT LOGS
-- Complete security and compliance trail for administrative actions
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT          DEFAULT NULL, -- Actor (who performed action)
  action      VARCHAR(80)  NOT NULL,     -- e.g. 'USER_UPDATE', 'WITHDRAWAL_APPROVE', 'EXPERT_ONBOARD'
  entity      VARCHAR(60)  NOT NULL,     -- e.g. 'user', 'withdrawal', 'expert', 'task'
  entity_id   VARCHAR(60)  DEFAULT NULL,
  details     TEXT         DEFAULT NULL,
  ip_address  VARCHAR(45)  DEFAULT NULL,
  user_agent  VARCHAR(255) DEFAULT NULL,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_audit_user (user_id),
  INDEX idx_audit_action (action),
  INDEX idx_audit_entity (entity, entity_id),
  CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------
-- 16. EXPERTS & DOCTORS
-- Verified specialist marketplace directory
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS experts (
  id                       INT AUTO_INCREMENT PRIMARY KEY,
  expert_code              VARCHAR(30)   NOT NULL UNIQUE,
  name                     VARCHAR(150)  NOT NULL,
  title                    VARCHAR(150)  NOT NULL,
  profession               VARCHAR(150)  NOT NULL,
  domain                   VARCHAR(100)  NOT NULL,
  license_number           VARCHAR(100)  DEFAULT NULL,
  rating                   DECIMAL(3,2)  NOT NULL DEFAULT 5.00,
  reviews_count            INT           NOT NULL DEFAULT 0,
  hourly_rate              DECIMAL(10,2) NOT NULL DEFAULT 2000.00,
  packages                 JSON          DEFAULT NULL,
  total_sessions_completed INT           NOT NULL DEFAULT 0,
  total_earnings           DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  response_time_mins       INT           NOT NULL DEFAULT 15,
  avatar_color             VARCHAR(20)   NOT NULL DEFAULT '#4F46E5',
  district                 VARCHAR(80)   DEFAULT 'Dhaka',
  languages                VARCHAR(150)  DEFAULT 'English, Bengali',
  education                VARCHAR(255)  DEFAULT NULL,
  experience_years         INT           NOT NULL DEFAULT 5,
  bio                      TEXT          DEFAULT NULL,
  is_verified              TINYINT(1)    NOT NULL DEFAULT 1,
  verified_badge           VARCHAR(100)  DEFAULT 'Verified Specialist',
  availability_status      VARCHAR(30)   DEFAULT 'online',
  status                   VARCHAR(30)   DEFAULT 'active',
  expert_user_id           INT           DEFAULT NULL,
  email                    VARCHAR(150)  DEFAULT NULL,
  username                 VARCHAR(50)   DEFAULT NULL,
  created_at               TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_experts_domain (domain),
  INDEX idx_experts_status (status),
  INDEX idx_experts_user (expert_user_id),
  CONSTRAINT fk_experts_user FOREIGN KEY (expert_user_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------
-- 17. CONSULTATION BOOKINGS & ESCROW
-- 1-on-1 video & advisory sessions with specialist escrow locks
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS consultation_bookings (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  booking_code     VARCHAR(40)   NOT NULL UNIQUE,
  expert_id        INT           NOT NULL,
  expert_user_id   INT           DEFAULT NULL,
  expert_name      VARCHAR(150)  DEFAULT NULL,
  expert_domain    VARCHAR(100)  DEFAULT NULL,
  expert_title     VARCHAR(150)  DEFAULT NULL,
  package_name     VARCHAR(150)  DEFAULT 'Standard Consultation',
  package_duration VARCHAR(50)   DEFAULT '30 mins',
  user_id          INT           DEFAULT NULL,
  user_name        VARCHAR(120)  NOT NULL,
  user_email       VARCHAR(150)  NOT NULL,
  user_phone       VARCHAR(30)   DEFAULT NULL,
  client_notes     TEXT          DEFAULT NULL,
  topic            VARCHAR(255)  DEFAULT NULL,
  scheduled_date   VARCHAR(30)   DEFAULT NULL,
  scheduled_time   VARCHAR(30)   DEFAULT NULL,
  slot             VARCHAR(100)  DEFAULT NULL,
  mode             ENUM('video','audio','chat') NOT NULL DEFAULT 'video',
  fee              DECIMAL(10,2) NOT NULL,
  escrow_status    ENUM('held_in_escrow','released_to_specialist','released_to_expert','refunded_to_client') NOT NULL DEFAULT 'held_in_escrow',
  meeting_link     VARCHAR(255)  DEFAULT NULL,
  status           ENUM('confirmed','in_progress','completed','cancelled','refunded') NOT NULL DEFAULT 'confirmed',
  created_at       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at     DATETIME      DEFAULT NULL,
  cancelled_at     DATETIME      DEFAULT NULL,
  cancel_reason    VARCHAR(255)  DEFAULT NULL,
  INDEX idx_cb_expert (expert_id),
  INDEX idx_cb_user (user_id),
  INDEX idx_cb_status (status),
  INDEX idx_cb_code (booking_code),
  CONSTRAINT fk_cb_expert FOREIGN KEY (expert_id) REFERENCES experts (id) ON DELETE CASCADE,
  CONSTRAINT fk_cb_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------
-- 17a. CONSULTATION MESSAGES & TRANSCRIPTS (T019)
-- In-meeting chat history and file attachments for consultation rooms
-- ----------------------------------------------------------------
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

-- ----------------------------------------------------------------
-- 17b. CONSULTATION DIGITAL ADVICE & PRESCRIPTION NOTES (T020)
-- Structured medical/specialist clinical notes, diagnosis & prescriptions
-- ----------------------------------------------------------------
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

-- ----------------------------------------------------------------
-- 18. EXPERT APPLICATIONS
-- Candidate doctors & specialists onboarding submissions & credentials
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS expert_applications (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  application_code VARCHAR(40)   NOT NULL UNIQUE,
  user_id          INT           DEFAULT NULL,
  name             VARCHAR(150)  NOT NULL,
  email            VARCHAR(150)  NOT NULL,
  phone            VARCHAR(30)   NOT NULL,
  domain           VARCHAR(100)  NOT NULL,
  profession       VARCHAR(150)  NOT NULL,
  title            VARCHAR(150)  NOT NULL,
  license_number   VARCHAR(100)  NOT NULL,
  education        VARCHAR(255)  DEFAULT NULL,
  experience_years INT           NOT NULL DEFAULT 3,
  hourly_rate      DECIMAL(10,2) NOT NULL DEFAULT 2000.00,
  bio              TEXT          DEFAULT NULL,
  district         VARCHAR(80)   DEFAULT 'Dhaka',
  status           ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  admin_notes      TEXT          DEFAULT NULL,
  submitted_at     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_at      DATETIME      DEFAULT NULL,
  INDEX idx_ea_status (status),
  INDEX idx_ea_code (application_code),
  CONSTRAINT fk_ea_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------
-- 19. REVIEWS & DISPUTES
-- Ratings & feedback for completed tasks and consultation sessions
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reviews (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  review_code      VARCHAR(40)   DEFAULT NULL UNIQUE,
  task_id          INT           DEFAULT NULL,
  booking_id       INT           DEFAULT NULL,
  reviewer_id      INT           NOT NULL,
  reviewee_id      INT           NOT NULL,
  rating           DECIMAL(3,2)  NOT NULL,
  comment          TEXT          NOT NULL,
  created_at       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_rev_reviewee (reviewee_id),
  CONSTRAINT fk_rev_reviewer FOREIGN KEY (reviewer_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_rev_reviewee FOREIGN KEY (reviewee_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS disputes (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  task_id          INT           NOT NULL,
  client_id        INT           NOT NULL,
  freelancer_id    INT           NOT NULL,
  reason           VARCHAR(500)  NOT NULL,
  amount           DECIMAL(12,2) NOT NULL,
  status           ENUM('open','resolved_worker','resolved_refund','closed') NOT NULL DEFAULT 'open',
  resolution_note  TEXT          DEFAULT NULL,
  created_at       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_disputes_task FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE CASCADE,
  CONSTRAINT fk_disputes_client FOREIGN KEY (client_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_disputes_freelancer FOREIGN KEY (freelancer_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------
-- 20. SERVICES & BUSINESSES
-- Freelance gig catalog and enterprise merchant partners
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS services (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  user_id       INT           NOT NULL,
  title         VARCHAR(200)  NOT NULL,
  category      VARCHAR(80)   NOT NULL,
  price         DECIMAL(10,2) NOT NULL,
  delivery_days INT           NOT NULL DEFAULT 3,
  revisions     INT           NOT NULL DEFAULT 2,
  rating        DECIMAL(3,2)  NOT NULL DEFAULT 5.00,
  review_count  INT           NOT NULL DEFAULT 0,
  sales_count   INT           NOT NULL DEFAULT 0,
  description   TEXT          DEFAULT NULL,
  tags          VARCHAR(255)  DEFAULT NULL,
  status        VARCHAR(30)   NOT NULL DEFAULT 'active',
  created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_serv_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS businesses (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  name           VARCHAR(150)  NOT NULL,
  slug           VARCHAR(100)  NOT NULL UNIQUE,
  domain         VARCHAR(100)  NOT NULL,
  contact_name   VARCHAR(100)  NOT NULL,
  email          VARCHAR(150)  NOT NULL,
  phone          VARCHAR(30)   DEFAULT NULL,
  district       VARCHAR(80)   DEFAULT 'Dhaka',
  address        VARCHAR(255)  DEFAULT NULL,
  credit_balance DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  is_verified    TINYINT(1)    NOT NULL DEFAULT 1,
  status         VARCHAR(30)   NOT NULL DEFAULT 'active',
  created_at     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------
-- 21. CMS & SITE SETTINGS
-- Live dynamic settings for homepage, banners, announcements
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS site_settings (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  hero_title        VARCHAR(255) NOT NULL,
  hero_subtitle     TEXT         NOT NULL,
  announcement_pill VARCHAR(255) DEFAULT NULL,
  popular_tags      VARCHAR(500) DEFAULT NULL,
  time_chips        VARCHAR(500) DEFAULT NULL,
  stats_trust_badge VARCHAR(255) DEFAULT NULL,
  cta_title         VARCHAR(255) DEFAULT NULL,
  cta_subtitle      TEXT         DEFAULT NULL,
  updated_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS reviews (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  review_code  VARCHAR(40)   DEFAULT NULL UNIQUE,
  task_id      INT           DEFAULT NULL,
  booking_id   INT           DEFAULT NULL,
  reviewer_id  INT           NOT NULL,
  reviewee_id  INT           NOT NULL,
  rating       DECIMAL(3,2)  NOT NULL,
  comment      TEXT          DEFAULT NULL,
  created_at   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_rev_reviewer (reviewer_id),
  INDEX idx_rev_reviewee (reviewee_id),
  INDEX idx_rev_task (task_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------
-- 22. HIGH PERFORMANCE VIEWS
-- ----------------------------------------------------------------
CREATE OR REPLACE VIEW v_top_earners AS
SELECT id, name, avatar_color, location, rating, tasks_completed,
       month_earned, total_earned, is_verified, verified_as
FROM users
WHERE is_top_earner = 1
ORDER BY month_earned DESC;

CREATE OR REPLACE VIEW v_physical_tasks AS
SELECT t.id, t.title, t.budget, t.duration_minutes, t.area, t.district,
       t.location_text, c.name AS category_name, c.icon
FROM tasks t
JOIN categories c ON c.id = t.category_id
WHERE t.task_type = 'physical' AND t.status = 'open';

CREATE OR REPLACE VIEW v_expert_directory AS
SELECT id, expert_code, name, title, profession, domain, rating,
       reviews_count, hourly_rate, verified_badge, availability_status, status
FROM experts
WHERE status = 'active'
ORDER BY rating DESC;

CREATE OR REPLACE VIEW wallet_transactions AS
SELECT id, transaction_code, wallet_id, user_id, amount, fee, type,
       reference_id AS task_id, reference_type, status, description AS note,
       description, balance_before, balance_after, created_at
FROM transactions;

SET FOREIGN_KEY_CHECKS = 1;
