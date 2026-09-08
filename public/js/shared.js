/* ============================================================
   XtraEarn - shared helpers: API client, auth, header, modals
   ============================================================ */

const API_BASE = '/api';

var Auth = {
  get token() { return localStorage.getItem('xe_token') || ''; },
  get user() {
    try { return JSON.parse(localStorage.getItem('xe_user') || 'null'); }
    catch { return null; }
  },
  save(token, user) {
    localStorage.setItem('xe_token', token);
    localStorage.setItem('xe_user', JSON.stringify(user));
    if (typeof renderHeader === 'function') renderHeader();
  },
  logout() {
    localStorage.removeItem('xe_token');
    localStorage.removeItem('xe_user');
    if (typeof renderHeader === 'function') renderHeader();
    if (typeof toast === 'function') toast('Logged out. See you soon!', 'info');
    setTimeout(() => { window.location.href = '/'; }, 500);
  },
  async init() {
    if (!Auth.token) return null;
    try {
      const me = await api('/users/me');
      if (me && me.user) {
        Auth.save(Auth.token, me.user);
        return me.user;
      }
    } catch {
      // Ignore token check fail
    }
    return Auth.user;
  }
};
if (typeof window !== 'undefined') window.Auth = Auth;

async function api(path, options = {}) {
  let method = 'GET';
  let body;
  if (typeof options === 'string') {
    method = options.toUpperCase();
    body = arguments[2];
  } else if (options && typeof options === 'object') {
    method = (options.method || 'GET').toUpperCase();
    body = options.body;
  }
  const headers = { 'Content-Type': 'application/json' };
  if (typeof Auth !== 'undefined' && Auth.token) headers.Authorization = `Bearer ${Auth.token}`;
  const normalizedPath = path.startsWith('/api') ? path : (API_BASE + path);
  const res = await fetch(normalizedPath, {
    method, headers,
    body: body !== undefined ? JSON.stringify(body) : undefined
  });
  let data = null;
  try { data = await res.json(); } catch { /* no body */ }

  if (!res.ok) {
    const err = new Error((data && data.error) || `Request failed (${res.status})`);
    err.status = res.status;
    if (data) Object.assign(err, { needed: data.needed, balance: data.balance });
    throw err;
  }
  return data;
}
if (typeof window !== 'undefined') window.api = api;

/* ---------- formatting helpers ---------- */
const money = n => '৳' + Number(n || 0).toLocaleString('en-US');
const initials = name => String(name || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0].toUpperCase()).join('');
const timeLabel = m => (m >= 60 ? (m % 60 === 0 ? `${m / 60} hour${m >= 120 ? 's' : ''}` : `${Math.floor(m / 60)}h ${m % 60}m`) : `${m} min`);

function starsHtml(rating, count, small = false) {
  const full = Math.round(Number(rating) || 0);
  const stars = '★'.repeat(full) + '<span class="stars-off">' + '★'.repeat(5 - full) + '</span>';
  const cnt = count !== undefined ? `<span class="stars-count">(${count})</span>` : '';
  return `<span class="stars ${small ? 'stars-sm' : ''}">${stars} ${Number(rating || 0).toFixed(1)} ${cnt}</span>`;
}

function avatarHtml(name, color, size = 44, extra = '') {
  return `<span class="avatar" style="width:${size}px;height:${size}px;background:${color || '#22C55E'};font-size:${Math.round(size * 0.36)}px">${initials(name)}${extra}</span>`;
}

function categoryThumb(task) {
  const gradients = {
    design: 'linear-gradient(135deg,#34D399,#059669)',
    'writing-content': 'linear-gradient(135deg,#60A5FA,#2563EB)',
    'video-audio': 'linear-gradient(135deg,#1E293B,#0F172A)',
    translation: 'linear-gradient(135deg,#22D3EE,#0891B2)',
    'ai-tasks': 'linear-gradient(135deg,#FBBF24,#D97706)',
    data: 'linear-gradient(135deg,#34D399,#0D9488)',
    research: 'linear-gradient(135deg,#A7F3D0,#10B981)',
    testing: 'linear-gradient(135deg,#C084FC,#7C3AED)',
    'opinion-feedback': 'linear-gradient(135deg,#F472B6,#DB2777)',
    'expert-help': 'linear-gradient(135deg,#818CF8,#4F46E5)',
    'mobile-local': 'linear-gradient(135deg,#2DD4BF,#0D9488)',
    'physical-help': 'linear-gradient(135deg,#4ADE80,#15803D)'
  };
  const g = gradients[task.category?.slug] || 'linear-gradient(135deg,#4ADE80,#16A34A)';
  const badges = [
    task.taskType === 'physical' ? '<span class="thumb-badge tb-physical">🤝 On-site</span>' : '',
    task.isUrgent ? '<span class="thumb-badge tb-urgent">⚡ Urgent</span>' : ''
  ].filter(Boolean).join('');
  return `<div class="task-thumb" style="background:${g}">
    <span class="task-thumb-emoji">${task.emoji || '✅'}</span>
    <span class="task-thumb-dur">⏱ ${timeLabel(task.durationMinutes)}</span>
    ${badges}
  </div>`;
}

function taskCardHtml(t) {
  const loc = t.taskType === 'physical' && (t.area || t.district)
    ? `<span class="task-loc">📍 ${escapeHtml([t.area, t.district].filter(Boolean).join(', '))}</span>` : '';
  return `<a class="task-card" href="/task?id=${t.id}">
    ${categoryThumb(t)}
    <div class="task-card-body">
      <span class="chip chip-cat">${t.category?.name || 'Task'}</span>
      <h3 class="task-title">${escapeHtml(t.title)}</h3>
      ${loc}
      <div class="task-meta">
        <span class="task-dur">⏱ ${timeLabel(t.durationMinutes)}</span>
        <span class="task-budget">${money(t.budget)}</span>
      </div>
      <div class="task-rating">${starsHtml(t.rating, t.ratingCount, true)}</div>
    </div>
  </a>`;
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
if (typeof window !== 'undefined') window.escapeHtml = escapeHtml;

const statusLabel = s => ({ open: '🟢 Open', in_progress: '🟡 In progress', delivered: '🟠 Delivered — review', completed: '✅ Completed' }[s] || s);
if (typeof window !== 'undefined') window.statusLabel = statusLabel;

/* ---------- toast ---------- */
let toastTimer = null;
function toast(msg, type = 'success') {
  let el = document.getElementById('xe-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'xe-toast';
    document.body.appendChild(el);
  }
  el.className = `toast toast-${type} show`;
  el.innerHTML = (type === 'success' ? '✅ ' : type === 'error' ? '⚠️ ' : 'ℹ️ ') + escapeHtml(msg);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3600);
}
if (typeof window !== 'undefined') window.toast = toast;

/* ---------- modals ---------- */
function openModal(id) {
  const m = typeof id === 'string' ? document.getElementById(id) : id;
  if (m) {
    m.classList.add('open', 'show');
    m.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }
}
if (typeof window !== 'undefined') window.openModal = openModal;

function closeModal(id) {
  const m = typeof id === 'string' ? document.getElementById(id) : id;
  if (m) {
    m.classList.remove('open', 'show');
    m.style.display = 'none';
    document.body.style.overflow = '';
  }
}
if (typeof window !== 'undefined') window.closeModal = closeModal;

document.addEventListener('click', e => {
  if (e.target.classList && (e.target.classList.contains('modal-overlay') || e.target.classList.contains('adm-modal-backdrop'))) {
    closeModal(e.target.id);
  }
  const closer = e.target.closest('[data-close]');
  if (closer) closeModal(closer.dataset.close);
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') document.querySelectorAll('.modal-overlay.open, .adm-modal-backdrop.open').forEach(m => closeModal(m.id));
});

/* ---------- auth modal ---------- */
function requireLogin(message = 'Please login to continue') {
  if (Auth.user) return true;
  toast(message, 'info');
  openAuthModal('login');
  return false;
}

function openAuthModal(tab = 'login') {
  ensureAuthModal();
  switchAuthTab(tab);
  openModal('xe-auth-modal');
}

function switchAuthTab(tab) {
  document.querySelectorAll('#xe-auth-modal .auth-tab').forEach(b =>
    b.classList.toggle('active', b.dataset.tab === tab));
  document.getElementById('xe-login-form').style.display = tab === 'login' ? '' : 'none';
  document.getElementById('xe-register-form').style.display = tab === 'register' ? '' : 'none';
  const demo = document.getElementById('xe-demo-hint');
  if (demo) demo.style.display = tab === 'login' ? '' : 'none';
}

function ensureAuthModal() {
  if (document.getElementById('xe-auth-modal')) return;
  const wrap = document.createElement('div');
  wrap.innerHTML = `
  <div class="modal-overlay" id="xe-auth-modal">
    <div class="modal">
      <button class="modal-x" data-close="xe-auth-modal" aria-label="Close">✕</button>
      <div class="modal-brand"><span class="logo-x">X</span> XtraEarn</div>
      <div class="auth-tabs">
        <button class="auth-tab active" data-tab="login">Login</button>
        <button class="auth-tab" data-tab="register">Sign Up</button>
      </div>
      <p id="xe-demo-hint" class="demo-hint">Demo: <code>rakib@example.com</code> / <code>Password123!</code></p>
      <form id="xe-login-form" autocomplete="on">
        <label>Email or Username<input type="text" name="email" id="xe-login-identifier" placeholder="you@example.com" required></label>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px; margin-bottom:4px;">
          <label style="margin-bottom:0; font-size:0.82rem; font-weight:600; color:#334155;">Password</label>
          <a href="#" id="xe-forgot-pass-btn" onclick="openForgotPasswordModal(event)" style="font-size:0.8rem; color:#10B981; font-weight:700; text-decoration:none; cursor:pointer;">Forgot password?</a>
        </div>
        <input type="password" name="password" placeholder="••••••••" minlength="8" required style="width:100%; box-sizing:border-box; margin-bottom:14px; padding:10px 12px; border:1px solid #CBD5E1; border-radius:8px; font-size:0.9rem;">
        <button class="btn btn-green btn-block" type="submit">Login</button>
        <p class="auth-swap">New to XtraEarn? <a href="#" data-tab="register">Create a free account</a></p>
      </form>
      <form id="xe-register-form" style="display:none" autocomplete="on">
        <label>Full name<input type="text" name="name" placeholder="e.g. Rakib Hasan" required></label>
        <label>Email<input type="email" name="email" placeholder="you@example.com" required></label>
        <label>Password<input type="password" name="password" placeholder="At least 8 characters" minlength="8" required></label>
        <label>I want to
          <select name="role">
            <option value="freelancer">Earn by doing tasks</option>
            <option value="client">Hire people for tasks</option>
          </select>
        </label>
        <label>Referral Code (Optional)
          <input type="text" name="referralCode" id="xe-reg-ref-code" placeholder="e.g. JOINNOW" style="text-transform:uppercase">
        </label>
        <button class="btn btn-green btn-block" type="submit">Create account</button>
        <p class="auth-swap">Already have an account? <a href="#" data-tab="login">Login</a></p>
      </form>
    </div>
  </div>`;
  document.body.appendChild(wrap);

  // Auto-populate referral code if stored from URL
  const savedRef = sessionStorage.getItem('xe_ref_code');
  if (savedRef) {
    const refInp = document.getElementById('xe-reg-ref-code');
    if (refInp) refInp.value = savedRef;
  }

  wrap.querySelectorAll('#xe-auth-modal .auth-tab, #xe-auth-modal .auth-swap a').forEach(el => {
    el.addEventListener('click', e => { e.preventDefault(); switchAuthTab(el.dataset.tab); });
  });

  document.getElementById('xe-login-form').addEventListener('submit', async e => {
    e.preventDefault();
    const f = e.target;
    const btn = f.querySelector('button[type=submit]');
    btn.disabled = true; btn.textContent = 'Logging in...';
    try {
      const data = await api('/auth/login', { method: 'POST', body: { email: f.email.value, password: f.password.value } });
      Auth.save(data.token, data.user);
      closeModal('xe-auth-modal');
      toast(`Welcome back, ${data.user.name.split(' ')[0]}! 🎉`);
      document.dispatchEvent(new CustomEvent('xe:auth'));
    } catch (err) { toast(err.message, 'error'); }
    btn.disabled = false; btn.textContent = 'Login';
  });

  document.getElementById('xe-register-form').addEventListener('submit', async e => {
    e.preventDefault();
    const f = e.target;
    const btn = f.querySelector('button[type=submit]');
    btn.disabled = true; btn.textContent = 'Creating account...';
    try {
      const data = await api('/auth/register', {
        method: 'POST',
        body: {
          name: f.name.value,
          email: f.email.value,
          password: f.password.value,
          role: f.role.value,
          referralCode: f.referralCode ? f.referralCode.value.trim() : undefined
        }
      });
      Auth.save(data.token, data.user);
      closeModal('xe-auth-modal');
      toast(`Welcome to XtraEarn, ${data.user.name.split(' ')[0]}! 🎉 Let's complete your verification.`);
      document.dispatchEvent(new CustomEvent('xe:auth'));
      setTimeout(() => {
        openVerificationWizard(1);
      }, 400);
    } catch (err) { toast(err.message, 'error'); }
    btn.disabled = false; btn.textContent = 'Create account';
  });
}

/* ---------- Interactive Verification & Onboarding Wizard ---------- */
let currentVwStep = 1;
let currentVwStatus = null;

async function openVerificationWizard(targetStep = 1) {
  if (!Auth.user) {
    return requireLogin('Please login to verify your account.');
  }
  ensureVerificationWizardModal();
  currentVwStep = Number(targetStep) || 1;
  openModal('xe-verification-modal');
  await refreshVerificationWizardState();
}
if (typeof window !== 'undefined') window.openVerificationWizard = openVerificationWizard;

async function refreshVerificationWizardState() {
  try {
    const status = await api('/users/me/verification-status');
    currentVwStatus = status;
    renderVerificationWizard();
  } catch (err) {
    console.error('Failed to load verification status:', err);
  }
}

function ensureVerificationWizardModal() {
  if (document.getElementById('xe-verification-modal')) return;
  const wrap = document.createElement('div');
  wrap.innerHTML = `
  <div class="modal-overlay" id="xe-verification-modal">
    <div class="modal vw-modal">
      <div class="vw-header">
        <button class="modal-x" data-close="xe-verification-modal" aria-label="Close" style="color:#fff; top:18px; right:18px;">✕</button>
        <div class="vw-title-row">
          <h3><span>🛡️</span> Account Verification & Profile Studio</h3>
          <span id="vw-pct-tag" style="background:#059669; color:#fff; font-size:0.75rem; font-weight:700; padding:4px 10px; border-radius:999px;">0% Verified</span>
        </div>
        <p class="vw-subtitle">Complete your identity documents, contact verification, and payout method to unlock all perks and instant withdrawals.</p>
        <div class="vw-progress-wrap">
          <div id="vw-progress-bar" class="vw-progress-fill" style="width: 0%;"></div>
        </div>
      </div>

      <div class="vw-steps-nav">
        <button class="vw-step-tab active" data-vw-step="1" onclick="switchVwStep(1)">
          <span>1. Contact</span>
          <small>Email & Mobile</small>
        </button>
        <button class="vw-step-tab" data-vw-step="2" onclick="switchVwStep(2)">
          <span>2. Profile</span>
          <small>Handle & Bio</small>
        </button>
        <button class="vw-step-tab" data-vw-step="3" onclick="switchVwStep(3)">
          <span>3. Documents</span>
          <small>NID / Passport</small>
        </button>
        <button class="vw-step-tab" data-vw-step="4" onclick="switchVwStep(4)">
          <span>4. Payout</span>
          <small>bKash / Bank</small>
        </button>
      </div>

      <div class="vw-body" id="vw-body-content">
        <!-- Injected dynamically -->
      </div>
    </div>
  </div>`;
  document.body.appendChild(wrap);
}

function switchVwStep(step) {
  currentVwStep = step;
  renderVerificationWizard();
}
if (typeof window !== 'undefined') window.switchVwStep = switchVwStep;

