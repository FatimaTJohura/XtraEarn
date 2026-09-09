# Data Model & Consistency Architecture

**Feature**: `specs/001-production-hardening`  
**Date**: 2026-09-08  
**Status**: Completed  

---

## 1. Core Entity Models & Schema Alignment

The authoritative data layer uses the existing 22 relational tables defined in `database/schema.sql`. Hardening establishes strict consistency and foreign-key integrity across the following key entities:

### 1.1 User & Identity (`users`)
Represents registered participants (Clients, Freelancers, Specialists, Admins).

| Field | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `INT` | `AUTO_INCREMENT PRIMARY KEY` | Internal unique user identifier |
| `name` | `VARCHAR(100)` | `NOT NULL` | Full display name |
| `username` | `VARCHAR(40)` | `UNIQUE DEFAULT NULL` | Vanity handle (e.g. `/@handle`) |
| `email` | `VARCHAR(150)` | `UNIQUE NOT NULL` | Unique account email (case-insensitive) |
| `password_hash` | `VARCHAR(255)` | `NOT NULL` | Cryptographic Bcrypt hash (10 rounds minimum) |
| `role` | `VARCHAR(30)` | `NOT NULL DEFAULT 'freelancer'` | Access tier: `'freelancer'`, `'client'`, `'admin'` |
| `user_type` | `VARCHAR(50)` | `NOT NULL DEFAULT 'regular'` | Domain profile: `'regular'`, `'business'`, `'specialist'` |
| `wallet_balance`| `DECIMAL(12,2)`| `NOT NULL DEFAULT 0.00` | Current available liquid balance in BDT |
| `is_verified` | `TINYINT(1)` | `NOT NULL DEFAULT 0` | KYC verification flag |
| `is_top_earner` | `TINYINT(1)` | `NOT NULL DEFAULT 0` | Leaderboard status flag |

### 1.2 Consultation Booking (`consultation_bookings`)
Represents 1-on-1 virtual specialist advisory or telehealth sessions.

| Field | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `INT` | `AUTO_INCREMENT PRIMARY KEY` | Session ID |
| `booking_code` | `VARCHAR(40)` | `UNIQUE NOT NULL` | Public identifier (e.g., `CNS-3770`) |
| `expert_id` | `INT` | `NOT NULL, FK -> experts(id)` | Specialist profile reference |
| `expert_user_id`| `INT` | `DEFAULT NULL, FK -> users(id)`| User account of specialist |
| `user_id` | `INT` | `DEFAULT NULL, FK -> users(id)`| User account of paying client |
| `user_name` | `VARCHAR(120)`| `NOT NULL` | Client name snapshot |
| `user_email` | `VARCHAR(150)`| `NOT NULL` | Client email snapshot |
| `package_name` | `VARCHAR(150)`| `DEFAULT 'Standard'` | Service package title |
| `package_duration`| `VARCHAR(50)`| `DEFAULT '30 mins'` | Session duration |
| `fee` | `DECIMAL(10,2)`| `NOT NULL` | Total booking fee in BDT |
| `escrow_status` | `ENUM(...)` | `NOT NULL DEFAULT 'held_in_escrow'` | `'held_in_escrow'`, `'released_to_specialist'`, `'refunded_to_client'` |
| `meeting_link` | `VARCHAR(255)`| `DEFAULT NULL` | Clean room URL (e.g. `/consult?room=CNS-3770`) |
| `status` | `ENUM(...)` | `NOT NULL DEFAULT 'confirmed'`| `'confirmed'`, `'in_progress'`, `'completed'`, `'cancelled'`, `'refunded'` |
| `created_at` | `TIMESTAMP` | `NOT NULL DEFAULT CURRENT_TIMESTAMP` | Booking creation timestamp |
| `completed_at` | `DATETIME` | `DEFAULT NULL` | Timestamp when escrow was released |
| `cancelled_at` | `DATETIME` | `DEFAULT NULL` | Timestamp when booking was cancelled |
| `cancel_reason` | `VARCHAR(255)`| `DEFAULT NULL` | Audit cancellation reason |

