/* XtraEarn — landing page logic */
document.addEventListener('DOMContentLoaded', () => {

  /* Dynamic CMS Settings & Section Visibility Hydration */
  api('/cms/bootstrap').then(bootstrap => {
    if (!bootstrap || !bootstrap.page) return;
    const p = bootstrap.page;
    const sections = Array.isArray(p.sections) ? p.sections : [];

    // Map section IDs to DOM elements
    const sectionMap = {
      'sec-hero': document.getElementById('sec-hero') || document.querySelector('.hero'),
      'sec-categories': document.getElementById('categories'),
      'sec-how-it-works': document.getElementById('how-it-works'),
      'sec-physical': document.getElementById('physical'),
      'sec-experts': document.getElementById('experts'),
      'sec-tasks': document.getElementById('featured'),
      'sec-spotlight': document.getElementById('pro-spotlight'),
      'sec-loyalty': document.getElementById('loyalty-referral') || document.querySelector('.referral-hub-card')?.closest('section'),
      'sec-trust': document.getElementById('trust-badges') || document.querySelector('.badges')?.closest('section'),
      'sec-earners': document.getElementById('earners'),
      'sec-testimonials': document.getElementById('testimonials'),
      'sec-cta': document.getElementById('cta')
    };

    sections.forEach(sec => {
      const el = sectionMap[sec.id] || (sec.type && (document.getElementById(sec.type.replace('_', '-')) || document.getElementById(sec.type)));
      if (el) {
        if (sec.visible === false) {
          el.style.setProperty('display', 'none', 'important');
        } else {
          el.style.removeProperty('display');
        }
      }

      // If category layout is set
      if (sec.id === 'sec-categories' || sec.type === 'category_grid') {
        const catTrack = document.getElementById('cat-grid');
        const catControls = document.querySelector('.cat-carousel-nav-btns');
        const catDots = document.getElementById('cat-carousel-dots');
        if (catTrack) {
          if (sec.layout === 'grid') {
            catTrack.classList.add('cat-layout-grid');
            catTrack.classList.remove('cat-layout-pills');
            if (catControls) catControls.style.display = 'none';
            if (catDots) catDots.style.display = 'none';
          } else if (sec.layout === 'pills') {
            catTrack.classList.add('cat-layout-pills');
            catTrack.classList.remove('cat-layout-grid');
            if (catControls) catControls.style.display = 'none';
            if (catDots) catDots.style.display = 'none';
          } else {
            catTrack.classList.remove('cat-layout-grid', 'cat-layout-pills');
            if (catControls) catControls.style.display = '';
            if (catDots) catDots.style.display = '';
          }
        }
      }
    });

    // Hydrate Hero and CTA titles
    const heroSec = sections.find(s => s.id === 'sec-hero' || s.type === 'hero');
    if (heroSec) {
      const heroH1 = document.querySelector('.hero-left h1');
      if (heroH1 && heroSec.title) heroH1.innerHTML = heroSec.title.replace(/real income/i, '<b>real income</b>').replace(/extra income/i, '<b>extra income</b>');
      const heroSub = document.querySelector('.hero-sub');
      if (heroSub && heroSec.subtitle) heroSub.textContent = heroSec.subtitle;
    }
  }).catch(() => {});

  api('/settings').then(({ settings }) => {
    if (!settings) return;
    const heroH1 = document.querySelector('.hero-left h1');
    if (heroH1 && settings.heroTitle) heroH1.innerHTML = settings.heroTitle.replace(/real income/i, '<b>real income</b>').replace(/extra income/i, '<b>extra income</b>');
    const heroSub = document.querySelector('.hero-sub');
    if (heroSub && settings.heroSubtitle) heroSub.textContent = settings.heroSubtitle;
    const annPill = document.querySelector('.hero-pill');
    if (annPill && settings.announcementPill) annPill.textContent = settings.announcementPill;
    const trustBadge = document.querySelector('.trust-bar .tb-text small');
    if (trustBadge && settings.statsTrustBadge) trustBadge.textContent = settings.statsTrustBadge;
    const ctaH2 = document.querySelector('.cta-text h2');
    if (ctaH2 && settings.ctaTitle) ctaH2.textContent = settings.ctaTitle;
    const ctaP = document.querySelector('.cta-text p');
    if (ctaP && settings.ctaSubtitle) ctaP.textContent = settings.ctaSubtitle;
  }).catch(() => {});

  /* hero action cards */
  document.querySelectorAll('.action-card').forEach(card => {
    card.addEventListener('click', () => {
      const act = card.dataset.act;
      if (act === 'post' || act === 'skill') {
        if (requireLogin('Login to post a task')) openPostTaskModal();
      } else {
        location.href = '/tasks';
      }
    });
  });
  document.querySelectorAll('.js-need-help').forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      if (requireLogin('Login to post a task')) openPostTaskModal();
    });
  });

  /* hero search */
  const catSel = document.getElementById('hs-category');
  api('/categories').then(({ items }) => {
    items.forEach(c => {
      const o = document.createElement('option');
      o.value = c.slug; o.textContent = c.name;
      catSel.appendChild(o);
    });
  }).catch(() => {});
  document.getElementById('hero-search').addEventListener('submit', e => {
    e.preventDefault();
    const p = new URLSearchParams();
    const q = document.getElementById('hs-q').value.trim();
    const cat = catSel.value;
    const time = document.getElementById('hs-time').value;
    if (q) p.set('q', q);
    if (cat) p.set('category', cat);
    if (time) p.set('maxDuration', time);
    location.href = '/tasks' + (p.toString() ? '?' + p.toString() : '');
  });

  /* ---------- Modern 6-Item Single-Row Category Carousel Controller ---------- */
  let allCategories = [];
  let currentCatFilter = 'all';
  let catSearchQuery = '';

  const catGrid = document.getElementById('cat-grid');
  const catSearchInput = document.getElementById('cat-search-home');
  const catSearchClear = document.getElementById('cat-search-clear');
  const catSegmentTabs = document.getElementById('cat-segment-tabs');
  const btnPrev = document.getElementById('cat-carousel-prev');
  const btnNext = document.getElementById('cat-carousel-next');
  const dotsContainer = document.getElementById('cat-carousel-dots');

  function renderCategoryShowcase() {
    if (!catGrid) return;

    let list = allCategories;

    // 1. Filter by segment tab
    if (currentCatFilter === 'online') {
      list = list.filter(c => c.type === 'online' || c.type === 'both' || !c.type);
    } else if (currentCatFilter === 'physical') {
      list = list.filter(c => c.type === 'physical' || c.type === 'both');
    } else if (currentCatFilter === 'trending') {
      list = list.filter(c => ['design-creative', 'writing-content', 'video-animation', 'ai-machine-learning', 'delivery-courier', 'home-repair', 'ecommerce'].includes(c.slug));
    } else if (currentCatFilter === 'expert') {
      list = list.filter(c => ['professional-expert', 'legal-services', 'engineering-architecture', 'education-tutoring', 'finance-accounting'].includes(c.slug));
    }

    // 2. Filter by search query
    if (catSearchQuery) {
      const q = catSearchQuery.toLowerCase();
      list = list.filter(c =>
        c.name.toLowerCase().includes(q) ||
        (c.subcategories || []).some(s => s.toLowerCase().includes(q))
      );
    }

    if (list.length === 0) {
      catGrid.innerHTML = `
        <div class="empty-state" style="width:100%;padding:36px 20px;text-align:center;background:#fff;border-radius:18px;border:1px dashed #CBD5E1">
          <span style="font-size:2rem;display:block;margin-bottom:8px">🔍</span>
          <b style="font-size:1.05rem;color:#0F172A;display:block;margin-bottom:4px">No categories matching "${escapeHtml(catSearchQuery)}"</b>
          <p style="color:#64748B;font-size:0.85rem;margin:0">Try searching for a different keyword, or reset the filter.</p>
        </div>`;
      if (dotsContainer) dotsContainer.innerHTML = '';
      updateCarouselButtons();
      return;
    }

    // Render single row cards
    catGrid.innerHTML = list.map(c => {
      const color = c.color || '#10B981';
      const badgeClass = c.type === 'physical' ? 'physical' : (c.type === 'both' ? 'both' : 'online');
      const badgeLabel = c.type === 'physical' ? '📍 On-site' : (c.type === 'both' ? '🔄 Hybrid' : '💻 Online');
      const subList = c.subcategories || [];
      const subSnippet = subList.length > 0
        ? subList.slice(0, 2).join(', ') + (subList.length > 2 ? '...' : '')
        : 'Services';

      return `
        <a class="cat-card-lux" href="/tasks?category=${c.slug}" style="--card-color:${color};--card-color-glow:${color}33" title="${escapeHtml(c.name)} (${subList.length} services)">
          <div class="cat-lux-top">
            <span class="cat-lux-icon" style="--icon-bg:${color}18">${c.icon}</span>
            <span class="cat-lux-badge ${badgeClass}">${badgeLabel}</span>
          </div>
          <div class="cat-lux-body">
            <b>${escapeHtml(c.name)}</b>
            <p>${escapeHtml(subSnippet)}</p>
          </div>
          <div class="cat-lux-foot">
            <span class="cat-task-pill" style="color:${color}">
              <b>${subList.length}</b> services
            </span>
            <span class="cat-arrow">→</span>
          </div>
        </a>
      `;
    }).join('');

    catGrid.scrollLeft = 0;
    renderCarouselDots(list.length);
    updateCarouselButtons();
  }

  function getCardsPerPage() {
    const w = window.innerWidth;
    if (w <= 480) return 1;
    if (w <= 768) return 2;
    if (w <= 1100) return 4;
    if (w <= 1400) return 5;
    return 6; // Exactly 6 per row on desktop
  }

  function renderCarouselDots(totalItems) {
    if (!dotsContainer) return;
    const perPage = getCardsPerPage();
    const totalPages = Math.ceil(totalItems / perPage);
    if (totalPages <= 1) {
      dotsContainer.innerHTML = '';
      return;
    }

    dotsContainer.innerHTML = Array.from({ length: totalPages }).map((_, i) => `
      <button class="cat-carousel-dot ${i === 0 ? 'active' : ''}" data-page="${i}" aria-label="Go to page ${i + 1}"></button>
    `).join('');

    dotsContainer.querySelectorAll('.cat-carousel-dot').forEach(dot => {
      dot.addEventListener('click', () => {
        const page = Number(dot.dataset.page);
        const card = catGrid.querySelector('.cat-card-lux');
        if (card) {
          const cardWidth = card.offsetWidth + 14;
          catGrid.scrollTo({ left: page * cardWidth * perPage, behavior: 'smooth' });
        }
      });
    });
  }

  function updateCarouselButtons() {
    if (!catGrid) return;
    const maxScroll = catGrid.scrollWidth - catGrid.clientWidth;
    if (btnPrev) btnPrev.disabled = catGrid.scrollLeft <= 5;
    if (btnNext) btnNext.disabled = catGrid.scrollLeft >= maxScroll - 5;

    // Update active dot
    if (dotsContainer) {
      const card = catGrid.querySelector('.cat-card-lux');
      if (card) {
        const perPage = getCardsPerPage();
        const cardWidth = card.offsetWidth + 14;
        const page = Math.round(catGrid.scrollLeft / (cardWidth * perPage));
        const dots = dotsContainer.querySelectorAll('.cat-carousel-dot');
        dots.forEach((d, i) => d.classList.toggle('active', i === page));
      }
    }
  }

  /* Carousel Navigation Click Listeners */
  if (btnPrev) {
    btnPrev.addEventListener('click', () => {
      if (!catGrid) return;
      const card = catGrid.querySelector('.cat-card-lux');
      const step = card ? (card.offsetWidth + 14) * getCardsPerPage() : 300;
      catGrid.scrollBy({ left: -step, behavior: 'smooth' });
    });
  }

  if (btnNext) {
    btnNext.addEventListener('click', () => {
      if (!catGrid) return;
      const card = catGrid.querySelector('.cat-card-lux');
      const step = card ? (card.offsetWidth + 14) * getCardsPerPage() : 300;
      catGrid.scrollBy({ left: step, behavior: 'smooth' });
    });
  }

  if (catGrid) {
    catGrid.addEventListener('scroll', () => {
      updateCarouselButtons();
    }, { passive: true });
  }

  /* Load categories and initialize showcase */
  api('/categories').then(({ items }) => {
    allCategories = items || [];
    renderCategoryShowcase();
  }).catch(() => toast('Could not load categories', 'error'));

  /* Segment Tabs Interaction */
  if (catSegmentTabs) {
    catSegmentTabs.querySelectorAll('.cat-seg-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        catSegmentTabs.querySelectorAll('.cat-seg-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentCatFilter = btn.dataset.catFilter || 'all';
        renderCategoryShowcase();
      });
    });
  }

  /* Search Input Interaction */
  if (catSearchInput) {
    catSearchInput.addEventListener('input', () => {
      catSearchQuery = catSearchInput.value.trim();
      if (catSearchClear) catSearchClear.style.display = catSearchQuery ? 'block' : 'none';
      renderCategoryShowcase();
    });
  }

  if (catSearchClear) {
    catSearchClear.addEventListener('click', () => {
      catSearchInput.value = '';
      catSearchQuery = '';
      catSearchClear.style.display = 'none';
      renderCategoryShowcase();
    });
  }

  window.addEventListener('resize', () => {
    if (allCategories.length) {
      renderCarouselDots(allCategories.length);
      updateCarouselButtons();
    }
  });

  /* featured tasks */
  api('/tasks?featured=1&limit=5').then(({ items }) => {
    document.getElementById('feat-grid').innerHTML = items.map(taskCardHtml).join('');
  }).catch(() => toast('Could not load featured tasks', 'error'));

  /* physical / on-site tasks near you */
  api('/tasks?type=physical&limit=5').then(({ items }) => {
    const grid = document.getElementById('physical-grid');
    if (!items.length) { grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><span class="big">🤝</span>No on-site tasks right now — post the first one!</div>'; return; }
    grid.innerHTML = items.map(taskCardHtml).join('');
  }).catch(() => {});
  document.querySelectorAll('.js-post-physical').forEach(b =>
    b.addEventListener('click', async () => {
      if (!requireLogin('Login to post a task')) return;
      await openPostTaskModal();
      switchPtType('physical');
      document.getElementById('pt-type').value = 'physical';
    }));

  /* =========================================================
     VERIFIED 1-ON-1 EXPERT MARKETPLACE & CONSULTATIONS SUITE
     ========================================================= */
  let homeActiveExpertDomain = 'all';
  let homeExpertsListCache = [];
  let homeExpertSearchTimer = null;
  let homeActiveBookingExpert = null;

  async function loadHomeExpertDomains() {
    try {
      const res = await api('/experts/domains');
      const domains = res.items || [];
      const pillsContainer = document.getElementById('home-exp-domain-pills');
      const showcaseContainer = document.getElementById('home-exp-domains-showcase');

      if (!domains.length) return;

      const totalAll = domains.reduce((acc, d) => acc + (d.count || 0), 0);
      const allCountEl = document.getElementById('hep-cnt-all');
      if (allCountEl) allCountEl.textContent = totalAll;

      // Render Dynamic Domain Pills
      if (pillsContainer) {
        let pillsHtml = `
          <button class="home-exp-pill ${homeActiveExpertDomain === 'all' ? 'active' : ''}" data-exp-domain="all">
            <span>🌟 All Disciplines</span> <span class="pill-cnt">${totalAll}</span>
          </button>
        `;
        domains.forEach(d => {
          pillsHtml += `
            <button class="home-exp-pill ${homeActiveExpertDomain === d.name ? 'active' : ''}" data-exp-domain="${escapeHtml(d.name)}">
              <span>${d.icon || '🧠'} ${escapeHtml(d.name)}</span> <span class="pill-cnt">${d.count || 0}</span>
            </button>
          `;
        });
        pillsContainer.innerHTML = pillsHtml;

        // Wire pill click listeners
        pillsContainer.querySelectorAll('.home-exp-pill').forEach(btn => {
          btn.addEventListener('click', () => {
            pillsContainer.querySelectorAll('.home-exp-pill').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            homeActiveExpertDomain = btn.getAttribute('data-exp-domain') || 'all';

            // Also sync highlight cards
            if (showcaseContainer) {
              showcaseContainer.querySelectorAll('.home-domain-card').forEach(c => {
                c.classList.toggle('active', c.getAttribute('data-domain-target') === homeActiveExpertDomain);
              });
            }
            loadHomeExperts();
          });
        });
      }

      // Render Showcase Cards
      if (showcaseContainer && domains.length >= 4) {
        showcaseContainer.innerHTML = domains.slice(0, 4).map(d => `
          <div class="home-domain-card ${homeActiveExpertDomain === d.name ? 'active' : ''}" data-domain-target="${escapeHtml(d.name)}">
            <div class="home-domain-top">
              <span class="home-domain-icon" style="background:${d.color || '#8B5CF6'}">${d.icon || '🧠'}</span>
              <span class="home-domain-cnt">${d.count} Specialists</span>
            </div>
            <h4>${escapeHtml(d.name)}</h4>
            <p>${escapeHtml(d.description || 'Verified 1-on-1 consultations and document advisory.')}</p>
          </div>
        `).join('');

        showcaseContainer.querySelectorAll('.home-domain-card').forEach(c => {
          c.addEventListener('click', () => {
            const target = c.getAttribute('data-domain-target');
            homeActiveExpertDomain = (homeActiveExpertDomain === target) ? 'all' : target;
            showcaseContainer.querySelectorAll('.home-domain-card').forEach(x => {
              x.classList.toggle('active', x.getAttribute('data-domain-target') === homeActiveExpertDomain);
            });
            if (pillsContainer) {
              pillsContainer.querySelectorAll('.home-exp-pill').forEach(p => {
                p.classList.toggle('active', p.getAttribute('data-exp-domain') === homeActiveExpertDomain);
              });
            }
            loadHomeExperts();
          });
        });
      }
    } catch (err) {
      console.warn('Could not load expert domains:', err);
    }
  }

  async function loadHomeExperts() {
    const grid = document.getElementById('expert-grid');
    if (!grid) return;

    try {
      const q = document.getElementById('home-exp-search')?.value || '';
      let url = `/experts?limit=6&sortBy=rating_high`;
      if (homeActiveExpertDomain && homeActiveExpertDomain !== 'all') {
        url += `&domain=${encodeURIComponent(homeActiveExpertDomain)}`;
      }
      if (q && q.trim()) {
        url += `&q=${encodeURIComponent(q.trim())}`;
      }

      const { items } = await api(url);
      homeExpertsListCache = items || [];

      if (!items || !items.length) {
        grid.innerHTML = `
          <div style="grid-column:1/-1;text-align:center;padding:44px 20px;background:rgba(15,23,42,0.6);border:1px dashed rgba(255,255,255,0.12);border-radius:18px">
            <div style="font-size:2.4rem;margin-bottom:8px">🧠</div>
            <h4 style="color:#fff;margin:0 0 6px">No specialists found</h4>
            <p style="color:#94A3B8;font-size:0.84rem;margin:0">Try selecting "All Disciplines" or clearing your search term.</p>
          </div>
        `;
        return;
      }

      grid.innerHTML = items.map(u => {
        const d = (u.domain || '').toLowerCase();
        const icon = d.includes('legal') ? '⚖️'
          : d.includes('medical') ? '🏥'
          : d.includes('engineering') ? '🏗️'
          : d.includes('finance') ? '💼'
          : d.includes('tech') ? '💻'
          : d.includes('education') ? '🧑‍🏫' : '📣';

        const p15 = u.packages?.quick_advice?.price || Math.round((u.hourly_rate || 2000) * 0.4);

        return `
          <div class="home-expert-card">
            <div>
              <div class="home-exp-card-header">
                <div class="home-exp-avatar-wrap">
                  <div class="home-exp-avatar" style="background:${u.avatar_color || '#4F46E5'}">
                    ${icon}
                  </div>
                  <span class="home-exp-status-dot" title="${u.availability_status === 'online' ? 'Online Now' : 'Available'}"></span>
                </div>
                <div style="flex:1;min-width:0">
                  <h4 class="home-exp-name">${escapeHtml(u.name)}</h4>
                  <div class="home-exp-badge-tag">${escapeHtml(u.verified_badge || 'Verified Specialist')}</div>
                </div>
              </div>

              <div class="home-exp-title">${escapeHtml(u.profession || u.title || 'Consultant Specialist')} · 📍 ${escapeHtml(u.district || 'Dhaka')}</div>
              <div class="home-exp-edu">${escapeHtml(u.education || 'Graduate Degree')}</div>

              <div class="home-exp-stats">
                <span>⭐ <b style="color:#FBBF24">${u.rating || 5.0}</b> (${u.reviews_count || 0})</span>
                <span>🗓️ <b>${u.total_sessions_completed || 0}</b> sessions</span>
                <span>⚡ <b>${u.response_time_mins || 10}m</b> SLA</span>
              </div>
            </div>

            <div>
              <div class="home-exp-price-box">
                <div>
                  <div class="price-label">15-Min Quick Chat from</div>
                  <div class="price-val">৳${p15.toLocaleString()}</div>
                </div>
                <div style="text-align:right">
                  <div class="price-label">Hourly Base Fee</div>
                  <div style="font-size:0.9rem;font-weight:700;color:#CBD5E1">৳${(u.hourly_rate || 2000).toLocaleString()}</div>
                </div>
              </div>

              <div class="home-exp-actions">
                <button class="btn-exp-dossier" onclick="openPublicExpertDossier(${u.id})">👁️ 360° Profile</button>
                <button class="btn-exp-book" onclick="openPublicBookConsult(${u.id})">📅 Book Consult</button>
              </div>
            </div>
          </div>
        `;
      }).join('');
    } catch (err) {
      console.warn('Could not load homepage experts:', err);
    }
  }

  // Search input debounce on Homepage
  const homeExpSearchInput = document.getElementById('home-exp-search');
  if (homeExpSearchInput) {
    homeExpSearchInput.addEventListener('input', () => {
      clearTimeout(homeExpertSearchTimer);
      homeExpertSearchTimer = setTimeout(() => loadHomeExperts(), 250);
    });
  }

  // Initial load
  loadHomeExpertDomains();
  loadHomeExperts();

  window.openPublicExpertDossier = async function(id) {
    try {
      let expert = homeExpertsListCache.find(e => e.id === Number(id));
      if (!expert) expert = await api(`/experts/${id}`);
      if (!expert) return toast('Specialist record not found', 'error');

      homeActiveBookingExpert = expert;

      const avatar = document.getElementById('pub-exp-avatar');
      if (avatar) {
        avatar.style.background = expert.avatar_color || '#4F46E5';
        const d = (expert.domain || '').toLowerCase();
        avatar.textContent = d.includes('legal') ? '⚖️' : d.includes('medical') ? '🏥' : d.includes('engineering') ? '🏗️' : d.includes('finance') ? '💼' : d.includes('tech') ? '💻' : d.includes('education') ? '🧑‍🏫' : '📣';
      }

      setElText('pub-exp-name', expert.name);
      setElText('pub-exp-badge', expert.verified_badge || 'Verified Specialist');
      setElText('pub-exp-district', `${expert.domain} · 📍 ${expert.district || 'Dhaka, BD'}`);
      setElText('pub-exp-title', expert.profession || expert.title);
      setElText('pub-exp-bio', expert.bio || 'Experienced verified professional available for 1-on-1 consultations and document review on XtraEarn.');
      setElText('pub-exp-rating', `⭐ ${expert.rating || 5.0} (${expert.reviews_count || 0} reviews)`);
      setElText('pub-exp-sessions', `${expert.total_sessions_completed || 0} Consultations`);
      setElText('pub-exp-response', `⚡ ${expert.response_time_mins || 10} mins`);
      setElText('pub-exp-exp', `${expert.experience_years || 5}+ Years`);
      setElText('pub-exp-license', expert.license_number ? `Official Accreditation: ${expert.license_number}` : 'Official Regulatory Registration Verified');
      setElText('pub-exp-edu', expert.education ? `🎓 Academic Background: ${expert.education}` : '🎓 Higher Graduate Degrees');

      const pkgList = document.getElementById('pub-exp-packages-list');
      if (pkgList) {
        const p = expert.packages || {};
        const hourly = expert.hourly_rate || 2000;
        const tiers = [
          { key: 'quick_advice', name: p.quick_advice?.name || '15-Min Quick Advice', price: p.quick_advice?.price || Math.round(hourly * 0.4), dur: '15 mins', desc: p.quick_advice?.description || 'Fast Q&A & immediate clinical/legal guidance.' },
          { key: 'standard_consult', name: p.standard_consult?.name || '30-Min Strategy Call', price: p.standard_consult?.price || Math.round(hourly * 0.65), dur: '30 mins', desc: p.standard_consult?.description || 'Live video consultation & diagnostic advice.' },
          { key: 'deep_dive', name: p.deep_dive?.name || '60-Min Deep Dive Session', price: hourly, dur: '60 mins', desc: p.deep_dive?.description || 'Full roadmap, case analysis & strategic plan.' },
          { key: 'written_opinion', name: p.written_opinion?.name || 'Formal Written Opinion', price: p.written_opinion?.price || Math.round(hourly * 1.8), dur: '24h SLA', desc: p.written_opinion?.description || 'Signed formal written report with seal.' }
        ];

        pkgList.innerHTML = tiers.map(t => `
          <div style="background:#1E293B;border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:12px">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px">
              <b style="color:#fff;font-size:0.86rem">${escapeHtml(t.name)}</b>
              <span style="color:#FBBF24;font-weight:800;font-size:0.95rem">৳${t.price.toLocaleString()}</span>
            </div>
            <div style="color:#10B981;font-size:0.74rem;font-weight:700;margin-bottom:4px">⏱ Duration: ${t.dur}</div>
            <p style="color:#94A3B8;font-size:0.76rem;margin:0">${escapeHtml(t.desc)}</p>
          </div>
        `).join('');
      }

      const bookBtn = document.getElementById('btn-pub-book-from-dossier');
      if (bookBtn) {
        bookBtn.onclick = () => {
          closeModal('modal-public-expert-dossier');
          openPublicBookConsult(expert.id);
        };
      }

      openModal('modal-public-expert-dossier');
    } catch (err) {
      toast('Error opening specialist profile: ' + err.message, 'error');
    }
  };

  window.openPublicBookConsult = async function(id) {
    try {
      let expert = homeExpertsListCache.find(e => e.id === Number(id));
      if (!expert) expert = await api(`/experts/${id}`);
      if (!expert) return toast('Specialist record not found', 'error');

      homeActiveBookingExpert = expert;

      document.getElementById('book-expert-id').value = expert.id;
      setElText('book-consult-sub', `Consult with ${expert.name} (${expert.profession || expert.domain}) · 100% Escrow Protected`);

      // Auto set tomorrow's date
      const tom = new Date(Date.now() + 86400000);
      const dateInp = document.getElementById('book-date');
      if (dateInp) {
        dateInp.value = tom.toISOString().split('T')[0];
        dateInp.min = new Date().toISOString().split('T')[0];
      }

      // Pre-fill user details if logged in
      if (Auth && Auth.user) {
        const nameInp = document.getElementById('book-client-name');
        const emailInp = document.getElementById('book-client-email');
        const phoneInp = document.getElementById('book-client-phone');
        if (nameInp && !nameInp.value) nameInp.value = Auth.user.name || '';
        if (emailInp && !emailInp.value) emailInp.value = Auth.user.email || '';
        if (phoneInp && !phoneInp.value) phoneInp.value = Auth.user.phone || '';
      }

      const p = expert.packages || {};
      const hourly = expert.hourly_rate || 2000;
      const tiers = [
        { key: 'quick_advice', name: '15-Min Quick Consultation', price: p.quick_advice?.price || Math.round(hourly * 0.4), dur: '15 mins' },
        { key: 'standard_consult', name: '30-Min Strategy Consultation', price: p.standard_consult?.price || Math.round(hourly * 0.65), dur: '30 mins' },
        { key: 'deep_dive', name: '60-Min Deep Dive Advisory', price: hourly, dur: '60 mins' },
        { key: 'written_opinion', name: 'Formal Written Opinion', price: p.written_opinion?.price || Math.round(hourly * 1.8), dur: '24h SLA' }
      ];

      const selector = document.getElementById('book-tier-selector');
      if (selector) {
        selector.innerHTML = tiers.map((t, idx) => `
          <div class="book-tier-card ${idx === 0 ? 'selected' : ''}" data-tier-key="${t.key}" data-tier-price="${t.price}" onclick="selectBookTier('${t.key}', ${t.price})">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2px">
              <b style="color:#fff;font-size:0.84rem">${escapeHtml(t.name)}</b>
              <span style="color:#FBBF24;font-weight:800;font-size:0.92rem">৳${t.price.toLocaleString()}</span>
            </div>
            <small style="color:#10B981;font-weight:700">⏱ ${t.dur}</small>
          </div>
        `).join('');
      }

      selectBookTier(tiers[0].key, tiers[0].price);
      openModal('modal-public-book-consult');
    } catch (err) {
      toast('Error opening booking dialog: ' + err.message, 'error');
    }
  };

  window.selectBookTier = function(tierKey, price) {
    document.getElementById('book-selected-tier').value = tierKey;
    const cards = document.querySelectorAll('#book-tier-selector .book-tier-card');
    cards.forEach(c => {
      c.classList.toggle('selected', c.getAttribute('data-tier-key') === tierKey);
    });
    setElText('book-fee-display', `৳${Number(price || 1200).toLocaleString()}`);
  };

  window.handlePublicConsultBookingSubmit = async function(e) {
    e.preventDefault();
    const expertId = document.getElementById('book-expert-id')?.value;
    const tier = document.getElementById('book-selected-tier')?.value;
    const date = document.getElementById('book-date')?.value;
    const time = document.getElementById('book-time')?.value;
    const mode = document.getElementById('book-mode')?.value;
    const name = document.getElementById('book-client-name')?.value.trim();
    const email = document.getElementById('book-client-email')?.value.trim();
    const phone = document.getElementById('book-client-phone')?.value.trim();
    const notes = document.getElementById('book-notes')?.value.trim();

    try {
      const res = await api(`/experts/${expertId}/book`, {
        method: 'POST',
        body: {
          tier,
          date,
          time,
          mode,
          client_name: name,
          client_email: email,
          client_phone: phone,
          notes
        }
      });

      closeModal('modal-public-book-consult');

      // Populate & display confirmed dossier modal
      const codeEl = document.getElementById('conf-booking-code');
      const expEl = document.getElementById('conf-expert-name');
      const slotEl = document.getElementById('conf-scheduled-slot');
      const feeEl = document.getElementById('conf-fee');
      const roomBtn = document.getElementById('conf-btn-room');

      if (codeEl) codeEl.textContent = res.booking.booking_code;
      if (expEl) expEl.textContent = res.booking.expert_name;
      if (slotEl) slotEl.textContent = `${res.booking.scheduled_date} · ${res.booking.scheduled_time}`;
      if (feeEl) feeEl.textContent = `৳${Number(res.booking.fee).toLocaleString()} (Held in Escrow)`;
      if (roomBtn) roomBtn.href = res.booking.meeting_link;

      openModal('modal-consult-confirmed');
      toast(`🎉 Consultation Booked (${res.booking.booking_code})! Room ready.`, 'success');
      loadHomeExperts();
    } catch (err) {
      toast('Booking failed: ' + err.message, 'error');
    }
  };

  /* top earners */
  api('/earners?limit=5').then(({ items }) => {
    const roles = ['Graphic Designer', 'Translator', 'Data Entry Expert', 'Content Writer', 'Video Editor'];
    const medals = ['🥇', '🥈', '🥉', '🎖️', '🎖️'];
    document.getElementById('earner-grid').innerHTML = items.map((u, i) => `
      <div class="earner-card">
        <div class="earner-head">
          ${avatarHtml(u.name, u.avatar_color, 46)}
          <div>
            <div class="earner-name">${escapeHtml(u.name)} ${u.is_verified ? '<span title="Verified">✅</span>' : ''}</div>
            <div class="earner-role">${roles[i] || 'Freelancer'}</div>
          </div>
        </div>
        <div class="earner-amount">${money(u.month_earned)} <span class="medal">${medals[i] || '🎖️'}</span></div>
        <div class="earner-foot">
          ${starsHtml(u.rating, undefined, true)}
          <span>📍 ${escapeHtml(u.location || 'Bangladesh')}</span>
        </div>
      </div>`).join('');
  }).catch(() => toast('Could not load top earners', 'error'));

  /* testimonials */
  api('/testimonials').then(({ items }) => {
    document.getElementById('testi-grid').innerHTML = items.map(t => `
      <div class="testi-card">
        <div class="testi-user">
          ${avatarHtml(t.user.name, t.user.avatar_color, 40)}
          <div><b>${escapeHtml(t.user.name)}</b><small>${escapeHtml(t.user.role)}</small></div>
        </div>
        <div class="testi-stars">${'★'.repeat(t.rating)}</div>
        <blockquote>"${escapeHtml(t.quote)}"</blockquote>
      </div>`).join('');
    const dots = document.getElementById('testi-dots');
    dots.innerHTML = items.map((_, i) => `<span class="dot ${i === 0 ? 'active' : ''}" data-i="${i}"></span>`).join('');
    dots.querySelectorAll('.dot').forEach(d => d.addEventListener('click', () => {
      dots.querySelectorAll('.dot').forEach(x => x.classList.remove('active'));
      d.classList.add('active');
      const card = document.querySelectorAll('#testi-grid .testi-card')[Number(d.dataset.i)];
      if (card) card.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }));
  }).catch(() => toast('Could not load testimonials', 'error'));

  /* CTA */
  document.getElementById('cta-start').addEventListener('click', () => {
    if (Auth.user) { location.href = '/tasks'; }
    else openAuthModal('register');
  });

  /* ============================================================
     GROWTH ENGINES: CAMPAIGNS, SPOTLIGHT, REFERRALS & STREAKS
     ============================================================ */
  let activeCampaignData = null;
  let homeActiveSpotlightCat = 'all';

  // 1. Dynamic Top Campaign Announcement Bar Hydration
  api('/campaigns/active').then(({ items }) => {
    if (!items || !items.length) return;
    activeCampaignData = items[0];
    const topBar = document.getElementById('top-campaign-bar');
    const badgeEl = document.getElementById('top-camp-badge');
    const textEl = document.getElementById('top-camp-text');
    if (topBar && badgeEl && textEl) {
      badgeEl.textContent = activeCampaignData.badge || 'PROMO';
      textEl.innerHTML = `${escapeHtml(activeCampaignData.title)}: <b>${activeCampaignData.discount_pct}% OFF + ${activeCampaignData.bonus_xp} XP</b>!`;
      topBar.style.display = 'block';
      api(`/campaigns/${activeCampaignData.id}/track`, { method: 'POST' }).catch(() => {});
    }
  }).catch(() => {});

  window.handleTopCampaignClaimClick = function() {
    if (!activeCampaignData) return;
    setElText('modal-camp-title', activeCampaignData.title);
    setElText('modal-camp-channel', `${activeCampaignData.channel.toUpperCase()} PROMOTION`);
    setElText('modal-camp-desc', activeCampaignData.description || 'Claim this offer to boost your earnings with bonus XP and fee discount perks.');
    setElText('modal-camp-bonus', `+${activeCampaignData.bonus_xp || 200} XP & 100 Points`);
    setElText('modal-camp-discount', `${activeCampaignData.discount_pct || 15}% OFF Fees`);
    openModal('modal-public-campaign-deal');
  };

  window.executeClaimActiveCampaign = async function() {
    if (!requireLogin('Login to claim this campaign reward')) return;
    if (!activeCampaignData) return;
    try {
      const res = await api('/campaigns/claim-offer', {
        method: 'POST',
        body: { campaignId: activeCampaignData.id }
      });
      closeModal('modal-public-campaign-deal');
      toast(res.message || '🎉 Campaign reward claimed successfully!', 'success');
      refreshUserAuthBadge();
    } catch (err) {
      toast('Could not claim offer: ' + err.message, 'error');
    }
  };

  // 2. Featured Professionals & Talent Spotlight Showcase
  async function loadTalentSpotlight() {
    const grid = document.getElementById('home-spotlight-grid');
    if (!grid) return;
    try {
      let url = '/professionals/featured?limit=8';
      if (homeActiveSpotlightCat && homeActiveSpotlightCat !== 'all') {
        url += `&category=${encodeURIComponent(homeActiveSpotlightCat)}`;
      }
      const { items } = await api(url);
      if (!items || !items.length) {
        grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:36px 20px;color:#94A3B8">No talent spotlight records found in this category.</div>';
        return;
      }

      grid.innerHTML = items.map(p => {
        const tierBadge = p.spotlight_tier === 'top_rated_plus' ? '💎 Top Rated Plus'
          : p.spotlight_tier === 'category_master' ? '🏆 Category Master' : '⭐ Rising Talent';
        return `
          <div class="pro-spotlight-card">
            <span class="pro-spotlight-badge">${tierBadge}</span>
            <div>
              <div class="pro-spotlight-avatar" style="background:${p.avatar_color || '#3B82F6'}">
                ${escapeHtml((p.name || 'P').slice(0, 2).toUpperCase())}
              </div>
              <div class="pro-spotlight-name">${escapeHtml(p.name)}</div>
              <div class="pro-spotlight-skill">${escapeHtml(p.primary_skill)}</div>
              <div style="color:#94A3B8;font-size:0.75rem;margin-bottom:8px">📂 ${escapeHtml(p.category)} · 📍 ${escapeHtml(p.location || 'Dhaka')}</div>
            </div>

            <div>
              <div class="pro-spotlight-stats">
                <span>⭐ <b style="color:#FBBF24">${p.rating || 4.9}</b></span>
                <span>📋 <b>${p.completed_tasks || 20}</b> tasks</span>
                <span>⚡ <b>+${p.views_boost_pct || 480}%</b> reach</span>
              </div>
              <div class="pro-spotlight-actions">
                <a href="/profile/${p.user_id}" class="btn-spotlight-profile">Profile</a>
                <button class="btn-spotlight-book" onclick="openPublicBookConsult(${p.user_id})">📅 Book Consult</button>
              </div>
            </div>
          </div>
        `;
      }).join('');
    } catch (err) {
      console.warn('Could not load talent spotlight:', err);
    }
  }

  // Wire spotlight category pills
  const spotlightPills = document.getElementById('spotlight-cat-pills');
  if (spotlightPills) {
    spotlightPills.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => {
        spotlightPills.querySelectorAll('button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        homeActiveSpotlightCat = btn.getAttribute('data-spotlight-cat') || 'all';
        loadTalentSpotlight();
      });
    });
  }

  loadTalentSpotlight();

  // 3. Referral Sharing Handlers
  window.openShareReferralModal = async function() {
    if (!requireLogin('Login to access your referral code')) return;
    try {
      const res = await api('/referrals/me');
      const input = document.getElementById('modal-ref-link-input');
      if (input) input.value = res.share_url || `http://localhost:3000/?ref=${res.referral_code}`;
      openModal('modal-public-share-referral');
    } catch (err) {
      toast('Could not load referral details: ' + err.message, 'error');
    }
  };

  window.copyModalReferralLink = function() {
    const input = document.getElementById('modal-ref-link-input');
    if (!input) return;
    navigator.clipboard.writeText(input.value).then(() => {
      toast('📋 Referral link copied to clipboard!', 'success');
    }).catch(() => {
      input.select();
      document.execCommand('copy');
      toast('📋 Referral link copied!', 'success');
    });
  };

  window.shareReferralVia = function(platform) {
    const input = document.getElementById('modal-ref-link-input');
    const url = encodeURIComponent(input ? input.value : 'http://localhost:3000');
    const text = encodeURIComponent('Join XtraEarn using my link and get ৳50 bonus credit on your first task! 🚀');

    if (platform === 'whatsapp') window.open(`https://api.whatsapp.com/send?text=${text}%20${url}`, '_blank');
    else if (platform === 'telegram') window.open(`https://t.me/share/url?url=${url}&text=${text}`, '_blank');
    else if (platform === 'facebook') window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
    else if (platform === 'email') window.open(`mailto:?subject=Earn%20Extra%20Income%20on%20XtraEarn&body=${text}%0A%0A${url}`, '_blank');
  };

  // 4. Daily Streak Check-in Handler
  window.handleDailyCheckinClick = async function() {
    if (!requireLogin('Login to claim your daily streak reward')) return;
    try {
      const res = await api('/loyalty/daily-checkin', { method: 'POST' });
      setElText('modal-streak-title', res.already_checked_in ? 'Already Checked In!' : (res.is_milestone ? '🎉 7-Day Milestone Streak!' : '🔥 Streak Check-in Complete!'));
      setElText('modal-streak-msg', res.message);
      setElText('modal-streak-days', `Day ${res.streak_days || 1} 🔥`);
      setElText('modal-streak-xp', `+${res.xp_awarded || 0} XP`);
      setElText('modal-streak-pts', `+${res.points_awarded || 0} Pts`);
      openModal('modal-public-daily-streak');
      refreshUserAuthBadge();
    } catch (err) {
      toast('Daily check-in error: ' + err.message, 'error');
    }
  };

  // 5. Talent Spotlight Application Modal
  let spotlightTiersData = [];
  let selectedSpotlightTierKey = 'top_rated_plus';

  window.openTalentSpotlightApplyModal = async function() {
    if (!requireLogin('Login to apply for Talent Spotlight')) return;
    try {
      const res = await api('/professionals/spotlight-tiers');
      spotlightTiersData = res.items || [];
      const grid = document.getElementById('spotlight-tiers-grid');
      if (grid && spotlightTiersData.length) {
        grid.innerHTML = spotlightTiersData.map((t, idx) => `
          <div class="boost-plan-card ${t.key === selectedSpotlightTierKey ? 'selected' : ''}" data-st-key="${t.key}" onclick="selectSpotlightTier('${t.key}', ${t.price})">
            <div class="boost-plan-top">
              <span class="boost-plan-title" style="font-size:0.84rem">${escapeHtml(t.title)}</span>
              <span class="boost-plan-price" style="font-size:1rem">৳${t.price}</span>
            </div>
            <div style="font-size:0.74rem;color:#38BDF8;font-weight:700">⏱ ${t.duration_days} Days Spotlight</div>
            <ul class="boost-plan-perks" style="font-size:0.72rem">
              ${(t.perks || []).slice(0, 2).map(p => `<li>${escapeHtml(p)}</li>`).join('')}
            </ul>
          </div>
        `).join('');
      }
      openModal('modal-talent-spotlight-apply');
    } catch (err) {
      toast('Could not load spotlight tiers: ' + err.message, 'error');
    }
  };

  window.selectSpotlightTier = function(key, price) {
    selectedSpotlightTierKey = key;
    document.querySelectorAll('#spotlight-tiers-grid .boost-plan-card').forEach(c => {
      c.classList.toggle('selected', c.getAttribute('data-st-key') === key);
    });
    setElText('spotlight-fee-display', `৳${Number(price || 300).toLocaleString()}`);
  };

  window.handleSpotlightApplicationSubmit = async function(e) {
    e.preventDefault();
    const category = document.getElementById('spotlight-cat-select')?.value;
    const skill = document.getElementById('spotlight-skill-input')?.value.trim();

    try {
      const res = await api('/professionals/apply-spotlight', {
        method: 'POST',
        body: {
          tier: selectedSpotlightTierKey,
          category,
          primary_skill: skill
        }
      });
      closeModal('modal-talent-spotlight-apply');
      toast(`🎉 Congratulations! Your profile is now spotlighted (${res.tier.title}).`, 'success');
      loadTalentSpotlight();
      refreshUserAuthBadge();
    } catch (err) {
      toast('Spotlight application failed: ' + err.message, 'error');
    }
  };

  window.openApplyExpertModal = function() {
    const user = typeof getUser === 'function' ? getUser() : null;
    if (user) {
      if (document.getElementById('app-exp-name')) document.getElementById('app-exp-name').value = user.name || '';
      if (document.getElementById('app-exp-email')) document.getElementById('app-exp-email').value = user.email || '';
      if (document.getElementById('app-exp-phone')) document.getElementById('app-exp-phone').value = user.phone || '';
      if (document.getElementById('app-exp-title')) document.getElementById('app-exp-title').value = user.profession || '';
      if (document.getElementById('app-exp-district')) document.getElementById('app-exp-district').value = user.location || 'Dhaka';
    }
    openModal('modal-apply-expert');
  };

  window.handleApplyExpertSubmit = async function(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-submit-apply-exp');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '⏳ Submitting Application...';
    }

    try {
      const payload = {
        name: document.getElementById('app-exp-name')?.value.trim(),
        domain: document.getElementById('app-exp-domain')?.value,
        title: document.getElementById('app-exp-title')?.value.trim(),
        profession: document.getElementById('app-exp-title')?.value.trim(),
        license_number: document.getElementById('app-exp-license')?.value.trim(),
        email: document.getElementById('app-exp-email')?.value.trim(),
        phone: document.getElementById('app-exp-phone')?.value.trim(),
        experience_years: Number(document.getElementById('app-exp-experience')?.value) || 3,
        district: document.getElementById('app-exp-district')?.value.trim() || 'Dhaka',
        hourly_rate: Number(document.getElementById('app-exp-rate')?.value) || 1500,
        education: document.getElementById('app-exp-education')?.value.trim(),
        bio: document.getElementById('app-exp-bio')?.value.trim()
      };

      const res = await api('/experts/apply', {
        method: 'POST',
        body: payload
      });

      closeModal('modal-apply-expert');
      document.getElementById('form-apply-expert')?.reset();

      if (typeof toast === 'function') {
        toast(`🩺 Application Submitted! Reference ID: [${res.application.application_code}]. Our compliance team will review and verify your license.`, 'success', 8000);
      } else {
        alert(`Application Submitted! Reference ID: [${res.application.application_code}]`);
      }
    } catch (err) {
      if (typeof toast === 'function') {
        toast('Application failed: ' + err.message, 'error');
      } else {
        alert('Application failed: ' + err.message);
      }
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '🚀 Submit Application for Review';
      }
    }
  };
});