function renderVerificationWizard() {
  const body = document.getElementById('vw-body-content');
  if (!body) return;
  const s = currentVwStatus || {
    emailVerified: false,
    phoneVerified: false,
    identityVerified: false,
    paymentVerified: false,
    kycStatus: 'none',
    verificationPct: 0
  };
  const u = Auth.user || {};

  const pctTag = document.getElementById('vw-pct-tag');
  if (pctTag) pctTag.textContent = `${s.verificationPct || 0}% Verified`;
  const bar = document.getElementById('vw-progress-bar');
  if (bar) bar.style.width = `${Math.max(5, s.verificationPct || 0)}%`;

  document.querySelectorAll('.vw-step-tab').forEach(tab => {
    const st = Number(tab.dataset.vwStep);
    tab.classList.toggle('active', st === currentVwStep);
    let isDone = false;
    if (st === 1) isDone = s.emailVerified && s.phoneVerified;
    if (st === 2) isDone = Boolean(u.username && u.profession);
    if (st === 3) isDone = s.identityVerified || s.kycStatus === 'pending';
    if (st === 4) isDone = s.paymentVerified;
    tab.classList.toggle('completed', isDone);
  });

  if (currentVwStep === 1) {
    body.innerHTML = `
      <div style="margin-bottom: 20px;">
        <h4 style="margin: 0 0 4px; font-size: 1.05rem; color:#0F172A;">Step 1: Contact & Security Verification</h4>
        <p style="margin:0; font-size:0.82rem; color:var(--muted);">Verify your primary email and Bangladesh mobile number for secure notifications and instant SMS OTP authentication.</p>
      </div>

      <div class="vw-verify-card">
        <div class="vw-verify-head">
          <div class="vw-verify-title">
            <span>✉️</span> Primary Email Address
          </div>
          <span class="pv2-status-pill ${s.emailVerified ? 'pv2-status-pill-verified' : 'pv2-status-pill-unverified'}">
            ${s.emailVerified ? '✔ Verified' : '✕ Unverified'}
          </span>
        </div>
        <div style="font-size:0.88rem; color:#334155; margin-bottom: 8px;">
          <b>${escapeHtml(u.email || s.email || '')}</b>
        </div>
        ${s.emailVerified ? `
          <div style="color:#059669; font-size:0.82rem; font-weight:600; display:flex; align-items:center; gap:6px;">
            <span>🛡️</span> Email verified for account security & critical notifications.
          </div>
        ` : `
          <div id="vw-email-action-row">
            <button class="btn btn-outline-primary btn-sm" onclick="sendEmailOtpFromWizard()" id="vw-btn-send-email-otp">
              Send 6-Digit Email Code
            </button>
          </div>
          <div id="vw-email-otp-box" style="display:none; margin-top:12px;">
            <div class="vw-input-group">
              <input type="text" id="vw-email-otp-input" placeholder="Enter 6-digit code" maxlength="6" style="letter-spacing:4px; font-weight:700; text-align:center;">
              <button class="btn btn-green btn-sm" onclick="confirmEmailOtpFromWizard()" id="vw-btn-confirm-email">Verify Email</button>
            </div>
            <div id="vw-email-demo-hint" class="vw-demo-code" style="display:none;"></div>
          </div>
        `}
      </div>

      <div class="vw-verify-card">
        <div class="vw-verify-head">
          <div class="vw-verify-title">
            <span>📱</span> Mobile Number (SMS OTP)
          </div>
          <span class="pv2-status-pill ${s.phoneVerified ? 'pv2-status-pill-verified' : 'pv2-status-pill-unverified'}">
            ${s.phoneVerified ? '✔ Verified' : '✕ Unverified'}
          </span>
        </div>
        ${s.phoneVerified ? `
          <div style="font-size:0.88rem; color:#334155; margin-bottom: 8px;">
            <b>${escapeHtml(u.phone || s.phone || '')}</b>
          </div>
          <div style="color:#059669; font-size:0.82rem; font-weight:600; display:flex; align-items:center; gap:6px;">
            <span>🛡️</span> 2-Factor Authentication & SMS payment alerts active.
          </div>
        ` : `
          <div style="margin-bottom: 8px;">
            <label style="font-size:0.8rem; font-weight:600; color:#475569; display:block; margin-bottom:4px;">Mobile Phone (International or Local)</label>
            <div style="display:flex; gap:8px;">
              <select id="vw-phone-dial-code" style="width:112px; padding:9px 6px; border:1.5px solid #CBD5E1; border-radius:8px; font-size:0.84rem; outline:none; background:#fff; cursor:pointer;">
                <option value="+880">🇧🇩 +880</option>
                <option value="+1">🇺🇸 +1</option>
                <option value="+44">🇬🇧 +44</option>
                <option value="+971">🇦🇪 +971</option>
                <option value="+966">🇸🇦 +966</option>
                <option value="+61">🇦🇺 +61</option>
                <option value="+91">🇮🇳 +91</option>
                <option value="+65">🇸🇬 +65</option>
                <option value="+60">🇲🇾 +60</option>
                <option value="+49">🇩🇪 +49</option>
                <option value="">🌐 Other</option>
              </select>
              <input type="tel" id="vw-phone-input" value="${escapeHtml(u.phone || s.phone || '')}" placeholder="e.g. 01712345678 or 2025550143" style="flex:1; padding:9px 12px; border:1.5px solid #CBD5E1; border-radius:8px; font-size:0.9rem; outline:none;">
              <button class="btn btn-outline-primary btn-sm" onclick="sendPhoneOtpFromWizard()" id="vw-btn-send-phone-otp">Send SMS OTP</button>
            </div>
          </div>
          <div id="vw-phone-otp-box" style="display:none; margin-top:12px;">
            <div class="vw-input-group">
              <input type="text" id="vw-phone-otp-input" placeholder="Enter 6-digit SMS OTP" maxlength="6" style="letter-spacing:4px; font-weight:700; text-align:center;">
              <button class="btn btn-green btn-sm" onclick="confirmPhoneOtpFromWizard()" id="vw-btn-confirm-phone">Verify Phone</button>
            </div>
            <div id="vw-phone-demo-hint" class="vw-demo-code" style="display:none;"></div>
          </div>
        `}
      </div>

      <div class="vw-footer" style="padding:16px 0 0; background:none; border:none;">
        <span style="font-size:0.8rem; color:var(--muted);">Step 1 of 4</span>
        <button class="btn btn-green" onclick="switchVwStep(2)">Proceed to Profile Details →</button>
      </div>
    `;
  } else if (currentVwStep === 2) {
    body.innerHTML = `
      <div style="margin-bottom: 20px;">
        <h4 style="margin: 0 0 4px; font-size: 1.05rem; color:#0F172A;">Step 2: Professional Profile & Public Handle</h4>
        <p style="margin:0; font-size:0.82rem; color:var(--muted);">Set up your unique @handle URL and summarize your capabilities for clients.</p>
      </div>

      <form id="vw-profile-form" onsubmit="saveProfileFromWizard(event)">
        <div style="margin-bottom: 14px;">
          <label style="display:flex; justify-content:space-between; font-size:0.84rem; font-weight:700; color:#334155; margin-bottom:4px;">
            <span>Unique Username / Public URL Handle</span>
            <span id="vw-uname-status" style="font-size:0.75rem;"></span>
          </label>
          <div class="pv2-uname-wrap">
            <span class="pv2-uname-prefix">@</span>
            <input class="pv2-uname-input" id="vw-input-username" name="username" value="${escapeHtml(u.username || '')}" placeholder="your_unique_handle" autocomplete="off" spellcheck="false" minlength="3" maxlength="30" required>
          </div>
          <div style="font-size:0.74rem; color:#64748B; margin-top:4px;" id="vw-uname-preview">${window.location.origin}/${u.username || '...'}</div>
        </div>

        <div style="margin-bottom: 14px;">
          <label style="font-size:0.84rem; font-weight:700; color:#334155; display:block; margin-bottom:4px;">Professional Headline</label>
          <input type="text" name="title_headline" value="${escapeHtml(u.title_headline || u.profession || '')}" placeholder="e.g. Senior Graphic Designer & Canva Specialist" style="width:100%; padding:9px 12px; border:1.5px solid #CBD5E1; border-radius:8px; font-size:0.9rem; outline:none;" required>
        </div>

        <div style="margin-bottom: 14px;">
          <label for="vw-input-profession" style="font-size:0.84rem; font-weight:700; color:#334155; display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
            <span>Primary Profession / Category</span>
            <span style="font-size:0.74rem; color:#10B981; font-weight:600;">⚡ Quick select</span>
          </label>
          <input type="text" id="vw-input-profession" name="profession" value="${escapeHtml(u.profession || 'Design & Creative')}" placeholder="e.g. Design & Creative" style="width:100%; padding:9px 12px; border:1.5px solid #CBD5E1; border-radius:8px; font-size:0.9rem; outline:none;" oninput="highlightVwCategoryPill(this.value)">
          <div class="pv2-cat-pills" id="vw-quick-categories" style="margin-top:6px;">
            <span class="pv2-cat-pill" onclick="selectVwCategory('Design & Creative')">🎨 Design & Creative</span>
            <span class="pv2-cat-pill" onclick="selectVwCategory('Web & Software Development')">💻 Web & Dev</span>
            <span class="pv2-cat-pill" onclick="selectVwCategory('Digital Marketing & SEO')">📱 Marketing</span>
            <span class="pv2-cat-pill" onclick="selectVwCategory('Writing & Translation')">✍️ Writing</span>
            <span class="pv2-cat-pill" onclick="selectVwCategory('Video & Animation')">🎬 Video Editing</span>
            <span class="pv2-cat-pill" onclick="selectVwCategory('Data & AI Analytics')">📊 Data & AI</span>
            <span class="pv2-cat-pill" onclick="selectVwCategory('Admin & Virtual Assistance')">💼 Virtual Assistant</span>
          </div>
        </div>

        <div style="margin-bottom: 14px;">
          <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px;">
            <label style="margin: 0; font-size:0.84rem; font-weight: 700; color: #334155;">Expertise & Skills</label>
            <span style="font-size: 0.74rem; color: #64748B;">Type & press <b>Enter</b> or <b>,</b></span>
          </div>
          <input type="hidden" id="vw-input-skills" name="skills" value="${escapeHtml(u.skills || '')}">
          <div class="pv2-skills-box" id="vw-skills-tag-box" onclick="document.getElementById('vw-skill-type-input').focus()">
            <div id="vw-skill-tags-list" style="display: flex; flex-wrap: wrap; gap: 6px;"></div>
            <input type="text" id="vw-skill-type-input" class="pv2-skill-input" placeholder="+ Add a skill (press Enter)..." autocomplete="off">
          </div>
          <div class="pv2-suggested-tray" style="margin-top:8px;">
            <div class="pv2-suggested-head">
              <span class="pv2-suggested-title">
                <span>💡</span> Suggested Skills <span id="vw-suggested-cat-badge" style="text-transform: none; color: #2563EB; font-weight: 600;">(Click to add)</span>
              </span>
              <button type="button" class="btn btn-xs btn-ghost" onclick="clearAllVwSkills()" style="font-size: 0.72rem; color: #DC2626; padding: 2px 6px;">Clear all</button>
            </div>
            <div class="pv2-suggest-pills" id="vw-suggested-skills-pills"></div>
          </div>
        </div>

        <div style="margin-bottom: 14px;">
          <label style="display:flex; justify-content:space-between; align-items:center; font-size:0.84rem; font-weight:700; color:#334155; margin-bottom:4px;">
            <span>Country & District / State</span>
            <span style="font-size:0.74rem; color:#2563EB; font-weight:600;">🌍 International & Country-Wise</span>
          </label>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <div>
              <label for="vw-select-country" style="font-size:0.75rem; color:#64748B; margin-bottom:3px; display:block; font-weight:600;">Country</label>
              <select id="vw-select-country" name="country" onchange="onVwCountryChange(this.value)" style="width:100%; padding:9px 10px; border:1.5px solid #CBD5E1; border-radius:8px; font-size:0.88rem; outline:none; background:#fff; cursor:pointer;">
              </select>
            </div>
            <div>
              <label for="vw-select-district" style="font-size:0.75rem; color:#64748B; margin-bottom:3px; display:block; font-weight:600;">District / State</label>
              <select id="vw-select-district" name="district" onchange="onVwDistrictChange(this.value)" style="width:100%; padding:9px 10px; border:1.5px solid #CBD5E1; border-radius:8px; font-size:0.88rem; outline:none; background:#fff; cursor:pointer;">
              </select>
            </div>
          </div>
          <div id="vw-custom-district-wrap" style="display:none; margin-top:8px;">
            <input type="text" id="vw-input-custom-district" placeholder="Enter custom state / district / region..." oninput="syncVwLocationValue()" style="width:100%; padding:9px 12px; border:1.5px solid #CBD5E1; border-radius:8px; font-size:0.88rem; outline:none;">
          </div>
          <input type="hidden" id="vw-input-location" name="location" value="${escapeHtml(u.location || 'Dhaka, Bangladesh')}">
        </div>

        <div style="margin-bottom: 16px;">
          <label style="font-size:0.84rem; font-weight:700; color:#334155; display:block; margin-bottom:4px;">Bio / Introduction</label>
          <textarea name="bio" rows="3" placeholder="Briefly describe your expertise, work experience, or company mission..." style="width:100%; padding:9px 12px; border:1.5px solid #CBD5E1; border-radius:8px; font-size:0.88rem; outline:none; resize:vertical;">${escapeHtml(u.bio || '')}</textarea>
        </div>

        <div class="vw-footer" style="padding:16px 0 0; background:none; border:none;">
          <button type="button" class="btn btn-ghost" onclick="switchVwStep(1)">← Back</button>
          <button type="submit" class="btn btn-green" id="vw-btn-save-profile">Save & Continue to Documents →</button>
        </div>
      </form>
    `;

    // Initialize wizard skills & category
    initVwSkills(u.skills || '');
    highlightVwCategoryPill(u.profession || 'Design & Creative');

    // Initialize cascading country & district dropdowns
    const vwCountrySel = document.getElementById('vw-select-country');
    const vwDistrictSel = document.getElementById('vw-select-district');
    const vwCustomWrap = document.getElementById('vw-custom-district-wrap');
    const vwCustomInput = document.getElementById('vw-input-custom-district');
    const vwHiddenLoc = document.getElementById('vw-input-location');

    if (window.XECurrencyAndGeo && vwCountrySel && vwDistrictSel) {
      const parsed = window.XECurrencyAndGeo.parseLocation(u.location || '');
      window.XECurrencyAndGeo.populateCountrySelect(vwCountrySel, parsed.countryCode || 'BD');
      window.XECurrencyAndGeo.populateDistrictSelect(vwDistrictSel, parsed.countryCode || 'BD', parsed.district || '');

      if (vwDistrictSel.value === '__CUSTOM__' || vwDistrictSel.value === 'Other') {
        if (vwCustomWrap) vwCustomWrap.style.display = 'block';
        if (vwCustomInput) vwCustomInput.value = parsed.district || '';
      } else {
        if (vwCustomWrap) vwCustomWrap.style.display = 'none';
        if (vwCustomInput) vwCustomInput.value = '';
      }
      if (vwHiddenLoc) vwHiddenLoc.value = u.location || '';
    }

    const vwSkillInput = document.getElementById('vw-skill-type-input');
    if (vwSkillInput && !vwSkillInput._hasListener) {
      vwSkillInput._hasListener = true;
      vwSkillInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ',') {
          e.preventDefault();
          addVwSkill(vwSkillInput.value.replace(/,/g, ''));
          vwSkillInput.value = '';
        } else if (e.key === 'Backspace' && vwSkillInput.value === '') {
          if (currentVwSkills.length > 0) {
            currentVwSkills.pop();
            renderVwSkillTags();
          }
        }
      });
    }

    const unameInput = document.getElementById('vw-input-username');
    if (unameInput) {
      let timeout = null;
      unameInput.addEventListener('input', () => {
        clearTimeout(timeout);
        const val = unameInput.value.trim().toLowerCase().replace(/^@/, '');
        const preview = document.getElementById('vw-uname-preview');
        const statusEl = document.getElementById('vw-uname-status');
        const saveBtn = document.getElementById('vw-btn-save-profile');
        if (preview) preview.textContent = `${window.location.origin}/${val || '...'}`;
        if (!val) {
          if (statusEl) { statusEl.textContent = 'Username is required'; statusEl.style.color = '#DC2626'; }
          if (saveBtn) saveBtn.disabled = true;
          return;
        }
        if (val === (u.username || '').toLowerCase()) {
          if (statusEl) { statusEl.textContent = 'Current Handle ✓'; statusEl.style.color = '#059669'; }
          if (saveBtn) saveBtn.disabled = false;
          return;
        }
        if (statusEl) { statusEl.textContent = 'Checking...'; statusEl.style.color = '#64748B'; }
        timeout = setTimeout(async () => {
          try {
            const res = await api(`/users/check-username?username=${encodeURIComponent(val)}&exclude_id=${u.id}`);
            if (res.available) {
              if (statusEl) { statusEl.textContent = '✓ Available'; statusEl.style.color = '#059669'; }
              if (saveBtn) saveBtn.disabled = false;
            } else {
              if (statusEl) { statusEl.textContent = `✕ ${res.error || 'Taken'}`; statusEl.style.color = '#DC2626'; }
              if (saveBtn) saveBtn.disabled = true;
            }
          } catch (e) {
            if (statusEl) { statusEl.textContent = `✕ ${e.message}`; statusEl.style.color = '#DC2626'; }
          }
        }, 350);
      });
    }
  } else if (currentVwStep === 3) {
    const isDocVerified = Boolean(s.identityVerified);
    const isDocPending = s.kycStatus === 'pending';

    body.innerHTML = `
      <div style="margin-bottom: 18px;">
        <h4 style="margin: 0 0 4px; font-size: 1.05rem; color:#0F172A;">Step 3: Identity & Credential Verification (KYC)</h4>
        <p style="margin:0; font-size:0.82rem; color:var(--muted);">Verify your National ID, Passport, Academic Qualifications, or Professional Licenses to receive Verified Badges.</p>
      </div>

      ${isDocVerified ? `
        <div style="background:#ECFDF5; border:1.5px solid #A7F3D0; border-radius:14px; padding:20px; text-align:center; margin-bottom:20px;">
          <span style="font-size:2.5rem; display:block; margin-bottom:8px;">🛡️</span>
          <h4 style="color:#065F46; margin:0 0 6px;">Identity & Credentials Verified</h4>
          <p style="color:#047857; font-size:0.84rem; margin:0 0 12px;">Your verified credentials are recognized across the platform. You can upload additional academic or professional certifications anytime below.</p>
          <button type="button" class="btn btn-sm btn-outline-primary" onclick="toggleAdditionalKycForm()">+ Submit Another Document / Certification</button>
        </div>
      ` : (isDocPending ? `
        <div style="background:#FEF3C7; border:1.5px solid #FDE68A; border-radius:14px; padding:20px; text-align:center; margin-bottom:20px;">
          <span style="font-size:2.5rem; display:block; margin-bottom:8px;">⏳</span>
          <h4 style="color:#92400E; margin:0 0 6px;">Submission Under Review</h4>
          <p style="color:#B45309; font-size:0.84rem; margin:0 0 10px;">Your documents are currently in the administrator review queue (usually approved within 1–2 hours).</p>
          <span style="display:inline-block; font-size:0.78rem; background:#FFFBEB; border:1px solid #FCD34D; color:#92400E; padding:3px 12px; border-radius:999px;">
            Document #${escapeHtml(s.nidNumber || 'Under Review')}
          </span>
          <div style="margin-top:14px;">
            <button type="button" class="btn btn-xs btn-outline-primary" onclick="toggleAdditionalKycForm()">Submit Another Credential (Degree / License)</button>
          </div>
        </div>
      ` : '')}

      <form id="vw-kyc-form" onsubmit="submitKycFromWizard(event)" style="${(isDocVerified || isDocPending) ? 'display:none;' : ''}">
        <div style="margin-bottom: 14px;">
          <label style="font-size:0.84rem; font-weight:700; color:#334155; display:block; margin-bottom:4px;">Document & Verification Category</label>
          <select name="doc_type" id="vw-doc-type" onchange="onVwDocTypeChange(this.value)" style="width:100%; padding:9px 12px; border:1.5px solid #CBD5E1; border-radius:8px; font-size:0.88rem; outline:none; background:#fff; font-weight:600; color:#1E293B;">
            <optgroup label="Government National Identity (Front & Back Required)">
              <option value="nid_smart">🪪 Smart NID Card (National ID) — Front & Back</option>
              <option value="nid_old">🪪 Old NID Card (Laminated) — Front & Back</option>
              <option value="driving_license">🚘 Bangladesh Driving License — Front & Back</option>
            </optgroup>
            <optgroup label="Government Passport (Single Bio-Data Page)">
              <option value="passport">🛂 Bangladesh / International Passport (Bio-Data Page Only)</option>
            </optgroup>
            <optgroup label="Educational Qualification (Single Certificate Document)">
              <option value="education_degree">🎓 Educational Degree / Certificate (SSC, HSC, Bachelor, Masters, Diploma)</option>
            </optgroup>
            <optgroup label="Professional Certification & Licensing (Single Document)">
              <option value="professional_cert">📜 Professional Certification (Cisco, AWS, Microsoft, IT, PMP)</option>
              <option value="bmdc_doctor">🩺 BMDC Medical License (Doctor / Medical Practitioner)</option>
              <option value="engineering">🏗️ Professional Engineering Certificate (IEB / P.Eng)</option>
            </optgroup>
          </select>
        </div>

        <!-- Dynamic Education Sub-Fields -->
        <div id="vw-edu-fields" style="display:none; background:#F8FAFC; border:1.5px solid #E2E8F0; border-radius:12px; padding:14px; margin-bottom:14px;">
          <div style="font-size:0.82rem; font-weight:700; color:#1E293B; margin-bottom:10px; display:flex; align-items:center; gap:6px;">
            <span>🎓</span> Academic Qualification Details
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:10px;">
            <div>
              <label style="font-size:0.78rem; font-weight:700; color:#475569; display:block; margin-bottom:3px;">Degree / Exam Title</label>
              <input type="text" name="degree_name" id="vw-degree-name" placeholder="e.g. B.Sc in CSE / HSC / BBA" style="width:100%; padding:8px 10px; border:1px solid #CBD5E1; border-radius:6px; font-size:0.85rem;">
            </div>
            <div>
              <label style="font-size:0.78rem; font-weight:700; color:#475569; display:block; margin-bottom:3px;">Passing Year</label>
              <input type="text" name="passing_year" id="vw-passing-year" placeholder="e.g. 2023" style="width:100%; padding:8px 10px; border:1px solid #CBD5E1; border-radius:6px; font-size:0.85rem;">
            </div>
          </div>
          <div>
            <label style="font-size:0.78rem; font-weight:700; color:#475569; display:block; margin-bottom:3px;">Institute / University / Education Board</label>
            <input type="text" name="institution_name" id="vw-institution-name" placeholder="e.g. University of Dhaka / BUET / Dhaka Board" style="width:100%; padding:8px 10px; border:1px solid #CBD5E1; border-radius:6px; font-size:0.85rem;">
          </div>
        </div>

        <!-- Dynamic Professional Certification Sub-Fields -->
        <div id="vw-prof-fields" style="display:none; background:#F8FAFC; border:1.5px solid #E2E8F0; border-radius:12px; padding:14px; margin-bottom:14px;">
          <div style="font-size:0.82rem; font-weight:700; color:#1E293B; margin-bottom:10px; display:flex; align-items:center; gap:6px;">
            <span>📜</span> Professional Certification & Licensing Details
          </div>
          <div style="margin-bottom:10px;">
            <label style="font-size:0.78rem; font-weight:700; color:#475569; display:block; margin-bottom:3px;">Certification / License Title</label>
            <input type="text" name="cert_title" id="vw-cert-title" placeholder="e.g. BMDC Medical Doctor / AWS Certified Solutions Architect" style="width:100%; padding:8px 10px; border:1px solid #CBD5E1; border-radius:6px; font-size:0.85rem;">
          </div>
          <div>
            <label style="font-size:0.78rem; font-weight:700; color:#475569; display:block; margin-bottom:3px;">Issuing Authority / Council / Body</label>
            <input type="text" name="council_name" id="vw-council-name" placeholder="e.g. BMDC / IEB / Cisco / Amazon Web Services" style="width:100%; padding:8px 10px; border:1px solid #CBD5E1; border-radius:6px; font-size:0.85rem;">
          </div>
        </div>

        <div style="margin-bottom: 16px;">
          <label id="vw-doc-number-label" style="font-size:0.84rem; font-weight:700; color:#334155; display:block; margin-bottom:4px;">NID / Document Number</label>
          <input type="text" name="doc_number" id="vw-doc-number" placeholder="e.g. 19952691234567" style="width:100%; padding:9px 12px; border:1.5px solid #CBD5E1; border-radius:8px; font-size:0.9rem; outline:none;" required>
        </div>

        <!-- Document Uploads Grid -->
        <div id="vw-upload-grid" style="display:grid; grid-template-columns: 1fr 1fr; gap:14px; margin-bottom: 16px;">
          <!-- Front / Single Document Upload -->
          <div id="vw-front-col">
            <label id="vw-front-label" style="font-size:0.82rem; font-weight:700; color:#334155; display:block; margin-bottom:4px;">Document Front Side</label>
            <div class="vw-dropzone" onclick="document.getElementById('vw-file-front').click()">
              <div id="vw-front-placeholder">
                <span id="vw-front-icon" style="font-size:1.8rem; display:block;">📄</span>
                <span id="vw-front-action-text" style="font-size:0.78rem; font-weight:600; color:#2563EB;">Upload Front Photo</span>
                <small id="vw-front-subtext" style="display:block; color:#94A3B8; font-size:0.72rem;">JPG, PNG, PDF up to 15MB</small>
              </div>
              <img id="vw-front-preview" class="vw-preview-thumb" style="display:none;">
              <input type="file" id="vw-file-front" accept="image/*,.pdf" onchange="previewKycFile(this, 'vw-front-preview', 'vw-front-placeholder')">
            </div>
          </div>

          <!-- Back Document Upload (Automatically hidden for Passport & Certificates) -->
          <div id="vw-back-col">
            <label id="vw-back-label" style="font-size:0.82rem; font-weight:700; color:#334155; display:block; margin-bottom:4px;">Document Back Side</label>
            <div class="vw-dropzone" onclick="document.getElementById('vw-file-back').click()">
              <div id="vw-back-placeholder">
                <span style="font-size:1.8rem; display:block;">📄</span>
                <span style="font-size:0.78rem; font-weight:600; color:#2563EB;">Upload Back Photo</span>
                <small style="display:block; color:#94A3B8; font-size:0.72rem;">JPG, PNG, PDF up to 15MB</small>
              </div>
              <img id="vw-back-preview" class="vw-preview-thumb" style="display:none;">
              <input type="file" id="vw-file-back" accept="image/*,.pdf" onchange="previewKycFile(this, 'vw-back-preview', 'vw-back-placeholder')">
            </div>
          </div>
        </div>

        <div style="background:#F8FAFC; border:1px solid #E2E8F0; border-radius:10px; padding:10px 14px; font-size:0.78rem; color:#64748B; margin-bottom:16px;">
          🔒 <b>Privacy Guarantee</b>: Document proof files are encrypted and used solely for credential verification in compliance with Bangladesh Cyber Security standards.
        </div>

        <button type="submit" class="btn btn-green btn-block" id="vw-btn-submit-kyc">Submit Documents for Verification</button>
      </form>

      <div class="vw-footer" style="padding:16px 0 0; background:none; border:none;">
        <button type="button" class="btn btn-ghost" onclick="switchVwStep(2)">← Back</button>
        <button type="button" class="btn btn-green" onclick="switchVwStep(4)">Proceed to Payout Setup →</button>
      </div>
    `;
  } else if (currentVwStep === 4) {
    const curMethod = s.payoutMethod || 'bkash';
    body.innerHTML = `
      <div style="margin-bottom: 20px;">
        <h4 style="margin: 0 0 4px; font-size: 1.05rem; color:#0F172A;">Step 4: Payout Method & Wallet Setup</h4>
        <p style="margin:0; font-size:0.82rem; color:var(--muted);">Link your personal bKash, Nagad, Rocket, or Bank account for automatic earnings disbursements.</p>
      </div>

      ${s.paymentVerified ? `
        <div style="background:#ECFDF5; border:1.5px solid #A7F3D0; border-radius:14px; padding:16px 20px; margin-bottom:20px; display:flex; align-items:center; justify-content:space-between;">
          <div style="display:flex; align-items:center; gap:12px;">
            <span style="font-size:2rem;">💳</span>
            <div>
              <b style="color:#065F46; font-size:0.95rem; display:block;">${(s.payoutMethod || 'bKash').toUpperCase()} Account Linked</b>
              <span style="color:#047857; font-size:0.82rem;">Account: ${escapeHtml(s.payoutAccount || '')}</span>
            </div>
          </div>
          <span class="pv2-status-pill pv2-status-pill-verified">✔ Active</span>
        </div>
      ` : ''}

      <form id="vw-payout-form" onsubmit="savePayoutFromWizard(event)">
        <label style="font-size:0.84rem; font-weight:700; color:#334155; display:block; margin-bottom:8px;">Select Disbursement Provider (Local & International)</label>
        <div class="vw-payout-grid" style="grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));">
          <div class="vw-payout-opt ${curMethod === 'bkash' ? 'selected' : ''}" onclick="selectPayoutMethod('bkash')">
            <span style="font-size:1.5rem; display:block; margin-bottom:4px;">📱</span>
            <b style="font-size:0.84rem; color:#D946EF; display:block;">bKash</b>
            <small style="color:#64748B; font-size:0.7rem;">BD Instant</small>
          </div>
          <div class="vw-payout-opt ${curMethod === 'nagad' ? 'selected' : ''}" onclick="selectPayoutMethod('nagad')">
            <span style="font-size:1.5rem; display:block; margin-bottom:4px;">🟠</span>
            <b style="font-size:0.84rem; color:#EA580C; display:block;">Nagad</b>
            <small style="color:#64748B; font-size:0.7rem;">0% Fee</small>
          </div>
          <div class="vw-payout-opt ${curMethod === 'rocket' ? 'selected' : ''}" onclick="selectPayoutMethod('rocket')">
            <span style="font-size:1.5rem; display:block; margin-bottom:4px;">🟣</span>
            <b style="font-size:0.84rem; color:#7C3AED; display:block;">Rocket</b>
            <small style="color:#64748B; font-size:0.7rem;">DBBL Wallet</small>
          </div>
          <div class="vw-payout-opt ${curMethod === 'bank' ? 'selected' : ''}" onclick="selectPayoutMethod('bank')">
            <span style="font-size:1.5rem; display:block; margin-bottom:4px;">🏦</span>
            <b style="font-size:0.84rem; color:#2563EB; display:block;">Local Bank</b>
            <small style="color:#64748B; font-size:0.7rem;">BEFTN / NPSB</small>
          </div>
          <div class="vw-payout-opt ${curMethod === 'paypal' ? 'selected' : ''}" onclick="selectPayoutMethod('paypal')">
            <span style="font-size:1.5rem; display:block; margin-bottom:4px;">💳</span>
            <b style="font-size:0.84rem; color:#0284C7; display:block;">PayPal</b>
            <small style="color:#64748B; font-size:0.7rem;">Global USD</small>
          </div>
          <div class="vw-payout-opt ${curMethod === 'payoneer' ? 'selected' : ''}" onclick="selectPayoutMethod('payoneer')">
            <span style="font-size:1.5rem; display:block; margin-bottom:4px;">🌐</span>
            <b style="font-size:0.84rem; color:#F97316; display:block;">Payoneer</b>
            <small style="color:#64748B; font-size:0.7rem;">Freelancers</small>
          </div>
          <div class="vw-payout-opt ${curMethod === 'wise' ? 'selected' : ''}" onclick="selectPayoutMethod('wise')">
            <span style="font-size:1.5rem; display:block; margin-bottom:4px;">💱</span>
            <b style="font-size:0.84rem; color:#10B981; display:block;">Wise</b>
            <small style="color:#64748B; font-size:0.7rem;">Multi-currency</small>
          </div>
          <div class="vw-payout-opt ${curMethod === 'swift' ? 'selected' : ''}" onclick="selectPayoutMethod('swift')">
            <span style="font-size:1.5rem; display:block; margin-bottom:4px;">🏛️</span>
            <b style="font-size:0.84rem; color:#6366F1; display:block;">SWIFT Wire</b>
            <small style="color:#64748B; font-size:0.7rem;">Global Bank</small>
          </div>
        </div>

        <input type="hidden" name="method" id="vw-payout-method-input" value="${escapeHtml(curMethod)}">

        <div style="margin-bottom: 14px;">
          <label style="font-size:0.84rem; font-weight:700; color:#334155; display:block; margin-bottom:4px;" id="vw-account-label">
            ${curMethod === 'bank' ? 'Bank Account Number' : `${curMethod.toUpperCase()} Mobile Wallet Number`}
          </label>
          <input type="text" name="account_number" id="vw-account-number" value="${escapeHtml(s.payoutAccount || '')}" placeholder="${curMethod === 'bank' ? 'e.g. 105.120.45689' : 'e.g. 01712345678'}" style="width:100%; padding:9px 12px; border:1.5px solid #CBD5E1; border-radius:8px; font-size:0.9rem; outline:none;" required>
        </div>

        <div style="margin-bottom: 14px;">
          <label style="font-size:0.84rem; font-weight:700; color:#334155; display:block; margin-bottom:4px;">Account Holder Name</label>
          <input type="text" name="account_name" value="${escapeHtml(u.name || '')}" placeholder="Exact name registered with provider" style="width:100%; padding:9px 12px; border:1.5px solid #CBD5E1; border-radius:8px; font-size:0.9rem; outline:none;" required>
        </div>

        <div id="vw-bank-fields" style="${curMethod === 'bank' ? '' : 'display:none;'} margin-bottom:14px;">
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
            <div>
              <label style="font-size:0.8rem; font-weight:700; color:#334155; display:block; margin-bottom:4px;">Bank Name</label>
              <input type="text" name="bank_name" placeholder="e.g. Dutch-Bangla Bank" style="width:100%; padding:9px 12px; border:1.5px solid #CBD5E1; border-radius:8px; font-size:0.88rem; outline:none;">
            </div>
            <div>
              <label style="font-size:0.8rem; font-weight:700; color:#334155; display:block; margin-bottom:4px;">Branch Name</label>
              <input type="text" name="branch_name" placeholder="e.g. Dhanmondi Branch" style="width:100%; padding:9px 12px; border:1.5px solid #CBD5E1; border-radius:8px; font-size:0.88rem; outline:none;">
            </div>
          </div>
        </div>

        <button type="submit" class="btn btn-green btn-block" id="vw-btn-save-payout">
          ${s.paymentVerified ? 'Update Payout Method' : 'Save & Link Payout Method'}
        </button>
      </form>

      <div class="vw-footer" style="padding:20px 0 0; background:none; border:none; justify-content:flex-end;">
        <button type="button" class="btn btn-primary" onclick="finishVerificationWizard()">
          🎉 Finish & View Profile Studio
        </button>
      </div>
    `;
  }
}