### 1.3 Financial Ledger (`transactions`)
Immutable audit trail recording all monetary movements.

| Field | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `BIGINT` | `AUTO_INCREMENT PRIMARY KEY` | Transaction log ID |
| `transaction_code`| `VARCHAR(50)`| `UNIQUE NOT NULL` | Unique audit reference (e.g. `TX-1788851448`) |
| `wallet_id` | `INT` | `NOT NULL` | Affected wallet reference |
| `user_id` | `INT` | `NOT NULL, FK -> users(id)` | Affected user reference |
| `amount` | `DECIMAL(12,2)`| `NOT NULL` | Transaction gross amount |
| `fee` | `DECIMAL(12,2)`| `NOT NULL DEFAULT 0.00` | Platform fee deducted |
| `type` | `VARCHAR(50)` | `NOT NULL` | Event type: `'deposit'`, `'escrow_hold'`, `'escrow_release'`, `'consultation_escrow'`, `'consultation_payout'`, `'refund'`, `'withdrawal'` |
| `reference_id` | `VARCHAR(80)` | `DEFAULT NULL` | Foreign entity key (`taskId` or `bookingCode`) |
| `reference_type`| `VARCHAR(50)` | `DEFAULT NULL` | Entity type (`'task'`, `'consultation'`, `'wallet'`) |
| `status` | `ENUM(...)` | `NOT NULL DEFAULT 'completed'` | `'pending'`, `'completed'`, `'failed'`, `'reversed'` |
| `description` | `VARCHAR(255)` | `NOT NULL` | Human-readable audit narrative |
| `balance_before`| `DECIMAL(12,2)`| `NOT NULL DEFAULT 0.00` | Wallet snapshot before execution |
| `balance_after` | `DECIMAL(12,2)`| `NOT NULL DEFAULT 0.00` | Wallet snapshot after execution |

---

## 2. State Transition Diagrams

### 2.1 Consultation Booking Lifecycle
```text
[ Created / Booked ]
        │
        ▼ (Client Wallet debited; Fee held in escrow)
  [ confirmed ]
        │
        ├───> (Session Starts) ───> [ in_progress ]
        │                                  │
        │                                  ├───> [ completed ] (Client/Admin confirms; Fee released to Specialist)
        │                                  │
        │                                  └───> [ cancelled ] (Client/Specialist/Admin cancels; Fee refunded to Client)
        │
        └───> (Cancelled prior to start) ───> [ cancelled ] (Fee refunded to Client)
```

### 2.2 Task Milestone & Escrow Lifecycle
```text
[ open ] ───> [ applied ]
                  │
                  ▼ (Client accepts bid; Task budget locked in escrow)
            [ in_progress ]
                  │
                  ▼ (Worker uploads file/link delivery)
             [ delivered ]
                  │
                  ├───> (Client requests changes) ───> [ in_progress ]
                  │
                  └───> (Client approves) ───> [ completed ]
                                                      │
                                                      ├──> 10% platform fee retained
                                                      ├──> 90% credited to worker wallet
                                                      └──> Client leaves review & rating
```

---

## 3. Data Integrity & Concurrency Rules

1. **Atomic Payout Invariant**:
   A booking or milestone payout query MUST include state validation in the `WHERE` clause:
   ```sql
   UPDATE consultation_bookings 
   SET status = 'completed', escrow_status = 'released_to_specialist', completed_at = NOW() 
   WHERE id = ? AND status IN ('confirmed', 'in_progress');
   ```
   If affected rows === 0, the operation halts immediately, preventing double disbursement.

2. **Negative Balance Invariant**:
   A wallet debit MUST strictly verify available funds at execution time:
   ```sql
   UPDATE users 
   SET wallet_balance = wallet_balance - ? 
   WHERE id = ? AND wallet_balance >= ?;
   ```
   Prevents balances from falling below zero during concurrent transactions.

3. **Ledger Double-Entry Invariant**:
   Every balance adjustment (`adjustWallet`) MUST be paired with a corresponding `transactions` entry documenting `balance_before`, `balance_after`, and `transaction_code`.
