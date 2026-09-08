require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const db = require('./db');

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// tiny request logger
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) console.log(`${req.method} ${req.originalUrl}`);
  next();
});

const store = require('./store');
const { authRequired } = require('./middleware/auth');

// API routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/tasks', require('./routes/tasks'));
app.get('/api/my/applications', authRequired, async (req, res, next) => {
  try { res.json({ items: await store.myApplications(req.user.id) }); }
  catch (err) { next(err); }
});
app.use('/api/categories', require('./routes/categories'));
app.use('/api/applications', require('./routes/applications'));
app.use('/api/users', require('./routes/users'));
app.use('/api/wallet', require('./routes/wallet'));
app.use('/api/deliveries', require('./routes/deliveries'));
app.use('/api/tasks/:taskId/messages', require('./routes/messages'));
app.use('/api/earners', require('./routes/earners'));
app.use('/api/experts', require('./routes/experts'));
app.use('/api/testimonials', require('./routes/testimonials'));
app.use('/api/stats', require('./routes/stats'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/cms', require('./routes/cms'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/invoices', require('./routes/invoices'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/consult', require('./routes/consult'));
app.use('/api/referrals', require('./routes/referrals'));
app.use('/api/campaigns', require('./routes/campaigns'));
app.use('/api/loyalty', require('./routes/loyalty'));
app.use('/api/professionals', require('./routes/professionals'));
app.use('/api/pricing', require('./routes/pricing'));

app.get('/api/health', (req, res) => res.json({ ok: true, mode: db.mode(), time: new Date().toISOString() }));

app.use('/api', (req, res) => res.status(404).json({ error: 'API route not found' }));

// 1-on-1 Consultation Live Meeting Room SPA route
app.get(['/consult/:roomId', '/consult', '/meet/:roomId', '/meet'], (req, res) => {
  res.sendFile(path.join(__dirname, '../public/consult.html'));
});

// Dynamic SPA clean URL parameterized routes
app.get(['/task/:id', '/task'], (req, res) => {
  res.sendFile(path.join(__dirname, '../public/task.html'));
});

app.get(['/profile/:id', '/profile'], (req, res) => {
  res.sendFile(path.join(__dirname, '../public/profile.html'));
});

// Dynamic CMS Public Page Builder renderer route
app.get(['/page/:slug', '/page', '/p/:slug', '/campaign/:slug'], (req, res) => {
  res.sendFile(path.join(__dirname, '../public/page.html'));
});

// redirect any direct .html requests to clean URLs
app.use((req, res, next) => {
  if (req.path.endsWith('.html') && !req.path.startsWith('/api')) {
    const cleanPath = req.path.replace(/\.html$/, '').replace(/\/index$/, '') || '/';
    const query = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
    return res.redirect(301, cleanPath + query);
  }
  next();
});

// static frontend with clean URL extension resolution
app.use(express.static(path.join(__dirname, '..', 'public'), {
  extensions: ['html'],
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html') || filePath.endsWith('.js') || filePath.endsWith('.css')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }
}));

// GitHub-style vanity root user profile handle (e.g. /admin_super, /@admin_super, /atiqurcse)
app.get(['/@:handle', '/:handle'], async (req, res, next) => {
  const rawHandle = req.params.handle || '';
  const cleanHandle = rawHandle.toLowerCase().trim().replace(/^@/, '');

  if (!cleanHandle || cleanHandle.includes('.') || cleanHandle.length < 3 || cleanHandle.length > 30) {
    return next();
  }

  const reserved = new Set([
    'api', 'consult', 'meet', 'task', 'tasks', 'profile', 'page', 'p', 'campaign',
    'admin', 'login', 'register', 'wallet', 'dashboard', 'affiliates', 'index',
    'css', 'js', 'images', 'uploads', 'fonts', 'assets', 'favicon', 'robots'
  ]);
  if (reserved.has(cleanHandle)) {
    return next();
  }

  try {
    const user = await store.getUserByUsername(cleanHandle);
    if (user) {
      return res.sendFile(path.join(__dirname, '../public/profile.html'));
    }
  } catch (err) {
    console.error('[vanity profile lookup error]', err);
  }

  // If handle format is valid username syntax, serve profile.html so client displays 404 Profile
  if (/^[a-zA-Z0-9_]{3,30}$/.test(cleanHandle)) {
    return res.sendFile(path.join(__dirname, '../public/profile.html'));
  }

  next();
});

// central error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[error]', err.message || err);
  res.status(err.status || 500).json({ error: err.message || 'Something went wrong' });
});

db.init().then(() => {
  app.listen(PORT, () => {
    console.log(`XtraEarn running  ->  http://localhost:${PORT}`);
    console.log(`API health check ->  http://localhost:${PORT}/api/health`);
  });
});