async function sendEmailOtpFromWizard() {
  const btn = document.getElementById('vw-btn-send-email-otp');
  if (btn) { btn.disabled = true; btn.textContent = 'Sending...'; }
  try {
    const res = await api('/users/me/verify-email/send-otp', { method: 'POST' });
    toast(res.message || 'Verification code sent! Check your inbox.', 'info');
    document.getElementById('vw-email-otp-box').style.display = 'block';
    if (res.otp) {
      const hint = document.getElementById('vw-email-demo-hint');
      if (hint) {
        hint.style.display = 'flex';
        hint.innerHTML = `<span>🔑 <b>Demo Code</b>: <code>${res.otp}</code></span> <button class="btn btn-xs btn-ghost" onclick="document.getElementById('vw-email-otp-input').value='${res.otp}'">Auto-Fill</button>`;
      }
    }
  } catch (e) {
    toast(e.message, 'error');
  }
  if (btn) { btn.disabled = false; btn.textContent = 'Resend Code'; }
}
if (typeof window !== 'undefined') window.sendEmailOtpFromWizard = sendEmailOtpFromWizard;

async function confirmEmailOtpFromWizard() {
  const inp = document.getElementById('vw-email-otp-input');
  const otp = inp ? inp.value.trim() : '';
  if (!otp) return toast('Please enter the 6-digit verification code.', 'error');
  const btn = document.getElementById('vw-btn-confirm-email');
  if (btn) { btn.disabled = true; btn.textContent = 'Verifying...'; }
  try {
    const res = await api('/users/me/verify-email/confirm', { method: 'POST', body: { otp } });
    toast(res.message || 'Email verified successfully! 🎉', 'success');
    await refreshVerificationWizardState();
  } catch (e) {
    toast(e.message, 'error');
  }
  if (btn) { btn.disabled = false; btn.textContent = 'Verify Email'; }
}
if (typeof window !== 'undefined') window.confirmEmailOtpFromWizard = confirmEmailOtpFromWizard;

async function sendPhoneOtpFromWizard() {
  const codeSel = document.getElementById('vw-phone-dial-code');
  const dialPrefix = codeSel ? codeSel.value : '';
  const inp = document.getElementById('vw-phone-input');
  let raw = inp ? inp.value.trim() : '';
  if (!raw) return toast('Please enter your mobile phone number.', 'error');

  let phone = raw;
  if (dialPrefix && !phone.startsWith('+')) {
    if (dialPrefix === '+880' && phone.startsWith('01')) {
      phone = phone; // keep 017... or prefix
    } else {
      phone = `${dialPrefix}${phone.replace(/^0+/, '')}`;
    }
  }

  const btn = document.getElementById('vw-btn-send-phone-otp');
  if (btn) { btn.disabled = true; btn.textContent = 'Sending...'; }
  try {
    const res = await api('/users/me/verify-phone/send-otp', { method: 'POST', body: { phone } });
    toast(res.message || '6-digit SMS code sent!', 'info');
    document.getElementById('vw-phone-otp-box').style.display = 'block';
    if (res.otp) {
      const hint = document.getElementById('vw-phone-demo-hint');
      if (hint) {
        hint.style.display = 'flex';
        hint.innerHTML = `<span>📱 <b>Demo SMS OTP</b>: <code>${res.otp}</code></span> <button class="btn btn-xs btn-ghost" onclick="document.getElementById('vw-phone-otp-input').value='${res.otp}'">Auto-Fill</button>`;
      }
    }
  } catch (e) {
    toast(e.message, 'error');
  }
  if (btn) { btn.disabled = false; btn.textContent = 'Resend SMS'; }
}
if (typeof window !== 'undefined') window.sendPhoneOtpFromWizard = sendPhoneOtpFromWizard;

async function confirmPhoneOtpFromWizard() {
  const inp = document.getElementById('vw-phone-otp-input');
  const otp = inp ? inp.value.trim() : '';
  if (!otp) return toast('Please enter the 6-digit SMS OTP.', 'error');
  const btn = document.getElementById('vw-btn-confirm-phone');
  if (btn) { btn.disabled = true; btn.textContent = 'Verifying...'; }
  try {
    const res = await api('/users/me/verify-phone/confirm', { method: 'POST', body: { otp } });
    toast(res.message || 'Mobile phone verified! 📱', 'success');
    await refreshVerificationWizardState();
  } catch (e) {
    toast(e.message, 'error');
  }
  if (btn) { btn.disabled = false; btn.textContent = 'Verify Phone'; }
}
if (typeof window !== 'undefined') window.confirmPhoneOtpFromWizard = confirmPhoneOtpFromWizard;

let currentVwSkills = [];

function initVwSkills(raw) {
  if (Array.isArray(raw)) currentVwSkills = raw.map(s => String(s).trim()).filter(Boolean);
  else if (typeof raw === 'string') currentVwSkills = raw.split(',').map(s => s.trim()).filter(Boolean);
  else currentVwSkills = [];
  renderVwSkillTags();
}

function renderVwSkillTags() {
  const container = document.getElementById('vw-skill-tags-list');
  const hiddenInput = document.getElementById('vw-input-skills');
  if (hiddenInput) hiddenInput.value = currentVwSkills.join(', ');

  if (container) {
    container.innerHTML = currentVwSkills.map(skill => `
      <span class="pv2-skill-tag">
        <span>${escapeHtml(skill)}</span>
        <span class="pv2-skill-tag-del" onclick="removeVwSkill('${escapeHtml(skill).replace(/'/g, "\\'")}')">✕</span>
      </span>
    `).join('');
  }

  const profInput = document.getElementById('vw-input-profession');
  renderVwSuggestedSkills(profInput ? profInput.value : '');
}

function addVwSkill(skill) {
  const clean = String(skill || '').trim();
  if (!clean) return;
  if (!currentVwSkills.some(s => s.toLowerCase() === clean.toLowerCase())) {
    currentVwSkills.push(clean);
    renderVwSkillTags();
  }
}

function removeVwSkill(skill) {
  const clean = String(skill || '').trim().toLowerCase();
  currentVwSkills = currentVwSkills.filter(s => s.toLowerCase() !== clean);
  renderVwSkillTags();
}

function clearAllVwSkills() {
  currentVwSkills = [];
  renderVwSkillTags();
}

