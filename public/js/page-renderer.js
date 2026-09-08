/* ============================================================
   XtraEarn Dynamic Public CMS Page Renderer Engine
   Renders visual builder schemas, widgets & SEO tags dynamically
   ============================================================ */

document.addEventListener('DOMContentLoaded', async () => {
  const loadingEl = document.getElementById('cms-page-loading');
  const contentEl = document.getElementById('cms-page-content');
  if (!contentEl) return;

  // 1. Determine Page Slug from URL Path or Query Params
  let slug = 'homepage';
  const path = window.location.pathname;
  const match = path.match(/\/(?:page|p|campaign)\/([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    slug = match[1];
  } else {
    const params = new URLSearchParams(window.location.search);
    if (params.get('slug')) slug = params.get('slug');
    else if (path !== '/' && path !== '/page' && path !== '/page.html') {
      slug = path.replace(/^\//, '').replace(/\.html$/, '');
    }
  }

  try {
    // 2. Fetch page schema
    let data;
    try {
      data = await api(`/cms/page/${slug}`);
    } catch {
      // fallback to bootstrap homepage if specific slug fails
      data = await api('/cms/homepage');
    }

    if (!data || !data.page) throw new Error('Page schema not found');
    const page = data.page;

    // 3. Inject SEO & Meta tags
    renderPageSeo(page);

    // 4. Render Page Sections
    renderPageSections(page, contentEl);

    // 5. Hide Loading state and reveal content
    if (loadingEl) loadingEl.style.display = 'none';
    contentEl.style.display = 'block';

  } catch (err) {
    console.error('CMS Renderer Error:', err);
    if (loadingEl) {
      loadingEl.innerHTML = `
        <div style="padding:60px 20px;text-align:center">
          <div style="font-size:3rem;margin-bottom:12px">⚠️</div>
          <h2 style="color:#F43F5E;margin-bottom:8px">Unable to Load Page</h2>
          <p style="color:#94A3B8;max-width:500px;margin:0 auto 20px">${escapeHtml(err.message || 'The requested CMS layout could not be rendered.')}</p>
          <a href="/tasks" class="btn btn-green">Browse Active Tasks →</a>
        </div>
      `;
    }
  }
});

/* ---------- SEO & JSON-LD Structured Data Injector ---------- */
function renderPageSeo(page) {
  if (!page) return;
  const pageTitle = page.meta_title || page.title || 'XtraEarn Micro-Tasks';
  document.title = pageTitle;

  const metaTitleEl = document.getElementById('cms-page-meta-title');
  if (metaTitleEl) metaTitleEl.textContent = pageTitle;

  const desc = page.meta_description || 'Turn your spare time into real income with verified micro-tasks and expert consultations on XtraEarn.';
  const metaDescEl = document.getElementById('cms-page-meta-desc');
  if (metaDescEl) metaDescEl.setAttribute('content', desc);

  const ogTitle = document.getElementById('cms-page-og-title');
  if (ogTitle) ogTitle.setAttribute('content', pageTitle);

  const ogDesc = document.getElementById('cms-page-og-desc');
  if (ogDesc) ogDesc.setAttribute('content', desc);

  // Injected JSON-LD Schema
  const schemaScript = document.createElement('script');
  schemaScript.type = 'application/ld+json';
  schemaScript.text = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": page.title,
    "description": desc,
    "url": window.location.href,
    "publisher": {
      "@type": "Organization",
      "name": "XtraEarn Bangladesh",
      "logo": {
        "@type": "ImageObject",
        "url": "https://xtraearn.com/assets/logo.png"
      }
    }
  });
  document.head.appendChild(schemaScript);
}

/* ---------- Page Sections & Column Builder ---------- */
function renderPageSections(page, container) {
  container.innerHTML = '';
  const sections = Array.isArray(page.sections) ? page.sections : [];

  if (sections.length === 0) {
    container.innerHTML = `
      <div class="cms-page-hero-banner">
        <div class="container">
          <div class="cms-hero-badge">⚡ LIVE PLATFORM</div>
          <h1 class="cms-hero-h1">${escapeHtml(page.title)}</h1>
          <p class="cms-hero-sub">${escapeHtml(page.meta_description || 'Complete tasks and earn instantly.')}</p>
          <div class="cms-hero-actions">
            <a href="/tasks" class="btn btn-green">Explore Tasks</a>
            <a href="/#how-it-works" class="btn btn-outline-light">How It Works</a>
          </div>
        </div>
      </div>
    `;
    return;
  }

  sections.forEach((sec, idx) => {
    if (sec.visible === false) return;

    const secEl = document.createElement('section');
    secEl.className = `cms-render-section cms-sec-${sec.type || 'standard'}`;
    secEl.id = sec.id || `cms-section-${idx}`;
    if (sec.bg) secEl.style.background = sec.bg;
    if (sec.padding) secEl.style.padding = sec.padding;

    const innerEl = document.createElement('div');
    innerEl.className = 'cms-section-inner';

    // Check if section is a hero banner type
    if (sec.type === 'hero') {
      innerEl.innerHTML = `
        <div class="cms-page-hero-banner" style="background:transparent;border:none;padding:20px 0">
          <div class="cms-hero-badge">${escapeHtml(sec.badge || '✨ FEATURED')}</div>
          <h1 class="cms-hero-h1">${escapeHtml(sec.title || page.title)}</h1>
          <p class="cms-hero-sub">${escapeHtml(sec.subtitle || page.meta_description || '')}</p>
          <div class="cms-hero-actions">
            <a href="/tasks" class="btn btn-green">${escapeHtml(sec.cta_text || 'Find Tasks Now')}</a>
            <a href="/#how-it-works" class="btn btn-outline-light">Learn More</a>
          </div>
        </div>
      `;
    }

    // Render nested rows and columns
    const rows = Array.isArray(sec.rows) ? sec.rows : [];
    rows.forEach(row => {
      const rowEl = document.createElement('div');
      const cols = Array.isArray(row.columns) ? row.columns : [];

      let colClass = 'cms-col-100';
      if (cols.length === 2) {
        colClass = (cols[0].width === '30%' || cols[0].width === '30/70') ? 'cms-col-30-70' : 'cms-col-50-50';
      } else if (cols.length === 3) {
        colClass = 'cms-col-33-33-33';
      }

      rowEl.className = `cms-row-grid ${colClass}`;

      cols.forEach(col => {
        const colEl = document.createElement('div');
        colEl.className = 'cms-column';
        if (col.width && !colClass.includes('col-')) colEl.style.width = col.width;

        const elements = Array.isArray(col.elements) ? col.elements : [];
        elements.forEach(elem => {
          const elNode = renderCmsElement(elem);
          if (elNode) colEl.appendChild(elNode);
        });

        rowEl.appendChild(colEl);
      });

      innerEl.appendChild(rowEl);
    });

    secEl.appendChild(innerEl);
    container.appendChild(secEl);
  });
}

/* ---------- Individual Element Node Generator ---------- */
function renderCmsElement(elem) {
  if (!elem || !elem.type) return null;
  const wrap = document.createElement('div');
  wrap.className = `cms-elem cms-elem-${elem.type}`;

  switch (elem.type) {
    case 'heading': {
      const tag = elem.level || 'h2';
      const heading = document.createElement(tag);
      heading.className = 'cms-elem-heading';
      if (elem.color) heading.style.color = elem.color;
      heading.innerHTML = escapeHtml(elem.content || '');
      wrap.appendChild(heading);
      break;
    }

    case 'paragraph': {
      const p = document.createElement('p');
      p.className = 'cms-elem-paragraph';
      if (elem.color) p.style.color = elem.color;
      p.innerHTML = escapeHtml(elem.content || '');
      wrap.appendChild(p);
      break;
    }

    case 'button': {
      const btn = document.createElement('a');
      btn.href = elem.url || '/tasks';
      btn.className = `btn btn-${elem.style || 'green'}`;
      btn.textContent = elem.text || 'Explore Tasks';
      if (elem.target === '_blank') btn.target = '_blank';
      wrap.appendChild(btn);
      break;
    }

    case 'trust_shield': {
      wrap.innerHTML = `
        <div class="cms-trust-shield-box">
          <div class="cms-trust-shield-icon">🛡️</div>
          <div>
            <h4 style="margin:0 0 6px;color:#34D399;font-size:1.1rem">${escapeHtml(elem.title || '100% Escrow Protection')}</h4>
            <p style="margin:0;color:#94A3B8;font-size:0.9rem;line-height:1.5">${escapeHtml(elem.description || 'Funds remain safely in escrow until you approve completed work.')}</p>
          </div>
        </div>
      `;
      break;
    }

    case 'faq_accordion': {
      const faqs = elem.items || [
        { q: 'How do I withdraw my earnings?', a: 'You can withdraw instantly to your bKash, Nagad, or Rocket account with 0% gateway fees.' },
        { q: 'Is my task payment safe?', a: 'Yes! All client payments are locked safely in escrow and only released when you approve the delivered work.' },
        { q: 'Can I post both online and local tasks?', a: 'Yes! You can post digital tasks (design, data entry, coding) and physical on-site tasks across all 64 districts.' }
      ];
      const faqContainer = document.createElement('div');
      faqContainer.className = 'cms-faq-accordion-wrap';
      faqContainer.innerHTML = faqs.map((f, i) => `
        <details style="background:rgba(30,41,59,0.8);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:14px 18px;margin-bottom:10px;cursor:pointer">
          <summary style="font-weight:700;color:#fff;outline:none;user-select:none">❓ ${escapeHtml(f.q)}</summary>
          <p style="margin:12px 0 0;color:#94A3B8;font-size:0.92rem;line-height:1.6">${escapeHtml(f.a)}</p>
        </details>
      `).join('');
      wrap.appendChild(faqContainer);
      break;
    }

    case 'dynamic_widget': {
      renderDynamicWidgetAsync(wrap, elem);
      break;
    }

    default: {
      const fallback = document.createElement('div');
      fallback.innerHTML = escapeHtml(elem.content || '');
      wrap.appendChild(fallback);
    }
  }

  return wrap;
}

/* ---------- Asynchronous Dynamic Widget Hydrator ---------- */
async function renderDynamicWidgetAsync(container, widget) {
  container.innerHTML = `<div style="padding:16px;color:#94A3B8;font-size:0.85rem">⏳ Loading live ${escapeHtml(widget.source || 'items')}...</div>`;

  try {
    const src = widget.source || 'tasks';
    const limit = Number(widget.limit) || 4;

    if (src === 'tasks') {
      const res = await api(`/tasks?limit=${limit}`);
      const items = res.items || [];
      if (items.length === 0) {
        container.innerHTML = `<p style="color:#94A3B8">No active tasks at the moment.</p>`;
        return;
      }
      container.innerHTML = `
        <div class="cms-widget-grid">
          ${items.slice(0, limit).map(t => `
            <a class="cms-task-item-card" href="/task?id=${t.id}">
              <div>
                <span class="cat-pill">${escapeHtml(t.category?.name || 'Task')}</span>
                <h4>${escapeHtml(t.title)}</h4>
              </div>
              <div class="task-footer">
                <span style="color:#94A3B8">⏱ ${timeLabel(t.durationMinutes)}</span>
                <span class="budget">${money(t.budget)}</span>
              </div>
            </a>
          `).join('')}
        </div>
      `;
    } else if (src === 'workers' || src === 'top_earners') {
      const res = await api('/earners');
      const items = res.items || [];
      container.innerHTML = `
        <div class="cms-widget-grid">
          ${items.slice(0, limit).map(w => `
            <div class="cms-expert-item-card">
              <div class="cms-expert-avatar">${initials(w.name)}</div>
              <h4 style="margin:0 0 4px;color:#fff">${escapeHtml(w.name)}</h4>
              <p style="margin:0 0 8px;font-size:0.8rem;color:#34D399;font-weight:700">${money(w.totalEarned)} earned</p>
              <div style="font-size:0.8rem;color:#94A3B8">${starsHtml(w.rating || 5, w.completedTasks || 10, true)}</div>
            </div>
          `).join('')}
        </div>
      `;
    } else if (src === 'experts') {
      const res = await api('/experts');
      const items = res.items || [];
      container.innerHTML = `
        <div class="cms-widget-grid">
          ${items.slice(0, limit).map(exp => `
            <div class="cms-expert-item-card">
              <div class="cms-expert-avatar" style="background:linear-gradient(135deg,#059669,#10B981)">${initials(exp.name)}</div>
              <h4 style="margin:0 0 4px;color:#fff">${escapeHtml(exp.name)}</h4>
              <p style="margin:0 0 6px;font-size:0.8rem;color:#38BDF8">${escapeHtml(exp.category || 'Expert')}</p>
              <a href="/consult?expert=${exp.id}" class="btn btn-outline-light" style="padding:4px 12px;font-size:0.8rem;margin-top:6px;display:inline-block">Book ৳${exp.ratePerMin || 10}/min</a>
            </div>
          `).join('')}
        </div>
      `;
    } else if (src === 'categories') {
      const res = await api('/categories');
      const items = res.items || [];
      container.innerHTML = `
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:12px">
          ${items.slice(0, limit * 2).map(c => `
            <a href="/tasks?category=${c.slug}" style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);padding:8px 14px;border-radius:999px;color:#fff;text-decoration:none;font-size:0.85rem;font-weight:600;display:inline-flex;align-items:center;gap:6px">
              <span>${c.emoji || '📁'}</span>
              <span>${escapeHtml(c.name)}</span>
            </a>
          `).join('')}
        </div>
      `;
    }
  } catch (err) {
    container.innerHTML = `<p style="color:#94A3B8;font-size:0.85rem">Live widget unavailable.</p>`;
  }
}
