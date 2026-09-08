/**
 * XtraEarn — Modern User Profile Studio & Interactive Hub
 * State-of-the-art layout with Gamification, Portfolio Showcase, Rating Breakdown, and Direct Hire
 */

document.addEventListener('DOMContentLoaded', () => {
  const root = document.getElementById('profile-root');
  if (!root) return;

  const urlParams = new URLSearchParams(location.search);
  let paramsId = urlParams.get('id');
  let paramsUsername = urlParams.get('u') || urlParams.get('username');

  // GitHub-style vanity root handle routing: /admin_super, /@admin_super, or /profile/:idOrHandle
  if (!paramsUsername && !paramsId) {
    const cleanPath = location.pathname.replace(/^\/+|\/+$/g, '');
    const parts = cleanPath.split('/');
    const reservedPages = new Set([
      'profile', 'tasks', 'task', 'login', 'register', 'dashboard', 'wallet', 'admin',
      'consult', 'meet', 'page', 'p', 'campaign', 'affiliates', 'index'
    ]);
    if (parts.length === 1 && parts[0]) {
      const seg = parts[0].toLowerCase();
      if (!reservedPages.has(seg) && !seg.includes('.')) {
        paramsUsername = parts[0].replace(/^@/, '');
      }
    } else if (parts.length === 2 && parts[0].toLowerCase() === 'profile' && parts[1]) {
      const seg = parts[1].replace(/^@/, '');
      if (/^\d+$/.test(seg)) {
        paramsId = seg;
      } else {
        paramsUsername = seg;
      }
    }
  }

  const loggedInUser = Auth && Auth.user ? Auth.user : null;
  const targetUserId = paramsUsername || paramsId || (loggedInUser ? (loggedInUser.username || loggedInUser.id) : null);

  if (!targetUserId) {
    if (typeof requireLogin === 'function') {
      requireLogin('Please login to view your profile.');
    } else {
      root.innerHTML = `
        <div class="empty-state" style="padding: 80px 20px; text-align: center;">
          <span class="big" style="font-size: 3rem; display: block; margin-bottom: 12px;">🔒</span>
          <h3>Please Login</h3>
          <p style="color: var(--muted); margin-bottom: 20px;">You must be logged in to view your profile studio.</p>
          <a href="/login" class="pv2-btn pv2-btn-primary">Login Now</a>
        </div>`;
    }
    return;
  }

  let isMe = false;
  if (loggedInUser) {
    if (!paramsId && !paramsUsername) {
      isMe = true;
    } else if (paramsId && Number(paramsId) === Number(loggedInUser.id)) {
      isMe = true;
    } else if (paramsUsername && (String(paramsUsername).toLowerCase().replace(/^@/, '') === (loggedInUser.username || '').toLowerCase())) {
      isMe = true;
    }
  }
  let profileData = null;

  async function loadProfile() {
    try {
      const data = await api(`/users/${targetUserId}`);
      profileData = data;
      if (loggedInUser && data.user && data.user.id === loggedInUser.id) {
        isMe = true;
      }
      window.currentProfileData = data;
      document.title = `${data.user.name} — Professional Profile Hub | XtraEarn`;
      render(data, isMe);
      if (isMe) {
        window.loadUserConsultations();
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('tab') === 'consultations') {
          setTimeout(() => {
            window.switchPv2Tab('tab-consultations');
          }, 100);
        }
      }
    } catch (err) {
      root.innerHTML = `
        <div class="empty-state" style="padding: 80px 20px; text-align: center;">
          <span class="big" style="font-size: 3rem; display: block; margin-bottom: 12px;">⚠️</span>
          <h3>Profile Not Found</h3>
          <p style="color: var(--muted); margin-bottom: 20px;">${escapeHtml(err.message || 'Unable to load profile information.')}</p>
          <a href="/tasks" class="pv2-btn pv2-btn-outline">Browse Tasks</a>
        </div>`;
    }
  }

  window.renderPortfolioCardHtml = function(p, idx, isSelf) {
    const isHidden = Boolean(p.is_hidden);
    return `
      <div class="pv2-portfolio-card" id="pv2-card-${p.id}" style="${isHidden ? 'border: 1.5px dashed #F59E0B; background: #FFFDF7; opacity: 0.92;' : ''}">
        <div class="pv2-portfolio-img-wrap" onclick="openPortfolioLightbox(${idx})" style="cursor: pointer;">
          <img class="pv2-portfolio-img" src="${escapeHtml(p.image_url)}" alt="${escapeHtml(p.title)}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1542744094-3a31727221eb?w=600&auto=format&fit=crop&q=80'; this.onerror=null;">
          <span class="pv2-portfolio-badge">${escapeHtml(p.category || 'Project')}</span>
          ${isHidden ? `
            <span class="pv2-portfolio-badge" style="left: auto; right: 10px; background: rgba(217, 119, 6, 0.95); font-size: 0.68rem; padding: 3px 8px; display: inline-flex; align-items: center; gap: 4px;">
              <span>🙈</span> Hidden
            </span>
          ` : ''}
        </div>
        <div class="pv2-portfolio-body">
          <h3 onclick="openPortfolioLightbox(${idx})" style="cursor: pointer;">${escapeHtml(p.title)}</h3>
          <p>${escapeHtml(p.description || 'Completed project with high quality specifications.')}</p>
          <div style="display: flex; gap: 4px; flex-wrap: wrap; margin-bottom: 12px;">
            ${(p.tags || []).map(t => `<span class="pv2-skill-pill" style="font-size: 0.72rem; padding: 2px 8px;">${escapeHtml(t)}</span>`).join('')}
          </div>
          <div class="pv2-portfolio-footer">
            ${p.budget ? `<span style="font-weight: 800; color: #10B981; font-size: 0.88rem;">৳${Number(p.budget).toLocaleString()}</span>` : `<span></span>`}
            <div style="display: flex; gap: 6px; align-items: center;">
              <button class="pv2-btn pv2-btn-outline" style="padding: 4px 10px; font-size: 0.75rem;" onclick="openPortfolioLightbox(${idx})">View Details</button>
              ${isSelf ? `
                <button class="pv2-btn pv2-btn-outline" style="padding: 4px 8px; font-size: 0.75rem; color: ${isHidden ? '#D97706' : '#10B981'}; font-weight: 700; display: inline-flex; align-items: center; gap: 3px;" onclick="togglePortfolioVisibility('${p.id}', ${idx})" title="${isHidden ? 'Currently hidden from public. Click to make visible.' : 'Currently visible to public. Click to hide.'}">
                  ${isHidden ? '🙈 Hidden' : '👁️ Visible'}
                </button>
                <button class="pv2-btn pv2-btn-outline" style="padding: 4px 8px; font-size: 0.75rem; color: #2563EB; font-weight: 700; display: inline-flex; align-items: center; gap: 3px;" onclick="enterInlineEditMode(${idx})" title="Live Edit Project">✏️ Live Edit</button>
                <button class="pv2-btn pv2-btn-outline" style="padding: 4px 8px; font-size: 0.75rem; color: #EF4444;" onclick="deletePortfolioItem('${p.id}')" title="Delete Project">🗑️</button>
              ` : ''}
            </div>
          </div>
        </div>
      </div>
    `;
  };

  window.renderCertificatesListHtml = function(certs, isSelf, trust, u) {
    if (!Array.isArray(certs) || !certs.length) {
      certs = [
        {
          type: 'identity',
          name: 'XtraEarn Verified Identity',
          verified: Boolean(trust && trust.identityVerified),
          status: (trust && trust.identityVerified) ? 'verified' : ((trust && trust.kycStatus === 'pending') ? 'pending' : 'unverified'),
          credential_id: `XE-ID-2026-${String(u.id || 1).padStart(5, '0')}`,
          description: (trust && trust.identityVerified) ? 'National Govt. Photo ID confirmed by XtraEarn Compliance.' : 'Government ID required • Click to upload NID or Passport'
        },
        {
          type: 'skill',
          name: `Skill Competency Level ${(u.tasks_completed || 0) >= 5 ? '2' : '1'}`,
          verified: Boolean((u.tasks_completed || 0) >= 1 || u.skill_verified),
          status: ((u.tasks_completed || 0) >= 1 || u.skill_verified) ? 'verified' : 'unearned',
          credential_id: `XE-SKL-2026-${String(u.id || 1).padStart(5, '0')}`,
          description: (u.tasks_completed || 0) >= 1 ? 'Milestone performance verified by client ratings.' : 'Complete 1 task with client rating to unlock competency badge.'
        }
      ];
    }

    return certs.map((c, idx) => {
      const isObj = typeof c === 'object' && c !== null;
      const certName = isObj ? (c.name || 'Certification') : String(c);
      const isIdentity = isObj ? (c.type === 'identity' || certName.includes('Identity')) : certName.includes('Identity');
      const isSkill = isObj ? (c.type === 'skill' || certName.includes('Competency')) : certName.includes('Competency');

      let isVerified = false;
      let statusText = '✔ Verified';
      let badgeStyle = 'background: #ECFDF5; color: #059669; border: 1px solid #A7F3D0;';
      let subText = 'Verified by Platform Governance Protocol';
      let cardStyle = 'background: #FFFFFF; border: 1px solid #E2E8F0; cursor: pointer; transition: all 0.2s ease;';
      let clickAction = '';

      if (isIdentity) {
        // Strict real-time check: ONLY verified if trust.identityVerified is true
        isVerified = Boolean(trust && trust.identityVerified);
        const kyc = (trust && trust.kycStatus) ? trust.kycStatus : (isObj ? c.status : 'none');

        if (isVerified) {
          statusText = '✔ Verified';
          badgeStyle = 'background: #ECFDF5; color: #059669; border: 1px solid #A7F3D0;';
          subText = 'National Govt. Photo ID Confirmed • Platform Protected';
          clickAction = `openCredentialModal('identity', '${escapeHtml(u.name || '')}', '${escapeHtml(u.username || '')}', '${c.credential_id || 'XE-ID-2026-' + u.id}', 'National Govt. Photo ID confirmed by XtraEarn Compliance and Platform Governance Protocol.', '${c.verified_at || 'Aug 2026'}')`;
        } else if (kyc === 'pending') {
          statusText = '⏳ In Review';
          badgeStyle = 'background: #FEF3C7; color: #D97706; border: 1px solid #FDE68A;';
          subText = 'NID / Passport submitted • Compliance review in progress';
          cardStyle = 'background: #FFFDF7; border: 1px dashed #F59E0B; cursor: pointer;';
          clickAction = `if (typeof toast === 'function') toast('⏳ Your NID verification is currently under compliance review.', 'info');`;
        } else {
          statusText = '⚠️ Unverified';
          badgeStyle = 'background: #FEF2F2; color: #DC2626; border: 1px solid #FECACA;';
          subText = isSelf ? '⚠️ NID not submitted yet • Click here to upload NID' : 'National ID verification not yet completed';
          cardStyle = 'background: #FFFBFB; border: 1.5px dashed #FCA5A5; cursor: pointer;';
          if (isSelf) {
            clickAction = `openVerificationWizard(3); if(typeof toast==='function') toast('Upload your National ID or Passport to verify this badge!', 'info');`;
          } else {
            clickAction = `if(typeof toast==='function') toast('This member has not yet submitted National ID verification.', 'info');`;
          }
        }
      } else if (isSkill) {
        const tasksCount = Number(u.tasks_completed || (isObj ? c.tasks_completed : 0) || 0);
        isVerified = tasksCount >= 1 || Boolean(u.skill_verified);
        if (isVerified) {
          statusText = '✔ Verified';
          badgeStyle = 'background: #ECFDF5; color: #059669; border: 1px solid #A7F3D0;';
          subText = `Performance benchmark verified • ${tasksCount} task(s) completed with rating`;
          clickAction = `openCredentialModal('skill', '${escapeHtml(u.name || '')}', '${escapeHtml(u.username || '')}', '${c.credential_id || 'XE-SKL-2026-' + u.id}', 'Demonstrated skill competency and verified client ratings on XtraEarn task milestones.', '${c.verified_at || 'Aug 2026'}')`;
        } else {
          statusText = '🔒 Unearned';
          badgeStyle = 'background: #F1F5F9; color: #64748B; border: 1px solid #CBD5E1;';
          subText = 'Complete at least 1 milestone task with 5-star feedback to unlock';
          cardStyle = 'background: #F8FAFC; border: 1px dashed #CBD5E1; opacity: 0.88; cursor: pointer;';
          clickAction = isSelf
            ? `if (typeof toast === 'function') toast('Complete client tasks on XtraEarn to unlock this Competency badge!', 'info');`
            : `if (typeof toast === 'function') toast('Skill competency badge is awarded upon completing task milestones.', 'info');`;
        }
      } else {
        // Professional or External
        isVerified = isObj ? Boolean(c.verified) : true;
        const certYear = isObj ? (c.year || c.issue_date || '2026') : '2026';
        const certIssuer = isObj ? (c.issuer || 'Official Authority') : 'Official Authority';
        const certId = isObj ? (c.id || c.credential_id || `cert-custom-${idx}`) : `cert-custom-${idx}`;
        if (isVerified) {
          statusText = '✔ Verified';
          badgeStyle = 'background: #ECFDF5; color: #059669; border: 1px solid #A7F3D0;';
          subText = `Accredited by ${escapeHtml(certIssuer)} • ${certYear}`;
          clickAction = `openCredentialModal('custom', '${escapeHtml(u.name || '')}', '${escapeHtml(u.username || '')}', '${c.credential_id || 'XE-CERT-' + (idx+1)}', '${escapeHtml(c.description || ('Accredited by ' + certIssuer))}', '${certYear}', '${escapeHtml(certName)}')`;
        } else {
          statusText = '⏳ Pending';
          badgeStyle = 'background: #FEF3C7; color: #D97706; border: 1px solid #FDE68A;';
          subText = 'Submitted for verification by platform compliance';
          cardStyle = 'background: #FFFDF7; border: 1px dashed #F59E0B; cursor: pointer;';
          clickAction = `if (typeof toast === 'function') toast('This certificate is undergoing verification.', 'info');`;
        }
      }

      const showDeleteBtn = isSelf && !isIdentity && !isSkill;
      const certDeleteId = isObj ? (c.id || c.name) : c;

      return `
        <div style="display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-radius: 12px; ${cardStyle}" ${clickAction ? `onclick="${clickAction}"` : ''} title="${isVerified ? 'Click to view digital certificate credential' : (isSelf ? 'Click to verify' : '')}">
          <span style="font-size: 1.4rem;">${isIdentity ? (isVerified ? '🛡️' : '🪪') : (isSkill ? (isVerified ? '🎖️' : '🔒') : '📜')}</span>
          <div style="flex: 1; min-width: 0;">
            <b style="font-size: 0.88rem; color: #0F172A; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(certName)}</b>
            <small style="color: var(--muted); font-size: 0.74rem; display: block; margin-top: 1px;">${subText}</small>
          </div>
          <span style="font-size: 0.74rem; font-weight: 800; padding: 3px 9px; border-radius: 12px; white-space: nowrap; display: inline-flex; align-items: center; gap: 3px; ${badgeStyle}">
            ${statusText}
          </span>
          ${showDeleteBtn ? `
            <button type="button" onclick="event.stopPropagation(); deleteCertificate('${escapeHtml(certDeleteId)}')" title="Delete this certificate" style="background: none; border: none; font-size: 0.95rem; color: #94A3B8; cursor: pointer; padding: 4px 6px; border-radius: 6px; margin-left: 2px; transition: all 0.2s;" onmouseover="this.style.color='#DC2626'" onmouseout="this.style.color='#94A3B8'">
              🗑️
            </button>
          ` : ''}
        </div>
      `;
    }).join('');
  };

  function render(data, isSelf) {
    const u = data.user;
    const lvl = data.levelProgress || {
      currentLevel: data.level ? data.level.name : 'Beginner',
      currentIcon: data.level ? data.level.icon : '🌱',
      nextLevel: 'Active',
      nextIcon: '🔥',
      tasksCompleted: u.tasks_completed || 0,
      targetTasks: 5,
      tasksRemaining: 2,
      progressPct: 40
    };

    const availMap = {
      available: { label: 'Available for Instant Work', class: 'pv2-status-online', dot: '🟢' },
      busy: { label: 'Busy on Active Projects', class: 'pv2-status-busy', dot: '🔴' },
      away: { label: 'Away / On Leave', class: 'pv2-status-away', dot: '🟡' }
    };
    const currentAvail = availMap[u.availability] || availMap.available;

    const ratingBd = data.ratingBreakdown || {
      total: data.reviews ? data.reviews.length : 0,
      average: Number(u.rating || 5.0).toFixed(1),
      percentages: { 5: 90, 4: 10, 3: 0, 2: 0, 1: 0 }
    };

    const portfolio = (data.portfolio || []).filter(p => isSelf || !p.is_hidden);
    const completedTasks = data.completedTasks || [];
    const reviews = data.reviews || [];
    const trust = data.trustMetrics || {
      onTimeDelivery: '99%',
      repeatHireRate: '88%',
      identityVerified: false,
      hourlyRate: u.hourly_rate || 350
    };

    // User Avatar
    const avatarInner = u.avatar_url
      ? `<img src="${escapeHtml(u.avatar_url)}" alt="${escapeHtml(u.name)}" style="width:110px;height:110px;object-fit:cover;border-radius:50%;border:4px solid #fff;box-shadow:0 8px 24px rgba(0,0,0,0.16);">`
      : (typeof avatarHtml === 'function' ? avatarHtml(u.name, u.avatar_color || '#10B981', 110) : `<div class="pv2-avatar" style="background:${escapeHtml(u.avatar_color || '#10B981')}">${escapeHtml(u.name.charAt(0))}</div>`);

    root.innerHTML = `
      <!-- HERO & BANNER CARD -->
      <div class="pv2-hero-card">
        <div class="pv2-banner" style="${u.cover_image ? (u.cover_image.startsWith('linear-gradient') ? `background: ${escapeHtml(u.cover_image)};` : `background-image: url('${escapeHtml(u.cover_image)}'); background-size: cover; background-position: center;`) : ''}">
          <div class="pv2-banner-pattern"></div>
          ${isSelf ? `
            <button class="pv2-banner-edit-btn" onclick="openBannerModal()" title="Change Cover Banner">
              <span>📷</span> Edit Cover
            </button>
          ` : ''}
          <div class="pv2-banner-badge">
            <span>${lvl.currentIcon}</span>
            <span>${escapeHtml(lvl.currentLevel)} Tier</span>
          </div>
        </div>

        <div class="pv2-hero-content">
          <div class="pv2-hero-top-row">
            <div class="pv2-avatar-wrap">
              ${avatarInner}
              <div class="pv2-status-dot ${currentAvail.class}" title="${currentAvail.label}"></div>
              ${isSelf ? `
                <button class="pv2-avatar-edit-btn" onclick="openAvatarModal()" title="Change Profile Picture">
                  📷
                </button>
              ` : ''}
            </div>

            <!-- Action Toolbar -->
            <div class="pv2-actions">
              ${isSelf ? `
                <button class="pv2-btn pv2-btn-primary" onclick="openEditProfileModal()">
                  <span>✏️</span> Edit Profile Studio
                </button>
                <button class="pv2-btn pv2-btn-outline" onclick="openChangePasswordModal()" title="Change Account Password">
                  <span>🔒</span> Password
                </button>
                <button class="pv2-btn pv2-btn-outline" onclick="openAddPortfolioModal()">
                  <span>🎨</span> Add Project
                </button>
                <button class="pv2-btn pv2-btn-outline" onclick="openShareProfileModal()">
                  <span>🔗</span> Share
                </button>
              ` : `
                <button class="pv2-btn pv2-btn-primary" onclick="hireFreelancer('${escapeHtml(u.name)}', '${escapeHtml(u.profession || '')}')">
                  <span>⚡</span> Hire Freelancer
                </button>
                <a href="/messages?user=${u.id}" class="pv2-btn pv2-btn-outline">
                  <span>💬</span> Message
                </a>
                <button class="pv2-btn pv2-btn-outline" onclick="openShareProfileModal()">
                  <span>🔗</span> Share
                </button>
              `}
            </div>
          </div>

          <div class="pv2-user-info">
            <h1>
              <span>${escapeHtml(u.name)}</span>
              ${u.username ? `
                <span class="pv2-username-chip" onclick="copyProfileHandle('${escapeHtml(u.username)}')" title="Click to copy public profile link: @${escapeHtml(u.username)}">
                  @${escapeHtml(u.username)}
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                </span>
              ` : ''}
              ${trust.identityVerified ? `<span class="pv2-verified-pill" title="Government ID & Escrow Verified">🛡️ Verified ${escapeHtml(u.verified_as || 'Pro')}</span>` : ''}
            </h1>
            <p class="pv2-headline">${escapeHtml(u.title_headline || u.profession || 'Specialist Contributor & Verified Member')}</p>
            <div class="pv2-meta-row">
              <span class="pv2-meta-item">📍 ${escapeHtml(u.location || 'Bangladesh')}</span>
              <span class="pv2-meta-item">${currentAvail.dot} ${currentAvail.label}</span>
              ${trust.hourlyRate ? `<span class="pv2-rate-tag">৳${trust.hourlyRate}/hr</span>` : ''}
              <span class="pv2-meta-item">🗓️ Member since ${escapeHtml(trust.memberSince || '2026')}</span>
          </div>
        </div>
      </div>

      <!-- GAMIFICATION & LEVEL PROGRESSION -->
      <div class="pv2-level-card">
        <div class="pv2-level-head">
          <div class="pv2-level-title">
            <span>${lvl.currentIcon}</span>
            <span>Current Rank: <b>${escapeHtml(lvl.currentLevel)}</b></span>
            <span class="pv2-level-badge">${lvl.progressPct}% to Next Level</span>
          </div>
          <div class="pv2-level-next">
            Next Milestone: <b>${lvl.nextIcon} ${escapeHtml(lvl.nextLevel)}</b> (${lvl.tasksRemaining} tasks remaining)
          </div>
        </div>
        <div class="pv2-progress-bar-wrap">
          <div class="pv2-progress-fill" style="width: ${Math.min(100, Math.max(8, lvl.progressPct))}%;"></div>
        </div>
        <div class="pv2-level-stats">
          <span>Completed: <b>${lvl.tasksCompleted} tasks</b></span>
          <span>Next Tier Unlock: <b>Lower platform commission & priority task matching</b></span>
          <span>Target: <b>${lvl.targetTasks} tasks</b></span>
        </div>
      </div>

      <!-- 4-METRICS STATS GRID -->
      <div class="pv2-metrics-grid">
        <div class="pv2-metric-card">
          <div class="pv2-metric-icon" style="background:#FEF3C7; color:#B45309;">⭐</div>
          <div class="pv2-metric-body">
            <b>${Number(u.rating || 5.0).toFixed(1)} ★</b>
            <small>${u.rating_count || reviews.length} Client Reviews</small>
          </div>
        </div>
        <div class="pv2-metric-card">
          <div class="pv2-metric-icon" style="background:#DCFCE7; color:#15803D;">💼</div>
          <div class="pv2-metric-body">
            <b>${u.tasks_completed || 0}</b>
            <small>Completed Deliveries</small>
          </div>
        </div>
        <div class="pv2-metric-card">
          <div class="pv2-metric-icon" style="background:#EFF6FF; color:#1D4ED8;">🎯</div>
          <div class="pv2-metric-body">
            <b>${trust.onTimeDelivery}</b>
            <small>On-Time SLA Guarantee</small>
          </div>
        </div>
        <div class="pv2-metric-card">
          <div class="pv2-metric-icon" style="background:#F3E8FF; color:#7E22CE;">⚡</div>
          <div class="pv2-metric-body">
            <b>~${u.response_minutes || 15}m</b>
            <small>Average Response Time</small>
          </div>
        </div>
      </div>

      ${isSelf && (trust.verificationPct < 100) ? `
        <div class="pv2-verify-banner">
          <div class="pv2-vb-left">
            <div class="pv2-vb-icon">🛡️</div>
            <div class="pv2-vb-content">
              <strong>Account Verification: ${trust.verificationPct || 0}% Complete</strong>
              <p>Complete your identity documents, mobile OTP, and payout method to unlock all platform perks and instant payouts.</p>
            </div>
          </div>
          <button class="pv2-btn pv2-btn-primary pv2-btn-sm" onclick="openVerificationWizard(1)">
            Complete Verification →
          </button>
        </div>
      ` : ''}

      <!-- TABS NAV (Full Width, Balanced Alignment) -->
      <div class="pv2-tabs-nav" id="pv2-tabs-bar">
        <button class="pv2-tab-btn active" onclick="switchPv2Tab('tab-showcase')">🌟 Overview & Bio</button>
        <button class="pv2-tab-btn" onclick="switchPv2Tab('tab-portfolio')">🎨 Portfolio Projects (${portfolio.length})</button>
        <button class="pv2-tab-btn" onclick="switchPv2Tab('tab-history')">💼 Work History (${completedTasks.length})</button>
        <button class="pv2-tab-btn" onclick="switchPv2Tab('tab-reviews')">⭐ Client Reviews (${reviews.length})</button>
        <button class="pv2-tab-btn" onclick="switchPv2Tab('tab-credentials')">🎓 Skills & Badges</button>
        ${isSelf ? `<button class="pv2-tab-btn" id="pv2-btn-tab-consultations" onclick="switchPv2Tab('tab-consultations')">📅 Consultations (<span id="pv2-consult-count">0</span>)</button>` : ''}
      </div>

      <!-- MAIN LAYOUT GRID: Left (Content) | Right (Sidebar) -->
      <div class="pv2-layout-grid">
        <div class="pv2-main-col">
          <!-- TAB 1: OVERVIEW & BIO -->
          <div id="tab-showcase" class="pv2-tab-content">
            <div class="pv2-card">
              <h3 class="pv2-card-title">
                <span>About & Professional Background</span>
                ${isSelf ? `<button class="pv2-btn pv2-btn-outline" style="padding: 6px 14px; font-size: 0.78rem;" onclick="openEditProfileModal()">Edit Bio</button>` : ''}
              </h3>
              <p style="color: #334155; font-size: 0.95rem; line-height: 1.7; white-space: pre-line; margin-bottom: 20px;">
                ${escapeHtml(u.bio || 'This professional has not provided a detailed bio yet. They are active on XtraEarn and available for task contracts.')}
              </p>

              ${data.badges && data.badges.length ? `
                <h4 style="font-size: 0.88rem; font-weight: 800; color: #475569; margin: 0 0 10px; text-transform: uppercase; letter-spacing: 0.05em;">Earned Accreditations</h4>
                <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 20px;">
                  ${data.badges.map((b, bIdx) => {
                    const bPalette = [
                      { bg: '#EFF6FF', border: '#BFDBFE', text: '#1E40AF' },
                      { bg: '#FEF3C7', border: '#FDE68A', text: '#92400E' },
                      { bg: '#F3E8FF', border: '#E9D5FF', text: '#6B21A8' },
                      { bg: '#ECFDF5', border: '#A7F3D0', text: '#065F46' },
                      { bg: '#FFF1F2', border: '#FECDD3', text: '#9F1239' }
                    ];
                    const pal = bPalette[bIdx % bPalette.length];
                    return `
                      <div style="background: ${pal.bg}; border: 1px solid ${pal.border}; color: ${pal.text}; padding: 6px 12px; border-radius: 10px; display: inline-flex; align-items: center; gap: 6px; font-size: 0.82rem; font-weight: 700;">
                        <span>${b.icon || '🏅'}</span>
                        <span>${escapeHtml(b.title || b)}</span>
                      </div>
                    `;
                  }).join('')}
                </div>
              ` : ''}

              <!-- Social links bar -->
              ${renderSocialLinksBar(u.social_links)}
            </div>

            <!-- Featured Highlights -->
            <div class="pv2-card">
              <h3 class="pv2-card-title">Key Specialties & Focus Areas</h3>
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px;">
                <div class="pv2-specialty-card">
                  <div class="pv2-specialty-icon-box" style="background: #EFF6FF; color: #1D4ED8;">🎯</div>
                  <div class="pv2-specialty-body">
                    <b>Escrow Protected Delivery</b>
                    <p>100% milestone satisfaction guaranteed before funds release.</p>
                  </div>
                </div>
                <div class="pv2-specialty-card">
                  <div class="pv2-specialty-icon-box" style="background: #FEF3C7; color: #D97706;">⚡</div>
                  <div class="pv2-specialty-body">
                    <b>Rapid Turnaround SLA</b>
                    <p>Consistent 24-48 hour delivery on agreed task blueprints.</p>
                  </div>
                </div>
                <div class="pv2-specialty-card">
                  <div class="pv2-specialty-icon-box" style="background: #ECFDF5; color: #059669;">🤝</div>
                  <div class="pv2-specialty-body">
                    <b>Clear Communication</b>
                    <p>Proactive updates in platform messenger with step milestones.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- TAB 2: PORTFOLIO -->
          <div id="tab-portfolio" class="pv2-tab-content" style="display:none">
            <div class="pv2-card">
              <div class="pv2-card-title">
                <span>Verified Work Showcase (${portfolio.length})</span>
                ${isSelf ? `
                  <button class="pv2-btn pv2-btn-primary" style="padding: 7px 16px; font-size: 0.82rem;" onclick="openAddPortfolioModal()">
                    + Add New Project
                  </button>
                ` : ''}
              </div>
              <p style="color: #64748B; font-size: 0.88rem; margin: -6px 0 20px;">Real deliverables, client-approved mockups, and live portfolio samples.</p>

              ${portfolio.length ? `
                <div class="pv2-portfolio-grid" id="pv2-portfolio-grid">
                  ${portfolio.map((p, idx) => renderPortfolioCardHtml(p, idx, isSelf)).join('')}
                </div>
              ` : `
                <div class="empty-state" style="padding: 50px 20px; text-align: center;">
                  <span class="big" style="font-size: 2.5rem; display: block; margin-bottom: 8px;">🎨</span>
                  <h4>No portfolio items published yet</h4>
                  <p style="color: var(--muted); font-size: 0.85rem; margin-bottom: 14px;">Showcase your past client projects and work samples to win 3.4x more proposals.</p>
                  ${isSelf ? `<button class="pv2-btn pv2-btn-primary" onclick="openAddPortfolioModal()">+ Add Your First Project</button>` : ''}
                </div>
              `}
            </div>
          </div>

          <!-- TAB 3: WORK HISTORY -->
          <div id="tab-history" class="pv2-tab-content" style="display:none">
            <div class="pv2-card">
              <h3 class="pv2-card-title">Completed Tasks & Contract Ledger (${completedTasks.length})</h3>
              <p style="color: #64748B; font-size: 0.88rem; margin: -6px 0 20px;">All contracts backed by XtraEarn 100% Escrow and milestone verification.</p>

              ${completedTasks.length ? `
                <div class="pv2-task-list">
                  ${completedTasks.map(t => {
                    const badgeClass = t.status === 'completed' ? 'pv2-badge-completed' : (t.status === 'in_progress' ? 'pv2-badge-progress' : 'pv2-badge-open');
                    return `
                      <a href="/tasks?id=${t.id}" class="pv2-task-item">
                        <div>
                          <div class="pv2-task-title">${escapeHtml(t.title)}</div>
                          <div class="pv2-task-sub">📁 ${escapeHtml(t.category)} · 🗓️ ${new Date(t.created_at).toLocaleDateString()}</div>
                        </div>
                        <div style="text-align: right;">
                          <div style="font-weight: 800; color: #0F172A; font-size: 1rem; margin-bottom: 4px;">৳${Number(t.budget).toLocaleString()}</div>
                          <span class="pv2-task-badge ${badgeClass}">${escapeHtml(t.status.toUpperCase())}</span>
                        </div>
                      </a>
                    `;
                  }).join('')}
                </div>
              ` : `
                <div class="empty-state" style="padding: 40px 20px; text-align: center;">
                  <span class="big" style="font-size: 2.5rem; display: block; margin-bottom: 8px;">💼</span>
                  <p style="color: var(--muted); font-size: 0.88rem;">No contract history found.</p>
                </div>
              `}
            </div>
          </div>

          <!-- TAB 4: REVIEWS & HISTOGRAM -->
          <div id="tab-reviews" class="pv2-tab-content" style="display:none">
            <div class="pv2-card">
              <h3 class="pv2-card-title">Client Feedback & Quality Score</h3>

              <!-- Histogram Overview -->
              <div class="pv2-review-overview">
                <div class="pv2-score-box">
                  <div class="pv2-big-score">${ratingBd.average}</div>
                  <div class="pv2-stars-wrap">${'★'.repeat(Math.round(ratingBd.average))}</div>
                  <small style="color: #64748B; font-weight: 700; font-size: 0.8rem;">Based on ${ratingBd.total} verified reviews</small>
                </div>
                <div>
                  ${[5, 4, 3, 2, 1].map(stars => {
                    const pct = ratingBd.percentages[stars] || 0;
                    return `
                      <div class="pv2-histogram-row">
                        <span style="width: 44px;">${stars} Stars</span>
                        <div class="pv2-histo-bar-wrap">
                          <div class="pv2-histo-fill" style="width: ${pct}%;"></div>
                        </div>
                        <span style="width: 38px; text-align: right; color: var(--muted);">${pct}%</span>
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>

              <!-- Reviews List -->
              ${reviews.length ? `
                <div style="display: flex; flex-direction: column;">
                  ${reviews.map(r => `
                    <div class="pv2-review-item">
                      <div class="pv2-review-head">
                        <div style="display: flex; align-items: center; gap: 12px;">
                          <div style="width: 38px; height: 38px; border-radius: 50%; background: #E2E8F0; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.88rem;">
                            ${r.reviewer ? escapeHtml(r.reviewer.name.charAt(0)) : 'C'}
                          </div>
                          <div>
                            <b style="font-size: 0.92rem; color: #0F172A; display: block;">${r.reviewer ? escapeHtml(r.reviewer.name) : 'Verified Client'}</b>
                            <small style="color: var(--muted); font-size: 0.76rem;">Task: "${escapeHtml(r.taskTitle || 'Contract Milestone')}"</small>
                          </div>
                        </div>
                        <div style="text-align: right;">
                          <div style="color: #F59E0B; font-size: 0.95rem;">${'★'.repeat(r.rating || 5)}</div>
                          <small style="color: var(--muted); font-size: 0.72rem;">${r.created_at ? new Date(r.created_at).toLocaleDateString() : 'Recent'}</small>
                        </div>
                      </div>
                      ${r.comment ? `
                        <p style="color: #334155; font-size: 0.88rem; line-height: 1.5; margin: 8px 0 0; font-style: italic;">
                          "${escapeHtml(r.comment)}"
                        </p>
                      ` : ''}
                    </div>
                  `).join('')}
                </div>
              ` : `
                <div class="empty-state" style="padding: 40px 20px; text-align: center;">
                  <span class="big" style="font-size: 2.5rem; display: block; margin-bottom: 8px;">⭐</span>
                  <p style="color: var(--muted); font-size: 0.88rem;">No client reviews posted yet. Reviews automatically appear upon task completion.</p>
                </div>
              `}
            </div>
          </div>

          <!-- TAB 5: CREDENTIALS & SKILLS -->
          <div id="tab-credentials" class="pv2-tab-content" style="display:none">
            <div class="pv2-card">
              <h3 class="pv2-card-title">Verified Skills & Capabilities</h3>
              <div class="pv2-skills-wrap" style="margin-bottom: 24px;">
                ${u.skills ? String(u.skills).split(',').map(s => `
                  <span class="pv2-skill-pill" style="font-size: 0.84rem; padding: 6px 14px;">
                    ⚡ ${escapeHtml(s.trim())}
                  </span>
                `).join('') : '<p style="color: var(--muted); font-size: 0.88rem;">No skills listed.</p>'}
              </div>

              <h3 class="pv2-card-title">Languages & Fluency</h3>
              <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 24px;">
                ${u.languages ? String(u.languages).split(',').map(l => `
                  <div style="background: #F8FAFC; border: 1px solid #E2E8F0; padding: 8px 14px; border-radius: 10px; font-size: 0.85rem;">
                    🗣️ <b>${escapeHtml(l.trim())}</b>
                  </div>
                `).join('') : '<p style="color: var(--muted); font-size: 0.88rem;">Bengali (Native), English (Working)</p>'}
              </div>

              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <h3 class="pv2-card-title" style="margin: 0;">Certificates & Badges</h3>
                ${isSelf ? `
                  <button type="button" class="pv2-btn pv2-btn-outline" style="font-size: 0.74rem; padding: 4px 10px; color: #2563EB; font-weight: 700; display: inline-flex; align-items: center; gap: 4px;" onclick="openAddCertificateModal()">
                    <span>➕</span> Add Certificate
                  </button>
                ` : ''}
              </div>
              <div style="display: flex; flex-direction: column; gap: 10px;">
                ${window.renderCertificatesListHtml(u.certifications, isSelf, trust, u)}
              </div>
            </div>
          </div>

          <!-- TAB 6: 1-ON-1 CONSULTATIONS & ESCROW HUB -->
          ${isSelf ? `
          <div id="tab-consultations" class="pv2-tab-content" style="display:none">
            <div class="pv2-card" style="padding: 22px;">
              <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 18px; border-bottom: 1px solid #E2E8F0; padding-bottom: 16px;">
                <div>
                  <h3 class="pv2-card-title" style="margin: 0; display: flex; align-items: center; gap: 8px;">
                    <span>📅 1-on-1 Consultations &amp; Appointments</span>
                  </h3>
                  <p style="font-size: 0.84rem; color: #64748B; margin: 4px 0 0 0;">
                    Manage your booked sessions, encrypted video call rooms, and protected escrow fees.
                  </p>
                </div>
                <div style="display: flex; gap: 8px;">
                  <button type="button" class="pv2-btn pv2-btn-outline" style="font-size: 0.78rem; padding: 6px 12px;" onclick="loadUserConsultations()">
                    🔄 Refresh
                  </button>
                  <a href="/index.html#expert-marketplace" class="pv2-btn pv2-btn-primary" style="font-size: 0.78rem; padding: 6px 14px; text-decoration: none; display: inline-flex; align-items: center; gap: 6px;">
                    <span>➕</span> Book Specialist
                  </a>
                  <a href="/index.html#experts" class="pv2-btn pv2-btn-outline" style="font-size: 0.78rem; padding: 6px 14px; text-decoration: none; color: #6D28D9; border-color: #DDD6FE; background: #F5F3FF; display: inline-flex; align-items: center; gap: 6px;">
                    <span>🩺</span> Apply as Specialist
                  </a>
                </div>
              </div>

              <!-- Dual Roles Switcher (Client vs Consultant Specialist) -->
              <div style="display: flex; gap: 10px; margin-bottom: 18px; border-bottom: 2px solid #F1F5F9; padding-bottom: 10px;">
                <button type="button" id="consult-subtab-client" onclick="switchConsultSubTab('client')" style="background: #2563EB; color: #fff; border: none; padding: 7px 14px; border-radius: 8px; font-weight: 700; font-size: 0.82rem; cursor: pointer; transition: all 0.2s;">
                  🛍️ As Client (<span id="consult-client-count">0</span>)
                </button>
                <button type="button" id="consult-subtab-consultant" onclick="switchConsultSubTab('consultant')" style="background: #F1F5F9; color: #475569; border: none; padding: 7px 14px; border-radius: 8px; font-weight: 700; font-size: 0.82rem; cursor: pointer; transition: all 0.2s;">
                  💼 As Consultant Specialist (<span id="consult-specialist-count">0</span>)
                </button>
              </div>

              <!-- Client Sessions Container -->
              <div id="consult-client-view">
                <div id="consult-client-list" style="display: flex; flex-direction: column; gap: 14px;">
                  <div style="text-align: center; padding: 30px; color: #94A3B8;">Loading your consultation sessions...</div>
                </div>
              </div>

              <!-- Consultant Sessions Container -->
              <div id="consult-consultant-view" style="display: none;">
                <div id="consult-consultant-list" style="display: flex; flex-direction: column; gap: 14px;">
                  <div style="text-align: center; padding: 30px; color: #94A3B8;">Loading sessions booked with you...</div>
                </div>
              </div>
            </div>
          </div>
          ` : ''}
        </div>

        <!-- RIGHT SIDEBAR WIDGETS -->
        <aside class="pv2-side-col">
          <!-- Widget 1: Trust & Verifications -->
          <div class="pv2-widget">
            <div class="pv2-widget-header">
              <h4 class="pv2-widget-title">
                <span class="pv2-widget-icon-wrap" style="background:#ECFDF5; color:#059669;">🛡️</span>
                <span>Trust & Verification</span>
              </h4>
              <span class="pv2-widget-badge ${trust.verificationPct === 100 ? 'pv2-widget-badge-green' : 'pv2-widget-badge-amber'}">
                ${trust.verificationPct === 100 ? `
                  <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
                  100% Verified
                ` : `${trust.verificationPct || 0}% Verified`}
              </span>
            </div>

            <div class="pv2-verify-list">
              <!-- National ID / Passport -->
              <div class="pv2-verify-card ${isSelf && !trust.identityVerified ? 'clickable' : ''}" ${isSelf && !trust.identityVerified ? 'onclick="openVerificationWizard(3)" title="Click to verify National ID / Passport"' : ''}>
                <div class="pv2-verify-left">
                  <div class="pv2-verify-icon-box" style="color: #2563EB; background: #EFF6FF;">🪪</div>
                  <div class="pv2-verify-info">
                    <span class="pv2-verify-name">National ID / Passport</span>
                    <span class="pv2-verify-sub">
                      ${trust.identityVerified ? 'Govt. Photo ID Confirmed' : (trust.kycStatus === 'pending' ? 'Admin Review in Progress' : (isSelf ? 'Click to Upload NID / Passport' : 'Govt. ID Verification Required'))}
                    </span>
                  </div>
                </div>
                ${trust.identityVerified ? `
                  <span class="pv2-status-pill pv2-status-pill-verified">
                    <svg width="11" height="11" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
                    Verified
                  </span>
                ` : (trust.kycStatus === 'pending' ? `
                  <span class="pv2-status-pill pv2-status-pill-pending">
                    <span>⏳ In Review</span>
                  </span>
                ` : `
                  <span class="pv2-status-pill pv2-status-pill-unverified">
                    <span>✕ Unverified</span>
                  </span>
                `)}
              </div>

              <!-- Payment & Wallet -->
              <div class="pv2-verify-card ${isSelf && !trust.paymentVerified ? 'clickable' : ''}" ${isSelf && !trust.paymentVerified ? 'onclick="openVerificationWizard(4)" title="Click to link payout method"' : ''}>
                <div class="pv2-verify-left">
                  <div class="pv2-verify-icon-box" style="color: #059669; background: #ECFDF5;">💳</div>
                  <div class="pv2-verify-info">
                    <span class="pv2-verify-name">Payment & Wallet</span>
                    <span class="pv2-verify-sub">
                      ${trust.paymentVerified ? `${escapeHtml((trust.payoutMethod || 'bKash').toUpperCase())} Payout Linked` : (isSelf ? 'Click to Link bKash / Bank' : 'Payout Account Pending')}
                    </span>
                  </div>
                </div>
                <span class="pv2-status-pill ${trust.paymentVerified ? 'pv2-status-pill-verified' : 'pv2-status-pill-unverified'}">
                  ${trust.paymentVerified ? `
                    <svg width="11" height="11" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
                    Verified
                  ` : `
                    <span>✕ Unlinked</span>
                  `}
                </span>
              </div>

              <!-- Email Address -->
              <div class="pv2-verify-card ${isSelf && !trust.emailVerified ? 'clickable' : ''}" ${isSelf && !trust.emailVerified ? 'onclick="openVerificationWizard(1)" title="Click to verify Email Address"' : ''}>
                <div class="pv2-verify-left">
                  <div class="pv2-verify-icon-box" style="color: #D97706; background: #FEF3C7;">✉️</div>
                  <div class="pv2-verify-info">
                    <span class="pv2-verify-name">Email Address</span>
                    <span class="pv2-verify-sub">
                      ${trust.emailVerified ? 'Primary Email Confirmed' : (isSelf ? 'Click to Verify with OTP' : 'Email Verification Pending')}
                    </span>
                  </div>
                </div>
                <span class="pv2-status-pill ${trust.emailVerified ? 'pv2-status-pill-verified' : 'pv2-status-pill-unverified'}">
                  ${trust.emailVerified ? `
                    <svg width="11" height="11" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
                    Verified
                  ` : `
                    <span>✕ Unverified</span>
                  `}
                </span>
              </div>

              <!-- Mobile Phone -->
              <div class="pv2-verify-card ${isSelf && !trust.phoneVerified ? 'clickable' : ''}" ${isSelf && !trust.phoneVerified ? 'onclick="openVerificationWizard(1)" title="Click to verify Mobile Phone"' : ''}>
                <div class="pv2-verify-left">
                  <div class="pv2-verify-icon-box" style="color: #7C3AED; background: #F3E8FF;">📱</div>
                  <div class="pv2-verify-info">
                    <span class="pv2-verify-name">Mobile Phone</span>
                    <span class="pv2-verify-sub">
                      ${trust.phoneVerified ? (u.phone ? `${escapeHtml(u.phone)} (2FA Active)` : '2-Factor Authenticated') : (isSelf ? 'Click to Verify via SMS OTP' : 'SMS Verification Pending')}
                    </span>
                  </div>
                </div>
                <span class="pv2-status-pill ${trust.phoneVerified ? 'pv2-status-pill-verified' : 'pv2-status-pill-unverified'}">
                  ${trust.phoneVerified ? `
                    <svg width="11" height="11" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
                    Verified
                  ` : `
                    <span>✕ Unverified</span>
                  `}
                </span>
              </div>

              <!-- Educational Qualification Certificate (if verified, pending, or self) -->
              ${(trust.educationStatus === 'approved' || trust.educationStatus === 'pending' || (isSelf && !trust.identityVerified)) ? `
                <div class="pv2-verify-card ${isSelf && trust.educationStatus !== 'approved' ? 'clickable' : ''}" ${isSelf && trust.educationStatus !== 'approved' ? 'onclick="openVerificationWizard(3)" title="Click to upload educational certificate"' : ''}>
                  <div class="pv2-verify-left">
                    <div class="pv2-verify-icon-box" style="color: #0284C7; background: #E0F2FE;">🎓</div>
                    <div class="pv2-verify-info">
                      <span class="pv2-verify-name">Academic Degree</span>
                      <span class="pv2-verify-sub">
                        ${trust.educationStatus === 'approved' ? `${escapeHtml(trust.educationDegree || 'Degree Verified')} • ${escapeHtml(trust.educationInstitution || 'Academic Board')}` : (trust.educationStatus === 'pending' ? 'Degree Certificate In Review' : (isSelf ? 'Click to verify Academic Degree' : 'Degree Pending'))}
                      </span>
                    </div>
                  </div>
                  ${trust.educationStatus === 'approved' ? `
                    <span class="pv2-status-pill pv2-status-pill-verified">
                      <svg width="11" height="11" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
                      Verified
                    </span>
                  ` : (trust.educationStatus === 'pending' ? `
                    <span class="pv2-status-pill pv2-status-pill-pending"><span>⏳ In Review</span></span>
                  ` : `
                    <span class="pv2-status-pill pv2-status-pill-unverified"><span>Optional</span></span>
                  `)}
                </div>
              ` : ''}

              <!-- Professional Certification (if verified or pending) -->
              ${(trust.professionalStatus === 'approved' || trust.professionalStatus === 'pending') ? `
                <div class="pv2-verify-card ${isSelf && trust.professionalStatus !== 'approved' ? 'clickable' : ''}" ${isSelf && trust.professionalStatus !== 'approved' ? 'onclick="openVerificationWizard(3)" title="Click to verify professional license"' : ''}>
                  <div class="pv2-verify-left">
                    <div class="pv2-verify-icon-box" style="color: #9333EA; background: #F3E8FF;">📜</div>
                    <div class="pv2-verify-info">
                      <span class="pv2-verify-name">Professional License</span>
                      <span class="pv2-verify-sub">
                        ${trust.professionalStatus === 'approved' ? `${escapeHtml(trust.professionalTitle || 'Certified Professional')}` : 'License Documents In Review'}
                      </span>
                    </div>
                  </div>
                  ${trust.professionalStatus === 'approved' ? `
                    <span class="pv2-status-pill pv2-status-pill-verified">
                      <svg width="11" height="11" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
                      Verified
                    </span>
                  ` : `
                    <span class="pv2-status-pill pv2-status-pill-pending"><span>⏳ In Review</span></span>
                  `}
                </div>
              ` : ''}
            </div>

            <div class="pv2-trust-footer">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              <span>100% Escrow Protected & Verified Identity on XtraEarn</span>
            </div>
          </div>

          <!-- Widget 2: Availability & SLA -->
          <div class="pv2-widget">
            <div class="pv2-widget-header">
              <h4 class="pv2-widget-title">
                <span class="pv2-widget-icon-wrap" style="background:#FFFBEB; color:#D97706;">⚡</span>
                <span>Availability & SLA</span>
              </h4>
              <span class="pv2-widget-badge pv2-widget-badge-status">
                <span class="pv2-pulse-dot"></span>
                ${escapeHtml(currentAvail.label)}
              </span>
            </div>

            <div class="pv2-avail-grid">
              <div class="pv2-avail-item">
                <span class="pv2-avail-label">⏱️ Turnaround</span>
                <span class="pv2-avail-val">24–48 hrs avg.</span>
              </div>
              <div class="pv2-avail-item">
                <span class="pv2-avail-label">⚡ Response Time</span>
                <span class="pv2-avail-val">~${u.response_minutes || 20} mins</span>
              </div>
              <div class="pv2-avail-item">
                <span class="pv2-avail-label">🕒 Working Hours</span>
                <span class="pv2-avail-val">09:00 AM – 10:00 PM</span>
              </div>
              <div class="pv2-avail-item">
                <span class="pv2-avail-label">📍 Base Location</span>
                <span class="pv2-avail-val">${escapeHtml(u.location || 'Dhaka, Bangladesh')}</span>
              </div>
            </div>

            <div style="margin-top: 14px; padding-top: 12px; border-top: 1px solid #F1F5F9; display: flex; align-items: center; justify-content: space-between;">
              <span style="font-size: 0.76rem; color: #64748B; font-weight: 600;">Timezone: GMT+6 (BST)</span>
              ${isSelf ? `
                <button class="pv2-link-btn" onclick="openEditProfileModal()">Edit Status ✏️</button>
              ` : `
                <span class="pv2-badge-fast">🚀 Quick Delivery</span>
              `}
            </div>
          </div>

          <!-- Widget 3: Quick Profile Completeness (If Self) -->
          ${isSelf ? `
            <div class="pv2-widget pv2-complete-widget">
              <div class="pv2-complete-score-row">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span style="font-size: 1.15rem;">✨</span>
                  <div>
                    <h4 style="font-size: 0.9rem; font-weight: 800; color: #065F46; margin: 0;">Profile Strength</h4>
                    <span style="font-size: 0.72rem; color: #047857; font-weight: 600;">Optimized for discovery</span>
                  </div>
                </div>
                <div style="font-size: 1.1rem; font-weight: 800; color: #059669;">92%</div>
              </div>

              <div class="pv2-complete-bar-wrap">
                <div class="pv2-complete-bar-fill" style="width: 92%;"></div>
              </div>

              <div class="pv2-complete-checklist">
                <span class="pv2-complete-check-item">✔ Bio & Title</span>
                <span class="pv2-complete-check-item">✔ Skills & Rate</span>
                <span class="pv2-complete-check-item">✔ ID Verified</span>
                <span class="pv2-complete-check-item" style="color: #B45309; font-weight: 700;">+8% Add 1 Project</span>
              </div>

              <button class="pv2-btn pv2-btn-primary" style="width: 100%; justify-content: center; font-size: 0.78rem; padding: 8px 12px;" onclick="openAddPortfolioModal()">
                + Add Project Sample
              </button>
            </div>
          ` : `
            <!-- Client CTA Card -->
            <div class="pv2-widget" style="background: linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%); border-color: #BFDBFE;">
              <div class="pv2-widget-header" style="border-bottom-color: rgba(30, 64, 175, 0.15);">
                <h4 class="pv2-widget-title" style="color: #1E40AF;">
                  <span>💼</span> Ready to Hire?
                </h4>
                <span class="pv2-widget-badge" style="background: #DBEAFE; color: #1E40AF; border: 1px solid #BFDBFE;">Direct Order</span>
              </div>
              <p style="color: #1E3A8A; font-size: 0.84rem; line-height: 1.5; margin-bottom: 14px;">
                Create a micro-job contract for ${escapeHtml(u.name.split(' ')[0])}. Funds remain 100% protected in Escrow until you approve the work.
              </p>
              <button class="pv2-btn pv2-btn-primary" style="width: 100%; justify-content: center;" onclick="hireFreelancer('${escapeHtml(u.name)}', '${escapeHtml(u.profession || '')}')">
                ⚡ Direct Offer / Hire
              </button>
            </div>
          `}
        </aside>
      </div>
    `;

    // Bind Edit Form Listener
    const editForm = document.getElementById('pv2-edit-form');
    if (editForm) {
      editForm.onsubmit = async (e) => {
        e.preventDefault();
        const f = e.target;
        try {
          const payload = {
            name: f.name.value.trim(),
            username: f.username ? f.username.value.trim().toLowerCase().replace(/^@/, '') : undefined,
            title_headline: f.title_headline.value.trim(),
            profession: f.profession.value.trim(),
            location: f.location ? f.location.value.trim() : '',
            country: f.country ? f.country.value : undefined,
            district: f.district ? (f.district.value === '__CUSTOM__' ? (document.getElementById('pv2-input-custom-district')?.value.trim() || '') : f.district.value) : undefined,
            phone: f.phone.value.trim(),
            bio: f.bio.value.trim(),
            skills: f.skills.value.trim(),
            languages: f.languages.value.trim(),
            hourly_rate: Number(f.hourly_rate.value) || null,
            availability: f.availability.value,
            user_type: f.user_type.value,
            cover_image: f.cover_image.value.trim() || null,
            social_links: {
              website: f.website.value.trim(),
              linkedin: f.linkedin.value.trim(),
              github: f.github.value.trim()
            }
          };

          const res = await api('/users/me', {
            method: 'PATCH',
            body: payload
          });

          if (res.user) {
            localStorage.setItem('xe_user', JSON.stringify(res.user));
          }
          if (typeof closeModal === 'function') closeModal('modal-edit-profile-v2');
          if (typeof toast === 'function') toast('Profile Studio updated successfully! ✨', 'success');
          loadProfile();
        } catch (err) {
          if (typeof toast === 'function') toast(err.message, 'error');
          else alert(err.message);
        }
      };
    }

    // Bind Portfolio Form Listener (Supports Add & Edit)
    const portForm = document.getElementById('pv2-portfolio-form');
    if (portForm) {
      portForm.onsubmit = async (e) => {
        e.preventDefault();
        const f = e.target;
        const idField = document.getElementById('pv2-port-id');
        const editingId = idField ? idField.value.trim() : '';
        const submitBtn = document.getElementById('pv2-port-modal-submit');

        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = editingId ? 'Updating Project...' : 'Publishing...';
        }

        try {
          const visInp = document.getElementById('pv2-port-visible');
          const is_hidden = visInp ? !visInp.checked : false;

          let catVal = f.category ? f.category.value.trim() : '';
          if (!catVal) {
            const catSel = document.getElementById('pv2-port-cat-select');
            if (catSel && catSel.value && catSel.value !== '__custom__') catVal = catSel.value;
            const catCustom = document.getElementById('pv2-port-cat-custom');
            if (catCustom && catCustom.value) catVal = catCustom.value.trim();
          }
          if (!catVal) catVal = 'General Project';

          let tagsVal = f.tags ? f.tags.value.trim() : '';
          if (!tagsVal && window.activePortfolioTags && window.activePortfolioTags.length) {
            tagsVal = window.activePortfolioTags.join(', ');
          }

          let rawUrl = f.project_url ? f.project_url.value.trim() : '';
          if (rawUrl && !rawUrl.startsWith('http://') && !rawUrl.startsWith('https://')) {
            rawUrl = 'https://' + rawUrl;
          }

          const payload = {
            title: f.title.value.trim(),
            category: catVal,
            image_url: f.image_url.value.trim(),
            description: f.description.value.trim(),
            tags: tagsVal,
            budget: Number(f.budget.value) || 0,
            project_url: rawUrl,
            is_hidden
          };

          if (editingId) {
            await api(`/users/me/portfolio/${encodeURIComponent(editingId)}`, {
              method: 'PUT',
              body: payload
            });
            if (typeof toast === 'function') toast('🎉 Portfolio project updated successfully! ✨', 'success');
          } else {
            await api('/users/me/portfolio', {
              method: 'POST',
              body: payload
            });
            if (typeof toast === 'function') toast('Portfolio project published! 🚀', 'success');
          }

          if (typeof closeModal === 'function') closeModal('modal-add-portfolio');
          f.reset();
          loadProfile();
        } catch (err) {
          if (typeof toast === 'function') toast(err.message, 'error');
          else alert(err.message);
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = editingId ? 'Save Changes ✨' : 'Publish Project 🚀';
          }
        }
      };
    }
  }

  function renderSocialLinksBar(socials) {
    if (!socials || typeof socials !== 'object') return '';
    const links = [];
    if (socials.website) links.push(`<a href="${escapeHtml(socials.website)}" target="_blank" rel="noopener noreferrer" class="pv2-btn pv2-btn-outline" style="font-size: 0.78rem; padding: 6px 12px;">🌐 Website</a>`);
    if (socials.linkedin) links.push(`<a href="${escapeHtml(socials.linkedin)}" target="_blank" rel="noopener noreferrer" class="pv2-btn pv2-btn-outline" style="font-size: 0.78rem; padding: 6px 12px;">in LinkedIn</a>`);
    if (socials.github) links.push(`<a href="${escapeHtml(socials.github)}" target="_blank" rel="noopener noreferrer" class="pv2-btn pv2-btn-outline" style="font-size: 0.78rem; padding: 6px 12px;">🐙 GitHub / Portfolio</a>`);

    if (!links.length) return '';
    return `
      <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 14px; border-top: 1px solid #F1F5F9; padding-top: 14px;">
        ${links.join('')}
      </div>
    `;
  }

  // Global Tab Switcher
  window.switchPv2Tab = function(tabId) {
    const tabs = document.querySelectorAll('.pv2-tab-content');
    tabs.forEach(t => t.style.display = 'none');

    const activeTab = document.getElementById(tabId);
    if (activeTab) activeTab.style.display = 'block';

    const btns = document.querySelectorAll('#pv2-tabs-bar .pv2-tab-btn');
    btns.forEach(b => b.classList.remove('active'));

    const activeBtn = Array.from(btns).find(b => b.getAttribute('onclick') && b.getAttribute('onclick').includes(tabId));
    if (activeBtn) activeBtn.classList.add('active');
  };

  // Curated Category & Skills Dictionary
  const CATEGORY_SKILLS_MAP = {
    'Design & Creative': [
      'Figma', 'UI/UX Design', 'Logo Design', 'Adobe Photoshop', 'Adobe Illustrator',
      'Canva', 'Branding & Identity', 'Typography', 'Mobile App Design', 'Banner Design'
    ],
    'Web & Software Development': [
      'React.js', 'Node.js', 'JavaScript', 'Python', 'HTML5/CSS3',
      'WordPress', 'Next.js', 'PHP', 'MongoDB', 'Tailwind CSS', 'API Integration'
    ],
    'Digital Marketing & SEO': [
      'SEO Audit', 'Facebook Ads', 'Google Ads', 'Social Media Marketing',
      'Google Analytics', 'Email Marketing', 'Content Strategy', 'Keyword Research'
    ],
    'Writing & Translation': [
      'Content Writing', 'SEO Copywriting', 'Blog Writing', 'Technical Writing',
      'Proofreading', 'Bengali Translation', 'English Translation', 'Ghostwriting'
    ],
    'Video & Animation': [
      'Adobe Premiere Pro', 'After Effects', 'Reels & Shorts Editing', 'CapCut',
      'Motion Graphics', 'YouTube Video Editing', 'Color Grading', '2D Animation'
    ],
    'Data & AI Analytics': [
      'Python', 'Advanced Excel', 'Machine Learning', 'SQL', 'Power BI',
      'Data Cleaning', 'Data Visualization', 'Deep Learning', 'Pandas'
    ],
    'Admin & Virtual Assistance': [
      'Virtual Assistant', 'Data Entry', 'MS Office', 'Web Research',
      'Customer Support', 'Lead Generation', 'Email Management', 'Transcription'
    ],
    'Engineering & Architecture': [
      'AutoCAD', 'SolidWorks', 'Civil Engineering', 'Electrical Design',
      '3D Modeling', 'Revit', 'Project Management', 'Structural Analysis'
    ],
    'Healthcare & Medical': [
      'Medical Consultation', 'Health Informatics', 'Telemedicine', 'Clinical Research',
      'Pharmacology', 'Nutrition & Diet', 'Medical Writing'
    ],
    'Finance & Accounting': [
      'QuickBooks', 'Bookkeeping', 'Financial Modeling', 'Taxation Bangladesh',
      'Xero', 'Auditing', 'Financial Statements', 'Payroll Management'
    ]
  };

  let currentProfileSkills = [];

  function initProfileSkills(skillsRaw) {
    if (Array.isArray(skillsRaw)) {
      currentProfileSkills = skillsRaw.map(s => String(s).trim()).filter(Boolean);
    } else if (typeof skillsRaw === 'string') {
      currentProfileSkills = skillsRaw.split(',').map(s => s.trim()).filter(Boolean);
    } else {
      currentProfileSkills = [];
    }
    renderProfileSkillTags();
  }

  function renderProfileSkillTags() {
    const container = document.getElementById('pv2-skill-tags-list');
    const hiddenInput = document.getElementById('pv2-input-skills');
    if (hiddenInput) hiddenInput.value = currentProfileSkills.join(', ');

    if (container) {
      container.innerHTML = currentProfileSkills.map(skill => `
        <span class="pv2-skill-tag">
          <span>${escapeHtml(skill)}</span>
          <span class="pv2-skill-tag-del" onclick="removeProfileSkill('${escapeHtml(skill).replace(/'/g, "\\'")}')" title="Remove skill">✕</span>
        </span>
      `).join('');
    }

    const profInput = document.getElementById('pv2-input-profession');
    renderSuggestedSkills(profInput ? profInput.value : '');
  }

  function addProfileSkill(skill) {
    const clean = String(skill || '').trim();
    if (!clean) return;
    const exists = currentProfileSkills.some(s => s.toLowerCase() === clean.toLowerCase());
    if (!exists) {
      currentProfileSkills.push(clean);
      renderProfileSkillTags();
    }
  }

  function removeProfileSkill(skill) {
    const clean = String(skill || '').trim().toLowerCase();
    currentProfileSkills = currentProfileSkills.filter(s => s.toLowerCase() !== clean);
    renderProfileSkillTags();
  }

  function clearAllProfileSkills() {
    currentProfileSkills = [];
    renderProfileSkillTags();
  }

  function renderSuggestedSkills(category) {
    const container = document.getElementById('pv2-suggested-skills-pills');
    const badge = document.getElementById('pv2-suggested-cat-badge');
    if (!container) return;

    let matchedKey = 'Design & Creative';
    const catLower = (category || '').toLowerCase();
    for (const key of Object.keys(CATEGORY_SKILLS_MAP)) {
      const keyLower = key.toLowerCase();
      if (catLower.includes(keyLower) || keyLower.includes(catLower) || (catLower.includes('web') && keyLower.includes('web')) || (catLower.includes('design') && keyLower.includes('design')) || (catLower.includes('market') && keyLower.includes('market')) || (catLower.includes('video') && keyLower.includes('video')) || (catLower.includes('data') && keyLower.includes('data')) || (catLower.includes('writ') && keyLower.includes('writ')) || (catLower.includes('admin') && keyLower.includes('admin')) || (catLower.includes('medic') && keyLower.includes('health')) || (catLower.includes('engine') && keyLower.includes('engine'))) {
        matchedKey = key;
        break;
      }
    }

    if (badge) badge.textContent = `(${matchedKey})`;

    const skills = CATEGORY_SKILLS_MAP[matchedKey] || CATEGORY_SKILLS_MAP['Design & Creative'];
    container.innerHTML = skills.map(sk => {
      const isAdded = currentProfileSkills.some(s => s.toLowerCase() === sk.toLowerCase());
      return `
        <span class="pv2-suggest-pill ${isAdded ? 'added' : ''}" onclick="${isAdded ? `removeProfileSkill('${escapeHtml(sk).replace(/'/g, "\\'")}')` : `addProfileSkill('${escapeHtml(sk).replace(/'/g, "\\'")}')`}">
          <span>${isAdded ? '✔' : '+'}</span>
          <span>${escapeHtml(sk)}</span>
        </span>
      `;
    }).join('');
  }

  function selectProfileCategory(cat) {
    const inp = document.getElementById('pv2-input-profession');
    if (inp) inp.value = cat;
    highlightActiveCategoryPill(cat);
    renderSuggestedSkills(cat);
  }

  function highlightActiveCategoryPill(val) {
    const valLower = (val || '').trim().toLowerCase();
    document.querySelectorAll('.pv2-cat-pill').forEach(pill => {
      const text = pill.textContent.toLowerCase();
      const isActive = valLower && (text.includes(valLower) || valLower.includes(text.replace(/^[^\s]+\s+/, '')));
      pill.classList.toggle('active', Boolean(isActive));
    });
    renderSuggestedSkills(val);
  }

  if (typeof window !== 'undefined') {
    window.selectProfileCategory = selectProfileCategory;
    window.highlightActiveCategoryPill = highlightActiveCategoryPill;
    window.addProfileSkill = addProfileSkill;
    window.removeProfileSkill = removeProfileSkill;
    window.clearAllProfileSkills = clearAllProfileSkills;
  }

  // Profile Modal Tab Switcher
  window.switchProfileModalTab = function(panelId) {
    const panels = document.querySelectorAll('.pv2-modal-panel');
    panels.forEach(p => p.style.display = 'none');

    const activePanel = document.getElementById(panelId);
    if (activePanel) activePanel.style.display = 'block';

    const btns = document.querySelectorAll('.pv2-modal-tab-btn');
    btns.forEach(b => b.classList.remove('active'));

    const clickedBtn = Array.from(btns).find(b => b.getAttribute('onclick') && b.getAttribute('onclick').includes(panelId));
    if (clickedBtn) clickedBtn.classList.add('active');
  };

  // Geo Country & District Handlers
  window.onProfileCountryChange = function(countryCode) {
    const districtSelect = document.getElementById('pv2-select-district');
    const customWrap = document.getElementById('pv2-custom-district-wrap');
    if (window.XECurrencyAndGeo && districtSelect) {
      window.XECurrencyAndGeo.populateDistrictSelect(districtSelect, countryCode, '');
    }
    if (customWrap) customWrap.style.display = 'none';
    syncProfileLocationValue();
  };

  window.onProfileDistrictChange = function(districtVal) {
    const customWrap = document.getElementById('pv2-custom-district-wrap');
    const customInput = document.getElementById('pv2-input-custom-district');
    if (districtVal === '__CUSTOM__' || districtVal === 'Other') {
      if (customWrap) customWrap.style.display = 'block';
      if (customInput) customInput.focus();
    } else {
      if (customWrap) customWrap.style.display = 'none';
    }
    syncProfileLocationValue();
  };

  window.onProfileCustomDistrictInput = function() {
    syncProfileLocationValue();
  };

  function syncProfileLocationValue() {
    const countrySelect = document.getElementById('pv2-select-country');
    const districtSelect = document.getElementById('pv2-select-district');
    const customInput = document.getElementById('pv2-input-custom-district');
    const hiddenLoc = document.getElementById('pv2-input-location');
    if (!hiddenLoc || !countrySelect || !districtSelect) return;

    const countryCode = countrySelect.value;
    const countryObj = window.XECurrencyAndGeo ? window.XECurrencyAndGeo.getCountryByCode(countryCode) : null;
    const countryName = countryObj ? countryObj.name : countryCode;

    let district = districtSelect.value;
    if (district === '__CUSTOM__' || district === 'Other') {
      district = customInput ? customInput.value.trim() : '';
    }
    hiddenLoc.value = window.XECurrencyAndGeo ? window.XECurrencyAndGeo.formatLocation(district, countryName) : (district ? `${district}, ${countryName}` : countryName);
  }

  // Open Edit Profile Modal and prefill
  window.openEditProfileModal = function() {
    if (!profileData || !profileData.user) return;
    const u = profileData.user;
    const f = document.getElementById('pv2-edit-form');
    if (!f) return;

    if (f.name) f.name.value = u.name || '';
    if (f.username) {
      f.username.value = u.username || '';
      const preview = document.getElementById('pv2-uname-preview');
      if (preview) preview.textContent = `${window.location.origin}/${u.username || '...'}`;
      const status = document.getElementById('pv2-uname-status');
      if (status) {
        status.textContent = u.username ? 'Current Handle \u2713' : '';
        status.className = 'pv2-uname-status' + (u.username ? ' available' : '');
      }
    }
    if (f.title_headline) f.title_headline.value = u.title_headline || '';
    if (f.profession) {
      f.profession.value = u.profession || '';
      highlightActiveCategoryPill(u.profession || '');
    }

    // Cascading Country & District setup
    const countrySelect = document.getElementById('pv2-select-country');
    const districtSelect = document.getElementById('pv2-select-district');
    const customWrap = document.getElementById('pv2-custom-district-wrap');
    const customInput = document.getElementById('pv2-input-custom-district');
    const hiddenLoc = document.getElementById('pv2-input-location');

    if (window.XECurrencyAndGeo && countrySelect && districtSelect) {
      const parsed = window.XECurrencyAndGeo.parseLocation(u.location || '');
      window.XECurrencyAndGeo.populateCountrySelect(countrySelect, parsed.countryCode || 'BD');
      window.XECurrencyAndGeo.populateDistrictSelect(districtSelect, parsed.countryCode || 'BD', parsed.district || '');

      if (districtSelect.value === '__CUSTOM__' || districtSelect.value === 'Other') {
        if (customWrap) customWrap.style.display = 'block';
        if (customInput) customInput.value = parsed.district || '';
      } else {
        if (customWrap) customWrap.style.display = 'none';
        if (customInput) customInput.value = '';
      }
      if (hiddenLoc) hiddenLoc.value = u.location || '';
    } else if (hiddenLoc) {
      hiddenLoc.value = u.location || '';
    }

    if (f.phone) f.phone.value = u.phone || '';
    if (f.bio) f.bio.value = u.bio || '';
    
    // Initialize interactive skills tags and suggestions
    initProfileSkills(u.skills || '');

    // Bind skill input keydown listener
    const skillTypeInput = document.getElementById('pv2-skill-type-input');
    if (skillTypeInput && !skillTypeInput._hasSkillListener) {
      skillTypeInput._hasSkillListener = true;
      skillTypeInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ',') {
          e.preventDefault();
          addProfileSkill(skillTypeInput.value.replace(/,/g, ''));
          skillTypeInput.value = '';
        } else if (e.key === 'Backspace' && skillTypeInput.value === '') {
          if (currentProfileSkills.length > 0) {
            currentProfileSkills.pop();
            renderProfileSkillTags();
          }
        }
      });
    }

    if (f.languages) f.languages.value = u.languages || '';
    if (f.hourly_rate) f.hourly_rate.value = u.hourly_rate || '';
    if (f.availability) f.availability.value = u.availability || 'available';
    if (f.user_type) f.user_type.value = u.user_type || 'regular';
    if (f.cover_image) f.cover_image.value = u.cover_image || '';

    const socials = u.social_links || {};
    if (f.website) f.website.value = socials.website || '';
    if (f.linkedin) f.linkedin.value = socials.linkedin || '';
    if (f.github) f.github.value = socials.github || '';

    // Attach real-time debounced username checker
    const unameInput = document.getElementById('pv2-input-username');
    if (unameInput && !unameInput._hasUnameListener) {
      unameInput._hasUnameListener = true;
      let checkTimeout = null;
      const setStatus = (msg, cls) => {
        const el = document.getElementById('pv2-uname-status');
        if (!el) return;
        el.textContent = msg;
        el.className = 'pv2-uname-status' + (cls ? ` ${cls}` : '');
      };
      unameInput.addEventListener('input', () => {
        clearTimeout(checkTimeout);
        const val = unameInput.value.trim().toLowerCase().replace(/^@/, '');
        const preview = document.getElementById('pv2-uname-preview');
        const saveBtn = f.querySelector('button[type="submit"]');

        if (preview) preview.textContent = `${window.location.origin}/${val || '...'}`;
        if (!val) {
          setStatus('Username is required', 'taken');
          if (saveBtn) saveBtn.disabled = true;
          return;
        }
        if (val === (profileData.user.username || '').toLowerCase()) {
          setStatus('Current Handle ✓', 'available');
          if (saveBtn) saveBtn.disabled = false;
          return;
        }

        setStatus('Checking...', 'checking');

        checkTimeout = setTimeout(async () => {
          try {
            const res = await api(`/users/check-username?username=${encodeURIComponent(val)}&exclude_id=${profileData.user.id}`);
            if (res.available) {
              setStatus('✓ Available', 'available');
              if (saveBtn) saveBtn.disabled = false;
            } else {
              setStatus(`✕ ${res.error || 'Already taken'}`, 'taken');
              if (saveBtn) saveBtn.disabled = true;
            }
          } catch (e) {
            setStatus(`✕ ${e.message}`, 'taken');
          }
        }, 350);
      });
    }

    switchProfileModalTab('tab-prof-basic');
    if (typeof openModal === 'function') openModal('modal-edit-profile-v2');
  };

  // Copy unique public handle (GitHub style: http://localhost:3000/admin_super)
  window.copyProfileHandle = function(username) {
    const handle = username || (profileData && profileData.user ? (profileData.user.username || profileData.user.id) : '');
    const url = `${window.location.origin}/${encodeURIComponent(handle)}`;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(() => {
        if (typeof toast === 'function') toast(`Copied public profile link: ${url}`, 'success');
        else alert(`Copied: ${url}`);
      }).catch(() => {
        prompt('Copy your unique profile link:', url);
      });
    } else {
      prompt('Copy your unique profile link:', url);
    }
  };

  // Quick Share Modal / Action
  window.openShareProfileModal = function() {
    const u = profileData && profileData.user ? profileData.user : {};
    const handle = u.username || targetUserId || u.id;
    const url = `${window.location.origin}/${encodeURIComponent(handle)}`;
    if (navigator.share) {
      navigator.share({
        title: `${u.name} (@${handle}) on XtraEarn`,
        text: `Check out ${u.name}'s verified professional profile on XtraEarn!`,
        url: url
      }).catch(() => {});
    } else {
      const shareInput = document.getElementById('pv2-share-link');
      const shareName = document.getElementById('pv2-share-name');
      if (shareInput) shareInput.value = url;
      if (shareName && u.name) shareName.textContent = `Share ${u.name}'s Profile`;
      if (typeof openModal === 'function') openModal('modal-share-profile');
    }
  };

  // Helper: update portfolio image preview thumbnail
  window.updatePortfolioImgPreview = function(url) {
    const preview = document.getElementById('pv2-port-img-preview');
    if (preview && url) {
      preview.src = url;
    }
  };

  // ==========================================
  // DYNAMIC CATEGORY, TAGS & LIVE LINK SYSTEM
  // ==========================================
  let cachedPortfolioCategories = null;
  window.loadDynamicPortfolioCategories = async function() {
    const sel = document.getElementById('pv2-port-cat-select');
    if (!sel) return;
    if (cachedPortfolioCategories && cachedPortfolioCategories.length) {
      populatePortfolioCategorySelect(cachedPortfolioCategories);
      return;
    }
    try {
      const res = await fetch('/api/categories');
      const data = await res.json();
      if (data && Array.isArray(data.items) && data.items.length) {
        cachedPortfolioCategories = data.items;
        populatePortfolioCategorySelect(data.items);
      }
    } catch (e) {
      console.warn('Could not fetch categories:', e);
    }
  };

  function populatePortfolioCategorySelect(categories) {
    const sel = document.getElementById('pv2-port-cat-select');
    if (!sel) return;
    const currentVal = sel.value;
    const itemsHtml = categories.map(c => `<option value="${escapeHtml(c.name)}">${c.icon || '💼'} ${escapeHtml(c.name)}</option>`).join('');
    sel.innerHTML = `
      <option value="">-- Select Project Category --</option>
      ${itemsHtml}
      <option value="__custom__">✨ Other / Custom Category...</option>
    `;
    if (currentVal) sel.value = currentVal;
  }

  window.handlePortfolioCategorySelect = function(val) {
    const customInp = document.getElementById('pv2-port-cat-custom');
    const hiddenInp = document.getElementById('pv2-port-cat');
    if (val === '__custom__') {
      if (customInp) {
        customInp.style.display = 'block';
        customInp.focus();
        if (hiddenInp) hiddenInp.value = customInp.value.trim();
      }
    } else {
      if (customInp) customInp.style.display = 'none';
      if (hiddenInp) hiddenInp.value = val;
    }
    updateCategoryPillsHighlight(val);
  };

  window.handlePortfolioCustomCatInput = function(val) {
    const hiddenInp = document.getElementById('pv2-port-cat');
    if (hiddenInp) hiddenInp.value = val.trim();
  };

  window.quickSelectPortfolioCategory = function(catName) {
    const sel = document.getElementById('pv2-port-cat-select');
    const customInp = document.getElementById('pv2-port-cat-custom');
    const hiddenInp = document.getElementById('pv2-port-cat');
    if (!sel || !hiddenInp) return;

    let found = false;
    for (let opt of sel.options) {
      if (opt.value === catName) {
        sel.value = catName;
        found = true;
        break;
      }
    }

    if (found) {
      if (customInp) customInp.style.display = 'none';
      hiddenInp.value = catName;
    } else {
      sel.value = '__custom__';
      if (customInp) {
        customInp.style.display = 'block';
        customInp.value = catName;
      }
      hiddenInp.value = catName;
    }
    updateCategoryPillsHighlight(catName);
  };

  function updateCategoryPillsHighlight(activeCat) {
    const container = document.getElementById('pv2-cat-quick-pills');
    if (!container) return;
    const pills = container.querySelectorAll('.pv2-cat-pill');
    pills.forEach(p => {
      const txt = p.textContent || '';
      if (activeCat && txt.toLowerCase().includes(activeCat.toLowerCase())) {
        p.classList.add('active');
      } else {
        p.classList.remove('active');
      }
    });
  }

  // --- Dynamic Tags Input System ---
  window.activePortfolioTags = [];

  window.renderPortfolioTags = function() {
    const list = document.getElementById('pv2-tag-chips-list');
    const hiddenInp = document.getElementById('pv2-port-tags');
    if (!list) return;

    list.innerHTML = window.activePortfolioTags.map(t => `
      <span class="pv2-tag-chip">
        <span>${escapeHtml(t)}</span>
        <button type="button" class="pv2-tag-chip-del" onclick="removePortfolioTag('${escapeHtml(t).replace(/'/g, "\\'")}')" title="Remove tag">✕</button>
      </span>
    `).join('');

    if (hiddenInp) {
      hiddenInp.value = window.activePortfolioTags.join(', ');
    }

    const suggContainer = document.getElementById('pv2-tag-suggestions');
    if (suggContainer) {
      const chips = suggContainer.querySelectorAll('.pv2-suggest-chip');
      chips.forEach(chip => {
        const rawTag = chip.textContent.replace(/^\+\s*/, '').trim();
        if (window.activePortfolioTags.some(t => t.toLowerCase() === rawTag.toLowerCase())) {
          chip.classList.add('active');
        } else {
          chip.classList.remove('active');
        }
      });
    }
  };

  window.addPortfolioTag = function(rawTag) {
    if (!rawTag) return;
    const clean = String(rawTag).replace(/^[#,\s]+|[,\s]+$/g, '').trim();
    if (!clean) return;
    if (!window.activePortfolioTags.some(t => t.toLowerCase() === clean.toLowerCase())) {
      window.activePortfolioTags.push(clean);
      window.renderPortfolioTags();
    }
    const inp = document.getElementById('pv2-tag-single-input');
    if (inp) {
      inp.value = '';
      inp.focus();
    }
  };

  window.removePortfolioTag = function(tagToRemove) {
    window.activePortfolioTags = window.activePortfolioTags.filter(t => t.toLowerCase() !== tagToRemove.toLowerCase());
    window.renderPortfolioTags();
  };

  window.focusPortfolioTagInput = function() {
    const inp = document.getElementById('pv2-tag-single-input');
    if (inp) inp.focus();
  };

  window.handlePortfolioTagKeyDown = function(evt) {
    if (evt.key === 'Enter' || evt.key === ',' || evt.key === 'Tab') {
      evt.preventDefault();
      const val = evt.target.value.trim();
      if (val) addPortfolioTag(val);
    } else if (evt.key === 'Backspace' && !evt.target.value) {
      if (window.activePortfolioTags && window.activePortfolioTags.length > 0) {
        window.activePortfolioTags.pop();
        window.renderPortfolioTags();
      }
    }
  };

  window.handlePortfolioTagBlur = function(input) {
    const val = input.value.trim();
    if (val) addPortfolioTag(val);
  };

  window.appendInlineTag = function(itemId, tag) {
    const inp = document.getElementById(`inline-inp-tags-${itemId}`);
    if (!inp) return;
    const current = inp.value ? inp.value.split(',').map(s => s.trim()).filter(Boolean) : [];
    if (!current.some(t => t.toLowerCase() === tag.toLowerCase())) {
      current.push(tag);
      inp.value = current.join(', ');
      if (typeof toast === 'function') toast(`Added tag: ${tag}`, 'info');
    }
    inp.focus();
  };

  // --- Dynamic Live Link System ---
  window.applyPortfolioUrlPreset = function(preset) {
    const inp = document.getElementById('pv2-port-url');
    if (!inp) return;
    const map = {
      web: 'https://',
      dribbble: 'https://dribbble.com/',
      behance: 'https://behance.net/gallery/',
      github: 'https://github.com/',
      youtube: 'https://youtube.com/watch?v='
    };
    const prefix = map[preset] || 'https://';
    if (!inp.value || inp.value === 'https://') {
      inp.value = prefix;
    } else if (!inp.value.startsWith('http')) {
      inp.value = prefix + inp.value;
    }
    inp.focus();
    inp.setSelectionRange(inp.value.length, inp.value.length);
    window.onPortfolioUrlChange(inp.value);
  };

  window.onPortfolioUrlChange = function(rawUrl) {
    const iconEl = document.getElementById('pv2-port-url-icon');
    const testBtn = document.getElementById('pv2-port-url-test-btn');
    const hintEl = document.getElementById('pv2-port-url-hint');
    const trimmed = (rawUrl || '').trim();

    if (!trimmed) {
      if (iconEl) iconEl.textContent = '🔗';
      if (testBtn) {
        testBtn.href = '#';
        testBtn.style.opacity = '0.45';
        testBtn.style.pointerEvents = 'none';
        testBtn.style.color = '';
        testBtn.style.borderColor = '';
        testBtn.style.background = '';
      }
      if (hintEl) {
        hintEl.innerHTML = `<span>💡</span> Paste link. Click "Test Link ↗" to verify in new tab.`;
        hintEl.style.color = '#64748B';
      }
      return;
    }

    let icon = '🌐';
    let platform = 'Website';
    if (/dribbble\.com/i.test(trimmed)) { icon = '🎨'; platform = 'Dribbble'; }
    else if (/behance\.net/i.test(trimmed)) { icon = '🔷'; platform = 'Behance'; }
    else if (/github\.com/i.test(trimmed)) { icon = '🐙'; platform = 'GitHub'; }
    else if (/youtube\.com|youtu\.be|loom\.com|vimeo\.com/i.test(trimmed)) { icon = '🎬'; platform = 'Video'; }
    else if (/linkedin\.com/i.test(trimmed)) { icon = '💼'; platform = 'LinkedIn'; }
    else if (/figma\.com/i.test(trimmed)) { icon = '📐'; platform = 'Figma'; }

    if (iconEl) iconEl.textContent = icon;

    const validUrl = trimmed.startsWith('http://') || trimmed.startsWith('https://')
      ? trimmed
      : `https://${trimmed}`;

    if (testBtn) {
      testBtn.href = validUrl;
      testBtn.style.opacity = '1';
      testBtn.style.pointerEvents = 'auto';
      testBtn.style.color = '#10B981';
      testBtn.style.borderColor = '#10B981';
      testBtn.style.background = '#ECFDF5';
    }
    if (hintEl) {
      hintEl.innerHTML = `<span style="color: #10B981;">✅</span> <b style="color: #10B981;">${platform} link ready!</b> Click "Test Link ↗" to test.`;
      hintEl.style.color = '#10B981';
    }
  };

  window.setInlineUrlPrefix = function(itemId, prefix) {
    const inp = document.getElementById(`inline-inp-url-${itemId}`);
    if (!inp) return;
    if (!inp.value || inp.value === 'https://') {
      inp.value = prefix;
    } else if (!inp.value.startsWith('http')) {
      inp.value = prefix + inp.value;
    }
    inp.focus();
    inp.setSelectionRange(inp.value.length, inp.value.length);
    window.updateInlineUrlTest(itemId, inp.value);
  };

  window.updateInlineUrlTest = function(itemId, rawUrl) {
    const testBtn = document.getElementById(`inline-test-btn-${itemId}`);
    const iconEl = document.getElementById(`inline-url-icon-${itemId}`);
    const trimmed = (rawUrl || '').trim();

    if (!trimmed) {
      if (iconEl) iconEl.textContent = '🔗';
      if (testBtn) {
        testBtn.href = '#';
        testBtn.style.opacity = '0.45';
        testBtn.style.pointerEvents = 'none';
        testBtn.style.color = '';
        testBtn.style.borderColor = '';
        testBtn.style.background = '';
      }
      return;
    }

    let icon = '🌐';
    if (/dribbble\.com/i.test(trimmed)) icon = '🎨';
    else if (/behance\.net/i.test(trimmed)) icon = '🔷';
    else if (/github\.com/i.test(trimmed)) icon = '🐙';
    else if (/youtube\.com|youtu\.be|loom\.com/i.test(trimmed)) icon = '🎬';
    else if (/linkedin\.com/i.test(trimmed)) icon = '💼';
    if (iconEl) iconEl.textContent = icon;

    const validUrl = trimmed.startsWith('http://') || trimmed.startsWith('https://')
      ? trimmed
      : `https://${trimmed}`;

    if (testBtn) {
      testBtn.href = validUrl;
      testBtn.style.opacity = '1';
      testBtn.style.pointerEvents = 'auto';
      testBtn.style.color = '#10B981';
      testBtn.style.borderColor = '#10B981';
      testBtn.style.background = '#ECFDF5';
    }
  };

  // Open Add Portfolio Modal
  window.openAddPortfolioModal = function() {
    const f = document.getElementById('pv2-portfolio-form');
    if (f) f.reset();
    const idField = document.getElementById('pv2-port-id');
    if (idField) idField.value = '';
    const icon = document.getElementById('pv2-port-modal-icon');
    if (icon) icon.textContent = '🎨';
    const title = document.getElementById('pv2-port-modal-title');
    if (title) title.textContent = 'Add Portfolio Project';
    const submitBtn = document.getElementById('pv2-port-modal-submit');
    if (submitBtn) submitBtn.textContent = 'Publish Project 🚀';
    const defaultCover = 'https://images.unsplash.com/photo-1542744094-3a31727221eb?w=600&auto=format&fit=crop&q=80';
    const imgInp = document.getElementById('pv2-port-img');
    if (imgInp) imgInp.value = defaultCover;
    updatePortfolioImgPreview(defaultCover);

    // Reset Category
    const catSel = document.getElementById('pv2-port-cat-select');
    if (catSel) catSel.value = '';
    const catCustom = document.getElementById('pv2-port-cat-custom');
    if (catCustom) { catCustom.value = ''; catCustom.style.display = 'none'; }
    const catHidden = document.getElementById('pv2-port-cat');
    if (catHidden) catHidden.value = '';
    updateCategoryPillsHighlight('');

    // Reset Tags
    window.activePortfolioTags = [];
    window.renderPortfolioTags();

    // Reset URL
    const urlInp = document.getElementById('pv2-port-url');
    if (urlInp) urlInp.value = '';
    window.onPortfolioUrlChange('');

    const visInp = document.getElementById('pv2-port-visible');
    if (visInp) {
      visInp.checked = true;
      const visTxt = document.getElementById('pv2-port-visible-txt');
      if (visTxt) {
        visTxt.textContent = '👁️ Visible';
        visTxt.style.color = '#10B981';
      }
    }

    loadDynamicPortfolioCategories();

    if (typeof openModal === 'function') openModal('modal-add-portfolio');
  };

  // Helper: update inline card image preview thumbnail
  window.updateInlineImgPreview = function(id, url) {
    const preview = document.getElementById(`inline-img-preview-${id}`);
    if (preview && url) {
      preview.src = url;
    }
  };

  // Handle inline image upload from device file picker
  window.handleInlinePortfolioImageUpload = async function(id, input) {
    const file = input && input.files && input.files[0];
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      if (typeof toast === 'function') toast('Image file is too large (max 15MB).', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = function(evt) {
      updateInlineImgPreview(id, evt.target.result);
    };
    reader.readAsDataURL(file);

    const imgInp = document.getElementById(`inline-inp-img-${id}`);
    const originalVal = imgInp ? imgInp.value : '';
    if (imgInp) imgInp.value = 'Uploading image...';

    try {
      const formData = new FormData();
      formData.append('file', file);

      const token = (typeof Auth !== 'undefined' && Auth.token) ? Auth.token : (localStorage.getItem('token') || sessionStorage.getItem('token'));
      const res = await fetch('/api/users/me/portfolio/upload', {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: formData
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to upload image');

      if (imgInp) imgInp.value = data.url;
      updateInlineImgPreview(id, data.url);
      if (typeof toast === 'function') toast('📸 Project image uploaded successfully!', 'success');
    } catch (err) {
      if (reader.result && imgInp) {
        imgInp.value = reader.result;
        if (typeof toast === 'function') toast('📸 Image loaded from device!', 'info');
      } else {
        if (imgInp) imgInp.value = originalVal;
        if (typeof toast === 'function') toast('Upload failed: ' + err.message, 'error');
      }
    }
  };

  // Handle modal image upload from device file picker
  window.handleModalPortfolioImageUpload = async function(input) {
    const file = input && input.files && input.files[0];
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      if (typeof toast === 'function') toast('Image file is too large (max 15MB).', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = function(evt) {
      updatePortfolioImgPreview(evt.target.result);
    };
    reader.readAsDataURL(file);

    const imgInp = document.getElementById('pv2-port-img');
    const originalVal = imgInp ? imgInp.value : '';
    if (imgInp) imgInp.value = 'Uploading image...';

    try {
      const formData = new FormData();
      formData.append('file', file);

      const token = (typeof Auth !== 'undefined' && Auth.token) ? Auth.token : (localStorage.getItem('token') || sessionStorage.getItem('token'));
      const res = await fetch('/api/users/me/portfolio/upload', {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: formData
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to upload image');

      if (imgInp) imgInp.value = data.url;
      updatePortfolioImgPreview(data.url);
      if (typeof toast === 'function') toast('📸 Project image uploaded successfully!', 'success');
    } catch (err) {
      if (reader.result && imgInp) {
        imgInp.value = reader.result;
        if (typeof toast === 'function') toast('📸 Image loaded from device!', 'info');
      } else {
        if (imgInp) imgInp.value = originalVal;
        if (typeof toast === 'function') toast('Upload failed: ' + err.message, 'error');
      }
    }
  };

  // Live Inline Edit Mode on the card itself
  window.enterInlineEditMode = function(indexOrId) {
    const pData = profileData || window.currentProfileData;
    if (!pData || !pData.portfolio) return;
    let item = null;
    let index = -1;
    if (typeof indexOrId === 'number' || /^\d+$/.test(indexOrId)) {
      index = Number(indexOrId);
      item = pData.portfolio[index];
    }
    if (!item) {
      index = pData.portfolio.findIndex(p => String(p.id) === String(indexOrId));
      if (index !== -1) item = pData.portfolio[index];
    }
    if (!item) return;

    const cardEl = document.getElementById(`pv2-card-${item.id}`);
    if (!cardEl) return;

    cardEl.classList.add('pv2-card-live-editing');
    cardEl.innerHTML = `
      <div style="position: absolute; top: -11px; right: 14px; background: linear-gradient(135deg, #10B981, #059669); color: #fff; font-size: 0.7rem; font-weight: 800; padding: 3px 10px; border-radius: 12px; z-index: 10; display: flex; align-items: center; gap: 5px; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);">
        <span>✨</span> LIVE EDIT MODE
      </div>

      <div class="pv2-portfolio-img-wrap" style="height: 175px; position: relative;">
        <img id="inline-img-preview-${item.id}" class="pv2-portfolio-img" src="${escapeHtml(item.image_url)}" alt="${escapeHtml(item.title)}" onerror="this.src='https://images.unsplash.com/photo-1542744094-3a31727221eb?w=600&auto=format&fit=crop&q=80'; this.onerror=null;">
        <div style="position: absolute; bottom: 8px; left: 8px; right: 8px; background: rgba(15, 23, 42, 0.92); backdrop-filter: blur(6px); padding: 8px 10px; border-radius: 10px; display: flex; flex-direction: column; gap: 6px; border: 1px solid rgba(255,255,255,0.12);">
          <div style="display: flex; gap: 6px; align-items: center; justify-content: space-between;">
            <span style="font-size: 0.72rem; color: #34D399; font-weight: 800;">🖼️ Cover Photo:</span>
            <label class="pv2-btn pv2-btn-primary" style="padding: 3px 10px; font-size: 0.7rem; font-weight: 800; cursor: pointer; background: #3B82F6; border-color: #3B82F6; margin: 0; display: inline-flex; align-items: center; gap: 4px;">
              <span>📤</span> Upload Photo
              <input type="file" id="inline-file-inp-${item.id}" accept="image/*" style="display: none;" onchange="handleInlinePortfolioImageUpload('${item.id}', this)">
            </label>
          </div>
          <div style="display: flex; gap: 6px; align-items: center;">
            <input type="text" id="inline-inp-img-${item.id}" value="${escapeHtml(item.image_url)}" placeholder="Or paste direct image URL..." style="flex: 1; min-width: 0; background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.25); border-radius: 4px; color: #fff; font-size: 0.72rem; padding: 4px 8px; outline: none;" oninput="updateInlineImgPreview('${item.id}', this.value)">
          </div>
        </div>
      </div>

      <div class="pv2-portfolio-body" style="padding: 14px; gap: 10px;">
        <div>
          <div style="display: flex; gap: 8px; justify-content: space-between;">
            <div style="flex: 1;">
              <label style="font-size: 0.68rem; font-weight: 800; color: #64748B; text-transform: uppercase; margin-bottom: 2px; display: block;">Category</label>
              <input type="text" id="inline-inp-cat-${item.id}" value="${escapeHtml(item.category || '')}" placeholder="e.g. Branding, UI/UX" style="width: 100%; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.78rem; font-weight: 700; padding: 5px 8px; box-sizing: border-box; outline: none;" onfocus="this.style.borderColor='#10B981'" onblur="this.style.borderColor='#CBD5E1'">
            </div>
            <div style="width: 110px;">
              <label style="font-size: 0.68rem; font-weight: 800; color: #64748B; text-transform: uppercase; margin-bottom: 2px; display: block;">Budget (৳)</label>
              <input type="number" id="inline-inp-budget-${item.id}" value="${item.budget || ''}" placeholder="৳ 5000" style="width: 100%; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.8rem; font-weight: 800; color: #10B981; padding: 5px 8px; box-sizing: border-box; outline: none;" onfocus="this.style.borderColor='#10B981'" onblur="this.style.borderColor='#CBD5E1'">
            </div>
          </div>
          <!-- Dynamic Category quick pills -->
          <div style="display: flex; gap: 4px; flex-wrap: wrap; margin-top: 5px;">
            <span class="pv2-cat-pill" style="font-size: 0.66rem; padding: 2px 7px;" onclick="const c = document.getElementById('inline-inp-cat-${item.id}'); if(c){ c.value = 'Graphics & Design'; c.focus(); }">🎨 Graphics</span>
            <span class="pv2-cat-pill" style="font-size: 0.66rem; padding: 2px 7px;" onclick="const c = document.getElementById('inline-inp-cat-${item.id}'); if(c){ c.value = 'Website & Software'; c.focus(); }">💻 Web</span>
            <span class="pv2-cat-pill" style="font-size: 0.66rem; padding: 2px 7px;" onclick="const c = document.getElementById('inline-inp-cat-${item.id}'); if(c){ c.value = 'Digital Marketing'; c.focus(); }">📣 Marketing</span>
            <span class="pv2-cat-pill" style="font-size: 0.66rem; padding: 2px 7px;" onclick="const c = document.getElementById('inline-inp-cat-${item.id}'); if(c){ c.value = 'Video & Animation'; c.focus(); }">🎬 Video</span>
            <span class="pv2-cat-pill" style="font-size: 0.66rem; padding: 2px 7px;" onclick="const c = document.getElementById('inline-inp-cat-${item.id}'); if(c){ c.value = 'AI & Machine Learning'; c.focus(); }">🤖 AI</span>
          </div>
        </div>

        <div>
          <label style="font-size: 0.68rem; font-weight: 800; color: #64748B; text-transform: uppercase; margin-bottom: 2px; display: block;">Project Title *</label>
          <input type="text" id="inline-inp-title-${item.id}" value="${escapeHtml(item.title)}" placeholder="Project Title" style="width: 100%; border: 1.5px solid #10B981; border-radius: 6px; font-size: 0.88rem; font-weight: 800; color: #0F172A; padding: 6px 8px; box-sizing: border-box; outline: none;">
        </div>

        <div>
          <label style="font-size: 0.68rem; font-weight: 800; color: #64748B; text-transform: uppercase; margin-bottom: 2px; display: block;">Description & Deliverables</label>
          <textarea id="inline-inp-desc-${item.id}" rows="2" placeholder="Briefly describe what was completed..." style="width: 100%; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.78rem; color: #334155; padding: 6px 8px; box-sizing: border-box; outline: none; resize: vertical; line-height: 1.4;" onfocus="this.style.borderColor='#10B981'" onblur="this.style.borderColor='#CBD5E1'">${escapeHtml(item.description || '')}</textarea>
        </div>

        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
            <label style="font-size: 0.68rem; font-weight: 800; color: #64748B; text-transform: uppercase; margin: 0;">Tags (comma separated)</label>
            <span style="font-size: 0.65rem; color: #94A3B8;">Click to append</span>
          </div>
          <input type="text" id="inline-inp-tags-${item.id}" value="${escapeHtml((item.tags || []).join(', '))}" placeholder="e.g. Figma, Branding, React" style="width: 100%; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.74rem; padding: 5px 8px; box-sizing: border-box; outline: none;" onfocus="this.style.borderColor='#10B981'" onblur="this.style.borderColor='#CBD5E1'">
          <div style="display: flex; gap: 4px; flex-wrap: wrap; margin-top: 5px;">
            <span class="pv2-suggest-chip" style="font-size: 0.65rem; padding: 2px 6px;" onclick="appendInlineTag('${item.id}', 'Figma')">+ Figma</span>
            <span class="pv2-suggest-chip" style="font-size: 0.65rem; padding: 2px 6px;" onclick="appendInlineTag('${item.id}', 'UI/UX')">+ UI/UX</span>
            <span class="pv2-suggest-chip" style="font-size: 0.65rem; padding: 2px 6px;" onclick="appendInlineTag('${item.id}', 'React')">+ React</span>
            <span class="pv2-suggest-chip" style="font-size: 0.65rem; padding: 2px 6px;" onclick="appendInlineTag('${item.id}', 'Branding')">+ Branding</span>
            <span class="pv2-suggest-chip" style="font-size: 0.65rem; padding: 2px 6px;" onclick="appendInlineTag('${item.id}', 'WordPress')">+ WordPress</span>
            <span class="pv2-suggest-chip" style="font-size: 0.65rem; padding: 2px 6px;" onclick="appendInlineTag('${item.id}', 'Python')">+ Python</span>
            <span class="pv2-suggest-chip" style="font-size: 0.65rem; padding: 2px 6px;" onclick="appendInlineTag('${item.id}', 'SEO')">+ SEO</span>
          </div>
        </div>

        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
            <label style="font-size: 0.68rem; font-weight: 800; color: #64748B; text-transform: uppercase; margin: 0;">Live Demo / Proof URL</label>
            <div style="display: flex; gap: 4px;">
              <button type="button" class="pv2-link-preset-chip" style="font-size: 0.65rem; padding: 1px 6px;" onclick="setInlineUrlPrefix('${item.id}', 'https://dribbble.com/')">🎨 Dribbble</button>
              <button type="button" class="pv2-link-preset-chip" style="font-size: 0.65rem; padding: 1px 6px;" onclick="setInlineUrlPrefix('${item.id}', 'https://github.com/')">🐙 GitHub</button>
              <button type="button" class="pv2-link-preset-chip" style="font-size: 0.65rem; padding: 1px 6px;" onclick="setInlineUrlPrefix('${item.id}', 'https://')">🌐 Web</button>
            </div>
          </div>
          <div style="display: flex; gap: 6px; align-items: center;">
            <div style="position: relative; flex: 1;">
              <span id="inline-url-icon-${item.id}" style="position: absolute; left: 8px; top: 50%; transform: translateY(-50%); font-size: 0.85rem; pointer-events: none;">🔗</span>
              <input type="text" id="inline-inp-url-${item.id}" value="${escapeHtml(item.project_url || '')}" placeholder="https://..." style="width: 100%; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.74rem; padding: 5px 8px 5px 28px; box-sizing: border-box; outline: none;" onfocus="this.style.borderColor='#10B981'" onblur="this.style.borderColor='#CBD5E1'" oninput="updateInlineUrlTest('${item.id}', this.value)">
            </div>
            <a id="inline-test-btn-${item.id}" href="${escapeHtml(item.project_url || '#')}" target="_blank" rel="noopener noreferrer" class="pv2-btn pv2-btn-outline" style="font-size: 0.72rem; padding: 5px 9px; white-space: nowrap; ${item.project_url ? 'color: #10B981; border-color: #10B981; background: #ECFDF5;' : 'opacity: 0.45; pointer-events: none;'}" title="Test Live Link">
              🔗 Test ↗
            </a>
          </div>
        </div>

        <!-- Public Visibility Switch in Inline Edit -->
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 6px 10px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; margin-top: 4px;">
          <span style="font-size: 0.76rem; font-weight: 800; color: #334155; display: flex; align-items: center; gap: 5px;">
            <span>👁️</span> Public Visibility:
          </span>
          <label style="display: inline-flex; align-items: center; gap: 6px; cursor: pointer; font-size: 0.76rem; font-weight: 700;">
            <input type="checkbox" id="inline-inp-visible-${item.id}" ${item.is_hidden ? '' : 'checked'} style="accent-color: #10B981; width: 15px; height: 15px; cursor: pointer;" onchange="const l = document.getElementById('inline-visible-label-${item.id}'); if (l) { l.textContent = this.checked ? '👁️ Visible to Public' : '🙈 Hidden from Public'; l.style.color = this.checked ? '#10B981' : '#F59E0B'; }">
            <span id="inline-visible-label-${item.id}" style="color: ${item.is_hidden ? '#F59E0B' : '#10B981'}; font-weight: 800;">
              ${item.is_hidden ? '🙈 Hidden from Public' : '👁️ Visible to Public'}
            </span>
          </label>
        </div>

        <div style="display: flex; gap: 8px; justify-content: flex-end; margin-top: 6px; border-top: 1px solid #F1F5F9; padding-top: 10px;">
          <button type="button" class="pv2-btn pv2-btn-outline" style="padding: 6px 12px; font-size: 0.76rem; font-weight: 700;" onclick="cancelInlineEditMode('${item.id}', ${index})">✕ Cancel</button>
          <button type="button" id="btn-save-inline-${item.id}" class="pv2-btn pv2-btn-primary" style="padding: 6px 18px; font-size: 0.76rem; font-weight: 800; background: #10B981; border-color: #10B981;" onclick="saveInlineEditMode('${item.id}', ${index})">💾 Save Live ✨</button>
        </div>
      </div>
    `;

    const titleInp = document.getElementById(`inline-inp-title-${item.id}`);
    if (titleInp) {
      titleInp.focus();
      titleInp.select();
    }
  };

  // Save changes from Live Inline Edit mode
  window.saveInlineEditMode = async function(id, index) {
    const pData = profileData || window.currentProfileData;
    if (!pData || !pData.portfolio) return;
    const item = pData.portfolio[index] || pData.portfolio.find(p => String(p.id) === String(id));
    if (!item) return;

    const titleInp = document.getElementById(`inline-inp-title-${id}`);
    const catInp = document.getElementById(`inline-inp-cat-${id}`);
    const imgInp = document.getElementById(`inline-inp-img-${id}`);
    const descInp = document.getElementById(`inline-inp-desc-${id}`);
    const tagsInp = document.getElementById(`inline-inp-tags-${id}`);
    const budgetInp = document.getElementById(`inline-inp-budget-${id}`);
    const urlInp = document.getElementById(`inline-inp-url-${id}`);
    const saveBtn = document.getElementById(`btn-save-inline-${id}`);

    const title = titleInp ? titleInp.value.trim() : '';
    if (!title) {
      if (typeof toast === 'function') toast('Please enter a project title', 'error');
      return;
    }

    const visibleInp = document.getElementById(`inline-inp-visible-${id}`);
    const is_hidden = visibleInp ? !visibleInp.checked : (item.is_hidden || false);

    let project_url = urlInp ? urlInp.value.trim() : (item.project_url || '');
    if (project_url && !project_url.startsWith('http://') && !project_url.startsWith('https://')) {
      project_url = 'https://' + project_url;
    }

    const payload = {
      title,
      category: catInp ? catInp.value.trim() : item.category,
      image_url: imgInp ? imgInp.value.trim() : item.image_url,
      description: descInp ? descInp.value.trim() : item.description,
      tags: tagsInp ? tagsInp.value.trim() : (item.tags || []).join(', '),
      budget: budgetInp ? (Number(budgetInp.value) || 0) : item.budget,
      project_url,
      is_hidden
    };

    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving...';
    }

    try {
      const res = await api(`/users/me/portfolio/${encodeURIComponent(item.id)}`, {
        method: 'PUT',
        body: payload
      });

      const updatedItem = res.item || { ...item, ...payload };
      pData.portfolio[index] = updatedItem;

      if (typeof toast === 'function') toast('🎉 Project updated live! ✨', 'success');

      const cardEl = document.getElementById(`pv2-card-${item.id}`);
      if (cardEl) {
        cardEl.outerHTML = renderPortfolioCardHtml(updatedItem, index, true);
        const newCard = document.getElementById(`pv2-card-${item.id}`);
        if (newCard) {
          newCard.style.transition = 'all 0.4s ease';
          newCard.style.boxShadow = '0 0 0 3px #10B981';
          setTimeout(() => { newCard.style.boxShadow = ''; }, 1200);
        }
      } else {
        loadProfile();
      }
    } catch (err) {
      if (typeof toast === 'function') toast('Failed to update: ' + err.message, 'error');
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = '💾 Save Live ✨';
      }
    }
  };

  // Cancel Live Inline Edit mode
  window.cancelInlineEditMode = function(id, index) {
    const pData = profileData || window.currentProfileData;
    if (!pData || !pData.portfolio) return;
    const item = pData.portfolio[index] || pData.portfolio.find(p => String(p.id) === String(id));
    if (!item) return;

    const cardEl = document.getElementById(`pv2-card-${id}`);
    if (cardEl) {
      cardEl.outerHTML = renderPortfolioCardHtml(item, index, true);
    }
  };

  // Toggle Portfolio Project Visibility (Hide/Unhide from public)
  window.togglePortfolioVisibility = async function(id, index) {
    const pData = profileData || window.currentProfileData;
    if (!pData || !pData.portfolio) return;
    let item = null;
    let idx = -1;
    if (typeof index === 'number' && pData.portfolio[index]) {
      idx = index;
      item = pData.portfolio[index];
    } else {
      idx = pData.portfolio.findIndex(p => String(p.id) === String(id));
      if (idx !== -1) item = pData.portfolio[idx];
    }
    if (!item) return;

    try {
      const res = await api(`/users/me/portfolio/${encodeURIComponent(item.id)}/visibility`, {
        method: 'PATCH'
      });

      const updatedItem = (res && res.item) ? res.item : { ...item, is_hidden: !item.is_hidden };
      pData.portfolio[idx] = updatedItem;

      if (updatedItem.is_hidden) {
        if (typeof toast === 'function') toast('🙈 Project is now hidden from public view.', 'info');
      } else {
        if (typeof toast === 'function') toast('👁️ Project is now live and visible to public!', 'success');
      }

      const cardEl = document.getElementById(`pv2-card-${item.id}`);
      if (cardEl) {
        cardEl.outerHTML = renderPortfolioCardHtml(updatedItem, idx, true);
        const newCard = document.getElementById(`pv2-card-${item.id}`);
        if (newCard) {
          newCard.style.transition = 'all 0.3s ease';
          newCard.style.transform = 'scale(0.98)';
          setTimeout(() => { newCard.style.transform = ''; }, 200);
        }
      } else {
        loadProfile();
      }
    } catch (err) {
      if (typeof toast === 'function') toast('Failed to update visibility: ' + err.message, 'error');
    }
  };

  // Open Edit Portfolio Modal (for modal-based edit, forwards to inline edit or opens modal)
  window.openEditPortfolioModal = function(indexOrId) {
    enterInlineEditMode(indexOrId);
  };

  // Delete Portfolio Item
  window.deletePortfolioItem = async function(itemId) {
    if (!confirm('Are you sure you want to remove this project from your portfolio?')) return;
    try {
      await api(`/users/me/portfolio/${itemId}`, { method: 'DELETE' });
      if (typeof toast === 'function') toast('Portfolio project removed.', 'info');
      loadProfile();
    } catch (err) {
      if (typeof toast === 'function') toast(err.message, 'error');
    }
  };

  // Portfolio Lightbox Preview
  window.openPortfolioLightbox = function(indexOrId) {
    const pData = profileData || window.currentProfileData;
    if (!pData || !pData.portfolio) return;
    let item = null;
    let index = -1;
    if (typeof indexOrId === 'number' || /^\d+$/.test(indexOrId)) {
      index = Number(indexOrId);
      item = pData.portfolio[index];
    }
    if (!item) {
      index = pData.portfolio.findIndex(p => String(p.id) === String(indexOrId));
      if (index !== -1) item = pData.portfolio[index];
    }
    if (!item) return;

    const img = document.getElementById('pv2-prev-img');
    const title = document.getElementById('pv2-prev-title');
    const cat = document.getElementById('pv2-prev-cat');
    const desc = document.getElementById('pv2-prev-desc');
    const budget = document.getElementById('pv2-prev-budget');
    const tags = document.getElementById('pv2-prev-tags');
    const date = document.getElementById('pv2-prev-date');
    const url = document.getElementById('pv2-prev-url');
    const editBtn = document.getElementById('pv2-prev-edit-btn');
    const visBtn = document.getElementById('pv2-prev-vis-btn');

    if (img) {
      img.src = item.image_url;
      img.onerror = function() {
        this.src = 'https://images.unsplash.com/photo-1542744094-3a31727221eb?w=600&auto=format&fit=crop&q=80';
        this.onerror = null;
      };
    }
    if (title) title.textContent = item.title;
    if (cat) cat.textContent = item.category || 'Project Showcase';
    if (desc) desc.textContent = item.description || 'Deliverables verified with milestone inspection.';
    if (budget) budget.textContent = item.budget ? `৳ ${Number(item.budget).toLocaleString()}` : '';
    if (date) date.textContent = `Completed: ${item.completed_at || 'Aug 2026'}`;

    if (tags) {
      tags.innerHTML = (item.tags || []).map(t => `<span class="pv2-skill-pill" style="font-size: 0.74rem;">${escapeHtml(t)}</span>`).join('');
    }

    if (url) {
      if (item.project_url) {
        url.href = item.project_url;
        url.style.display = 'inline-flex';
      } else {
        url.style.display = 'none';
      }
    }

    const canEdit = Boolean(isMe || (window.Auth && Auth.user && pData.user && String(Auth.user.id) === String(pData.user.id)));
    if (visBtn) {
      if (canEdit) {
        visBtn.style.display = 'inline-flex';
        const updateVisBtnUi = (hidden) => {
          if (hidden) {
            visBtn.innerHTML = '<span>🙈</span> Hidden (Click to make visible)';
            visBtn.style.color = '#D97706';
            visBtn.style.borderColor = '#F59E0B';
            visBtn.style.background = '#FFFBEB';
          } else {
            visBtn.innerHTML = '<span>👁️</span> Visible (Click to hide)';
            visBtn.style.color = '#10B981';
            visBtn.style.borderColor = '#10B981';
            visBtn.style.background = '#ECFDF5';
          }
        };
        updateVisBtnUi(Boolean(item.is_hidden));
        visBtn.onclick = async function() {
          visBtn.disabled = true;
          await togglePortfolioVisibility(item.id, index);
          visBtn.disabled = false;
          const refreshedItem = pData.portfolio[index] || pData.portfolio.find(p => String(p.id) === String(item.id));
          if (refreshedItem) updateVisBtnUi(Boolean(refreshedItem.is_hidden));
        };
      } else {
        visBtn.style.display = 'none';
      }
    }

    if (editBtn) {
      if (canEdit) {
        editBtn.style.display = 'inline-flex';
        editBtn.onclick = function() {
          if (typeof closeModal === 'function') closeModal('modal-portfolio-preview');
          enterInlineEditMode(index);
          const el = document.getElementById(`pv2-card-${item.id}`);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        };
      } else {
        editBtn.style.display = 'none';
      }
    }

    if (typeof openModal === 'function') {
      openModal('modal-portfolio-preview');
    } else {
      const modal = document.getElementById('modal-portfolio-preview');
      if (modal) modal.classList.add('open');
    }
  };

  // Official Verified Credential Modal
  window.openCredentialModal = function(type, holderName, handle, credId, desc, date, customTitle) {
    const modal = document.getElementById('modal-verified-credential');
    if (!modal) return;

    const titleEl = document.getElementById('pv2-cert-modal-name');
    const holderEl = document.getElementById('pv2-cert-modal-holder');
    const handleEl = document.getElementById('pv2-cert-modal-handle');
    const descEl = document.getElementById('pv2-cert-modal-desc');
    const idEl = document.getElementById('pv2-cert-modal-id');
    const dateEl = document.getElementById('pv2-cert-modal-date');
    const iconEl = document.getElementById('pv2-cert-modal-icon');

    if (titleEl) {
      if (type === 'identity') titleEl.textContent = 'XtraEarn Verified Identity';
      else if (type === 'skill') titleEl.textContent = 'Skill Competency Credential';
      else titleEl.textContent = customTitle || 'Official Platform Credential';
    }
    if (iconEl) {
      if (type === 'identity') iconEl.textContent = '🛡️';
      else if (type === 'skill') iconEl.textContent = '🎖️';
      else iconEl.textContent = '📜';
    }
    if (holderEl) holderEl.textContent = holderName || 'Verified Contributor';
    if (handleEl) handleEl.textContent = handle ? `@${handle.replace(/^@/, '')}` : '';
    if (descEl) descEl.textContent = desc || 'Official verified credential certified by XtraEarn Platform Governance Protocol.';
    if (idEl) idEl.textContent = credId || 'XE-VER-2026';
    if (dateEl) dateEl.textContent = date || 'Aug 2026';

    if (typeof openModal === 'function') openModal('modal-verified-credential');
    else modal.classList.add('open');
  };

  window.copyCredentialLink = function() {
    const url = window.location.href;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      if (typeof toast === 'function') toast('🔗 Credential verification link copied!', 'success');
    }
  };

  // Add Certificate & Professional Credential Modal Controller
  let certSelectedFile = null;

  function ensureAddCertificateModal() {
    if (document.getElementById('modal-add-certificate')) return;
    const wrap = document.createElement('div');
    wrap.innerHTML = `
    <div class="modal-overlay" id="modal-add-certificate">
      <div class="modal" style="max-width: 540px; padding: 0; border-radius: 24px; overflow: hidden; box-shadow: 0 25px 60px rgba(0,0,0,0.3); border: 1px solid #E2E8F0; background: #ffffff;">
        <div style="background: linear-gradient(135deg, #0F172A, #1E293B); padding: 22px 24px; color: #fff; position: relative;">
          <button class="modal-x" onclick="closeModal('modal-add-certificate')" aria-label="Close" style="position: absolute; top: 16px; right: 16px; color: #fff; background: rgba(255,255,255,0.15); border: none; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; cursor: pointer;">✕</button>
          <div style="display: flex; align-items: center; gap: 14px;">
            <span style="width: 46px; height: 46px; border-radius: 14px; background: rgba(16, 185, 129, 0.15); border: 1.5px solid #10B981; display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">🎓</span>
            <div>
              <h3 style="margin: 0; font-size: 1.25rem; font-weight: 800; color: #fff;">Add Certificate or Degree</h3>
              <p style="margin: 3px 0 0; font-size: 0.82rem; color: #94A3B8;">Add verified credentials, diplomas, or professional accreditations</p>
            </div>
          </div>
        </div>

        <form id="form-add-certificate" onsubmit="submitAddCertificate(event)" style="padding: 20px 24px 24px;">
          <div style="margin-bottom: 16px;">
            <label style="display: block; font-size: 0.74rem; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">Quick Suggestions</label>
            <div style="display: flex; gap: 6px; flex-wrap: wrap;">
              <button type="button" class="cert-quick-chip" onclick="applyCertPreset('Google UX Design Professional Certificate', 'Google / Coursera')" style="font-size: 0.75rem; padding: 4px 10px; border-radius: 20px; border: 1px solid #CBD5E1; background: #F8FAFC; color: #334155; font-weight: 600; cursor: pointer; transition: all 0.2s;">🌐 Google UX</button>
              <button type="button" class="cert-quick-chip" onclick="applyCertPreset('Meta Front-End Developer Professional Certificate', 'Meta / Coursera')" style="font-size: 0.75rem; padding: 4px 10px; border-radius: 20px; border: 1px solid #CBD5E1; background: #F8FAFC; color: #334155; font-weight: 600; cursor: pointer; transition: all 0.2s;">💻 Meta Front-End</button>
              <button type="button" class="cert-quick-chip" onclick="applyCertPreset('AWS Certified Solutions Architect', 'Amazon Web Services (AWS)')" style="font-size: 0.75rem; padding: 4px 10px; border-radius: 20px; border: 1px solid #CBD5E1; background: #F8FAFC; color: #334155; font-weight: 600; cursor: pointer; transition: all 0.2s;">☁️ AWS Architect</button>
              <button type="button" class="cert-quick-chip" onclick="applyCertPreset('Bachelor of Science in Computer Science', 'University / Institution')" style="font-size: 0.75rem; padding: 4px 10px; border-radius: 20px; border: 1px solid #CBD5E1; background: #F8FAFC; color: #334155; font-weight: 600; cursor: pointer; transition: all 0.2s;">🎓 B.Sc Degree</button>
              <button type="button" class="cert-quick-chip" onclick="applyCertPreset('BMDC Registered Medical Practitioner', 'BMDC')" style="font-size: 0.75rem; padding: 4px 10px; border-radius: 20px; border: 1px solid #CBD5E1; background: #F8FAFC; color: #334155; font-weight: 600; cursor: pointer; transition: all 0.2s;">🏥 BMDC Doctor</button>
              <button type="button" class="cert-quick-chip" onclick="applyCertPreset('IEB Professional Engineer Member', 'IEB')" style="font-size: 0.75rem; padding: 4px 10px; border-radius: 20px; border: 1px solid #CBD5E1; background: #F8FAFC; color: #334155; font-weight: 600; cursor: pointer; transition: all 0.2s;">🏗️ IEB Engineer</button>
            </div>
          </div>

          <div style="margin-bottom: 14px;">
            <label for="cert-input-title" style="display: block; font-size: 0.82rem; font-weight: 700; color: #334155; margin-bottom: 5px;">Certificate / Degree Title <span style="color:#DC2626;">*</span></label>
            <input type="text" id="cert-input-title" required placeholder="e.g. Google UX Design Professional Certificate" style="width: 100%; padding: 10px 14px; border: 1.5px solid #CBD5E1; border-radius: 10px; font-size: 0.9rem; outline: none; transition: border-color 0.2s; box-sizing: border-box;" oninput="updateCertPreview()">
          </div>

          <div style="margin-bottom: 14px;">
            <label for="cert-input-issuer" style="display: block; font-size: 0.82rem; font-weight: 700; color: #334155; margin-bottom: 5px;">Issuing Organization or Authority <span style="color:#DC2626;">*</span></label>
            <input type="text" id="cert-input-issuer" required placeholder="e.g. Google, Coursera, Dhaka University, BMDC" style="width: 100%; padding: 10px 14px; border: 1.5px solid #CBD5E1; border-radius: 10px; font-size: 0.9rem; outline: none; transition: border-color 0.2s; box-sizing: border-box;" oninput="updateCertPreview()">
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px;">
            <div>
              <label for="cert-input-year" style="display: block; font-size: 0.82rem; font-weight: 700; color: #334155; margin-bottom: 5px;">Year Issued</label>
              <select id="cert-input-year" style="width: 100%; padding: 10px 12px; border: 1.5px solid #CBD5E1; border-radius: 10px; font-size: 0.88rem; outline: none; background: #fff; box-sizing: border-box;" onchange="updateCertPreview()">
                <option value="2026">2026</option>
                <option value="2025">2025</option>
                <option value="2024">2024</option>
                <option value="2023">2023</option>
                <option value="2022">2022</option>
                <option value="2021">2021</option>
                <option value="2020">2020</option>
                <option value="2019">2019</option>
                <option value="2018">2018</option>
                <option value="Earlier">Earlier</option>
              </select>
            </div>
            <div>
              <label for="cert-input-id" style="display: block; font-size: 0.82rem; font-weight: 700; color: #334155; margin-bottom: 5px;">Credential ID (Optional)</label>
              <input type="text" id="cert-input-id" placeholder="e.g. 9842A7C" style="width: 100%; padding: 10px 14px; border: 1.5px solid #CBD5E1; border-radius: 10px; font-size: 0.9rem; outline: none; box-sizing: border-box;" oninput="updateCertPreview()">
            </div>
          </div>

          <div style="margin-bottom: 14px;">
            <label for="cert-input-url" style="display: block; font-size: 0.82rem; font-weight: 700; color: #334155; margin-bottom: 5px;">Credential / Verification Link (Optional)</label>
            <input type="url" id="cert-input-url" placeholder="https://coursera.org/verify/... or verification link" style="width: 100%; padding: 10px 14px; border: 1.5px solid #CBD5E1; border-radius: 10px; font-size: 0.9rem; outline: none; box-sizing: border-box;">
          </div>

          <div style="margin-bottom: 18px;">
            <label style="display: block; font-size: 0.82rem; font-weight: 700; color: #334155; margin-bottom: 5px;">Certificate Photo or Document (Optional)</label>
            <div id="cert-drop-zone" onclick="document.getElementById('cert-input-file').click()" style="border: 2px dashed #CBD5E1; border-radius: 12px; padding: 14px; text-align: center; background: #F8FAFC; cursor: pointer; transition: all 0.2s;">
              <input type="file" id="cert-input-file" accept=".jpg,.jpeg,.png,.webp,.pdf" onchange="onCertFileSelected(this)" style="display: none;">
              <div id="cert-drop-prompt" style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
                <span style="font-size: 1.4rem;">📄</span>
                <span style="font-size: 0.82rem; font-weight: 700; color: #334155;">Click to upload certificate document</span>
                <small style="color: #64748B; font-size: 0.74rem;">JPG, PNG, WEBP, or PDF (Max 15MB)</small>
              </div>
              <div id="cert-drop-selected" style="display: none; align-items: center; justify-content: center; gap: 8px;">
                <span style="font-size: 1.2rem;">📎</span>
                <span id="cert-selected-filename" style="font-size: 0.82rem; font-weight: 700; color: #059669;">certificate.pdf</span>
                <button type="button" onclick="event.stopPropagation(); clearCertFileSelection();" style="background: #FEE2E2; color: #DC2626; border: none; border-radius: 50%; width: 22px; height: 22px; font-size: 0.75rem; font-weight: 800; cursor: pointer; display: flex; align-items: center; justify-content: center;">✕</button>
              </div>
            </div>
          </div>

          <div style="margin-bottom: 18px;">
            <label style="display: block; font-size: 0.74rem; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">Live Profile Preview</label>
            <div style="display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-radius: 12px; background: #FFFFFF; border: 1.5px solid #E2E8F0; box-shadow: 0 2px 8px rgba(0,0,0,0.04);">
              <span style="font-size: 1.5rem;">📜</span>
              <div style="flex: 1; min-width: 0;">
                <b id="cert-preview-title" style="font-size: 0.88rem; color: #0F172A; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">Google UX Design Professional Certificate</b>
                <small id="cert-preview-sub" style="color: var(--muted); font-size: 0.74rem; display: block; margin-top: 1px;">Accredited by Google / Coursera • 2026</small>
              </div>
              <span style="font-size: 0.74rem; font-weight: 800; padding: 3px 9px; border-radius: 12px; white-space: nowrap; background: #ECFDF5; color: #059669; border: 1px solid #A7F3D0;">
                ✔ Verified
              </span>
            </div>
          </div>

          <div style="display: flex; gap: 10px; justify-content: flex-end; border-top: 1px solid #F1F5F9; padding-top: 16px;">
            <button type="button" class="pv2-btn pv2-btn-outline" onclick="closeModal('modal-add-certificate')" style="font-size: 0.85rem; padding: 8px 16px;">Cancel</button>
            <button type="submit" id="cert-submit-btn" class="pv2-btn pv2-btn-primary" style="font-size: 0.85rem; padding: 8px 20px; font-weight: 700;">
              Add Certificate ✨
            </button>
          </div>
        </form>
      </div>
    </div>`;
    document.body.appendChild(wrap.firstElementChild);
  }

  window.openAddCertificateModal = function() {
    ensureAddCertificateModal();
    const modal = document.getElementById('modal-add-certificate');
    if (!modal) return;

    // Reset form fields
    const form = document.getElementById('form-add-certificate');
    if (form) form.reset();

    clearCertFileSelection();
    updateCertPreview();

    if (typeof openModal === 'function') openModal('modal-add-certificate');
    else modal.classList.add('open');

    setTimeout(() => {
      const input = document.getElementById('cert-input-title');
      if (input) input.focus();
    }, 100);
  };

  window.applyCertPreset = function(title, issuer) {
    const titleInput = document.getElementById('cert-input-title');
    const issuerInput = document.getElementById('cert-input-issuer');
    if (titleInput) titleInput.value = title;
    if (issuerInput) issuerInput.value = issuer;
    updateCertPreview();
  };

  window.updateCertPreview = function() {
    const title = document.getElementById('cert-input-title')?.value?.trim() || 'Google UX Design Professional Certificate';
    const issuer = document.getElementById('cert-input-issuer')?.value?.trim() || 'Google / Coursera';
    const year = document.getElementById('cert-input-year')?.value || '2026';
    const credId = document.getElementById('cert-input-id')?.value?.trim();

    const titleEl = document.getElementById('cert-preview-title');
    const subEl = document.getElementById('cert-preview-sub');

    if (titleEl) titleEl.textContent = title;
    if (subEl) {
      subEl.textContent = `Accredited by ${issuer} • ${year}${credId ? ' • ID: ' + credId : ''}`;
    }
  };

  window.onCertFileSelected = function(input) {
    if (input.files && input.files[0]) {
      certSelectedFile = input.files[0];
      const filenameEl = document.getElementById('cert-selected-filename');
      const promptEl = document.getElementById('cert-drop-prompt');
      const selectedEl = document.getElementById('cert-drop-selected');

      const sizeInMb = (certSelectedFile.size / (1024 * 1024)).toFixed(1);
      if (filenameEl) filenameEl.textContent = `${certSelectedFile.name} (${sizeInMb} MB)`;
      if (promptEl) promptEl.style.display = 'none';
      if (selectedEl) selectedEl.style.display = 'flex';
    }
  };

  window.clearCertFileSelection = function() {
    certSelectedFile = null;
    const fileInput = document.getElementById('cert-input-file');
    if (fileInput) fileInput.value = '';
    const promptEl = document.getElementById('cert-drop-prompt');
    const selectedEl = document.getElementById('cert-drop-selected');
    if (promptEl) promptEl.style.display = 'flex';
    if (selectedEl) selectedEl.style.display = 'none';
  };

  window.submitAddCertificate = async function(e) {
    if (e && e.preventDefault) e.preventDefault();

    const title = document.getElementById('cert-input-title')?.value?.trim();
    const issuer = document.getElementById('cert-input-issuer')?.value?.trim();
    const year = document.getElementById('cert-input-year')?.value || '2026';
    const credId = document.getElementById('cert-input-id')?.value?.trim();
    const credUrl = document.getElementById('cert-input-url')?.value?.trim();
    const submitBtn = document.getElementById('cert-submit-btn');

    if (!title) {
      if (typeof toast === 'function') toast('Please enter the certificate title', 'error');
      return;
    }
    if (!issuer) {
      if (typeof toast === 'function') toast('Please enter the issuing authority', 'error');
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Saving Certificate...';
    }

    try {
      let documentUrl = '';

      // Upload file if selected
      if (certSelectedFile) {
        const formData = new FormData();
        formData.append('file', certSelectedFile);
        const token = localStorage.getItem('token');
        const uploadRes = await fetch('/api/users/me/certificates/upload', {
          method: 'POST',
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
          body: formData
        });
        const uploadData = await uploadRes.json();
        if (uploadData && uploadData.url) {
          documentUrl = uploadData.url;
        }
      }

      // Submit certificate
      await api('/users/me/certificates', {
        method: 'POST',
        body: {
          title,
          name: title,
          issuer,
          year,
          credential_id: credId || undefined,
          credential_url: credUrl || undefined,
          document_url: documentUrl || undefined,
          description: `Accredited by ${issuer}`
        }
      });

      if (typeof toast === 'function') toast('🎉 Certificate added to your verified credentials!', 'success');
      closeModal('modal-add-certificate');

      // Reload profile
      if (typeof loadProfile === 'function') {
        loadProfile();
      }
    } catch (err) {
      if (typeof toast === 'function') toast(err.message || 'Failed to add certificate', 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Add Certificate ✨';
      }
    }
  };

  window.deleteCertificate = async function(certId) {
    if (!confirm('Are you sure you want to remove this certificate from your profile?')) return;
    try {
      await api(`/users/me/certificates/${encodeURIComponent(certId)}`, {
        method: 'DELETE'
      });
      if (typeof toast === 'function') toast('Certificate removed successfully.', 'info');
      if (typeof loadProfile === 'function') {
        loadProfile();
      }
    } catch (err) {
      if (typeof toast === 'function') toast(err.message || 'Failed to remove certificate', 'error');
    }
  };

  // Share Profile Modal
  window.openShareProfileModal = function() {
    const shareInput = document.getElementById('pv2-share-link');
    const shareName = document.getElementById('pv2-share-name');
    const u = profileData && profileData.user ? profileData.user : {};
    const handle = u.username || targetUserId || u.id;
    const fullUrl = `${window.location.origin}/${encodeURIComponent(handle)}`;

    if (shareInput) shareInput.value = fullUrl;
    if (shareName && u.name) {
      shareName.textContent = `Share ${u.name}'s Profile`;
    }
    if (typeof openModal === 'function') openModal('modal-share-profile');
  };

  window.copyProfileShareLink = function() {
    const input = document.getElementById('pv2-share-link');
    if (!input) return;
    input.select();
    input.setSelectionRange(0, 99999);
    navigator.clipboard.writeText(input.value).then(() => {
      if (typeof toast === 'function') toast('Profile link copied to clipboard! 📋', 'success');
      else alert('Profile link copied!');
    });
  };

  window.shareSocial = function(network) {
    const u = profileData && profileData.user ? profileData.user : {};
    const handle = u.username || targetUserId || u.id;
    const fullUrl = `${window.location.origin}/${encodeURIComponent(handle)}`;
    const url = encodeURIComponent(fullUrl);
    const text = encodeURIComponent(`Check out ${u.name || 'this'}'s verified profile and portfolio on XtraEarn!`);
    let shareUrl = '';

    if (network === 'wa') {
      shareUrl = `https://api.whatsapp.com/send?text=${text}%20${url}`;
    } else if (network === 'li') {
      shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${url}`;
    } else if (network === 'fb') {
      shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
    }

    if (shareUrl) {
      window.open(shareUrl, '_blank', 'width=600,height=500');
    }
  };

  // ==========================================
  // PROFILE PHOTO & BANNER CUSTOMIZERS
  // ==========================================
  let selectedAvatarColor = '#10B981';
  let tempAvatarUrl = '';

  window.openAvatarModal = function() {
    if (!profileData || !profileData.user) return;
    const u = profileData.user;
    selectedAvatarColor = u.avatar_color || '#10B981';
    tempAvatarUrl = u.avatar_url || '';

    const previewImg = document.getElementById('pv2-avatar-preview-img');
    const previewText = document.getElementById('pv2-avatar-preview-text');
    const previewWrap = document.getElementById('pv2-avatar-preview-wrap');
    const urlInput = document.getElementById('pv2-avatar-url-input');

    if (urlInput) urlInput.value = tempAvatarUrl;
    if (previewWrap) {
      previewWrap.style.background = selectedAvatarColor;
      previewWrap.style.borderColor = selectedAvatarColor;
    }
    if (previewText) {
      previewText.textContent = (u.name || 'User').split(' ').map(n => n.charAt(0)).join('').substring(0, 2).toUpperCase();
    }

    if (tempAvatarUrl && previewImg) {
      previewImg.src = tempAvatarUrl;
      previewImg.style.display = 'block';
      if (previewText) previewText.style.display = 'none';
    } else {
      if (previewImg) previewImg.style.display = 'none';
      if (previewText) previewText.style.display = 'block';
    }

    // Set active color swatch
    const circles = document.querySelectorAll('#pv2-avatar-color-swatches .pv2-color-circle');
    circles.forEach(c => {
      if (c.style.background.includes(selectedAvatarColor) || c.getAttribute('onclick')?.includes(selectedAvatarColor)) {
        c.classList.add('active');
      } else {
        c.classList.remove('active');
      }
    });

    if (typeof openModal === 'function') openModal('modal-change-avatar');
  };

  window.selectAvatarColor = function(colorHex) {
    selectedAvatarColor = colorHex;
    const previewWrap = document.getElementById('pv2-avatar-preview-wrap');
    const previewImg = document.getElementById('pv2-avatar-preview-img');
    const previewText = document.getElementById('pv2-avatar-preview-text');
    const urlInput = document.getElementById('pv2-avatar-url-input');

    if (previewWrap) {
      previewWrap.style.background = colorHex;
      previewWrap.style.borderColor = colorHex;
    }
    // Switching to color avatar clears URL
    tempAvatarUrl = '';
    if (urlInput) urlInput.value = '';
    if (previewImg) previewImg.style.display = 'none';
    if (previewText) previewText.style.display = 'block';

    const circles = document.querySelectorAll('#pv2-avatar-color-swatches .pv2-color-circle');
    circles.forEach(c => {
      if (c.style.background.includes(colorHex) || c.getAttribute('onclick')?.includes(colorHex)) {
        c.classList.add('active');
      } else {
        c.classList.remove('active');
      }
    });
  };

  // Avatar file upload listener
  const avatarFileInput = document.getElementById('pv2-avatar-file-input');
  if (avatarFileInput) {
    avatarFileInput.onchange = function(e) {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) {
        if (typeof toast === 'function') toast('Image file is too large (max 5MB).', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onload = function(evt) {
        tempAvatarUrl = evt.target.result;
        const previewImg = document.getElementById('pv2-avatar-preview-img');
        const previewText = document.getElementById('pv2-avatar-preview-text');
        const urlInput = document.getElementById('pv2-avatar-url-input');
        if (urlInput) urlInput.value = tempAvatarUrl.substring(0, 40) + '... (local file)';
        if (previewImg) {
          previewImg.src = tempAvatarUrl;
          previewImg.style.display = 'block';
        }
        if (previewText) previewText.style.display = 'none';
      };
      reader.readAsDataURL(file);
    };
  }

  // Live URL input listener for Avatar
  const avatarUrlInput = document.getElementById('pv2-avatar-url-input');
  if (avatarUrlInput) {
    avatarUrlInput.oninput = function(e) {
      const url = e.target.value.trim();
      tempAvatarUrl = url;
      const previewImg = document.getElementById('pv2-avatar-preview-img');
      const previewText = document.getElementById('pv2-avatar-preview-text');
      if (url && previewImg) {
        previewImg.src = url;
        previewImg.style.display = 'block';
        if (previewText) previewText.style.display = 'none';
      } else {
        if (previewImg) previewImg.style.display = 'none';
        if (previewText) previewText.style.display = 'block';
      }
    };
  }

  window.saveAvatarChange = async function() {
    try {
      const payload = {
        avatar_color: selectedAvatarColor,
        avatar_url: tempAvatarUrl || null
      };
      const res = await api('/users/me', {
        method: 'PATCH',
        body: payload
      });
      if (res.user) {
        localStorage.setItem('xe_user', JSON.stringify(res.user));
      }
      if (typeof closeModal === 'function') closeModal('modal-change-avatar');
      if (typeof toast === 'function') toast('Profile photo updated ✨', 'success');
      loadProfile();
    } catch (err) {
      if (typeof toast === 'function') toast(err.message, 'error');
      else alert(err.message);
    }
  };

  // Open Banner Modal
  let tempBannerValue = '';

  window.openBannerModal = function() {
    if (!profileData || !profileData.user) return;
    const u = profileData.user;
    tempBannerValue = u.cover_image || '';

    const preview = document.getElementById('pv2-banner-preview');
    const urlInput = document.getElementById('pv2-banner-url-input');

    if (urlInput) urlInput.value = tempBannerValue.startsWith('linear-gradient') ? '' : tempBannerValue;
    if (preview) {
      if (tempBannerValue.startsWith('linear-gradient')) {
        preview.style.background = tempBannerValue;
      } else if (tempBannerValue) {
        preview.style.backgroundImage = `url('${tempBannerValue}')`;
      } else {
        preview.style.background = 'linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #064E3B 100%)';
      }
    }

    if (typeof openModal === 'function') openModal('modal-change-banner');
  };

  window.selectBannerPreset = function(presetValue, isGrad) {
    tempBannerValue = presetValue;
    const preview = document.getElementById('pv2-banner-preview');
    const urlInput = document.getElementById('pv2-banner-url-input');
    if (preview) {
      if (isGrad) {
        preview.style.background = presetValue;
        if (urlInput) urlInput.value = '';
      } else {
        preview.style.backgroundImage = `url('${presetValue}')`;
        if (urlInput) urlInput.value = presetValue;
      }
    }
  };

  // Banner file upload listener
  const bannerFileInput = document.getElementById('pv2-banner-file-input');
  if (bannerFileInput) {
    bannerFileInput.onchange = function(e) {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) {
        if (typeof toast === 'function') toast('Banner file is too large (max 5MB).', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onload = function(evt) {
        tempBannerValue = evt.target.result;
        const preview = document.getElementById('pv2-banner-preview');
        const urlInput = document.getElementById('pv2-banner-url-input');
        if (urlInput) urlInput.value = tempBannerValue.substring(0, 40) + '... (local file)';
        if (preview) preview.style.backgroundImage = `url('${tempBannerValue}')`;
      };
      reader.readAsDataURL(file);
    };
  }

  // Live URL input listener for Banner
  const bannerUrlInput = document.getElementById('pv2-banner-url-input');
  if (bannerUrlInput) {
    bannerUrlInput.oninput = function(e) {
      const url = e.target.value.trim();
      tempBannerValue = url;
      const preview = document.getElementById('pv2-banner-preview');
      if (preview) {
        if (url) preview.style.backgroundImage = `url('${url}')`;
        else preview.style.background = 'linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #064E3B 100%)';
      }
    };
  }

  window.saveBannerChange = async function() {
    try {
      const payload = {
        cover_image: tempBannerValue || null
      };
      const res = await api('/users/me', {
        method: 'PATCH',
        body: payload
      });
      if (res.user) {
        localStorage.setItem('xe_user', JSON.stringify(res.user));
      }
      if (typeof closeModal === 'function') closeModal('modal-change-banner');
      if (typeof toast === 'function') toast('Cover banner updated ✨', 'success');
      loadProfile();
    } catch (err) {
      if (typeof toast === 'function') toast(err.message, 'error');
      else alert(err.message);
    }
  };

  // Direct Hire Button Handler
  window.hireFreelancer = function(name, category) {
    if (typeof openPostTaskModal === 'function') {
      openPostTaskModal();
      setTimeout(() => {
        const titleInput = document.getElementById('pt-title');
        if (titleInput && !titleInput.value) {
          titleInput.value = `Task for ${name}: Custom ${category || 'Project'}`;
        }
      }, 300);
    } else if (typeof window.openPostTaskModal === 'function') {
      window.openPostTaskModal();
    } else {
      location.href = `/tasks?hire=${targetUserId}`;
    }
  };

  // ==========================================
  // 1-ON-1 CONSULTATIONS & ESCROW MANAGEMENT
  // ==========================================
  window.currentConsultSubTab = 'client';

  window.switchConsultSubTab = function(subtab) {
    window.currentConsultSubTab = subtab;
    const btnClient = document.getElementById('consult-subtab-client');
    const btnConsultant = document.getElementById('consult-subtab-consultant');
    const viewClient = document.getElementById('consult-client-view');
    const viewConsultant = document.getElementById('consult-consultant-view');

    if (subtab === 'client') {
      if (btnClient) { btnClient.style.background = '#2563EB'; btnClient.style.color = '#fff'; }
      if (btnConsultant) { btnConsultant.style.background = '#F1F5F9'; btnConsultant.style.color = '#475569'; }
      if (viewClient) viewClient.style.display = 'block';
      if (viewConsultant) viewConsultant.style.display = 'none';
    } else {
      if (btnClient) { btnClient.style.background = '#F1F5F9'; btnClient.style.color = '#475569'; }
      if (btnConsultant) { btnConsultant.style.background = '#2563EB'; btnConsultant.style.color = '#fff'; }
      if (viewClient) viewClient.style.display = 'none';
      if (viewConsultant) viewConsultant.style.display = 'block';
    }
  };

  window.loadUserConsultations = async function() {
    const clientListEl = document.getElementById('consult-client-list');
    const specialistListEl = document.getElementById('consult-consultant-list');
    if (!clientListEl && !specialistListEl) return;

    try {
      const data = await api('/consult/my');
      const clientBookings = data.client_bookings || [];
      const consultantBookings = data.consultant_bookings || [];

      // Update counters
      const countTotal = document.getElementById('pv2-consult-count');
      const countClient = document.getElementById('consult-client-count');
      const countSpecialist = document.getElementById('consult-specialist-count');

      if (countTotal) countTotal.textContent = clientBookings.length + consultantBookings.length;
      if (countClient) countClient.textContent = clientBookings.length;
      if (countSpecialist) countSpecialist.textContent = consultantBookings.length;

      // Render Client Bookings
      if (clientListEl) {
        if (!clientBookings.length) {
          clientListEl.innerHTML = `
            <div style="text-align: center; padding: 48px 20px; background: #F8FAFC; border-radius: 12px; border: 1px dashed #CBD5E1;">
              <span style="font-size: 2.2rem; display: block; margin-bottom: 10px;">📅</span>
              <h4 style="margin: 0 0 6px; font-size: 1rem; color: #1E293B;">No Consultations Booked Yet</h4>
              <p style="color: #64748B; font-size: 0.84rem; max-width: 420px; margin: 0 auto 16px;">
                You haven't booked any 1-on-1 consultations with verified doctors, lawyers, or industry specialists yet.
              </p>
              <a href="/index.html#expert-marketplace" class="pv2-btn pv2-btn-primary" style="font-size: 0.82rem; padding: 8px 18px; text-decoration: none; display: inline-flex; align-items: center; gap: 6px;">
                <span>⚡</span> Browse Specialists &amp; Book
              </a>
            </div>
          `;
        } else {
          clientListEl.innerHTML = clientBookings.map(b => renderClientBookingCard(b)).join('');
        }
      }

      // Render Consultant Bookings
      if (specialistListEl) {
        if (!consultantBookings.length) {
          specialistListEl.innerHTML = `
            <div style="text-align: center; padding: 48px 20px; background: #F8FAFC; border-radius: 12px; border: 1px dashed #CBD5E1;">
              <span style="font-size: 2.2rem; display: block; margin-bottom: 10px;">💼</span>
              <h4 style="margin: 0 0 6px; font-size: 1rem; color: #1E293B;">No Client Bookings Received Yet</h4>
              <p style="color: #64748B; font-size: 0.84rem; max-width: 420px; margin: 0 auto 16px;">
                When clients book 1-on-1 advisory sessions with your verified specialist profile, appointments and escrow earnings appear right here.
              </p>
              <a href="/index.html#expert-marketplace" class="pv2-btn pv2-btn-outline" style="font-size: 0.82rem; padding: 8px 18px; text-decoration: none;">
                View Expert Marketplace Directory
              </a>
            </div>
          `;
        } else {
          specialistListEl.innerHTML = consultantBookings.map(b => renderConsultantBookingCard(b)).join('');
        }
      }
    } catch (err) {
      console.error('Error loading user consultations:', err);
    }
  };

  function renderClientBookingCard(b) {
    const isCompleted = b.status === 'completed';
    const isCancelled = b.status === 'cancelled';
    const isConfirmed = b.status === 'confirmed';
    const roomUrl = b.meeting_link || ('/consult?room=' + encodeURIComponent(b.booking_code));

    const statusBadge = isConfirmed
      ? `<span style="background: #ECFDF5; color: #059669; border: 1px solid #A7F3D0; font-size: 0.72rem; font-weight: 700; padding: 3px 9px; border-radius: 20px; display: inline-flex; align-items: center; gap: 4px;">🟢 Confirmed Appointment</span>`
      : isCompleted
      ? `<span style="background: #F1F5F9; color: #334155; border: 1px solid #CBD5E1; font-size: 0.72rem; font-weight: 700; padding: 3px 9px; border-radius: 20px; display: inline-flex; align-items: center; gap: 4px;">✔ Session Completed</span>`
      : isCancelled
      ? `<span style="background: #FEF2F2; color: #DC2626; border: 1px solid #FECACA; font-size: 0.72rem; font-weight: 700; padding: 3px 9px; border-radius: 20px; display: inline-flex; align-items: center; gap: 4px;">✕ Cancelled &amp; Refunded</span>`
      : `<span style="background: #EFF6FF; color: #2563EB; border: 1px solid #BFDBFE; font-size: 0.72rem; font-weight: 700; padding: 3px 9px; border-radius: 20px;">Live Session</span>`;

    const escrowBadge = b.escrow_status === 'released_to_expert' || b.escrow_status === 'released_to_specialist'
      ? `<span style="color: #059669; font-weight: 700; font-size: 0.78rem;">✅ ৳${Number(b.fee).toLocaleString()} Released</span>`
      : b.escrow_status === 'refunded_to_client'
      ? `<span style="color: #64748B; font-weight: 700; font-size: 0.78rem;">↩️ ৳${Number(b.fee).toLocaleString()} Refunded</span>`
      : `<span style="color: #D97706; font-weight: 700; font-size: 0.78rem; background: #FEF3C7; padding: 2px 8px; border-radius: 6px;">🛡️ ৳${Number(b.fee).toLocaleString()} Held in Escrow</span>`;

    return `
      <div style="background: #fff; border: 1px solid #E2E8F0; border-radius: 14px; padding: 18px; box-shadow: 0 2px 8px rgba(0,0,0,0.03); transition: all 0.2s;">
        <!-- Header row -->
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; border-bottom: 1px solid #F1F5F9; padding-bottom: 10px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-family: monospace; font-weight: 800; font-size: 0.88rem; color: #2563EB; background: #EFF6FF; padding: 2px 8px; border-radius: 6px;">
              #${escapeHtml(b.booking_code)}
            </span>
            ${statusBadge}
          </div>
          <div>${escrowBadge}</div>
        </div>

        <!-- Specialist details row -->
        <div style="display: flex; gap: 14px; align-items: flex-start; margin-bottom: 14px;">
          <div style="width: 48px; height: 48px; border-radius: 12px; overflow: hidden; background: #EEF2FF; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 1.1rem; color: #4F46E5;">
            ${b.specialist_avatar ? `<img src="${escapeHtml(b.specialist_avatar)}" style="width:100%;height:100%;object-fit:cover;">` : escapeHtml((b.specialist_name || 'E').substring(0, 1))}
          </div>
          <div style="flex: 1; min-width: 0;">
            <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
              <h4 style="margin: 0; font-size: 0.96rem; color: #0F172A; font-weight: 800;">${escapeHtml(b.specialist_name)}</h4>
              <span style="background: #F1F5F9; color: #475569; font-size: 0.7rem; font-weight: 700; padding: 2px 7px; border-radius: 99px;">
                ${escapeHtml(b.specialist_category || 'Specialist')}
              </span>
            </div>
            <p style="margin: 3px 0 0; font-size: 0.8rem; color: #64748B;">
              ${escapeHtml(b.specialist_title || 'Certified Consultant')}
            </p>
          </div>
        </div>

        <!-- Session details grid -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px; background: #F8FAFC; border-radius: 10px; padding: 12px 14px; margin-bottom: 14px; font-size: 0.82rem;">
          <div>
            <span style="color: #64748B; font-size: 0.74rem; display: block; text-transform: uppercase;">📅 Scheduled Slot</span>
            <b style="color: #1E293B;">${escapeHtml(b.slot || 'Pending Schedule')}</b>
          </div>
          <div>
            <span style="color: #64748B; font-size: 0.74rem; display: block; text-transform: uppercase;">🎥 Mode</span>
            <b style="color: #1E293B;">${escapeHtml((b.mode || 'video').toUpperCase())} Call</b>
          </div>
          <div>
            <span style="color: #64748B; font-size: 0.74rem; display: block; text-transform: uppercase;">💡 Focus Topic</span>
            <span style="color: #1E293B; font-weight: 600;">${escapeHtml(b.topic || 'General Consultation')}</span>
          </div>
          ${b.client_notes ? `
          <div style="grid-column: 1 / -1;">
            <span style="color: #64748B; font-size: 0.74rem; display: block; text-transform: uppercase;">📝 Your Notes</span>
            <span style="color: #334155; font-size: 0.8rem;">${escapeHtml(b.client_notes)}</span>
          </div>
          ` : ''}
        </div>

        <!-- Action buttons row -->
        <div style="display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; align-items: center; border-top: 1px solid #F1F5F9; padding-top: 12px;">
          ${!isCancelled ? `
            <a href="${escapeHtml(roomUrl)}" target="_blank" class="pv2-btn pv2-btn-primary" style="font-size: 0.8rem; padding: 7px 16px; text-decoration: none; display: inline-flex; align-items: center; gap: 6px;">
              <span>🎥</span> Join Consultation Call
            </a>
            <button type="button" class="pv2-btn pv2-btn-outline" style="font-size: 0.8rem; padding: 7px 12px;" onclick="copyConsultationLink('${escapeHtml(roomUrl)}')">
              📋 Copy Link
            </button>
          ` : ''}
          ${isConfirmed ? `
            <button type="button" class="pv2-btn pv2-btn-outline" style="color: #DC2626; border-color: #FECACA; font-size: 0.8rem; padding: 7px 12px;" onclick="cancelUserConsultation(${b.id})">
              ❌ Cancel &amp; Refund Escrow
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }

  function renderConsultantBookingCard(b) {
    const isCompleted = b.status === 'completed';
    const isCancelled = b.status === 'cancelled';
    const isConfirmed = b.status === 'confirmed';
    const roomUrl = b.meeting_link || ('/consult?room=' + encodeURIComponent(b.booking_code));

    const statusBadge = isConfirmed
      ? `<span style="background: #ECFDF5; color: #059669; border: 1px solid #A7F3D0; font-size: 0.72rem; font-weight: 700; padding: 3px 9px; border-radius: 20px;">🟢 Confirmed</span>`
      : isCompleted
      ? `<span style="background: #F1F5F9; color: #334155; border: 1px solid #CBD5E1; font-size: 0.72rem; font-weight: 700; padding: 3px 9px; border-radius: 20px;">✔ Completed</span>`
      : isCancelled
      ? `<span style="background: #FEF2F2; color: #DC2626; border: 1px solid #FECACA; font-size: 0.72rem; font-weight: 700; padding: 3px 9px; border-radius: 20px;">✕ Cancelled</span>`
      : `<span style="background: #EFF6FF; color: #2563EB; font-size: 0.72rem; font-weight: 700; padding: 3px 9px; border-radius: 20px;">In Session</span>`;

    return `
      <div style="background: #fff; border: 1px solid #E2E8F0; border-radius: 14px; padding: 18px; box-shadow: 0 2px 8px rgba(0,0,0,0.03);">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; border-bottom: 1px solid #F1F5F9; padding-bottom: 10px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-family: monospace; font-weight: 800; font-size: 0.88rem; color: #4F46E5; background: #EEF2FF; padding: 2px 8px; border-radius: 6px;">
              #${escapeHtml(b.booking_code)}
            </span>
            ${statusBadge}
          </div>
          <div style="font-weight: 800; color: #059669; font-size: 0.92rem;">
            ৳${Number(b.fee).toLocaleString()}
            <small style="color: #64748B; font-weight: 500; font-size: 0.72rem;">
              (${b.escrow_status === 'released_to_expert' || b.escrow_status === 'released_to_specialist' ? 'Credited to Wallet' : b.escrow_status === 'refunded_to_client' ? 'Refunded to Client' : 'Held in Escrow'})
            </small>
          </div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px; margin-bottom: 12px;">
          <div>
            <span style="color: #64748B; font-size: 0.74rem; text-transform: uppercase;">Client Information</span>
            <h4 style="margin: 2px 0 0; font-size: 0.95rem; color: #0F172A;">${escapeHtml(b.client_name)}</h4>
            <div style="font-size: 0.8rem; color: #64748B; margin-top: 2px;">
              ✉️ ${escapeHtml(b.client_email)} ${b.client_phone ? ' • 📞 ' + escapeHtml(b.client_phone) : ''}
            </div>
          </div>
          <div style="text-align: right;">
            <span style="color: #64748B; font-size: 0.74rem; text-transform: uppercase;">Appointment Slot</span>
            <div style="font-weight: 800; color: #1E293B; font-size: 0.88rem; margin-top: 2px;">📅 ${escapeHtml(b.slot)}</div>
            <div style="font-size: 0.78rem; color: #2563EB;">🎥 ${escapeHtml((b.mode || 'video').toUpperCase())} Call</div>
          </div>
        </div>

        <div style="background: #F8FAFC; border-radius: 10px; padding: 12px 14px; margin-bottom: 14px; font-size: 0.82rem;">
          <div><b>Topic:</b> ${escapeHtml(b.topic || 'Consultation advisory')}</div>
          ${b.client_notes ? `<div style="margin-top: 4px; color: #475569;"><b>Client Brief:</b> ${escapeHtml(b.client_notes)}</div>` : ''}
        </div>

        <div style="display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; align-items: center; border-top: 1px solid #F1F5F9; padding-top: 12px;">
          ${!isCancelled ? `
            <a href="${escapeHtml(roomUrl)}" target="_blank" class="pv2-btn pv2-btn-primary" style="font-size: 0.8rem; padding: 7px 16px; text-decoration: none; display: inline-flex; align-items: center; gap: 6px;">
              <span>🎥</span> Start Call Room
            </a>
            <button type="button" class="pv2-btn pv2-btn-outline" style="font-size: 0.8rem; padding: 7px 12px;" onclick="copyConsultationLink('${escapeHtml(roomUrl)}')">
              📋 Copy Link
            </button>
          ` : ''}
          ${isConfirmed ? `
            <button type="button" class="pv2-btn" style="background: #059669; color: #fff; font-size: 0.8rem; font-weight: 700; padding: 7px 14px; border: none; border-radius: 8px; cursor: pointer;" onclick="completeUserConsultation(${b.id})">
              ✅ Mark Completed &amp; Release ৳${Number(b.fee).toLocaleString()}
            </button>
            <button type="button" class="pv2-btn pv2-btn-outline" style="color: #DC2626; border-color: #FECACA; font-size: 0.8rem; padding: 7px 12px;" onclick="cancelUserConsultation(${b.id})">
              ❌ Decline &amp; Refund
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }

  window.completeUserConsultation = async function(bookingId) {
    if (!confirm('Mark this consultation session as completed? This will release the escrow payment directly to the consultant.')) return;
    try {
      await api(`/consult/booking/${encodeURIComponent(bookingId)}/complete`, { method: 'POST' });
      if (typeof toast === 'function') toast('🎉 Consultation marked completed! Escrow funds released.', 'success');
      loadUserConsultations();
    } catch (err) {
      if (typeof toast === 'function') toast(err.message || 'Failed to complete consultation', 'error');
    }
  };

  window.cancelUserConsultation = async function(bookingId) {
    const reason = prompt('Please enter a cancellation reason (optional):', 'Client requested reschedule / cancellation');
    if (reason === null) return;
    try {
      await api(`/consult/booking/${encodeURIComponent(bookingId)}/cancel`, {
        method: 'POST',
        body: { reason }
      });
      if (typeof toast === 'function') toast('Consultation session cancelled and escrow refunded.', 'info');
      loadUserConsultations();
    } catch (err) {
      if (typeof toast === 'function') toast(err.message || 'Failed to cancel consultation', 'error');
    }
  };

  window.copyConsultationLink = function(url) {
    const fullUrl = url.startsWith('http') ? url : (window.location.origin + url);
    navigator.clipboard.writeText(fullUrl).then(() => {
      if (typeof toast === 'function') toast('Consultation room link copied to clipboard! 📋', 'success');
    }).catch(() => {
      prompt('Copy your consultation room link:', fullUrl);
    });
  };

  // React to login/logout
  document.addEventListener('xe:auth', () => {
    if (!Auth.user && !paramsId) location.href = '/login';
  });

  // Initial Load
  loadProfile();
});