function renderVwSuggestedSkills(category) {
  const container = document.getElementById('vw-suggested-skills-pills');
  const badge = document.getElementById('vw-suggested-cat-badge');
  if (!container) return;

  const map = {
    'Design & Creative': ['Figma', 'UI/UX Design', 'Logo Design', 'Photoshop', 'Illustrator', 'Canva', 'Branding'],
    'Web & Software Development': ['React.js', 'Node.js', 'JavaScript', 'Python', 'HTML/CSS', 'WordPress', 'PHP'],
    'Digital Marketing & SEO': ['SEO', 'Facebook Ads', 'Google Ads', 'Social Media', 'Content Strategy'],
    'Writing & Translation': ['Content Writing', 'SEO Copywriting', 'Blog Writing', 'Bengali Translation', 'Proofreading'],
    'Video & Animation': ['Premiere Pro', 'After Effects', 'Reels Editing', 'Motion Graphics', 'CapCut'],
    'Data & AI Analytics': ['Python', 'Excel', 'SQL', 'Machine Learning', 'Power BI'],
    'Admin & Virtual Assistance': ['Virtual Assistant', 'Data Entry', 'MS Office', 'Customer Support', 'Lead Generation']
  };

  let matchedKey = 'Design & Creative';
  const catLower = (category || '').toLowerCase();
  for (const k of Object.keys(map)) {
    if (catLower.includes(k.toLowerCase()) || k.toLowerCase().includes(catLower) || (catLower.includes('web') && k.includes('Web')) || (catLower.includes('design') && k.includes('Design')) || (catLower.includes('video') && k.includes('Video'))) {
      matchedKey = k;
      break;
    }
  }

  if (badge) badge.textContent = `(${matchedKey})`;

  const skills = map[matchedKey] || map['Design & Creative'];
  container.innerHTML = skills.map(sk => {
    const isAdded = currentVwSkills.some(s => s.toLowerCase() === sk.toLowerCase());
    return `
      <span class="pv2-suggest-pill ${isAdded ? 'added' : ''}" onclick="${isAdded ? `removeVwSkill('${escapeHtml(sk).replace(/'/g, "\\'")}')` : `addVwSkill('${escapeHtml(sk).replace(/'/g, "\\'")}')`}">
        <span>${isAdded ? '✔' : '+'}</span>
        <span>${escapeHtml(sk)}</span>
      </span>
    `;
  }).join('');
}

function selectVwCategory(cat) {
  const inp = document.getElementById('vw-input-profession');
  if (inp) inp.value = cat;
  highlightVwCategoryPill(cat);
  renderVwSuggestedSkills(cat);
}

function highlightVwCategoryPill(val) {
  const valLower = (val || '').trim().toLowerCase();
  document.querySelectorAll('#vw-quick-categories .pv2-cat-pill').forEach(pill => {
    const text = pill.textContent.toLowerCase();
    const isActive = valLower && (text.includes(valLower) || valLower.includes(text.replace(/^[^\s]+\s+/, '')));
    pill.classList.toggle('active', Boolean(isActive));
  });
  renderVwSuggestedSkills(val);
}

if (typeof window !== 'undefined') {
  window.selectVwCategory = selectVwCategory;
  window.highlightVwCategoryPill = highlightVwCategoryPill;
  window.addVwSkill = addVwSkill;
  window.removeVwSkill = removeVwSkill;
  window.clearAllVwSkills = clearAllVwSkills;
}

// Wizard Cascading Country & District Handlers
window.onVwCountryChange = function(countryCode) {
  const districtSelect = document.getElementById('vw-select-district');
  const customWrap = document.getElementById('vw-custom-district-wrap');
  if (window.XECurrencyAndGeo && districtSelect) {
    window.XECurrencyAndGeo.populateDistrictSelect(districtSelect, countryCode, '');
  }
  if (customWrap) customWrap.style.display = 'none';
  syncVwLocationValue();
};

window.onVwDistrictChange = function(districtVal) {
  const customWrap = document.getElementById('vw-custom-district-wrap');
  const customInput = document.getElementById('vw-input-custom-district');
  if (districtVal === '__CUSTOM__' || districtVal === 'Other') {
    if (customWrap) customWrap.style.display = 'block';
    if (customInput) customInput.focus();
  } else {
    if (customWrap) customWrap.style.display = 'none';
  }
  syncVwLocationValue();
};

window.syncVwLocationValue = function() {
  const countrySelect = document.getElementById('vw-select-country');
  const districtSelect = document.getElementById('vw-select-district');
  const customInput = document.getElementById('vw-input-custom-district');
  const hiddenLoc = document.getElementById('vw-input-location');
  if (!hiddenLoc || !countrySelect || !districtSelect) return;

  const countryCode = countrySelect.value;
  const countryObj = window.XECurrencyAndGeo ? window.XECurrencyAndGeo.getCountryByCode(countryCode) : null;
  const countryName = countryObj ? countryObj.name : countryCode;

  let district = districtSelect.value;
  if (district === '__CUSTOM__' || district === 'Other') {
    district = customInput ? customInput.value.trim() : '';
  }
  hiddenLoc.value = window.XECurrencyAndGeo ? window.XECurrencyAndGeo.formatLocation(district, countryName) : (district ? `${district}, ${countryName}` : countryName);
};

async function saveProfileFromWizard(e) {
  e.preventDefault();
  const f = e.target;
  const btn = document.getElementById('vw-btn-save-profile');
  if (btn) { btn.disabled = true; btn.textContent = 'Saving...'; }
  try {
    const customInput = document.getElementById('vw-input-custom-district');
    const districtVal = f.district ? (f.district.value === '__CUSTOM__' ? (customInput ? customInput.value.trim() : '') : f.district.value) : undefined;
    const payload = {
      username: f.username.value.trim().toLowerCase().replace(/^@/, ''),
      title_headline: f.title_headline.value.trim(),
      profession: f.profession.value.trim(),
      skills: f.skills ? f.skills.value.trim() : undefined,
      location: f.location ? f.location.value.trim() : '',
      country: f.country ? f.country.value : undefined,
      district: districtVal,
      bio: f.bio.value.trim()
    };
    const res = await api('/users/me', { method: 'PATCH', body: payload });
    if (Auth.user) Object.assign(Auth.user, res.user);
    toast('Profile information updated! 👍', 'success');
    switchVwStep(3);
  } catch (err) {
    toast(err.message, 'error');
  }
  if (btn) { btn.disabled = false; btn.textContent = 'Save & Continue to Documents →'; }
}
if (typeof window !== 'undefined') window.saveProfileFromWizard = saveProfileFromWizard;

function onVwDocTypeChange(val) {
  const isPassport = val === 'passport';
  const isEdu = val === 'education_degree';
  const isProf = ['professional_cert', 'bmdc_doctor', 'engineering'].includes(val);
  const isSinglePage = isPassport || isEdu || isProf;

  const backCol = document.getElementById('vw-back-col');
  const frontCol = document.getElementById('vw-front-col');
  const uploadGrid = document.getElementById('vw-upload-grid');
  const docNumLabel = document.getElementById('vw-doc-number-label');
  const docNumInput = document.getElementById('vw-doc-number');
  const frontLabel = document.getElementById('vw-front-label');
  const frontActionText = document.getElementById('vw-front-action-text');
  const frontSubtext = document.getElementById('vw-front-subtext');
  const frontIcon = document.getElementById('vw-front-icon');

  const eduFields = document.getElementById('vw-edu-fields');
  const profFields = document.getElementById('vw-prof-fields');

  if (eduFields) eduFields.style.display = isEdu ? 'block' : 'none';
  if (profFields) profFields.style.display = isProf ? 'block' : 'none';

  if (isSinglePage) {
    if (backCol) backCol.style.display = 'none';
    if (frontCol) frontCol.style.gridColumn = '1 / -1';
    if (uploadGrid) uploadGrid.style.gridTemplateColumns = '1fr';
  } else {
    if (backCol) backCol.style.display = 'block';
    if (frontCol) frontCol.style.gridColumn = 'auto';
    if (uploadGrid) uploadGrid.style.gridTemplateColumns = '1fr 1fr';
  }

  if (isPassport) {
    if (docNumLabel) docNumLabel.textContent = 'Passport Number';
    if (docNumInput) { docNumInput.placeholder = 'e.g. A01234567 or EE1234567'; docNumInput.required = true; }
    if (frontLabel) frontLabel.textContent = 'Passport Bio-Data Page (Photo & Details Page)';
    if (frontActionText) frontActionText.textContent = 'Upload Passport Bio-Data Page';
    if (frontSubtext) frontSubtext.textContent = 'Single main page with photo, full name & MRZ barcode';
    if (frontIcon) frontIcon.textContent = '🛂';
  } else if (isEdu) {
    if (docNumLabel) docNumLabel.textContent = 'Certificate / Roll / Registration Number (Optional)';
    if (docNumInput) { docNumInput.placeholder = 'e.g. Roll: 104523, Reg: 1810523049'; docNumInput.required = false; }
    if (frontLabel) frontLabel.textContent = 'Academic Certificate / Diploma / Transcript';
    if (frontActionText) frontActionText.textContent = 'Upload Degree / Certificate Document';
    if (frontSubtext) frontSubtext.textContent = 'Single certificate document or marksheet (JPG, PNG, PDF)';
    if (frontIcon) frontIcon.textContent = '🎓';
  } else if (isProf) {
    if (docNumLabel) docNumLabel.textContent = 'License / Registration / Certification ID';
    if (docNumInput) { docNumInput.placeholder = 'e.g. BMDC-A-54321, IEB-M-12845, AWS-CERT-8841'; docNumInput.required = true; }
    if (frontLabel) frontLabel.textContent = 'Professional Certificate / Official License';
    if (frontActionText) frontActionText.textContent = 'Upload Professional Certificate / License';
    if (frontSubtext) frontSubtext.textContent = 'Official council membership, doctor license, or certificate copy (PDF, JPG)';
    if (frontIcon) frontIcon.textContent = '📜';
  } else {
    // NID or Driving License
    if (docNumLabel) docNumLabel.textContent = val === 'driving_license' ? 'Driving License Number' : 'National ID (NID) Number';
    if (docNumInput) { docNumInput.placeholder = 'e.g. 19952691234567'; docNumInput.required = true; }
    if (frontLabel) frontLabel.textContent = 'Document Front Side';
    if (frontActionText) frontActionText.textContent = 'Upload Front Photo';
    if (frontSubtext) frontSubtext.textContent = 'JPG, PNG, PDF up to 15MB';
    if (frontIcon) frontIcon.textContent = '🪪';
  }
}
if (typeof window !== 'undefined') window.onVwDocTypeChange = onVwDocTypeChange;

function toggleAdditionalKycForm() {
  const f = document.getElementById('vw-kyc-form');
  if (f) {
    f.style.display = f.style.display === 'none' ? 'block' : 'none';
    if (f.style.display === 'block') {
      const sel = document.getElementById('vw-doc-type');
      if (sel) {
        sel.value = 'education_degree';
        onVwDocTypeChange('education_degree');
      }
    }
  }
}
if (typeof window !== 'undefined') window.toggleAdditionalKycForm = toggleAdditionalKycForm;

function previewKycFile(input, imgId, placeholderId) {
  if (input.files && input.files[0]) {
    const file = input.files[0];
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const ph = document.getElementById(placeholderId);
    const img = document.getElementById(imgId);
    if (isPdf) {
      if (img) img.style.display = 'none';
      if (ph) {
        ph.style.display = 'block';
        ph.innerHTML = `
          <span style="font-size:2rem; display:block; color:#EF4444;">📑</span>
          <span style="font-size:0.82rem; font-weight:700; color:#0F172A; display:block; margin-top:4px;">${escapeHtml(file.name)}</span>
          <small style="color:#059669; font-size:0.75rem; font-weight:600;">✓ PDF Document Ready (${(file.size / 1024 / 1024).toFixed(1)} MB)</small>
        `;
      }
    } else {
      const reader = new FileReader();
      reader.onload = function(e) {
        if (img) {
          img.src = e.target.result;
          img.style.display = 'block';
        }
        if (ph) ph.style.display = 'none';
      };
      reader.readAsDataURL(file);
    }
  }
}
if (typeof window !== 'undefined') window.previewKycFile = previewKycFile;

async function submitKycFromWizard(e) {
  e.preventDefault();
  const f = e.target;
  const docType = f.doc_type.value;
  const docNumber = f.doc_number ? f.doc_number.value.trim() : '';
  const isPassport = docType === 'passport';
  const isEdu = docType === 'education_degree';
  const isProf = ['professional_cert', 'bmdc_doctor', 'engineering'].includes(docType);
  const isSinglePage = isPassport || isEdu || isProf;

  const frontFile = document.getElementById('vw-file-front') ? document.getElementById('vw-file-front').files[0] : null;
  const backFile = document.getElementById('vw-file-back') ? document.getElementById('vw-file-back').files[0] : null;

  if (!isEdu && !docNumber) {
    return toast('Please enter your document or certificate identification number.', 'error');
  }

  if (!frontFile) {
    return toast(isSinglePage ? 'Please select your document/certificate file to upload.' : 'Please upload the front photo of your ID.', 'error');
  }

  if (!isSinglePage && !backFile) {
    return toast('Please upload both the front and back photos for National ID / Driving License.', 'error');
  }

  const btn = document.getElementById('vw-btn-submit-kyc');
  if (btn) { btn.disabled = true; btn.textContent = 'Uploading documents...'; }

  try {
    const formData = new FormData();
    formData.append('doc_type', docType);
    formData.append('doc_number', docNumber || (f.degree_name ? f.degree_name.value.trim() : 'Submitted'));
    if (f.degree_name && f.degree_name.value) formData.append('degree_name', f.degree_name.value.trim());
    if (f.institution_name && f.institution_name.value) formData.append('institution_name', f.institution_name.value.trim());
    if (f.passing_year && f.passing_year.value) formData.append('passing_year', f.passing_year.value.trim());
    if (f.cert_title && f.cert_title.value) formData.append('cert_title', f.cert_title.value.trim());
    if (f.council_name && f.council_name.value) formData.append('council_name', f.council_name.value.trim());

    if (frontFile) formData.append('front_image', frontFile);
    if (!isSinglePage && backFile) formData.append('back_image', backFile);

    const res = await fetch('/api/users/me/kyc', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Auth.token}`
      },
      body: formData
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Submission failed');

    toast(data.message || 'Credentials submitted successfully for admin review! 🪪', 'success');
    await refreshVerificationWizardState();
    switchVwStep(4);
  } catch (err) {
    toast(err.message, 'error');
  }
  if (btn) { btn.disabled = false; btn.textContent = 'Submit Documents for Verification'; }
}
if (typeof window !== 'undefined') window.submitKycFromWizard = submitKycFromWizard;

function selectPayoutMethod(method) {
  const inp = document.getElementById('vw-payout-method-input');
  if (inp) inp.value = method;
  document.querySelectorAll('.vw-payout-opt').forEach(el => el.classList.remove('selected'));
  if (event && event.currentTarget) event.currentTarget.classList.add('selected');
  else if (event && event.target && event.target.closest('.vw-payout-opt')) event.target.closest('.vw-payout-opt').classList.add('selected');

  const label = document.getElementById('vw-account-label');
  const numInput = document.getElementById('vw-account-number');
  const bankFields = document.getElementById('vw-bank-fields');

  if (method === 'bank' || method === 'swift') {
    if (label) label.textContent = method === 'swift' ? 'Bank SWIFT / BIC Code or IBAN' : 'Bank Account Number';
    if (numInput) numInput.placeholder = method === 'swift' ? 'e.g. BD00BKAS12345678 or SWIFT: BBBLBDDH' : 'e.g. 105.120.45689';
    if (bankFields) bankFields.style.display = 'block';
  } else if (method === 'paypal') {
    if (label) label.textContent = 'PayPal Account Email';
    if (numInput) numInput.placeholder = 'e.g. your-name@paypal.com';
    if (bankFields) bankFields.style.display = 'none';
  } else if (method === 'payoneer') {
    if (label) label.textContent = 'Payoneer Registered Email / Payee ID';
    if (numInput) numInput.placeholder = 'e.g. freelancer@payoneer.com';
    if (bankFields) bankFields.style.display = 'none';
  } else if (method === 'wise') {
    if (label) label.textContent = 'Wise (TransferWise) Email / Multi-Currency IBAN';
    if (numInput) numInput.placeholder = 'e.g. user@wise.com or IBAN';
    if (bankFields) bankFields.style.display = 'none';
  } else {
    if (label) label.textContent = `${method.toUpperCase()} Mobile Wallet Number`;
    if (numInput) numInput.placeholder = 'e.g. 01712345678';
    if (bankFields) bankFields.style.display = 'none';
  }
}
if (typeof window !== 'undefined') window.selectPayoutMethod = selectPayoutMethod;

async function savePayoutFromWizard(e) {
  e.preventDefault();
  const f = e.target;
  const method = f.method.value;
  const accountNumber = f.account_number.value.trim();
  const accountName = f.account_name.value.trim();
  const bankName = f.bank_name ? f.bank_name.value.trim() : '';
  const branchName = f.branch_name ? f.branch_name.value.trim() : '';

  if (!accountNumber) return toast('Please enter your payout account number.', 'error');

  const btn = document.getElementById('vw-btn-save-payout');
  if (btn) { btn.disabled = true; btn.textContent = 'Saving...'; }

  try {
    const res = await api('/users/me/payout-method', {
      method: 'POST',
      body: {
        method,
        account_number: accountNumber,
        account_name: accountName,
        bank_name: bankName,
        branch_name: branchName
      }
    });
    toast(res.message || 'Payout account linked! 💳', 'success');
    await refreshVerificationWizardState();
  } catch (err) {
    toast(err.message, 'error');
  }
  if (btn) { btn.disabled = false; btn.textContent = 'Save & Link Payout Method'; }
}
if (typeof window !== 'undefined') window.savePayoutFromWizard = savePayoutFromWizard;

async function finishVerificationWizard() {
  try {
    await api('/users/me/complete-onboarding', { method: 'POST' });
  } catch (e) {}
  closeModal('xe-verification-modal');
  toast('Verification and profile setup completed! 🌟', 'success');
  if (window.location.pathname.includes('profile')) {
    window.location.reload();
  } else {
    const u = Auth.user || {};
    window.location.href = `/${u.username || 'profile'}`;
  }
}
if (typeof window !== 'undefined') window.finishVerificationWizard = finishVerificationWizard;

/* ---------- Change Password Modal & Security System ---------- */
function ensureChangePasswordModal() {
  if (document.getElementById('modal-change-password')) return;
  const wrap = document.createElement('div');
  wrap.innerHTML = `
  <div class="modal-overlay" id="modal-change-password">
    <div class="modal" style="max-width: 480px; padding: 0; border-radius: 20px; overflow: hidden; box-shadow: 0 25px 60px rgba(0,0,0,0.3); border: 1px solid #E2E8F0;">
      <div style="background: linear-gradient(135deg, #0F172A, #1E293B); padding: 22px 24px; color: #fff; position: relative;">
        <button class="modal-x" onclick="closeModal('modal-change-password')" aria-label="Close" style="color:#fff; top:16px; right:16px;">✕</button>
        <div style="display: flex; align-items: center; gap: 12px;">
          <span style="width: 44px; height: 44px; border-radius: 12px; background: rgba(16, 185, 129, 0.15); border: 1.5px solid #10B981; display: flex; align-items: center; justify-content: center; font-size: 1.4rem;">🔐</span>
          <div>
            <h3 style="margin: 0; font-size: 1.2rem; font-weight: 800; color: #fff;">Change Password</h3>
            <p style="margin: 3px 0 0; font-size: 0.8rem; color: #94A3B8;">Update your account password with instant encryption</p>
          </div>
        </div>
      </div>
      
      <form id="form-change-password" onsubmit="submitChangePassword(event)" style="padding: 22px 24px;">
        <div id="cp-error-alert" style="display: none; background: #FEF2F2; border: 1px solid #FECACA; color: #DC2626; padding: 10px 14px; border-radius: 10px; font-size: 0.82rem; margin-bottom: 16px; font-weight: 600;"></div>
        <div id="cp-success-alert" style="display: none; background: #ECFDF5; border: 1px solid #A7F3D0; color: #059669; padding: 10px 14px; border-radius: 10px; font-size: 0.82rem; margin-bottom: 16px; font-weight: 600;"></div>

        <!-- Current Password -->
        <div style="margin-bottom: 16px;">
          <label for="cp-input-current" style="display: block; font-size: 0.82rem; font-weight: 700; color: #334155; margin-bottom: 6px;">Current Password</label>
          <div style="position: relative;">
            <input type="password" id="cp-input-current" required placeholder="Enter your current password" style="width: 100%; padding: 10px 42px 10px 14px; border: 1.5px solid #CBD5E1; border-radius: 10px; font-size: 0.9rem; outline: none; transition: border-color 0.2s; box-sizing: border-box;" autocomplete="current-password">
            <button type="button" onclick="togglePasswordVisibility('cp-input-current', this)" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; font-size: 1.1rem; cursor: pointer; color: #64748B;" title="Toggle visibility">👁️</button>
          </div>
        </div>

        <!-- New Password -->
        <div style="margin-bottom: 16px;">
          <label for="cp-input-new" style="display: block; font-size: 0.82rem; font-weight: 700; color: #334155; margin-bottom: 6px;">New Password</label>
          <div style="position: relative;">
            <input type="password" id="cp-input-new" required minlength="8" placeholder="At least 8 characters" style="width: 100%; padding: 10px 42px 10px 14px; border: 1.5px solid #CBD5E1; border-radius: 10px; font-size: 0.9rem; outline: none; transition: border-color 0.2s; box-sizing: border-box;" oninput="onNewPasswordInput(this.value)" autocomplete="new-password">
            <button type="button" onclick="togglePasswordVisibility('cp-input-new', this)" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; font-size: 1.1rem; cursor: pointer; color: #64748B;" title="Toggle visibility">👁️</button>
          </div>
          <!-- Live Strength Meter -->
          <div style="margin-top: 6px; display: flex; align-items: center; gap: 8px;">
            <div style="flex: 1; height: 4px; background: #E2E8F0; border-radius: 2px; overflow: hidden;">
              <div id="cp-strength-bar" style="width: 0%; height: 100%; transition: width 0.3s ease, background-color 0.3s ease;"></div>
            </div>
            <span id="cp-strength-text" style="font-size: 0.72rem; color: #64748B; font-weight: 700; min-width: 65px; text-align: right;"></span>
          </div>
        </div>

        <!-- Confirm New Password -->
        <div style="margin-bottom: 18px;">
          <label for="cp-input-confirm" style="display: block; font-size: 0.82rem; font-weight: 700; color: #334155; margin-bottom: 6px;">Confirm New Password</label>
          <div style="position: relative;">
            <input type="password" id="cp-input-confirm" required minlength="8" placeholder="Re-type new password" style="width: 100%; padding: 10px 42px 10px 14px; border: 1.5px solid #CBD5E1; border-radius: 10px; font-size: 0.9rem; outline: none; transition: border-color 0.2s; box-sizing: border-box;" oninput="onConfirmPasswordInput(this.value)" autocomplete="new-password">
            <button type="button" onclick="togglePasswordVisibility('cp-input-confirm', this)" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; font-size: 1.1rem; cursor: pointer; color: #64748B;" title="Toggle visibility">👁️</button>
          </div>
          <div id="cp-match-hint" style="font-size: 0.72rem; margin-top: 4px; font-weight: 600; display: none;"></div>
        </div>

        <!-- Checklist -->
        <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 10px 14px; margin-bottom: 20px; font-size: 0.76rem; color: #475569;">
          <div id="cp-chk-len" style="display: flex; align-items: center; gap: 6px; margin-bottom: 3px;">
            <span>⚪</span> <span>Minimum 8 characters long</span>
          </div>
          <div id="cp-chk-match" style="display: flex; align-items: center; gap: 6px;">
            <span>⚪</span> <span>Both passwords match exactly</span>
          </div>
        </div>

        <!-- Actions -->
        <div style="display: flex; gap: 10px; justify-content: flex-end; border-top: 1px solid #F1F5F9; padding-top: 16px;">
          <button type="button" class="btn btn-outline-secondary" onclick="closeModal('modal-change-password')" style="padding: 8px 16px; font-size: 0.85rem;">Cancel</button>
          <button type="submit" id="cp-btn-submit" class="btn btn-green" style="padding: 8px 20px; font-size: 0.85rem; font-weight: 700;">
            Update Password 🔐
          </button>
        </div>
      </form>
    </div>
  </div>`;
  document.body.appendChild(wrap.firstElementChild);
}

function openChangePasswordModal() {
  if (!Auth.user) {
    if (typeof requireLogin === 'function') return requireLogin('Please login to change your password.');
    return;
  }
  ensureChangePasswordModal();
  const form = document.getElementById('form-change-password');
  if (form) form.reset();
  const errEl = document.getElementById('cp-error-alert');
  const succEl = document.getElementById('cp-success-alert');
  if (errEl) errEl.style.display = 'none';
  if (succEl) succEl.style.display = 'none';
  const bar = document.getElementById('cp-strength-bar');
  const txt = document.getElementById('cp-strength-text');
  if (bar) bar.style.width = '0%';
  if (txt) txt.textContent = '';
  openModal('modal-change-password');
}
if (typeof window !== 'undefined') window.openChangePasswordModal = openChangePasswordModal;

function togglePasswordVisibility(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  if (input.type === 'password') {
    input.type = 'text';
    btn.textContent = '🙈';
  } else {
    input.type = 'password';
    btn.textContent = '👁️';
  }
}
if (typeof window !== 'undefined') window.togglePasswordVisibility = togglePasswordVisibility;

function onNewPasswordInput(val) {
  const bar = document.getElementById('cp-strength-bar');
  const txt = document.getElementById('cp-strength-text');
  const chkLen = document.getElementById('cp-chk-len');

  if (chkLen) {
    if (val.length >= 8) {
      chkLen.innerHTML = '<span>🟢</span> <span style="color:#059669; font-weight:700;">Minimum 8 characters long</span>';
    } else {
      chkLen.innerHTML = '<span>⚪</span> <span>Minimum 8 characters long</span>';
    }
  }

  if (!bar || !txt) return;
  if (!val) {
    bar.style.width = '0%';
    txt.textContent = '';
    return;
  }

  let score = 0;
  if (val.length >= 8) score += 25;
  if (val.length >= 12) score += 25;
  if (/[0-9]/.test(val)) score += 25;
  if (/[^A-Za-z0-9]/.test(val)) score += 25;

  bar.style.width = `${Math.max(15, score)}%`;
  if (score <= 25) {
    bar.style.backgroundColor = '#EF4444';
    txt.textContent = 'Weak';
    txt.style.color = '#EF4444';
  } else if (score <= 50) {
    bar.style.backgroundColor = '#F59E0B';
    txt.textContent = 'Fair';
    txt.style.color = '#F59E0B';
  } else if (score <= 75) {
    bar.style.backgroundColor = '#3B82F6';
    txt.textContent = 'Good';
    txt.style.color = '#3B82F6';
  } else {
    bar.style.backgroundColor = '#10B981';
    txt.textContent = 'Strong 🛡️';
    txt.style.color = '#10B981';
  }

  const confirmVal = document.getElementById('cp-input-confirm')?.value || '';
  if (confirmVal) onConfirmPasswordInput(confirmVal);
}
if (typeof window !== 'undefined') window.onNewPasswordInput = onNewPasswordInput;

function onConfirmPasswordInput(val) {
  const newPass = document.getElementById('cp-input-new')?.value || '';
  const hint = document.getElementById('cp-match-hint');
  const chkMatch = document.getElementById('cp-chk-match');

  if (!val) {
    if (hint) hint.style.display = 'none';
    if (chkMatch) chkMatch.innerHTML = '<span>⚪</span> <span>Both passwords match exactly</span>';
    return;
  }

  const isMatch = val === newPass;
  if (hint) {
    hint.style.display = 'block';
    hint.textContent = isMatch ? '✓ Passwords match' : '✕ Passwords do not match';
    hint.style.color = isMatch ? '#059669' : '#DC2626';
  }

  if (chkMatch) {
    if (isMatch) {
      chkMatch.innerHTML = '<span>🟢</span> <span style="color:#059669; font-weight:700;">Both passwords match exactly</span>';
    } else {
      chkMatch.innerHTML = '<span>🔴</span> <span style="color:#DC2626; font-weight:600;">Passwords do not match yet</span>';
    }
  }
}
if (typeof window !== 'undefined') window.onConfirmPasswordInput = onConfirmPasswordInput;

async function submitChangePassword(e) {
  e.preventDefault();
  const current_password = document.getElementById('cp-input-current')?.value || '';
  const new_password = document.getElementById('cp-input-new')?.value || '';
  const confirm_password = document.getElementById('cp-input-confirm')?.value || '';
  const btn = document.getElementById('cp-btn-submit');
  const errEl = document.getElementById('cp-error-alert');
  const succEl = document.getElementById('cp-success-alert');

  if (errEl) errEl.style.display = 'none';
  if (succEl) succEl.style.display = 'none';

  if (!current_password) {
    if (errEl) { errEl.textContent = 'Please enter your current password.'; errEl.style.display = 'block'; }
    return;
  }
  if (!new_password || new_password.length < 8) {
    if (errEl) { errEl.textContent = 'New password must be at least 8 characters long.'; errEl.style.display = 'block'; }
    return;
  }
  if (new_password !== confirm_password) {
    if (errEl) { errEl.textContent = 'New password and confirmation do not match.'; errEl.style.display = 'block'; }
    return;
  }
  if (current_password === new_password) {
    if (errEl) { errEl.textContent = 'New password must be different from current password.'; errEl.style.display = 'block'; }
    return;
  }

  if (btn) { btn.disabled = true; btn.textContent = 'Updating Password...'; }
  try {
    const res = await api('/auth/change-password', {
      method: 'POST',
      body: { current_password, new_password, confirm_password }
    });
    if (succEl) {
      succEl.textContent = res.message || 'Password changed successfully! 🔐';
      succEl.style.display = 'block';
    }
    if (typeof toast === 'function') toast('🎉 Password updated successfully!', 'success');
    setTimeout(() => {
      closeModal('modal-change-password');
    }, 1200);
  } catch (err) {
    if (errEl) {
      errEl.textContent = err.message || 'Failed to update password. Please check your current password.';
      errEl.style.display = 'block';
    }
    if (typeof toast === 'function') toast(err.message, 'error');
  }
  if (btn) { btn.disabled = false; btn.textContent = 'Update Password 🔐'; }
}
if (typeof window !== 'undefined') window.submitChangePassword = submitChangePassword;

/* ---------- Forgot Password Modal & Password Recovery System ---------- */
let fpTargetIdentifier = '';
let fpResendSeconds = 0;
let fpResendInterval = null;

function ensureForgotPasswordModal() {
  if (document.getElementById('modal-forgot-password')) return;
  const wrap = document.createElement('div');
  wrap.innerHTML = `
  <div class="modal-overlay" id="modal-forgot-password" style="display:none;">
    <div class="modal" style="max-width: 480px; padding: 0; border-radius: 20px; overflow: hidden; box-shadow: 0 25px 60px rgba(0,0,0,0.3); border: 1px solid #E2E8F0; background: #ffffff;">
      <!-- Modal Header -->
      <div style="background: linear-gradient(135deg, #0F172A, #1E293B); padding: 22px 24px; color: #fff; position: relative;">
        <button class="modal-x" onclick="closeModal('modal-forgot-password')" aria-label="Close" style="color:#fff; top:16px; right:16px; background:none; border:none; font-size:1.2rem; cursor:pointer;">✕</button>
        <div style="display: flex; align-items: center; gap: 12px;">
          <span style="width: 44px; height: 44px; border-radius: 12px; background: rgba(16, 185, 129, 0.15); border: 1.5px solid #10B981; display: flex; align-items: center; justify-content: center; font-size: 1.4rem;">🔑</span>
          <div>
            <h3 id="fp-modal-title" style="margin: 0; font-size: 1.2rem; font-weight: 800; color: #fff;">Reset Password</h3>
            <p id="fp-modal-desc" style="margin: 3px 0 0; font-size: 0.8rem; color: #94A3B8;">Recover your account with a secure 6-digit OTP code</p>
          </div>
        </div>
      </div>

      <!-- Alerts -->
      <div style="padding: 16px 24px 0;">
        <div id="fp-error-alert" style="display: none; background: #FEF2F2; border: 1px solid #FECACA; color: #DC2626; padding: 10px 14px; border-radius: 10px; font-size: 0.82rem; margin-bottom: 8px; font-weight: 600;"></div>
        <div id="fp-success-alert" style="display: none; background: #ECFDF5; border: 1px solid #A7F3D0; color: #059669; padding: 10px 14px; border-radius: 10px; font-size: 0.82rem; margin-bottom: 8px; font-weight: 600;"></div>
      </div>

      <!-- STEP 1: Enter Email / Username to Request OTP -->
      <form id="fp-step-1-form" onsubmit="submitForgotPasswordRequest(event)" style="padding: 16px 24px 24px;">
        <div style="margin-bottom: 18px;">
          <label for="fp-input-identifier" style="display: block; font-size: 0.84rem; font-weight: 700; color: #334155; margin-bottom: 6px;">Registered Email or Username</label>
          <input type="text" id="fp-input-identifier" required placeholder="e.g. you@example.com or rakib_dev" style="width: 100%; padding: 11px 14px; border: 1.5px solid #CBD5E1; border-radius: 10px; font-size: 0.92rem; outline: none; transition: border-color 0.2s; box-sizing: border-box;" autocomplete="username">
          <p style="margin: 6px 0 0; font-size: 0.76rem; color: #64748B;">Enter the email address or username registered with your account.</p>
        </div>

        <div style="display: flex; flex-direction: column; gap: 10px;">
          <button type="submit" id="fp-btn-step1" class="btn btn-green btn-block" style="padding: 12px; font-size: 0.92rem; font-weight: 700;">
            Send Verification Code →
          </button>
          <button type="button" onclick="backToLoginFromForgot()" style="background: none; border: none; color: #64748B; font-size: 0.84rem; font-weight: 600; cursor: pointer; padding: 8px; transition: color 0.2s;">
            ← Back to Login
          </button>
        </div>
      </form>

      <!-- STEP 2: Enter OTP & New Password -->
      <form id="fp-step-2-form" onsubmit="submitPasswordReset(event)" style="display: none; padding: 16px 24px 24px;">
        <!-- Email Target Pill -->
        <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 10px 14px; margin-bottom: 14px; display: flex; align-items: center; justify-content: space-between;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 1.1rem;">📬</span>
            <span id="fp-target-email-display" style="font-size: 0.82rem; font-weight: 700; color: #1E293B;">user@example.com</span>
          </div>
          <a href="#" onclick="backToForgotStep1(event)" style="font-size: 0.76rem; color: #10B981; font-weight: 700; text-decoration: none;">Change</a>
        </div>

        <!-- Demo OTP Auto-fill Banner (Hidden by default in production) -->
        <div id="fp-demo-banner" style="display: none; background: #EFF6FF; border: 1px dashed #93C5FD; border-radius: 10px; padding: 8px 12px; margin-bottom: 14px; font-size: 0.78rem; color: #1D4ED8; align-items: center; justify-content: space-between;">
          <span>💡 Code: <strong id="fp-demo-otp-val" style="letter-spacing: 2px; font-family: monospace; font-size: 0.9rem;">123456</strong></span>
          <button type="button" onclick="autoFillDemoOtp()" style="background: #2563EB; color: #fff; border: none; padding: 3px 8px; border-radius: 6px; font-size: 0.72rem; font-weight: 700; cursor: pointer;">Auto-fill</button>
        </div>

        <!-- 6-digit OTP Input -->
        <div style="margin-bottom: 14px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <label for="fp-input-otp" style="font-size: 0.84rem; font-weight: 700; color: #334155;">6-Digit OTP Code</label>
            <button type="button" id="fp-resend-btn" onclick="resendPasswordOtp()" style="background: none; border: none; color: #10B981; font-size: 0.78rem; font-weight: 700; cursor: pointer; padding: 0;">Resend Code</button>
          </div>
          <input type="text" id="fp-input-otp" maxlength="6" pattern="[0-9]{6}" required placeholder="••••••" style="width: 100%; text-align: center; font-family: monospace; font-size: 1.35rem; letter-spacing: 8px; padding: 9px; border: 1.5px solid #CBD5E1; border-radius: 10px; outline: none; box-sizing: border-box; font-weight: 800; color: #0F172A;" autocomplete="one-time-code">
        </div>

        <!-- New Password -->
        <div style="margin-bottom: 14px;">
          <label for="fp-input-new-pass" style="display: block; font-size: 0.84rem; font-weight: 700; color: #334155; margin-bottom: 6px;">New Password</label>
          <div style="position: relative;">
            <input type="password" id="fp-input-new-pass" required minlength="8" placeholder="At least 8 characters" style="width: 100%; padding: 10px 42px 10px 14px; border: 1.5px solid #CBD5E1; border-radius: 10px; font-size: 0.9rem; outline: none; transition: border-color 0.2s; box-sizing: border-box;" oninput="onFpNewPasswordInput(this.value)" autocomplete="new-password">
            <button type="button" onclick="togglePasswordVisibility('fp-input-new-pass', this)" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; font-size: 1.1rem; cursor: pointer; color: #64748B;" title="Toggle visibility">👁️</button>
          </div>
          <!-- Live Strength Meter -->
          <div style="margin-top: 6px; display: flex; align-items: center; gap: 8px;">
            <div style="flex: 1; height: 4px; background: #E2E8F0; border-radius: 2px; overflow: hidden;">
              <div id="fp-strength-bar" style="width: 0%; height: 100%; transition: width 0.3s ease, background-color 0.3s ease;"></div>
            </div>
            <span id="fp-strength-text" style="font-size: 0.72rem; color: #64748B; font-weight: 700; min-width: 65px; text-align: right;"></span>
          </div>
        </div>

        <!-- Confirm Password -->
        <div style="margin-bottom: 14px;">
          <label for="fp-input-confirm-pass" style="display: block; font-size: 0.84rem; font-weight: 700; color: #334155; margin-bottom: 6px;">Confirm New Password</label>
          <div style="position: relative;">
            <input type="password" id="fp-input-confirm-pass" required minlength="8" placeholder="Re-type new password" style="width: 100%; padding: 10px 42px 10px 14px; border: 1.5px solid #CBD5E1; border-radius: 10px; font-size: 0.9rem; outline: none; transition: border-color 0.2s; box-sizing: border-box;" oninput="onFpConfirmPasswordInput(this.value)" autocomplete="new-password">
            <button type="button" onclick="togglePasswordVisibility('fp-input-confirm-pass', this)" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; font-size: 1.1rem; cursor: pointer; color: #64748B;" title="Toggle visibility">👁️</button>
          </div>
          <div id="fp-match-hint" style="font-size: 0.72rem; margin-top: 4px; font-weight: 600; display: none;"></div>
        </div>

        <!-- Checklist -->
        <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 10px 14px; margin-bottom: 18px; font-size: 0.76rem; color: #475569;">
          <div id="fp-chk-len" style="display: flex; align-items: center; gap: 6px; margin-bottom: 3px;">
            <span>⚪</span> <span>Minimum 8 characters long</span>
          </div>
          <div id="fp-chk-match" style="display: flex; align-items: center; gap: 6px;">
            <span>⚪</span> <span>Both passwords match exactly</span>
          </div>
        </div>

        <!-- Actions -->
        <div style="display: flex; flex-direction: column; gap: 10px;">
          <button type="submit" id="fp-btn-step2" class="btn btn-green btn-block" style="padding: 12px; font-size: 0.92rem; font-weight: 700;">
            Reset Password & Sign In 🔐
          </button>
          <button type="button" onclick="backToForgotStep1(event)" style="background: none; border: none; color: #64748B; font-size: 0.84rem; font-weight: 600; cursor: pointer; padding: 8px; transition: color 0.2s;">
            ← Use different email
          </button>
        </div>
      </form>
    </div>
  </div>`;
  document.body.appendChild(wrap.firstElementChild);
}

function openForgotPasswordModal(e) {
  if (e && e.preventDefault) e.preventDefault();
  closeModal('xe-auth-modal');
  ensureForgotPasswordModal();

  // Reset to Step 1
  const step1 = document.getElementById('fp-step-1-form');
  const step2 = document.getElementById('fp-step-2-form');
  if (step1) step1.style.display = 'block';
  if (step2) step2.style.display = 'none';

  const errEl = document.getElementById('fp-error-alert');
  const succEl = document.getElementById('fp-success-alert');
  if (errEl) errEl.style.display = 'none';
  if (succEl) succEl.style.display = 'none';

  // Check if login form has an email typed
  const loginInput = document.getElementById('xe-login-identifier');
  const fpInput = document.getElementById('fp-input-identifier');
  if (loginInput && fpInput && loginInput.value.trim()) {
    fpInput.value = loginInput.value.trim();
  }

  openModal('modal-forgot-password');
  setTimeout(() => {
    if (fpInput) fpInput.focus();
  }, 100);
}
if (typeof window !== 'undefined') window.openForgotPasswordModal = openForgotPasswordModal;

function backToLoginFromForgot() {
  closeModal('modal-forgot-password');
  openAuthModal('login');
}
if (typeof window !== 'undefined') window.backToLoginFromForgot = backToLoginFromForgot;

function backToForgotStep1(e) {
  if (e && e.preventDefault) e.preventDefault();
  const step1 = document.getElementById('fp-step-1-form');
  const step2 = document.getElementById('fp-step-2-form');
  if (step1) step1.style.display = 'block';
  if (step2) step2.style.display = 'none';
  const errEl = document.getElementById('fp-error-alert');
  const succEl = document.getElementById('fp-success-alert');
  if (errEl) errEl.style.display = 'none';
  if (succEl) succEl.style.display = 'none';
}
if (typeof window !== 'undefined') window.backToForgotStep1 = backToForgotStep1;

function autoFillDemoOtp() {
  const demoCode = document.getElementById('fp-demo-otp-val')?.textContent?.trim() || '123456';
  const input = document.getElementById('fp-input-otp');
  if (input) {
    input.value = demoCode;
    input.focus();
  }
}
if (typeof window !== 'undefined') window.autoFillDemoOtp = autoFillDemoOtp;

function onFpNewPasswordInput(val) {
  const bar = document.getElementById('fp-strength-bar');
  const txt = document.getElementById('fp-strength-text');
  const chkLen = document.getElementById('fp-chk-len');

  if (chkLen) {
    if (val.length >= 8) {
      chkLen.innerHTML = '<span>🟢</span> <span style="color:#059669; font-weight:700;">Minimum 8 characters long</span>';
    } else {
      chkLen.innerHTML = '<span>⚪</span> <span>Minimum 8 characters long</span>';
    }
  }

  if (!bar || !txt) return;
  if (!val) {
    bar.style.width = '0%';
    txt.textContent = '';
    return;
  }

  let score = 0;
  if (val.length >= 8) score += 25;
  if (val.length >= 12) score += 25;
  if (/[0-9]/.test(val)) score += 25;
  if (/[^A-Za-z0-9]/.test(val)) score += 25;

  bar.style.width = `${Math.max(15, score)}%`;
  if (score <= 25) {
    bar.style.backgroundColor = '#EF4444';
    txt.textContent = 'Weak';
    txt.style.color = '#EF4444';
  } else if (score <= 50) {
    bar.style.backgroundColor = '#F59E0B';
    txt.textContent = 'Fair';
    txt.style.color = '#F59E0B';
  } else if (score <= 75) {
    bar.style.backgroundColor = '#3B82F6';
    txt.textContent = 'Good';
    txt.style.color = '#3B82F6';
  } else {
    bar.style.backgroundColor = '#10B981';
    txt.textContent = 'Strong 🛡️';
    txt.style.color = '#10B981';
  }

  const confirmVal = document.getElementById('fp-input-confirm-pass')?.value || '';
  if (confirmVal) onFpConfirmPasswordInput(confirmVal);
}
if (typeof window !== 'undefined') window.onFpNewPasswordInput = onFpNewPasswordInput;

function onFpConfirmPasswordInput(val) {
  const newPass = document.getElementById('fp-input-new-pass')?.value || '';
  const hint = document.getElementById('fp-match-hint');
  const chkMatch = document.getElementById('fp-chk-match');

  if (!val) {
    if (hint) hint.style.display = 'none';
    if (chkMatch) chkMatch.innerHTML = '<span>⚪</span> <span>Both passwords match exactly</span>';
    return;
  }

  if (val === newPass) {
    if (hint) {
      hint.style.display = 'block';
      hint.style.color = '#059669';
      hint.innerHTML = '✓ Passwords match';
    }
    if (chkMatch) chkMatch.innerHTML = '<span>🟢</span> <span style="color:#059669; font-weight:700;">Both passwords match exactly</span>';
  } else {
    if (hint) {
      hint.style.display = 'block';
      hint.style.color = '#DC2626';
      hint.innerHTML = '✕ Passwords do not match';
    }
    if (chkMatch) chkMatch.innerHTML = '<span>🔴</span> <span style="color:#DC2626;">Both passwords match exactly</span>';
  }
}
if (typeof window !== 'undefined') window.onFpConfirmPasswordInput = onFpConfirmPasswordInput;

async function submitForgotPasswordRequest(e) {
  if (e && e.preventDefault) e.preventDefault();
  const input = document.getElementById('fp-input-identifier');
  const identifier = (input ? input.value : '').trim();
  if (!identifier) return;

  const btn = document.getElementById('fp-btn-step1');
  const errEl = document.getElementById('fp-error-alert');
  const succEl = document.getElementById('fp-success-alert');
  if (errEl) errEl.style.display = 'none';
  if (succEl) succEl.style.display = 'none';

  if (btn) { btn.disabled = true; btn.textContent = 'Sending Code...'; }

  try {
    const res = await api('/auth/forgot-password/request-code', {
      method: 'POST',
      body: { identifier }
    });

    fpTargetIdentifier = identifier;

    // Transition to Step 2
    document.getElementById('fp-step-1-form').style.display = 'none';
    document.getElementById('fp-step-2-form').style.display = 'block';

    const targetDisplay = document.getElementById('fp-target-email-display');
    if (targetDisplay) targetDisplay.textContent = res.masked_email || res.email || identifier;

    const demoBanner = document.getElementById('fp-demo-banner');
    const demoOtpVal = document.getElementById('fp-demo-otp-val');
    if (res.otp && demoOtpVal) {
      demoOtpVal.textContent = res.otp;
      if (demoBanner) demoBanner.style.display = 'flex';
    } else {
      if (demoBanner) demoBanner.style.display = 'none';
    }

    if (succEl) {
      succEl.textContent = res.message || 'Verification code sent! Please check your email.';
      succEl.style.display = 'block';
    }

    startResendCountdown(60);

    const otpInput = document.getElementById('fp-input-otp');
    if (otpInput) {
      otpInput.value = '';
      setTimeout(() => otpInput.focus(), 150);
    }
  } catch (err) {
    if (errEl) {
      errEl.textContent = err.message || 'No account found with this email/username.';
      errEl.style.display = 'block';
    }
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Send Verification Code →'; }
  }
}
if (typeof window !== 'undefined') window.submitForgotPasswordRequest = submitForgotPasswordRequest;

function startResendCountdown(seconds) {
  clearInterval(fpResendInterval);
  fpResendSeconds = seconds;
  const resendBtn = document.getElementById('fp-resend-btn');
  if (!resendBtn) return;
  resendBtn.disabled = true;
  resendBtn.style.opacity = '0.5';
  resendBtn.textContent = `Resend in ${fpResendSeconds}s`;

  fpResendInterval = setInterval(() => {
    fpResendSeconds--;
    if (fpResendSeconds <= 0) {
      clearInterval(fpResendInterval);
      resendBtn.disabled = false;
      resendBtn.style.opacity = '1';
      resendBtn.textContent = 'Resend Code';
    } else {
      resendBtn.textContent = `Resend in ${fpResendSeconds}s`;
    }
  }, 1000);
}

async function resendPasswordOtp() {
  if (fpResendSeconds > 0 || !fpTargetIdentifier) return;
  const errEl = document.getElementById('fp-error-alert');
  const succEl = document.getElementById('fp-success-alert');
  if (errEl) errEl.style.display = 'none';

  try {
    const res = await api('/auth/forgot-password/request-code', {
      method: 'POST',
      body: { identifier: fpTargetIdentifier }
    });
    if (succEl) {
      succEl.textContent = `New code sent: ${res.otp || ''}`;
      succEl.style.display = 'block';
    }
    const demoOtpVal = document.getElementById('fp-demo-otp-val');
    if (demoOtpVal && res.otp) demoOtpVal.textContent = res.otp;
    startResendCountdown(60);
    if (typeof toast === 'function') toast('New verification code sent! 📬', 'success');
  } catch (err) {
    if (errEl) {
      errEl.textContent = err.message || 'Failed to resend code.';
      errEl.style.display = 'block';
    }
  }
}
if (typeof window !== 'undefined') window.resendPasswordOtp = resendPasswordOtp;

async function submitPasswordReset(e) {
  if (e && e.preventDefault) e.preventDefault();
  const otp = document.getElementById('fp-input-otp')?.value?.trim();
  const new_password = document.getElementById('fp-input-new-pass')?.value;
  const confirm_password = document.getElementById('fp-input-confirm-pass')?.value;

  const btn = document.getElementById('fp-btn-step2');
  const errEl = document.getElementById('fp-error-alert');
  const succEl = document.getElementById('fp-success-alert');
  if (errEl) errEl.style.display = 'none';
  if (succEl) succEl.style.display = 'none';

  if (!otp || otp.length < 6) {
    if (errEl) {
      errEl.textContent = 'Please enter the full 6-digit verification code.';
      errEl.style.display = 'block';
    }
    return;
  }
  if (!new_password || new_password.length < 8) {
    if (errEl) {
      errEl.textContent = 'New password must be at least 8 characters long.';
      errEl.style.display = 'block';
    }
    return;
  }
  if (new_password !== confirm_password) {
    if (errEl) {
      errEl.textContent = 'Passwords do not match. Please re-enter confirmation.';
      errEl.style.display = 'block';
    }
    return;
  }

  if (btn) { btn.disabled = true; btn.textContent = 'Resetting Password...'; }

  try {
    const res = await api('/auth/forgot-password/reset', {
      method: 'POST',
      body: {
        identifier: fpTargetIdentifier,
        otp,
        new_password,
        confirm_password
      }
    });

    if (succEl) {
      succEl.textContent = '🎉 Password reset successfully! Redirecting to login...';
      succEl.style.display = 'block';
    }
    if (typeof toast === 'function') toast('🎉 Password reset successfully! Please sign in.', 'success');

    setTimeout(() => {
      closeModal('modal-forgot-password');
      openAuthModal('login');
      // Pre-populate the email in the login form
      const loginIdentifier = document.getElementById('xe-login-identifier');
      if (loginIdentifier && fpTargetIdentifier) {
        loginIdentifier.value = fpTargetIdentifier;
      }
      const passInp = document.querySelector('#xe-login-form input[type=password]');
      if (passInp) passInp.focus();
    }, 1200);
  } catch (err) {
    if (errEl) {
      errEl.textContent = err.message || 'Failed to reset password. Please check your verification code.';
      errEl.style.display = 'block';
    }
    if (typeof toast === 'function') toast(err.message, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Reset Password & Sign In 🔐'; }
  }
}
if (typeof window !== 'undefined') window.submitPasswordReset = submitPasswordReset;

/* ---------- header auth area ---------- */
function renderHeader() {
  const slot = document.getElementById('header-auth');
  if (!slot) return;
  const user = Auth.user;
  if (!user) {
    slot.innerHTML = `
      <button class="btn btn-outline-light btn-post" id="btn-post" style="margin-right:6px">+ Post a Task</button>
      <button class="btn btn-ghost-light" id="btn-login">Login</button>
      <button class="btn btn-green" id="btn-signup">Sign Up</button>`;
    const postBtn = slot.querySelector('#btn-post');
    if (postBtn) postBtn.addEventListener('click', (e) => { e.preventDefault(); typeof openPostTaskModal === 'function' && openPostTaskModal(); });
    const loginBtn = slot.querySelector('#btn-login');
    if (loginBtn) loginBtn.addEventListener('click', () => openAuthModal('login'));
    const signupBtn = slot.querySelector('#btn-signup');
    if (signupBtn) signupBtn.addEventListener('click', () => openAuthModal('register'));
    return;
  }
  const isAdmin = user.role === 'admin';
  const adminBadge = isAdmin ? `<span style="background:#4F46E5;color:#fff;font-size:0.68rem;padding:2px 7px;border-radius:6px;font-weight:800;letter-spacing:0.04em">ADMIN</span>` : '';
  const adminLink = isAdmin ? `<a href="/admin" style="color:var(--green-600);font-weight:700;background:var(--green-soft);border-radius:8px;padding:8px 12px;margin:4px 0">🛡️ Admin Dashboard</a>` : '';

  slot.innerHTML = `
    <button class="btn btn-outline-light btn-post" id="btn-post">+ Post a Task</button>
    <a href="/wallet#loyalty" class="nav-gamification-pill" title="Level & Daily Streak Progress">
      <span>🏆 Lvl ${user.loyalty_level || 1}</span>
      <span>🔥 ${user.daily_streak || 1}d</span>
    </a>
    <div class="notif-menu-wrap">
      <button class="notif-bell-btn" id="notif-bell-btn" aria-label="Notifications" title="Notifications">
        🔔
        <span class="notif-badge" id="notif-unread-badge" style="display:none">0</span>
      </button>
      <div class="notif-dropdown" id="notif-dropdown" style="display:none">
        <div class="notif-dd-head">
          <div style="display:flex;align-items:center;gap:6px">
            <strong>Notifications</strong>
            <span class="notif-count-tag" id="notif-total-tag">0</span>
          </div>
          <button class="notif-mark-read-btn" onclick="markAllNotificationsRead()">Mark all as read</button>
        </div>
        <div class="notif-dd-list" id="notif-dd-list">
          <div class="empty-state" style="padding:20px;font-size:0.8rem">No new notifications</div>
        </div>
        <div class="notif-dd-foot">
          <a href="/wallet" style="color:#22C55E;font-weight:700;font-size:0.8rem;text-decoration:none">View Wallet & Payouts →</a>
        </div>
      </div>
    </div>
    <div class="user-menu">
      <button class="user-menu-btn" id="user-menu-btn">
        ${avatarHtml(user.name, user.avatar_color, 34)}
        <span class="user-name">${escapeHtml(user.name.split(' ')[0])}</span>
        ${adminBadge}
        <span class="caret">▾</span>
      </button>
      <div class="user-dropdown" id="user-dropdown">
        <div class="user-dd-head">
          <strong>${escapeHtml(user.name)}</strong>
          <span>${escapeHtml(user.email)}</span>
        </div>
        ${adminLink}
        <a href="/profile">👤 My profile</a>
        <a href="/profile?tab=consultations">📅 My Consultations</a>
        <a href="#" onclick="openChangePasswordModal(); return false;">🔒 Change Password</a>
        <a href="/wallet">💰 Wallet</a>
        <a href="/wallet#referrals">🤝 Refer &amp; Earn (৳100)</a>
        <a href="/affiliates">🌐 Affiliate Program</a>
        <a href="/wallet#loyalty">🎁 Loyalty &amp; Rewards</a>
        <a href="/tasks?mine=1">My posted tasks</a>
        <a href="/tasks?applied=1">My applications</a>
        <button id="btn-logout">Logout</button>
      </div>
    </div>`;

  // update main nav if admin
  const mainNav = document.getElementById('main-nav');
  if (mainNav && isAdmin && !mainNav.querySelector('a[href="/admin"]')) {
    const a = document.createElement('a');
    a.href = '/admin';
    a.innerHTML = '🛡️ Admin';
    a.style.color = 'var(--green-400)';
    a.style.fontWeight = '700';
    mainNav.appendChild(a);
  }

  // highlight active nav item
  if (mainNav) {
    const path = window.location.pathname;
    mainNav.querySelectorAll('a').forEach(a => {
      const href = a.getAttribute('href') || '';
      if (href === path || (path === '/' && (href === '/' || href === '/index')) || (href !== '/' && !href.startsWith('/#') && !href.startsWith('#') && path.startsWith(href))) {
        a.classList.add('active');
      } else {
        a.classList.remove('active');
      }
    });
  }

  const postBtn = slot.querySelector('#btn-post');
  if (postBtn) postBtn.addEventListener('click', () => typeof openPostTaskModal === 'function' && openPostTaskModal());
  const btn = slot.querySelector('#user-menu-btn');
  const dd = slot.querySelector('#user-dropdown');
  if (btn && dd) {
    btn.addEventListener('click', e => { e.stopPropagation(); dd.classList.toggle('open'); });
    document.addEventListener('click', () => dd.classList.remove('open'));
  }

  // Notification Bell listener
  const notifBtn = slot.querySelector('#notif-bell-btn');
  const notifDd = slot.querySelector('#notif-dropdown');
  if (notifBtn && notifDd) {
    notifBtn.addEventListener('click', e => {
      e.stopPropagation();
      const isOpen = notifDd.style.display === 'block';
      notifDd.style.display = isOpen ? 'none' : 'block';
      if (!isOpen) loadUserNotifications();
    });
    document.addEventListener('click', e => {
      if (!notifDd.contains(e.target) && e.target !== notifBtn) {
        notifDd.style.display = 'none';
      }
    });
  }

  const logoutBtn = slot.querySelector('#btn-logout');
  if (logoutBtn) logoutBtn.addEventListener('click', () => Auth.logout());

  // Load initial notifications badge
  loadUserNotifications();
}

/* ---------- NOTIFICATION DRAWER & FEED SYSTEM ---------- */
let cachedNotifications = [];
let activeNotifTab = 'all';

async function loadUserNotifications() {
  if (!Auth.user) return;
  try {
    const res = await api('/notifications');
    cachedNotifications = res.items || [];
    const unreadCount = res.unreadCount || 0;

    const badge = document.getElementById('notif-unread-badge');
    const totalTag = document.getElementById('notif-total-tag');
    if (badge) {
      if (unreadCount > 0) {
        badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
        badge.style.display = 'block';
      } else {
        badge.style.display = 'none';
      }
    }
    if (totalTag) totalTag.textContent = cachedNotifications.length;

    renderNotificationFeed();
  } catch (err) {
    console.warn('Could not fetch notifications:', err);
  }
}
window.loadUserNotifications = loadUserNotifications;

function renderNotificationFeed() {
  const container = document.getElementById('notif-feed-list');
  if (!container) return;

  let filtered = cachedNotifications;
  if (activeNotifTab === 'unread') filtered = cachedNotifications.filter(n => !n.is_read);
  else if (activeNotifTab === 'payment') filtered = cachedNotifications.filter(n => n.type === 'payment');
  else if (activeNotifTab === 'task') filtered = cachedNotifications.filter(n => n.type === 'task');

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="text-align:center;padding:32px 16px;color:#64748B;font-size:0.85rem">
        <div style="font-size:1.8rem;margin-bottom:6px">🔕</div>
        <div>No notifications in this tab.</div>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(n => `
    <a href="${escapeHtml(n.link || '#')}" class="notif-item ${!n.is_read ? 'unread' : ''}" onclick="markSingleNotificationRead(${n.id}, event)">
      <span class="notif-icon">${n.icon || '🔔'}</span>
      <div class="notif-body">
        <div class="notif-title">${escapeHtml(n.title)}</div>
        <div class="notif-msg">${escapeHtml(n.message)}</div>
        <div class="notif-time">${timeAgoString(n.created_at)}</div>
      </div>
    </a>
  `).join('');
}

function timeAgoString(dateStr) {
  if (!dateStr) return 'Just now';
  const diffSec = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diffSec < 60) return 'Just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}

window.filterNotificationsTab = function(tab) {
  activeNotifTab = tab;
  document.querySelectorAll('.notif-tab').forEach(b => {
    b.classList.toggle('active', b.dataset.tab === tab);
  });
  renderNotificationFeed();
};

window.markSingleNotificationRead = async function(notifId, e) {
  try {
    await api(`/notifications/${notifId}/read`, { method: 'POST' });
    const target = cachedNotifications.find(n => n.id === notifId);
    if (target) target.is_read = 1;
    loadUserNotifications();
  } catch (err) {
    console.warn(err);
  }
};

window.markAllNotificationsRead = async function() {
  try {
    await api('/notifications/read-all', { method: 'POST' });
    cachedNotifications.forEach(n => n.is_read = 1);
    const badge = document.getElementById('notif-unread-badge');
    if (badge) badge.style.display = 'none';
    renderNotificationFeed();
    toast('All notifications marked as read', 'info');
  } catch (err) {
    toast(err.message, 'error');
  }
};

/* ---------- global navigation & action listeners ---------- */
window.toggleMobileNav = function(e) {
  if (e) {
    if (typeof e.stopPropagation === 'function') e.stopPropagation();
    if (typeof e.preventDefault === 'function') e.preventDefault();
  }
  const mainNav = document.getElementById('main-nav');
  const navToggle = document.getElementById('nav-toggle');
  if (!mainNav) return;
  const isOpen = mainNav.classList.toggle('open');
  if (navToggle) {
    navToggle.textContent = isOpen ? '✕' : '☰';
    navToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  }
};

function setupNavToggle() {
  const navToggle = document.getElementById('nav-toggle');
  const mainNav = document.getElementById('main-nav');
  if (navToggle && mainNav && !navToggle.dataset.bound) {
    navToggle.dataset.bound = 'true';
    navToggle.onclick = function(e) {
      window.toggleMobileNav(e);
    };
    document.addEventListener('click', e => {
      if (mainNav.classList.contains('open')) {
        if (!mainNav.contains(e.target) && e.target !== navToggle && !navToggle.contains(e.target)) {
          mainNav.classList.remove('open');
          navToggle.textContent = '☰';
          navToggle.setAttribute('aria-expanded', 'false');
        }
      }
    });
    mainNav.addEventListener('click', e => {
      if (e.target.closest('a')) {
        mainNav.classList.remove('open');
        navToggle.textContent = '☰';
        navToggle.setAttribute('aria-expanded', 'false');
      }
    });
  }
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupNavToggle);
} else {
  setupNavToggle();
}

document.addEventListener('DOMContentLoaded', () => {
  // Global delegated click handler for all Post a Task triggers across pages
  document.addEventListener('click', e => {
    const trigger = e.target.closest('#btn-post, #btn-post-side, .btn-post, .js-need-help, [data-act="post"], [data-open="xe-pt-modal"]');
    if (trigger) {
      e.preventDefault();
      openPostTaskModal();
    }
  });
});

/* ---------- DYNAMIC TASK POSTING MODAL (ONLINE + PHYSICAL + TEMPLATE ENGINE) ---------- */
let ptCategoriesCache = null;
window.xePostEngine = null;

async function openPostTaskModal() {
  try {
    await ensurePostTaskModal();
    if (window.xePostEngine) {
      window.xePostEngine.goToStep(1);
      await window.xePostEngine.checkAndPromptDraft();
    }
    openModal('xe-pt-modal');
  } catch (err) {
    console.error('Failed to open Post a Task modal:', err);
    toast('Could not open task modal: ' + (err.message || err), 'error');
  }
}
window.openPostTaskModal = openPostTaskModal;

function switchPtType(type) {
  if (window.xePostEngine) {
    window.xePostEngine.taskType = type;
    window.xePostEngine.formData.taskType = type;
  }
  document.querySelectorAll('#xe-pt-modal .pt-type-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.type === type));
  const loc = document.getElementById('pt-physical-location-box');
  const online = document.getElementById('pt-online-workmode-box');
  if (loc) loc.style.display = type === 'physical' ? 'block' : 'none';
  if (online) online.style.display = type === 'physical' ? 'none' : 'block';
  if (window.xePostEngine && window.xePostEngine.formData.categoryId) {
    window.xePostEngine.loadTemplateForCategory(window.xePostEngine.formData.categoryId, window.xePostEngine.formData.subcategory);
  }
}

async function ensurePostTaskModal() {
  if (!ptCategoriesCache) {
    try { ptCategoriesCache = (await api('/categories')).items; }
    catch { ptCategoriesCache = [{ id: 1, icon: '🎨', name: 'Design & Creative', subcategories: ['Logo & Branding', 'Social Media Design'] }]; }
  }

  // Ensure DynamicTaskPostingEngine is loaded
  if (typeof window.DynamicTaskPostingEngine === 'undefined') {
    await new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = '/js/taskPostingEngine.js';
      script.onload = resolve;
      script.onerror = resolve;
      document.head.appendChild(script);
    });
  }

  if (!window.xePostEngine && typeof window.DynamicTaskPostingEngine !== 'undefined') {
    window.xePostEngine = new window.DynamicTaskPostingEngine();
    await window.xePostEngine.init(ptCategoriesCache);
  }

  function updateSubcategories(catId) {
    const subSelect = document.getElementById('pt-subcategory');
    if (!subSelect) return;
    const cat = ptCategoriesCache.find(c => String(c.id) === String(catId)) || ptCategoriesCache[0];
    const subs = cat && Array.isArray(cat.subcategories) && cat.subcategories.length ? cat.subcategories : ['General'];
    subSelect.innerHTML = subs.map(s => {
      const name = typeof s === 'string' ? s : (s && s.name ? s.name : 'General');
      return `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`;
    }).join('');
    if (window.xePostEngine) {
      window.xePostEngine.formData.categoryId = Number(catId);
      window.xePostEngine.formData.categoryName = cat?.name || '';
      window.xePostEngine.formData.subcategory = subSelect.value;
      window.xePostEngine.loadTemplateForCategory(catId, subSelect.value);
    }
  }

  if (document.getElementById('xe-pt-modal')) {
    const catSel = document.getElementById('pt-category');
    if (catSel) {
      catSel.innerHTML = ptCategoriesCache.map(c => `<option value="${c.id}">${c.icon} ${escapeHtml(c.name)}</option>`).join('');
      updateSubcategories(catSel.value);
    }
    return;
  }

  const wrap = document.createElement('div');
  wrap.innerHTML = `
  <div class="modal-overlay" id="xe-pt-modal">
    <div class="modal modal-wide pt-modal-container" style="max-width:720px;width:95%;max-height:92vh;display:flex;flex-direction:column">
      
      <!-- Modal Header -->
      <div class="pt-modal-header" style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:1px solid rgba(255,255,255,0.08);padding-bottom:12px;margin-bottom:14px">
        <div>
          <h2 class="modal-title" style="margin:0 0 4px;font-size:1.35rem">Post a Task</h2>
          <p class="modal-sub" style="margin:0;font-size:0.82rem">Describe what you need — skilled verified people will apply in minutes.</p>
        </div>
        <button class="modal-x" data-close="xe-pt-modal" aria-label="Close" style="position:static">✕</button>
      </div>

      <!-- Draft Resume Prompt Banner (Hidden by default) -->
      <div id="pt-draft-resume-banner" style="display:none;background:rgba(99,102,241,0.12);border:1px solid rgba(99,102,241,0.3);border-radius:8px;padding:10px 14px;margin-bottom:14px;align-items:center;justify-content:space-between">
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-size:1.2rem">📋</span>
          <div>
            <b style="color:#fff;font-size:0.85rem">Resume saved draft?</b>
            <span class="draft-title" style="color:#A78BFA;font-size:0.8rem;display:block"></span>
          </div>
        </div>
        <div style="display:flex;gap:8px">
          <button type="button" class="btn btn-outline-light btn-sm btn-dismiss-draft" style="font-size:0.75rem;padding:4px 8px">Discard</button>
          <button type="button" class="btn btn-purple btn-sm btn-resume-draft" style="font-size:0.75rem;padding:4px 12px">Restore Draft</button>
        </div>
      </div>

      <!-- 6-Step Visual Stepper Bar -->
      <div class="pt-stepper-bar" style="display:flex;gap:6px;margin-bottom:18px;overflow-x:auto;padding-bottom:4px">
        <div class="pt-step-item active" onclick="window.xePostEngine.goToStep(1)">
          <span class="pt-step-badge">1</span>
          <span class="pt-step-title">Basics</span>
        </div>
        <div class="pt-step-item" onclick="window.xePostEngine.goToStep(2)">
          <span class="pt-step-badge">2</span>
          <span class="pt-step-title">Details</span>
        </div>
        <div class="pt-step-item" onclick="window.xePostEngine.goToStep(3)">
          <span class="pt-step-badge">3</span>
          <span class="pt-step-title">Files &amp; Skills</span>
        </div>
        <div class="pt-step-item" onclick="window.xePostEngine.goToStep(4)">
          <span class="pt-step-badge">4</span>
          <span class="pt-step-title">Location &amp; SLA</span>
        </div>
        <div class="pt-step-item" onclick="window.xePostEngine.goToStep(5)">
          <span class="pt-step-badge">5</span>
          <span class="pt-step-title">Budget</span>
        </div>
        <div class="pt-step-item" onclick="window.xePostEngine.goToStep(6)">
          <span class="pt-step-badge">6</span>
          <span class="pt-step-title">Review</span>
        </div>
      </div>

      <!-- Scrollable Form Body -->
      <div class="pt-modal-body" style="flex:1;overflow-y:auto;padding-right:4px">
        <form id="pt-form" onsubmit="event.preventDefault()">

          <!-- STEP 1: BASICS -->
          <div class="pt-step-panel" id="pt-step-panel-1">
            <div class="pt-type-switch" style="margin-bottom:14px">
              <button type="button" class="pt-type-btn active" data-type="online">💻 Online task</button>
              <button type="button" class="pt-type-btn" data-type="physical">🤝 Physical / on-site help</button>
            </div>
            <input type="hidden" name="taskType" id="pt-type" value="online">

            <div style="margin-bottom:14px">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
                <label for="pt-input-title" style="font-size:0.84rem;font-weight:700;color:#CBD5E1;margin:0;display:inline-flex;align-items:center;gap:4px">
                  Task Title <span style="color:#EF4444;font-weight:bold">*</span>
                </label>
                <button type="button" id="pt-btn-ai-assist" class="btn btn-purple btn-sm" style="font-size:0.75rem;padding:4px 12px;border-radius:14px;display:inline-flex;align-items:center;gap:5px" onclick="window.xePostEngine.triggerAiAssistance()">
                  ✨ AI Auto-Suggest
                </button>
              </div>
              <input type="text" name="title" id="pt-input-title" maxlength="150" placeholder="e.g. Minimal Brand Logo Design &amp; Vector Files" class="adm-input" required style="width:100%;height:42px;box-sizing:border-box">
              <span class="pt-inline-err" id="err-pt-title" style="display:none"></span>
            </div>

            <!-- Non-Authoritative AI Suggestions Container (Hidden by default) -->
            <div id="pt-ai-suggestions-panel" style="display:none;margin-bottom:14px"></div>

            <div class="pt-form-row-2col" style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:14px">
              <div class="pt-field-col" style="display:flex;flex-direction:column">
                <div style="display:flex;align-items:center;gap:4px;margin-bottom:6px;min-height:20px">
                  <label for="pt-category" style="font-size:0.84rem;font-weight:700;color:#CBD5E1;margin:0;display:inline-flex;align-items:center;gap:4px">
                    Category <span style="color:#EF4444;font-weight:bold">*</span>
                  </label>
                </div>
                <select name="categoryId" id="pt-category" class="adm-select" style="width:100%;height:42px;box-sizing:border-box">
                  ${ptCategoriesCache.map(c => `<option value="${c.id}">${c.icon} ${escapeHtml(c.name)}</option>`).join('')}
                </select>
                <span class="pt-inline-err" id="err-pt-category" style="display:none"></span>
              </div>

              <div class="pt-field-col" style="display:flex;flex-direction:column">
                <div style="display:flex;align-items:center;gap:4px;margin-bottom:6px;min-height:20px">
                  <label for="pt-subcategory" style="font-size:0.84rem;font-weight:700;color:#CBD5E1;margin:0;display:inline-flex;align-items:center;gap:4px">
                    Subcategory <span style="color:#EF4444;font-weight:bold">*</span>
                  </label>
                </div>
                <select name="subcategory" id="pt-subcategory" class="adm-select" style="width:100%;height:42px;box-sizing:border-box"></select>
                <span class="pt-inline-err" id="err-pt-subcategory" style="display:none"></span>
              </div>
            </div>

            <div style="margin-bottom:14px">
              <div style="margin-bottom:6px">
                <label for="pt-pro-level" style="font-size:0.84rem;font-weight:700;color:#CBD5E1;margin:0;display:inline-flex;align-items:center;gap:4px">
                  Worker Experience Level
                </label>
              </div>
              <select name="proLevel" id="pt-pro-level" class="adm-select" style="width:100%;height:42px;box-sizing:border-box">
                <option value="beginner">Beginner (Cost effective)</option>
                <option value="intermediate">Intermediate</option>
                <option value="skilled" selected>Skilled (Recommended)</option>
                <option value="expert">Expert / Specialist</option>
                <option value="verified_pro">Verified Professional</option>
                <option value="licensed_pro">Licensed Specialist</option>
              </select>
            </div>

            <div style="margin-bottom:14px">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
                <label for="pt-input-desc" style="font-size:0.84rem;font-weight:700;color:#CBD5E1;margin:0;display:inline-flex;align-items:center;gap:4px">
                  Detailed Description &amp; Deliverables <span style="color:#EF4444;font-weight:bold">*</span>
                </label>
                <small id="pt-desc-counter" style="color:#94A3B8;font-size:0.75rem">min 10 characters</small>
              </div>
              <textarea name="description" id="pt-input-desc" rows="4" minlength="10" class="adm-input" style="width:100%;box-sizing:border-box;resize:vertical;min-height:96px" placeholder="Describe what needs to be done, specific goals, deliverables, and requirements (min 10 characters)" required></textarea>
              <span class="pt-inline-err" id="err-pt-desc" style="display:none"></span>
            </div>
          </div>

          <!-- STEP 2: CATEGORY SPECIFIC DYNAMIC FIELDS -->
          <div class="pt-step-panel" id="pt-step-panel-2" style="display:none">
            <div id="pt-dynamic-fields-container"></div>
          </div>

          <!-- STEP 3: FILES, DELIVERABLES & SKILLS -->
          <div class="pt-step-panel" id="pt-step-panel-3" style="display:none">
            <!-- Skills Tagger -->
            <div style="margin-bottom:18px">
              <label style="font-size:0.84rem;font-weight:700;color:#CBD5E1;display:block;margin-bottom:6px">Required Skills Tags</label>
              <div style="display:flex;gap:8px;margin-bottom:8px;align-items:stretch">
                <input type="text" id="pt-skill-input" placeholder="Type a skill &amp; press Enter (e.g. illustrator, photoshop, translation)" class="adm-input" style="flex:1;height:42px;box-sizing:border-box">
                <button type="button" class="btn btn-green btn-sm" id="pt-btn-add-skill" style="font-weight:700;padding:0 18px;height:42px;display:inline-flex;align-items:center;gap:6px;border-radius:8px;white-space:nowrap">
                  ➕ Add Skill
                </button>
              </div>

              <!-- Quick suggestions chips -->
              <div id="pt-quick-skills-wrap" style="display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-bottom:12px">
                <small style="color:#94A3B8;font-size:0.75rem;margin-right:2px">💡 Quick add:</small>
                <span class="pt-suggest-chip" onclick="window.xePostEngine &amp;&amp; window.xePostEngine.addSkill('product-listing')">+ product-listing</span>
                <span class="pt-suggest-chip" onclick="window.xePostEngine &amp;&amp; window.xePostEngine.addSkill('shopify')">+ shopify</span>
                <span class="pt-suggest-chip" onclick="window.xePostEngine &amp;&amp; window.xePostEngine.addSkill('daraz')">+ daraz</span>
                <span class="pt-suggest-chip" onclick="window.xePostEngine &amp;&amp; window.xePostEngine.addSkill('excel')">+ excel</span>
                <span class="pt-suggest-chip" onclick="window.xePostEngine &amp;&amp; window.xePostEngine.addSkill('canva')">+ canva</span>
                <span class="pt-suggest-chip" onclick="window.xePostEngine &amp;&amp; window.xePostEngine.addSkill('photoshop')">+ photoshop</span>
              </div>

              <div id="pt-skills-container" style="display:flex;flex-wrap:wrap;gap:6px;min-height:30px"></div>
            </div>

            <!-- File Upload Zone -->
            <div style="margin-bottom:18px">
              <label style="font-size:0.84rem;font-weight:700;color:#CBD5E1;display:block;margin-bottom:6px">Reference Files &amp; Attachments (Optional)</label>
              <div id="pt-file-dropzone" style="background:#0F172A;border:2px dashed rgba(255,255,255,0.15);border-radius:10px;padding:20px;text-align:center;cursor:pointer" onclick="document.getElementById('pt-file-input').click()">
                <span style="font-size:1.8rem;display:block;margin-bottom:4px">📁</span>
                <b style="color:#fff;font-size:0.88rem">Click or Drag &amp; Drop files here</b>
                <small style="color:#94A3B8;display:block;margin-top:2px">Images, PDF, DOCX, ZIP, MP4 (Max 25MB per file)</small>
                <input type="file" id="pt-file-input" multiple style="display:none" onchange="window.xePostEngine.handleFileUpload(this.files)">
              </div>
              <div id="pt-files-list" style="margin-top:10px"></div>
            </div>

            <!-- Special Instructions -->
            <div>
              <label style="font-size:0.84rem;font-weight:700;color:#CBD5E1;display:block;margin-bottom:4px">Special Constraints &amp; Revisions</label>
              <textarea id="pt-special-instructions" rows="2" class="adm-input" style="width:100%" placeholder="e.g. Include 2 rounds of revisions; deliver source files in ZIP..."></textarea>
            </div>
          </div>

          <!-- STEP 4: LOCATION & SCHEDULE -->
          <div class="pt-step-panel" id="pt-step-panel-4" style="display:none">
            <!-- Physical Location Controls -->
            <div id="pt-physical-location-box" style="display:none;background:#0F172A;border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:16px;margin-bottom:16px">
              <b style="color:#10B981;font-size:0.9rem;display:block;margin-bottom:12px">📍 Physical Location &amp; Meeting Point</b>
              <div class="pt-form-row-2col" style="margin-bottom:12px">
                <div class="pt-field-col">
                  <div style="display:flex;align-items:center;gap:4px;margin-bottom:6px;min-height:20px">
                    <label for="pt-select-district" style="font-size:0.84rem;font-weight:700;color:#CBD5E1;margin:0;display:inline-flex;align-items:center;gap:4px">
                      District <span style="color:#EF4444;font-weight:bold">*</span>
                    </label>
                  </div>
                  <select id="pt-select-district" class="adm-select" style="width:100%;height:42px;box-sizing:border-box"></select>
                </div>
                <div class="pt-field-col">
                  <div style="display:flex;align-items:center;gap:4px;margin-bottom:6px;min-height:20px">
                    <label for="pt-select-area" style="font-size:0.84rem;font-weight:700;color:#CBD5E1;margin:0;display:inline-flex;align-items:center;gap:4px">
                      Area / Thana <span style="color:#EF4444;font-weight:bold">*</span>
                    </label>
                  </div>
                  <select id="pt-select-area" class="adm-select" style="width:100%;height:42px;box-sizing:border-box"></select>
                </div>
              </div>

              <div class="pt-field-col" style="margin-bottom:12px">
                <div style="display:flex;align-items:center;gap:4px;margin-bottom:6px;min-height:20px">
                  <label for="pt-input-meeting-point" style="font-size:0.84rem;font-weight:700;color:#CBD5E1;margin:0;display:inline-flex;align-items:center;gap:4px">
                    Exact Meeting Point / Landmark <span style="color:#EF4444;font-weight:bold">*</span>
                  </label>
                </div>
                <input type="text" id="pt-input-meeting-point" class="adm-input" placeholder="e.g. In front of Rapa Plaza, 2nd floor office" style="width:100%;height:42px;box-sizing:border-box">
                <span class="pt-inline-err" id="err-pt-meeting-point" style="display:none"></span>
              </div>

              <label style="display:flex;align-items:center;gap:8px;cursor:pointer;margin:0">
                <input type="checkbox" id="pt-location-privacy" checked style="accent-color:#10B981">
                <span style="color:#94A3B8;font-size:0.78rem">🔒 Only reveal full address &amp; phone to the hired worker</span>
              </label>
            </div>

            <!-- Online Work Mode Controls -->
            <div id="pt-online-workmode-box" style="background:#0F172A;border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:16px;margin-bottom:16px">
              <b style="color:#60A5FA;font-size:0.9rem;display:block;margin-bottom:12px">💻 Online Collaboration Preferences</b>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px">
                <label style="display:flex;align-items:center;gap:10px;cursor:pointer;font-size:0.84rem;color:#E2E8F0;background:#1E293B;padding:10px 14px;border-radius:8px;margin:0">
                  <input type="radio" name="pt-work-mode" value="remote" checked style="accent-color:#10B981">
                  <span>File Delivery / Remote</span>
                </label>
                <label style="display:flex;align-items:center;gap:10px;cursor:pointer;font-size:0.84rem;color:#E2E8F0;background:#1E293B;padding:10px 14px;border-radius:8px;margin:0">
                  <input type="radio" name="pt-work-mode" value="chat_interactive" style="accent-color:#10B981">
                  <span>Real-time Chat / Collaboration</span>
                </label>
              </div>

              <div class="pt-field-col">
                <div style="display:flex;align-items:center;gap:4px;margin-bottom:6px;min-height:20px">
                  <label for="pt-comm-pref" style="font-size:0.84rem;font-weight:700;color:#CBD5E1;margin:0">
                    Preferred Communication Channel
                  </label>
                </div>
                <select id="pt-comm-pref" class="adm-select" style="width:100%;height:42px;box-sizing:border-box">
                  <option value="xtraearn_chat">XtraEarn Official Encrypted Chat</option>
                  <option value="video_room">XtraEarn Video Meeting Room</option>
                  <option value="file_only">Delivery Files Only</option>
                </select>
              </div>
            </div>

            <!-- Schedule & Urgency -->
            <div class="pt-form-row-3col" style="margin-bottom:14px">
              <div class="pt-field-col">
                <div style="display:flex;align-items:center;gap:4px;margin-bottom:6px;min-height:20px">
                  <label for="pt-preferred-date" style="font-size:0.84rem;font-weight:700;color:#CBD5E1;margin:0">Preferred Date</label>
                </div>
                <input type="date" id="pt-preferred-date" class="adm-input" style="width:100%;height:42px;box-sizing:border-box">
              </div>

              <div class="pt-field-col">
                <div style="display:flex;align-items:center;gap:4px;margin-bottom:6px;min-height:20px">
                  <label for="pt-preferred-timeslot" style="font-size:0.84rem;font-weight:700;color:#CBD5E1;margin:0">Time Slot</label>
                </div>
                <select id="pt-preferred-timeslot" class="adm-select" style="width:100%;height:42px;box-sizing:border-box">
                  <option value="anytime">Anytime</option>
                  <option value="morning">Morning (8am - 12pm)</option>
                  <option value="afternoon">Afternoon (12pm - 4pm)</option>
                  <option value="evening">Evening (4pm - 8pm)</option>
                  <option value="night">Night (8pm - 11pm)</option>
                </select>
              </div>

              <div class="pt-field-col" style="display:flex;flex-direction:column;justify-content:flex-end">
                <div style="display:flex;align-items:center;gap:4px;margin-bottom:6px;min-height:20px">
                  <span style="font-size:0.84rem;font-weight:700;color:#CBD5E1">Priority</span>
                </div>
                <label style="display:flex;align-items:center;gap:8px;height:42px;background:#0F172A;border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:0 12px;margin:0;cursor:pointer;box-sizing:border-box">
                  <input type="checkbox" id="pt-urgent-toggle" style="accent-color:#F59E0B;width:16px;height:16px;margin:0">
                  <span style="color:#FBBF24;font-size:0.82rem;font-weight:700">⚡ Urgent (Need ASAP)</span>
                </label>
              </div>
            </div>
          </div>

          <!-- STEP 5: BUDGET & WORKER CRITERIA -->
          <div class="pt-step-panel" id="pt-step-panel-5" style="display:none">
            <div class="pt-form-row-3col" style="margin-bottom:14px">
              <div class="pt-field-col">
                <div style="display:flex;align-items:center;gap:4px;margin-bottom:6px;min-height:20px">
                  <label for="pt-input-budget" style="font-size:0.84rem;font-weight:700;color:#CBD5E1;margin:0;display:inline-flex;align-items:center;gap:4px">
                    Task Budget <span style="color:#EF4444;font-weight:bold">*</span>
                  </label>
                </div>
                <input type="number" id="pt-input-budget" min="20" step="10" value="250" class="adm-input" required style="width:100%;height:42px;box-sizing:border-box" oninput="window.xePostEngine.formData.budget=this.value;window.xePostEngine.calculateFeeBreakdown()">
                <span class="pt-inline-err" id="err-pt-budget" style="display:none"></span>
              </div>

              <div class="pt-field-col">
                <div style="display:flex;align-items:center;gap:4px;margin-bottom:6px;min-height:20px">
                  <label for="pt-select-currency" style="font-size:0.84rem;font-weight:700;color:#CBD5E1;margin:0">
                    Currency <span style="color:#EF4444;font-weight:bold">*</span>
                  </label>
                </div>
                <select id="pt-select-currency" class="adm-select" style="width:100%;height:42px;box-sizing:border-box" onchange="window.xePostEngine.formData.currency=this.value;window.xePostEngine.calculateFeeBreakdown()">
                  <option value="BDT">৳ BDT (Taka)</option>
                  <option value="USD">$ USD (Dollar)</option>
                  <option value="EUR">€ EUR (Euro)</option>
                  <option value="GBP">£ GBP (Pound)</option>
                </select>
              </div>

              <div class="pt-field-col">
                <div style="display:flex;align-items:center;gap:4px;margin-bottom:6px;min-height:20px">
                  <label for="pt-input-delivery" style="font-size:0.84rem;font-weight:700;color:#CBD5E1;margin:0;display:inline-flex;align-items:center;gap:4px">
                    Delivery SLA (Hours) <span style="color:#EF4444;font-weight:bold">*</span>
                  </label>
                </div>
                <input type="number" id="pt-input-delivery" min="1" max="336" value="24" class="adm-input" required style="width:100%;height:42px;box-sizing:border-box">
                <span class="pt-inline-err" id="err-pt-delivery" style="display:none"></span>
              </div>
            </div>

            <div class="pt-form-row-2col" style="margin-bottom:14px">
              <div class="pt-field-col">
                <div style="display:flex;align-items:center;gap:4px;margin-bottom:6px;min-height:20px">
                  <label for="pt-input-duration" style="font-size:0.84rem;font-weight:700;color:#CBD5E1;margin:0">
                    Est. Duration (Minutes)
                  </label>
                </div>
                <input type="number" id="pt-input-duration" min="5" step="5" value="30" class="adm-input" required style="width:100%;height:42px;box-sizing:border-box">
                <span class="pt-inline-err" id="err-pt-duration" style="display:none"></span>
              </div>

              <div class="pt-field-col">
                <div style="display:flex;align-items:center;gap:4px;margin-bottom:6px;min-height:20px">
                  <label for="pt-crit-rating" style="font-size:0.84rem;font-weight:700;color:#CBD5E1;margin:0">
                    Min Freelancer Rating
                  </label>
                </div>
                <select id="pt-crit-rating" class="adm-select" style="width:100%;height:42px;box-sizing:border-box">
                  <option value="0">Any Rating (Open to all)</option>
                  <option value="4.0">⭐ 4.0+ Stars</option>
                  <option value="4.5">⭐⭐ 4.5+ Stars</option>
                  <option value="4.8">⭐⭐⭐ 4.8+ Stars (Top Rated)</option>
                </select>
              </div>
            </div>

            <!-- Worker Criteria Extra -->
            <div style="background:#0F172A;border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:14px;margin-bottom:14px">
              <b style="color:#A78BFA;font-size:0.86rem;display:block;margin-bottom:10px">🎯 Worker Eligibility Criteria</b>
              <div class="pt-form-row-2col" style="margin-bottom:10px">
                <div class="pt-field-col">
                  <label for="pt-crit-tasks" style="font-size:0.8rem;color:#CBD5E1;margin-bottom:6px">Min Completed Tasks</label>
                  <select id="pt-crit-tasks" class="adm-select" style="width:100%;height:42px;box-sizing:border-box">
                    <option value="0">0+ (Newcomers welcome)</option>
                    <option value="5">5+ Completed</option>
                    <option value="20">20+ Completed (Experienced)</option>
                  </select>
                </div>
                <div class="pt-field-col" style="display:flex;justify-content:flex-end">
                  <label style="display:flex;align-items:center;gap:8px;margin:0;cursor:pointer;height:42px">
                    <input type="checkbox" id="pt-crit-verified" style="accent-color:#10B981;width:16px;height:16px">
                    <span style="color:#E2E8F0;font-size:0.82rem">🔒 Verified NID/KYC Only</span>
                  </label>
                </div>
              </div>
            </div>

            <!-- Escrow Breakdown Box -->
            <div id="pt-escrow-calculation-box"></div>
          </div>

          <!-- STEP 6: REVIEW & QUALITY CHECK -->
          <div class="pt-step-panel" id="pt-step-panel-6" style="display:none">
            <div id="pt-quality-check-card" style="margin-bottom:14px"></div>
            <div id="pt-review-summary-card"></div>
          </div>

        </form>
      </div>

      <!-- Modal Footer Controls -->
      <div class="pt-modal-footer" style="display:flex;justify-content:space-between;align-items:center;border-top:1px solid rgba(255,255,255,0.08);padding-top:14px;margin-top:14px">
        <div style="display:flex;align-items:center;gap:8px">
          <small id="pt-draft-indicator" style="color:#94A3B8;font-size:0.75rem">💾 Auto-saving draft...</small>
          <button type="button" class="btn btn-outline-light btn-sm" style="font-size:0.75rem;padding:4px 8px" onclick="window.xePostEngine.saveDraft();toast('Draft saved manually! 💾', 'info');">Save Draft</button>
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          <span id="pt-validation-msg" style="display:none;color:#F87171;font-size:0.8rem;font-weight:600;margin-right:6px"></span>
          <button type="button" class="btn btn-outline-light" id="pt-btn-back" style="display:none" onclick="window.xePostEngine.prevStep()">‹ Back</button>
          <button type="button" class="btn btn-purple" id="pt-btn-next" onclick="window.xePostEngine.nextStep()">Next ›</button>
          <button type="button" class="btn btn-green" id="pt-btn-publish" style="display:none;font-weight:800;box-shadow:0 4px 14px rgba(16,185,129,0.4)" onclick="window.xePostEngine.publishTask()">🚀 Publish Task &amp; Fund Escrow</button>
        </div>
      </div>

    </div>
  </div>`;
  document.body.appendChild(wrap);

  const catSel = document.getElementById('pt-category');
  if (catSel) {
    catSel.addEventListener('change', () => updateSubcategories(catSel.value));
    updateSubcategories(catSel.value);
  }

  const subSel = document.getElementById('pt-subcategory');
  if (subSel) {
    subSel.addEventListener('change', () => {
      if (window.xePostEngine) {
        window.xePostEngine.formData.subcategory = subSel.value;
        window.xePostEngine.loadTemplateForCategory(catSel.value, subSel.value);
      }
    });
  }

  wrap.querySelectorAll('.pt-type-btn').forEach(b =>
    b.addEventListener('click', () => {
      switchPtType(b.dataset.type);
      document.getElementById('pt-type').value = b.dataset.type;
    }));

  // Auto-trigger step 1 view
  if (window.xePostEngine) {
    window.xePostEngine.renderStepView();
  }
}


