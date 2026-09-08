# XtraEarn — Micro-Task Freelancing Platform

Full-stack implementation of the XtraEarn landing design: **frontend** (vanilla HTML/CSS/JS), **backend** (Node.js + Express REST API with JWT auth), and **SQL database** (MySQL schema + seed).

Turn your spare time into extra income — post tasks, find tasks, apply, get paid.

## Quick start

```bash
npm install
npm start          # or double-click start.bat on Windows
```

Open **http://localhost:3000**

> The server auto-detects MySQL. If MySQL is not running, it falls back to an
> in-memory seed of the same data (everything works, but data resets on restart).
> For persistence, set up MySQL as shown below.

## MySQL setup (optional, for persistence)

```bash
mysql -u root -p < database/schema.sql   # creates the xtraearn database + tables
mysql -u root -p < database/seed.sql     # categories, users, tasks, testimonials
```

Then point the app at your server — copy `.env.example` to `.env` and adjust:

```ini
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=xtraearn
JWT_SECRET=some-long-random-string
PORT=3000
```

## Demo accounts

All seeded users share the password **`Password123!`**

| Role       | Email                 | Who                 |
| ---------- | --------------------- | ------------------- |
| Admin      | `admin@xtraearn.com`  | System Admin        |
| Freelancer | `rakib@example.com`   | Top earner #1       |
| Freelancer | `nusrat@example.com`  | Translator          |
| Client     | `bdshop@example.com`  | Posts the tasks     |
| Client     | `farhana@example.com` | Business owner      |

## Features

**Frontend** (`public/`)
- Landing page matching the design: dark hero with phone mockup + floating task cards, action cards, hero search, time chips, popular hashtags
- Popular categories, How-it-works steps + Why panel, featured tasks, trust badges, top earners, testimonials, CTA banner, full footer — all rendered from the live API
- **Find Tasks** page: category/time filters, sorting, live search, empty states
- **Task detail** page: full info, applicants list, one-click **Apply / Withdraw**
- **Task owner view**: Accept / Reject applications — accepting moves the task to *In progress* and auto-rejects other pending applicants
- **Login / Sign up** modal (JWT stored in localStorage), user dropdown menu
- **Post a Task** modal with validation (login required)
- Toast notifications, responsive layout (desktop → mobile), no frameworks

**Backend** (`server/`, Express + Node 18+)
- `POST /api/auth/register` — create account (freelancer/client), bcrypt-hashed passwords
- `POST /api/auth/login` — returns JWT
- `GET  /api/auth/me` — current user (auth required)
- `GET  /api/tasks` — search, filter by category/max duration/min budget, sort, pagination
- `GET  /api/tasks/:id` — task detail + applicants
- `POST /api/tasks` — post a task (auth required, validated)
- `DELETE /api/tasks/:id` — owner deletes their open task
- `POST /api/tasks/:id/apply` — apply (one application per task per user, can't apply to your own)
- `DELETE /api/tasks/:id/apply` — withdraw application
- `POST /api/applications/:id/accept` — owner hires a freelancer → task becomes in-progress, other pending applications auto-rejected
- `POST /api/applications/:id/reject` — owner declines an application
- `GET  /api/my/applications` — tasks I applied to
- `GET  /api/categories` | `GET /api/earners` | `GET /api/testimonials` | `GET /api/stats`
- `GET  /api/health` — `{ ok, mode: "mysql" | "memory" }`

**Database** (`database/`)
- `schema.sql` — tables `users`, `categories`, `tasks`, `applications`, `testimonials` with FKs, indexes, and a `v_top_earners` view
- `seed.sql` — 10 users, 10 categories, 12 tasks, 4 testimonials (bcrypt demo password)

## Project structure

```
├── database/
│   ├── schema.sql        # MySQL schema
│   └── seed.sql          # demo data
├── server/
│   ├── index.js          # Express app + static hosting
│   ├── db.js             # MySQL pool + automatic memory fallback
│   ├── store.js          # data access (SQL + in-memory implementations)
│   ├── seedData.js       # JS mirror of seed.sql for fallback mode
│   ├── middleware/auth.js# JWT sign/verify middleware
│   ├── routes/           # auth, tasks, categories, earners, testimonials, stats
│   └── test-api.js       # 40-case API smoke test (node server/test-api.js)
├── public/
│   ├── index.html        # landing page
│   ├── tasks.html        # browse tasks
│   ├── task.html         # task detail
│   ├── css/styles.css
│   └── js/               # shared.js (api/auth/ui), app.js, tasks.js, task.js
└── package.json
```

## Scripts

```bash
npm start        # start the server (http://localhost:3000)
npm run dev      # start with auto-reload on file changes
node server/test-api.js   # run API smoke tests (server must be running)
```
