# Implementation Plan: XtraEarn Production Hardening and Architecture Stabilization

**Branch**: `001-production-hardening` | **Date**: 2026-09-08 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/001-production-hardening/spec.md`

---

## Summary

Hardens the XtraEarn platform against unauthorized credential access, secures consultation escrow operations, resolves dual-storage state divergence by unifying persistence under the authoritative MySQL database, sanitizes environment configurations, and establishes automated regression and security test coverage while preserving 100% of existing micro-task, wallet, consultation, and CMS functionality.

---

## Technical Context

**Language/Version**: JavaScript (Node.js >= 18.0.0, ES2022)  
**Primary Dependencies**: Express 4.19.2, mysql2 3.11.0, jsonwebtoken 9.0.2, bcryptjs 2.4.3, multer 2.2.0, pdfkit 0.20.2, cors 2.8.5, dotenv 16.4.5  
**Storage**: MySQL 8.x (`xtraearn` database, UTF8mb4, BST timezone) with fallback in-memory JSON document cache  
**Testing**: Custom Node.js assertion harness (`server/test-api.js`, `server/verify-*.js`)  
**Target Platform**: Node.js runtime on Linux / Windows Server  
**Project Type**: Full-stack web application (Express REST API backend + Vanilla HTML5/CSS3/ES6+ SPA frontend)  
**Performance Goals**: < 100ms API response time for authenticated queries, atomic sub-second escrow release  
**Constraints**: Zero breaking changes to client-facing REST contracts or frontend SPA script bindings; no plain-text bypass passwords in code  
**Scale/Scope**: 50K+ simulated users, 170 seeded accounts, 22 database tables, 24 API router modules  

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Security Gate (Pass)**: Eliminates all hardcoded plain-text credential bypasses (`password123`). Enforces cryptographic Bcrypt salting.
- **Authorization Gate (Pass)**: Consultation booking completion (`/complete`) and cancellation (`/cancel`) guarded with strict client ownership or administrator role verification.
- **Data Integrity Gate (Pass)**: Resolves split-brain storage divergence; runtime mutations commit directly to MySQL database rather than vanishing in-memory.
- **Secrets Isolation Gate (Pass)**: Purges committed third-party API keys and SMTP credentials from repository files.
- **Preservation Gate (Pass)**: Existing functional test suite and user journeys (tasks, bidding, deliveries, wallet deposits, reviews) remain 100% backward compatible.

---

## Project Structure

### Documentation (this feature)

```text
specs/001-production-hardening/
├── plan.md              # Implementation plan (this document)
├── research.md          # Technical decisions and architecture rationale
├── data-model.md        # Entity definitions, schema constraints, state transitions
├── quickstart.md        # Step-by-step verification and test execution guide
├── contracts/           # API interface contracts
│   ├── auth.contract.md
│   ├── consultation.contract.md
│   └── wallet.contract.md
└── checklists/
    └── requirements.md  # Specification quality checklist
```

### Source Code Layout

```text
/
├── server/
│   ├── index.js                     # Express entrypoint, environment sanitizer, router mounting
│   ├── db.js                        # MySQL connection pool and dynamic mode detection
│   ├── store.js                     # Core business logic and query store (authoritative MySQL writes)
│   ├── notificationService.js       # In-app feed and raw TLS SMTP client
│   ├── invoiceService.js            # PDFKit invoice and receipt generator
│   ├── pricingEngine.js             # 11-level priority monetization engine
│   ├── monetizationStore.js         # Double-entry ledger and membership plans
│   ├── middleware/
│   │   └── auth.js                  # JWT token verification and adminRequired guards
│   └── routes/
│       ├── auth.js                  # Authentication routes (hardened: bypass removed)
│       ├── consult.js               # Consultation routes (hardened: ownership enforced)
│       ├── tasks.js                 # Task marketplace routes
│       ├── wallet.js                # Wallet balance and transaction routes
│       ├── deliveries.js            # Milestone submissions and review routes
│       ├── admin.js                 # Unified admin management routes
│       └── ...                      # 18 additional specialized domain routers
├── database/
│   ├── schema.sql                   # 22 relational tables, indexes, and views
│   ├── seed.sql                     # Production seed data
│   └── xtraearn_db.json             # Document seed data source
├── scripts/
│   ├── setup_mysql.js               # Database provisioning and data migration
│   └── export_seed.js               # Database snapshot export utility
├── public/                          # Frontend SPA assets (HTML, CSS, Vanilla JS)
└── tests/ (or server/test-api.js)   # Functional and security regression test harness
```

**Structure Decision**: Preserves the established monolithic repository structure while isolating security changes to `server/routes/auth.js`, `server/routes/consult.js`, and `server/store.js`.

---

## Complexity Tracking

| Item | Why Needed | Simpler Alternative Rejected Because |
| :--- | :--- | :--- |
| Single Authoritative MySQL Storage | Eliminates split-brain state where consultations and admin updates were written to memory and lost on restart. | Bi-directional JSON-SQL synchronization creates race conditions and file-locking bottlenecks. |
| Atomic SQL `WHERE status = ...` Guards | Prevents duplicate escrow payouts during concurrent client completion requests. | In-memory application mutexes fail when multi-process clusters are deployed. |
| Strict Ownership Verification | Prevents unauthorized actors from triggering fund releases on consultation bookings. | Unauthenticated room URLs or query tokens are easily shared or leaked in referrer logs. |