/* ---------- INVOICE & RECEIPT MODAL GENERATOR ---------- */
function downloadInvoicePdf(type, id) {
  const url = `/api/invoices/${type}/${id}/pdf`;
  const a = document.createElement('a');
  a.href = url;
  a.download = `XtraEarn-${type === 'task' ? 'Invoice' : 'Receipt'}-${id}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  toast('📄 Downloading Official PDF Document...', 'info');
}
window.downloadInvoicePdf = downloadInvoicePdf;

async function openInvoiceModal(type, id) {
  let modal = document.getElementById('xe-invoice-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'xe-invoice-modal';
    document.body.appendChild(modal);
  }
  modal.className = 'modal-overlay';

  modal.innerHTML = `
    <div class="modal" style="max-width:680px;padding:0;background:#0F172A;border:1px solid rgba(255,255,255,0.12);border-radius:18px;overflow:hidden;box-shadow:0 25px 50px -12px rgba(0,0,0,0.7);color:#F8FAFC">
      <div style="display:flex;justify-content:space-between;align-items:center;padding:16px 24px;background:#1E293B;border-bottom:1px solid rgba(255,255,255,0.08)">
        <div style="display:flex;align-items:center;gap:10px">
          <span style="font-size:1.3rem">📄</span>
          <h3 style="margin:0;font-size:1.05rem;font-weight:700;color:#fff">${type === 'task' ? 'Official Task Invoice' : 'Transaction Payment Receipt'}</h3>
        </div>
        <button class="modal-close" onclick="closeModal('xe-invoice-modal')" style="background:none;border:none;color:#94A3B8;font-size:1.5rem;cursor:pointer">×</button>
      </div>

      <div id="invoice-modal-content" style="padding:24px;max-height:75vh;overflow-y:auto;background:#0B1120">
        <div style="text-align:center;padding:40px 0;color:#94A3B8">
          <div class="adm-spinner" style="margin:0 auto 12px"></div>
          <p>Generating verified digital document...</p>
        </div>
      </div>

      <div style="display:flex;justify-content:space-between;align-items:center;padding:16px 24px;background:#1E293B;border-top:1px solid rgba(255,255,255,0.08)">
        <span style="font-size:0.8rem;color:#94A3B8">🔒 Verified by XtraEarn Bangladesh</span>
        <div style="display:flex;gap:10px">
          <button class="btn btn-outline btn-sm" onclick="window.printInvoiceContent()" style="background:rgba(255,255,255,0.05);color:#fff;border:1px solid rgba(255,255,255,0.15)">🖨️ Print</button>
          <button class="btn btn-green btn-sm" onclick="downloadInvoicePdf('${type}', '${id}')" style="background:#16A34A;color:#fff;font-weight:700">⬇️ Download PDF</button>
        </div>
      </div>
    </div>
  `;

  openModal('xe-invoice-modal');

  try {
    const res = await api(`/invoices/${type}/${id}`);
    const data = type === 'task' ? res.invoice : res.receipt;
    const bodyEl = document.getElementById('invoice-modal-content');
    if (!bodyEl) return;

    if (type === 'task') {
      bodyEl.innerHTML = `
        <div id="printable-invoice" style="background:#fff;color:#0F172A;border-radius:12px;padding:28px;font-family:'Plus Jakarta Sans',sans-serif">
          <!-- Top Branded Header -->
          <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #F1F5F9;padding-bottom:20px;margin-bottom:20px">
            <div>
              <div style="font-size:1.5rem;font-weight:800;letter-spacing:-0.5px">
                <span style="color:#16A34A">XTRA</span><span style="color:#0F172A">EARN</span>
              </div>
              <p style="margin:4px 0 0;font-size:0.75rem;color:#64748B">Bangladesh's Micro-Task & Freelance Platform</p>
              <p style="margin:2px 0 0;font-size:0.75rem;color:#64748B">Motijheel C/A, Dhaka-1000 • support@xtraearn.com</p>
            </div>
            <div style="text-align:right">
              <span style="display:inline-block;background:#DCFCE7;color:#15803D;font-weight:800;font-size:0.75rem;padding:4px 10px;border-radius:99px;margin-bottom:6px">● ${escapeHtml(data.status)}</span>
              <h2 style="margin:0;font-size:1.1rem;font-weight:800;color:#0F172A">${escapeHtml(data.invoiceNumber)}</h2>
              <span style="font-size:0.78rem;color:#64748B">Date: ${escapeHtml(data.date)}</span>
            </div>
          </div>

          <!-- Parties Grid -->
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px">
            <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:14px">
              <small style="font-size:0.7rem;font-weight:700;color:#64748B;text-transform:uppercase">Billed To (Client)</small>
              <div style="font-weight:700;font-size:0.95rem;color:#0F172A;margin-top:4px">${escapeHtml(data.clientName)}</div>
              <div style="font-size:0.8rem;color:#64748B">${escapeHtml(data.clientEmail)}</div>
              <div style="font-size:0.75rem;color:#64748B;margin-top:4px">Task Ref: #TASK-${escapeHtml(data.taskId)}</div>
            </div>
            <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:14px">
              <small style="font-size:0.7rem;font-weight:700;color:#64748B;text-transform:uppercase">Performed By (Freelancer)</small>
              <div style="font-weight:700;font-size:0.95rem;color:#0F172A;margin-top:4px">${escapeHtml(data.workerName)}</div>
              <div style="font-size:0.8rem;color:#64748B">${escapeHtml(data.workerEmail)}</div>
              <div style="font-size:0.75rem;color:#16A34A;margin-top:4px">✓ Verified Identity (NID KYC)</div>
            </div>
          </div>

          <!-- Line Items Table -->
          <table style="width:100%;border-collapse:collapse;margin-bottom:20px;font-size:0.85rem">
            <thead>
              <tr style="background:#0F172A;color:#fff;text-align:left">
                <th style="padding:10px 14px;border-radius:6px 0 0 6px">Service / Task Title</th>
                <th style="padding:10px 14px">Category</th>
                <th style="padding:10px 14px;text-align:right;border-radius:0 6px 6px 0">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr style="border-bottom:1px solid #E2E8F0">
                <td style="padding:14px;font-weight:700;color:#0F172A">${escapeHtml(data.taskTitle)}</td>
                <td style="padding:14px;color:#64748B">${escapeHtml(data.category)}</td>
                <td style="padding:14px;text-align:right;font-weight:800;color:#0F172A">৳${Number(data.budget).toLocaleString()}</td>
              </tr>
            </tbody>
          </table>

          <!-- Totals Split Box -->
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:20px;margin-bottom:20px">
            <div style="flex:1;background:#F0FDF4;border:1px solid #BBF7D0;border-radius:8px;padding:14px;font-size:0.78rem;color:#166534">
              <div style="font-weight:800;margin-bottom:4px">🔒 100% Escrow Protection</div>
              <div>Payment was securely held in escrow and released upon client acceptance. Tax-compliant digital record.</div>
              <div style="margin-top:6px;font-family:monospace;font-size:0.72rem;color:#15803D">Ref: ${escapeHtml(data.txRef)}</div>
            </div>
            <div style="width:230px;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:14px;font-size:0.82rem">
              <div style="display:flex;justify-content:space-between;margin-bottom:6px;color:#64748B">
                <span>Task Budget:</span>
                <span style="font-weight:700;color:#0F172A">৳${Number(data.budget).toLocaleString()}</span>
              </div>
              <div style="display:flex;justify-content:space-between;margin-bottom:8px;color:#64748B">
                <span>Platform Fee (10%):</span>
                <span style="font-weight:700;color:#EF4444">-৳${Number(data.platformFeeAmount).toLocaleString()}</span>
              </div>
              <div style="border-top:1px solid #E2E8F0;padding-top:8px;display:flex;justify-content:space-between;font-size:0.95rem;font-weight:800">
                <span style="color:#0F172A">Total Paid:</span>
                <span style="color:#16A34A">৳${Number(data.budget).toLocaleString()}</span>
              </div>
              <div style="margin-top:4px;font-size:0.7rem;color:#64748B;text-align:right">
                Net to Freelancer: ৳${Number(data.netEarnings).toLocaleString()}
              </div>
            </div>
          </div>

          <!-- Bottom Micro Notes -->
          <div style="border-top:1px solid #F1F5F9;padding-top:12px;text-align:center;font-size:0.7rem;color:#94A3B8">
            This is an official electronically generated invoice by XtraEarn Technologies Ltd. (Govt Reg #BD-994821).
          </div>
        </div>
      `;
    } else {
      bodyEl.innerHTML = `
        <div id="printable-invoice" style="background:#fff;color:#0F172A;border-radius:12px;padding:28px;font-family:'Plus Jakarta Sans',sans-serif">
          <!-- Top Branded Header -->
          <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #F1F5F9;padding-bottom:20px;margin-bottom:20px">
            <div>
              <div style="font-size:1.5rem;font-weight:800;letter-spacing:-0.5px">
                <span style="color:#16A34A">XTRA</span><span style="color:#0F172A">EARN</span>
              </div>
              <p style="margin:4px 0 0;font-size:0.75rem;color:#64748B">Payment & Escrow Receipt</p>
              <p style="margin:2px 0 0;font-size:0.75rem;color:#64748B">support@xtraearn.com • Dhaka, Bangladesh</p>
            </div>
            <div style="text-align:right">
              <span style="display:inline-block;background:#DCFCE7;color:#15803D;font-weight:800;font-size:0.75rem;padding:4px 10px;border-radius:99px;margin-bottom:6px">● COMPLETED</span>
              <h2 style="margin:0;font-size:1.1rem;font-weight:800;color:#0F172A">${escapeHtml(data.receiptNumber)}</h2>
              <span style="font-size:0.78rem;color:#64748B">Date: ${escapeHtml(data.date)}</span>
            </div>
          </div>

          <!-- Account Holder -->
          <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:14px;margin-bottom:20px">
            <small style="font-size:0.7rem;font-weight:700;color:#64748B;text-transform:uppercase">Account Holder</small>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-top:4px">
              <div>
                <div style="font-weight:700;font-size:0.95rem;color:#0F172A">${escapeHtml(data.userName)}</div>
                <div style="font-size:0.8rem;color:#64748B">${escapeHtml(data.userEmail)}</div>
              </div>
              <div style="text-align:right">
                <div style="font-size:0.8rem;font-weight:700;color:#0F172A">${escapeHtml(data.method)}</div>
                <div style="font-size:0.72rem;color:#64748B;font-family:monospace">Ref: ${escapeHtml(data.txRef)}</div>
              </div>
            </div>
          </div>

          <!-- Particulars -->
          <table style="width:100%;border-collapse:collapse;margin-bottom:20px;font-size:0.85rem">
            <thead>
              <tr style="background:#0F172A;color:#fff;text-align:left">
                <th style="padding:10px 14px;border-radius:6px 0 0 6px">Transaction Type</th>
                <th style="padding:10px 14px">Channel</th>
                <th style="padding:10px 14px;text-align:right;border-radius:0 6px 6px 0">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr style="border-bottom:1px solid #E2E8F0">
                <td style="padding:14px;font-weight:700;color:#0F172A">${escapeHtml(data.type)}</td>
                <td style="padding:14px;color:#64748B">${escapeHtml(data.method)}</td>
                <td style="padding:14px;text-align:right;font-weight:800;color:#16A34A">৳${Number(data.amount).toLocaleString()}</td>
              </tr>
            </tbody>
          </table>

          <!-- Summary & Totals -->
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:20px;margin-bottom:20px">
            <div style="flex:1;background:#F0FDF4;border:1px solid #BBF7D0;border-radius:8px;padding:14px;font-size:0.78rem;color:#166534">
              <div style="font-weight:800;margin-bottom:4px">✅ Instant Reconciled Receipt</div>
              <div>This transaction was processed through secure digital payment rails and credited to wallet balance.</div>
            </div>
            <div style="width:230px;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:14px;font-size:0.82rem">
              <div style="display:flex;justify-content:space-between;margin-bottom:6px;color:#64748B">
                <span>Gross Total:</span>
                <span style="font-weight:700;color:#0F172A">৳${Number(data.amount).toLocaleString()}</span>
              </div>
              <div style="display:flex;justify-content:space-between;margin-bottom:8px;color:#64748B">
                <span>Fee:</span>
                <span style="font-weight:700;color:#64748B">৳${Number(data.fee || 0).toLocaleString()}</span>
              </div>
              <div style="border-top:1px solid #E2E8F0;padding-top:8px;display:flex;justify-content:space-between;font-size:0.95rem;font-weight:800">
                <span style="color:#0F172A">Net Credited:</span>
                <span style="color:#16A34A">৳${Number(data.netAmount).toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div style="border-top:1px solid #F1F5F9;padding-top:12px;text-align:center;font-size:0.7rem;color:#94A3B8">
            Official Receipt • XtraEarn Technologies Ltd. • Keep this receipt for accounting purposes.
          </div>
        </div>
      `;
    }
  } catch (err) {
    const bodyEl = document.getElementById('invoice-modal-content');
    if (bodyEl) bodyEl.innerHTML = `<div style="text-align:center;padding:30px;color:#EF4444">⚠️ Error loading invoice: ${escapeHtml(err.message)}</div>`;
  }
}
window.openInvoiceModal = openInvoiceModal;

window.printInvoiceContent = function() {
  const content = document.getElementById('printable-invoice');
  if (!content) return window.print();
  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <html>
      <head>
        <title>XtraEarn Invoice</title>
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">
        <style>
          body { font-family: 'Plus Jakarta Sans', sans-serif; margin: 20px; background: #fff; }
          @media print { body { margin: 0; } }
        </style>
      </head>
      <body>${content.outerHTML}</body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => { printWindow.print(); }, 250);
};

window.openModal = function(id) {
  const el = typeof id === 'string' ? document.getElementById(id) : id;
  if (!el) return;
  el.classList.add('open', 'show');
  el.style.display = 'flex';
  document.body.style.overflow = 'hidden';
};

window.closeModal = function(id) {
  const el = typeof id === 'string' ? document.getElementById(id) : id;
  if (!el) return;
  el.classList.remove('open', 'show');
  el.style.display = 'none';
  document.body.style.overflow = '';
};

window.setElText = function(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text !== undefined && text !== null ? text : '';
};

/* ---------- CMS Storefront Hydrator & Behavioral Popups ---------- */
let activeCmsPopupData = null;

async function initCmsStorefront() {
  try {
    const bootstrap = await api('/cms/bootstrap');
    if (!bootstrap) return;

    // 1. Theme Tokens Injection
    if (bootstrap.theme_tokens) {
      const root = document.documentElement;
      const t = bootstrap.theme_tokens;
      const pColor = t['--primary-color'] || t.primary_color;
      const aColor = t['--accent-color'] || t.accent_color;
      const bgDark = t['--bg-dark'] || t.background_dark;
      const cardBg = t['--card-bg'] || t.card_background;
      const font = t['--font-sans'] || t.font_heading || t.font_body;
      const radius = t['--radius-md'] || t.border_radius;

      if (pColor) root.style.setProperty('--primary-color', pColor);
      if (aColor) root.style.setProperty('--accent-color', aColor);
      if (bgDark) root.style.setProperty('--bg-dark', bgDark);
      if (cardBg) root.style.setProperty('--card-bg', cardBg);
      if (font) root.style.setProperty('--font-family', font);
      if (radius) root.style.setProperty('--radius-md', radius);
    }

    // 2. Global Top Announcement Bar
    const annBar = document.getElementById('cms-top-announcement-bar');
    if (annBar && bootstrap.header && bootstrap.header.announcement_bar) {
      const barData = bootstrap.header.announcement_bar;
      const isDismissed = sessionStorage.getItem('xe_ann_bar_dismissed');
      if (barData.enabled && !isDismissed) {
        annBar.style.display = 'block';
        const txtEl = document.getElementById('cms-ann-text');
        if (txtEl) txtEl.textContent = barData.text || '⚡ Welcome to XtraEarn!';
        const linkEl = document.getElementById('cms-ann-link');
        if (linkEl && barData.url) {
          linkEl.href = barData.url;
          linkEl.style.display = 'inline-block';
        }
      }
    }

    // 3. High-Conversion Behavioral Popups
    if (Array.isArray(bootstrap.popups) && bootstrap.popups.length > 0) {
      const popup = bootstrap.popups[0]; // Active top popup
      const dismissed = localStorage.getItem(`xe_popup_dismissed_${popup.id}`);
      if (!dismissed) {
        activeCmsPopupData = popup;
        setupPopupTrigger(popup);
      }
    }

    // 4. Dynamic Footer
    if (bootstrap.footer) {
      const fTagline = document.getElementById('cms-footer-tagline');
      if (fTagline && bootstrap.footer.newsletter_headline) {
        fTagline.textContent = bootstrap.footer.newsletter_headline;
      }
      const fCopy = document.getElementById('cms-footer-copyright');
      if (fCopy && bootstrap.footer.copyright) {
        fCopy.textContent = bootstrap.footer.copyright;
      }
    }
  } catch (err) {
    // Graceful fallback if CMS endpoint is temporarily unavailable
  }
}

function setupPopupTrigger(popup) {
  const trigger = popup.trigger || 'after_5_seconds';

  const triggerShow = () => {
    const modal = document.getElementById('cms-active-popup-modal');
    if (!modal) return;
    const titleEl = document.getElementById('cms-popup-title');
    const bodyEl = document.getElementById('cms-popup-body');
    const badgeEl = document.getElementById('cms-popup-badge');
    const ctaEl = document.getElementById('cms-popup-cta');

    if (titleEl) titleEl.textContent = popup.headline || 'Special Offer!';
    if (bodyEl) bodyEl.textContent = popup.content || 'Join today and get instant bonuses.';
    if (badgeEl) badgeEl.textContent = (popup.target_audience || 'ALL USERS').toUpperCase();
    if (ctaEl && popup.cta_button) {
      ctaEl.textContent = popup.cta_button.label || 'Get Started';
      ctaEl.href = popup.cta_button.action_url || '/tasks';
    }

    modal.classList.add('show');
  };

  if (trigger === 'after_5_seconds' || trigger === 'time_delayed') {
    setTimeout(triggerShow, 5000);
  } else if (trigger === 'scroll_50%') {
    const onScroll = () => {
      const scrollPercent = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
      if (scrollPercent >= 45) {
        triggerShow();
        window.removeEventListener('scroll', onScroll);
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
  } else if (trigger === 'exit_intent') {
    const onMouseLeave = (e) => {
      if (e.clientY <= 10) {
        triggerShow();
        document.removeEventListener('mouseleave', onMouseLeave);
      }
    };
    document.addEventListener('mouseleave', onMouseLeave);
  }
}

window.dismissAnnouncementBar = function() {
  const annBar = document.getElementById('cms-top-announcement-bar');
  if (annBar) annBar.style.display = 'none';
  sessionStorage.setItem('xe_ann_bar_dismissed', 'true');
};

window.dismissActivePopup = function() {
  const modal = document.getElementById('cms-active-popup-modal');
  if (modal) modal.classList.remove('show');
  if (activeCmsPopupData) {
    localStorage.setItem(`xe_popup_dismissed_${activeCmsPopupData.id}`, 'true');
  }
};

/* ---------- boot ---------- */
document.addEventListener('DOMContentLoaded', () => {
  // Capture ?ref=CODE from URL if present
  try {
    const p = new URLSearchParams(window.location.search);
    const ref = p.get('ref') || p.get('referral');
    if (ref) {
      sessionStorage.setItem('xe_ref_code', ref.trim().toUpperCase());
    }
  } catch (e) {}

  ensureAuthModal();
  renderHeader();
  initCmsStorefront();
});

window.refreshUserAuthBadge = async function() {
  await Auth.init();
  renderHeader();
};

