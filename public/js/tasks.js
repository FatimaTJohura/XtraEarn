/* XtraEarn — Tasks Browse Page Controller */
document.addEventListener('DOMContentLoaded', () => {
  const grid = document.getElementById('tasks-grid');
  const countEl = document.getElementById('tasks-count');
  const searchInput = document.getElementById('search-input');
  const searchClearBtn = document.getElementById('search-clear-btn');
  const activeChipsBar = document.getElementById('active-filter-chips');
  const chipsContainer = document.getElementById('chips-container');
  const btnClearAllChips = document.getElementById('btn-clear-all-chips');
  const btnResetSidebar = document.getElementById('btn-reset-filters-sidebar');
  
  const catOnlineSearchBox = document.getElementById('cat-online-search-box');
  const filterOnlineCats = document.getElementById('filter-online-cats');
  const catPhysicalSearchBox = document.getElementById('cat-physical-search-box');
  const filterPhysicalCats = document.getElementById('filter-physical-cats');
  
  const groupSubcats = document.getElementById('group-subcats');
  const filterSubcats = document.getElementById('filter-subcats');

  const filterAreaContainer = document.getElementById('filter-area-container');
  const selectAreaFilter = document.getElementById('select-area-filter');

  const DISTRICT_AREAS = {
    Dhaka: ['Dhanmondi', 'Gulshan', 'Banani', 'Uttara', 'Mirpur', 'Tejgaon', 'Nilkhet', 'Agargaon', 'Badda', 'Motijheel', 'Mohakhali', 'Mohammadpur', 'Old Dhaka'],
    Chattogram: ['GEC Circle', 'Agrabad', 'Panchlaish', 'Nasirabad', 'Halishahar', 'Khulshi', 'Chawkbazar'],
    Sylhet: ['Zindabazar', 'Amberkhana', 'Shibganj', 'Upashahar', 'Kumarpara'],
    Rajshahi: ['Shaheb Bazar', 'Kazihata', 'Motihar', 'Boalia', 'Upashahar'],
    Khulna: ['Shibbari', 'Boyra', 'Sonadanga', 'Khalishpur', 'Daulatpur'],
    Barishal: ['Sadar Road', 'Natun Bazar', 'Rupatali'],
    Rangpur: ['Jahaj Company Mor', 'Dhap', 'Modern Mor']
  };

  const params = new URLSearchParams(location.search);

  let categoriesCache = [];

  const state = {
    q: params.get('q') || '',
    category: params.get('category') || '',
    subcategory: params.get('subcategory') || '',
    quickJob: params.get('quickJob') || '',
    taskType: params.get('type') || params.get('taskType') || '',
    district: params.get('district') || '',
    area: params.get('area') || '',
    urgency: params.get('urgency') || '',
    maxDuration: params.get('maxDuration') || '',
    minBudget: params.get('minBudget') || '',
    maxBudget: params.get('maxBudget') || '',
    featured: params.get('featured') || '',
    sort: params.get('sort') || 'budget_high', // Default: Top Price First
    applied: params.get('applied') === '1',
    mine: params.get('mine') === '1'
  };

  if (state.q && searchInput) {
    searchInput.value = state.q;
    if (searchClearBtn) searchClearBtn.classList.add('visible');
  }

  if (state.applied || state.mine) {
    const titleEl = document.getElementById('page-title');
    const subEl = document.getElementById('page-sub');
    if (titleEl) titleEl.textContent = state.mine ? 'My Posted Tasks' : 'My Applications';
    if (subEl) subEl.textContent = state.mine
      ? 'Tasks you have posted as a client.'
      : 'Tasks you have applied to as a freelancer.';
  }

  function updateUrl() {
    const p = new URLSearchParams();
    if (state.q) p.set('q', state.q);
    if (state.category) p.set('category', state.category);
    if (state.subcategory) p.set('subcategory', state.subcategory);
    if (state.quickJob) p.set('quickJob', state.quickJob);
    if (state.taskType) p.set('type', state.taskType);
    if (state.district) p.set('district', state.district);
    if (state.area) p.set('area', state.area);
    if (state.urgency) p.set('urgency', state.urgency);
    if (state.maxDuration) p.set('maxDuration', state.maxDuration);
    if (state.minBudget) p.set('minBudget', state.minBudget);
    if (state.maxBudget) p.set('maxBudget', state.maxBudget);
    if (state.featured) p.set('featured', state.featured);
    if (state.sort !== 'budget_high') p.set('sort', state.sort);
    if (state.applied) p.set('applied', '1');
    if (state.mine) p.set('mine', '1');
    history.replaceState(null, '', '/tasks' + (p.toString() ? '?' + p : ''));
  }

  function markActive() {
    // 1. Quick Jobs sidebar (at bottom)
    document.querySelectorAll('#filter-quick a').forEach(a => {
      a.classList.toggle('active', a.dataset.quick === String(state.quickJob));
    });

    // 1b. Featured filter
    document.querySelectorAll('#filter-featured a').forEach(a => {
      a.classList.toggle('active', a.dataset.featured === String(state.featured));
    });

    // 2. Work type sidebar
    document.querySelectorAll('#filter-type a').forEach(a => {
      a.classList.toggle('active', a.dataset.type === String(state.taskType));
    });

    // 3. District sidebar
    document.querySelectorAll('#filter-district a').forEach(a => {
      a.classList.toggle('active', a.dataset.district === String(state.district));
    });

    // 4. Area dropdown sync
    renderAreaDropdown();

    // 5. Urgency sidebar
    document.querySelectorAll('#filter-urgency a').forEach(a => {
      a.classList.toggle('active', a.dataset.urgency === String(state.urgency));
    });

    // 6. Budget sidebar
    document.querySelectorAll('#filter-budget a').forEach(a => {
      const [mn, mx] = (a.dataset.budget || '').split('-');
      const isActive = String(state.minBudget) === mn && String(state.maxBudget || '') === (mx || '');
      a.classList.toggle('active', isActive);
    });

    // 7. Sort sidebar
    document.querySelectorAll('#filter-sort a').forEach(a => {
      a.classList.toggle('active', a.dataset.sort === state.sort);
    });

    // 8. Categories sync
    document.querySelectorAll('#filter-online-cats a, #filter-physical-cats a').forEach(a => {
      a.classList.toggle('active', a.dataset.cat === state.category);
    });

    // 9. Subcategory sidebar
    if (filterSubcats) {
      filterSubcats.querySelectorAll('a').forEach(a => {
        a.classList.toggle('active', a.dataset.sub === state.subcategory);
      });
    }

    // 10. Top Quick Filter Pills
    document.querySelectorAll('#task-quick-pills .quick-pill').forEach(btn => {
      let active = false;
      if (btn.dataset.pillSort !== undefined) {
        active = state.sort === btn.dataset.pillSort;
      } else if (btn.dataset.pillType !== undefined) {
        active = (btn.dataset.pillType === '' && !state.taskType) || (btn.dataset.pillType === state.taskType);
      } else if (btn.dataset.pillTime !== undefined) {
        active = String(state.maxDuration) === btn.dataset.pillTime || state.quickJob === 'under-30m';
      }
      btn.classList.toggle('active', active);
    });

    renderSubcategoriesList();
    renderActiveChips();
  }

  function renderAreaDropdown() {
    if (!filterAreaContainer || !selectAreaFilter) return;

    if (!state.district || !DISTRICT_AREAS[state.district]) {
      filterAreaContainer.style.display = 'none';
      selectAreaFilter.innerHTML = '<option value="">All Areas</option>';
      return;
    }

    filterAreaContainer.style.display = 'block';
    const areas = DISTRICT_AREAS[state.district] || [];
    selectAreaFilter.innerHTML =
      `<option value="">All Areas in ${escapeHtml(state.district)}</option>` +
      areas.map(ar => `<option value="${escapeHtml(ar)}" ${state.area === ar ? 'selected' : ''}>📍 ${escapeHtml(ar)}</option>`).join('');
  }

  function renderSubcategoriesList() {
    if (!groupSubcats || !filterSubcats) return;

    if (!state.category) {
      groupSubcats.style.display = 'none';
      filterSubcats.innerHTML = '';
      return;
    }

    const currentCat = categoriesCache.find(c => c.slug === state.category || String(c.id) === String(state.category));
    if (!currentCat || !currentCat.subcategories || !currentCat.subcategories.length) {
      groupSubcats.style.display = 'none';
      filterSubcats.innerHTML = '';
      return;
    }

    groupSubcats.style.display = 'block';
    filterSubcats.innerHTML =
      `<a href="#" data-sub="" class="${!state.subcategory ? 'active' : ''}">All in ${escapeHtml(currentCat.name)}</a>` +
      currentCat.subcategories.map(sub => `
        <a href="#" data-sub="${escapeHtml(sub)}" class="${state.subcategory === sub ? 'active' : ''}">
          🔹 ${escapeHtml(sub)}
        </a>
      `).join('');

    filterSubcats.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', e => {
        e.preventDefault();
        const targetSub = a.dataset.sub;
        if (state.subcategory === targetSub) {
          state.subcategory = '';
        } else {
          state.subcategory = targetSub;
        }
        markActive();
        updateUrl();
        load();
      });
    });
  }

  function renderActiveChips() {
    if (!chipsContainer || !activeChipsBar) return;

    const chips = [];

    if (state.q) {
      chips.push({
        label: `🔍 "${state.q}"`,
        onRemove: () => {
          state.q = '';
          if (searchInput) searchInput.value = '';
          if (searchClearBtn) searchClearBtn.classList.remove('visible');
        }
      });
    }

    if (state.district) {
      chips.push({
        label: `📍 ${state.district}`,
        onRemove: () => { state.district = ''; state.area = ''; }
      });
    }

    if (state.area) {
      chips.push({
        label: `📌 ${state.area}`,
        onRemove: () => { state.area = ''; }
      });
    }

    if (state.quickJob) {
      const quickLabels = {
        'under-5m': '⚡ Under 5 min',
        'under-10m': '⏱️ Under 10 min',
        'under-15m': '⏳ Under 15 min',
        'under-30m': '🕒 Under 30 min',
        'under-1h': '📅 Under 1 hour'
      };
      chips.push({
        label: quickLabels[state.quickJob] || state.quickJob,
        onRemove: () => { state.quickJob = ''; }
      });
    }

    if (state.taskType) {
      const typeLabels = { online: '💻 Online Tasks', physical: '📍 Physical / On-Site', hybrid: '🔄 Hybrid' };
      chips.push({
        label: typeLabels[state.taskType] || state.taskType,
        onRemove: () => { state.taskType = ''; }
      });
    }

    if (state.category) {
      const catObj = categoriesCache.find(c => c.slug === state.category || String(c.id) === String(state.category));
      const catLabel = catObj ? `${catObj.icon} ${catObj.name}` : state.category;
      chips.push({
        label: `📁 ${catLabel}`,
        onRemove: () => { state.category = ''; state.subcategory = ''; }
      });
    }

    if (state.subcategory) {
      chips.push({
        label: `🔹 ${state.subcategory}`,
        onRemove: () => { state.subcategory = ''; }
      });
    }

    if (state.urgency) {
      const urgLabels = { instant: '⚡ Instant (≤ 15m)', same_day: '🚀 Same Day (≤ 24h)' };
      chips.push({
        label: urgLabels[state.urgency] || state.urgency,
        onRemove: () => { state.urgency = ''; }
      });
    }

    if (state.maxDuration) {
      chips.push({
        label: `⏱ ≤ ${state.maxDuration} min`,
        onRemove: () => { state.maxDuration = ''; }
      });
    }

    if (state.minBudget || state.maxBudget) {
      const bLabel = state.maxBudget ? `৳${state.minBudget} – ৳${state.maxBudget}` : `৳${state.minBudget}+`;
      chips.push({
        label: `💰 ${bLabel}`,
        onRemove: () => { state.minBudget = ''; state.maxBudget = ''; }
      });
    }

    if (state.featured) {
      chips.push({
        label: '⭐ Featured & Boosted',
        onRemove: () => { state.featured = ''; }
      });
    }

    if (state.sort && state.sort !== 'budget_high') {
      const sortLabels = {
        newest: 'Newest first',
        budget_low: 'Lowest budget',
        rating: 'Top rated',
        duration: 'Fastest'
      };
      chips.push({
        label: `📶 ${sortLabels[state.sort] || state.sort}`,
        onRemove: () => { state.sort = 'budget_high'; }
      });
    }

    if (chips.length > 0) {
      activeChipsBar.style.display = 'flex';
      chipsContainer.innerHTML = chips.map((chip, idx) => `
        <span class="filter-chip" data-chip-idx="${idx}">
          ${escapeHtml(chip.label)}
          <span class="chip-remove" data-remove-idx="${idx}" title="Remove filter">✕</span>
        </span>
      `).join('');

      chipsContainer.querySelectorAll('.chip-remove').forEach(el => {
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          const idx = Number(el.dataset.removeIdx);
          if (chips[idx] && chips[idx].onRemove) {
            chips[idx].onRemove();
            markActive();
            updateUrl();
            load();
          }
        });
      });
    } else {
      activeChipsBar.style.display = 'none';
      chipsContainer.innerHTML = '';
    }
  }

  function clearAllFilters() {
    state.q = '';
    state.category = '';
    state.subcategory = '';
    state.quickJob = '';
    state.taskType = '';
    state.district = '';
    state.area = '';
    state.urgency = '';
    state.maxDuration = '';
    state.minBudget = '';
    state.maxBudget = '';
    state.sort = 'budget_high'; // Reset to Top Price First
    if (searchInput) searchInput.value = '';
    if (searchClearBtn) searchClearBtn.classList.remove('visible');
    if (catOnlineSearchBox) catOnlineSearchBox.value = '';
    if (catPhysicalSearchBox) catPhysicalSearchBox.value = '';
    renderCategoriesLists();
    markActive();
    updateUrl();
    load();
  }

  async function load() {
    if (!grid) return;
    grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1;text-align:center;padding:40px"><span class="big" style="font-size:2rem;display:block;margin-bottom:8px">⏳</span>Loading matching tasks...</div>';

    try {
      if (state.applied || state.mine) {
        if (!requireLogin(state.mine ? 'Login to see your posted tasks' : 'Login to see your applications')) return;
        if (state.mine) {
          const all = await api('/tasks?limit=100&status=');
          render(all.items.filter(t => t.clientId === (Auth.user && Auth.user.id)), 'posted tasks', all.total);
        } else {
          const data = await api('/my/applications');
          render(data.items.map(x => x.task), 'applications', data.items.length);
        }
        return;
      }

      const p = new URLSearchParams();
      p.set('limit', '100');
      if (state.q) p.set('q', state.q);
      if (state.category) p.set('category', state.category);
      if (state.subcategory) p.set('subcategory', state.subcategory);
      if (state.quickJob) p.set('quickJob', state.quickJob);
      if (state.taskType) p.set('taskType', state.taskType);
      if (state.district) p.set('district', state.district);
      if (state.area) p.set('area', state.area);
      if (state.urgency) p.set('urgency', state.urgency);
      if (state.maxDuration) p.set('maxDuration', state.maxDuration);
      if (state.minBudget) p.set('minBudget', state.minBudget);
      if (state.maxBudget) p.set('maxBudget', state.maxBudget);
      if (state.featured) p.set('featured', state.featured);
      p.set('sort', state.sort);

      const data = await api('/tasks?' + p.toString());
      render(data.items || [], 'open tasks', data.total);
    } catch (err) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><span class="big">⚠️</span>${escapeHtml(err.message || 'Error loading tasks')}</div>`;
    }
  }

  function render(items, label, total) {
    const count = items ? items.length : 0;
    if (countEl) {
      if (count === (total || count)) {
        countEl.textContent = `Showing all ${count} ${label}`;
      } else {
        countEl.textContent = `Showing ${count} of ${total || count} ${label}`;
      }
    }

    if (!items || !items.length) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1;text-align:center;padding:50px 20px;background:#fff;border:1px dashed #CBD5E1;border-radius:16px">
          <span class="big" style="font-size:2.5rem;display:block;margin-bottom:10px">🔍</span>
          <h3 style="font-size:1.1rem;margin:0 0 6px;color:#0F172A">No tasks found matching your filters</h3>
          <p style="color:#64748B;font-size:0.88rem;margin:0 0 16px">Try relaxing your search terms or clearing active filters.</p>
          <button class="btn btn-green btn-sm" id="btn-reset-empty" style="padding:8px 18px;border-radius:8px">Clear All Filters</button>
        </div>`;
      const btnResetEmpty = document.getElementById('btn-reset-empty');
      if (btnResetEmpty) btnResetEmpty.addEventListener('click', clearAllFilters);
      return;
    }

    grid.innerHTML = items.map(taskCardHtml).join('');
  }

  function renderCategoriesLists() {
    const onlineQuery = (catOnlineSearchBox?.value || '').toLowerCase().trim();
    const physicalQuery = (catPhysicalSearchBox?.value || '').toLowerCase().trim();

    // 1. Online Categories (type: 'online' or 'both')
    if (filterOnlineCats) {
      let onlineCats = categoriesCache.filter(c => c.type === 'online' || c.type === 'both' || !c.type);
      if (onlineQuery) {
        onlineCats = onlineCats.filter(c => c.name.toLowerCase().includes(onlineQuery) || (c.subcategories || []).some(s => s.toLowerCase().includes(onlineQuery)));
      }
      filterOnlineCats.innerHTML = onlineCats.map(c => `
        <a href="#" data-cat="${c.slug}" class="${state.category === c.slug ? 'active' : ''}">
          ${c.icon} ${escapeHtml(c.name)} <small>${c.task_count || ''}</small>
        </a>
      `).join('');
    }

    // 2. Physical & On-site Categories (type: 'physical' or 'both')
    if (filterPhysicalCats) {
      let physicalCats = categoriesCache.filter(c => c.type === 'physical' || c.type === 'both');
      if (physicalQuery) {
        physicalCats = physicalCats.filter(c => c.name.toLowerCase().includes(physicalQuery) || (c.subcategories || []).some(s => s.toLowerCase().includes(physicalQuery)));
      }
      filterPhysicalCats.innerHTML = physicalCats.map(c => `
        <a href="#" data-cat="${c.slug}" class="${state.category === c.slug ? 'active' : ''}">
          ${c.icon} ${escapeHtml(c.name)} <small>${c.task_count || ''}</small>
        </a>
      `).join('');
    }

    // Attach click handlers to both category lists
    document.querySelectorAll('#filter-online-cats a, #filter-physical-cats a').forEach(a => {
      a.addEventListener('click', e => {
        e.preventDefault();
        const targetCat = a.dataset.cat;
        if (state.category === targetCat) {
          state.category = '';
          state.subcategory = '';
        } else {
          state.category = targetCat;
          state.subcategory = '';
        }
        markActive();
        updateUrl();
        load();
      });
    });
  }

  /* Load Category List and Sync Counts */
  api('/categories').then(({ items }) => {
    categoriesCache = items || [];
    renderCategoriesLists();
    markActive();
  }).catch(() => {});

  if (catOnlineSearchBox) {
    catOnlineSearchBox.addEventListener('input', renderCategoriesLists);
  }
  if (catPhysicalSearchBox) {
    catPhysicalSearchBox.addEventListener('input', renderCategoriesLists);
  }

  /* Wire Dynamic Area Dropdown */
  if (selectAreaFilter) {
    selectAreaFilter.addEventListener('change', () => {
      state.area = selectAreaFilter.value;
      markActive();
      updateUrl();
      load();
    });
  }

  /* Sync Quick Badge Counts */
  api('/tasks?limit=100').then(res => {
    if (res && res.items) {
      const all = res.items;
      const onlineCount = all.filter(t => t.taskType === 'online').length;
      const physicalCount = all.filter(t => t.taskType === 'physical').length;
      const quickCount = all.filter(t => t.durationMinutes && t.durationMinutes <= 30).length;

      const bAll = document.getElementById('badge-all-count');
      const bOnline = document.getElementById('badge-online-count');
      const bPhysical = document.getElementById('badge-physical-count');
      const bQuick = document.getElementById('badge-quick-count');

      if (bAll) bAll.textContent = all.length;
      if (bOnline) bOnline.textContent = onlineCount;
      if (bPhysical) bPhysical.textContent = physicalCount;
      if (bQuick) bQuick.textContent = quickCount;
    }
  }).catch(() => {});

  /* Wire Quick Jobs Sidebar (At bottom) */
  document.querySelectorAll('#filter-quick a').forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      const targetQuick = a.dataset.quick;
      if (targetQuick === '') {
        state.quickJob = '';
      } else if (state.quickJob === targetQuick) {
        state.quickJob = '';
      } else {
        state.quickJob = targetQuick;
      }
      markActive();
      updateUrl();
      load();
    });
  });

  /* Wire Featured / Boosted Filter */
  document.querySelectorAll('#filter-featured a').forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      const target = a.dataset.featured;
      state.featured = state.featured === target ? '' : target;
      markActive();
      updateUrl();
      load();
    });
  });

  /* Wire Work Type Sidebar with Toggle Support */
  document.querySelectorAll('#filter-type a').forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      const targetType = a.dataset.type;
      if (targetType === '') {
        state.taskType = '';
      } else if (state.taskType === targetType) {
        state.taskType = '';
      } else {
        state.taskType = targetType;
      }
      markActive();
      updateUrl();
      load();
    });
  });

  /* Wire District / Location Sidebar */
  document.querySelectorAll('#filter-district a').forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      const targetDistrict = a.dataset.district;
      if (targetDistrict === '') {
        state.district = '';
        state.area = '';
      } else if (state.district === targetDistrict) {
        state.district = '';
        state.area = '';
      } else {
        state.district = targetDistrict;
        state.area = '';
      }
      markActive();
      updateUrl();
      load();
    });
  });

  /* Wire Urgency Sidebar */
  document.querySelectorAll('#filter-urgency a').forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      const targetUrgency = a.dataset.urgency;
      if (targetUrgency === '') {
        state.urgency = '';
      } else if (state.urgency === targetUrgency) {
        state.urgency = '';
      } else {
        state.urgency = targetUrgency;
      }
      markActive();
      updateUrl();
      load();
    });
  });

  /* Wire Budget Sidebar with Toggle Support */
  document.querySelectorAll('#filter-budget a').forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      const [mn, mx] = (a.dataset.budget || '').split('-');
      if (String(state.minBudget) === mn && String(state.maxBudget || '') === (mx || '')) {
        state.minBudget = '';
        state.maxBudget = '';
      } else {
        state.minBudget = mn;
        state.maxBudget = mx || '';
      }
      markActive();
      updateUrl();
      load();
    });
  });

  /* Wire Sort Sidebar */
  document.querySelectorAll('#filter-sort a').forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      state.sort = a.dataset.sort || 'budget_high';
      markActive();
      updateUrl();
      load();
    });
  });

  /* Wire Top Quick Pills */
  document.querySelectorAll('#task-quick-pills .quick-pill').forEach(btn => {
    btn.addEventListener('click', e => {
      e.preventDefault();
      if (btn.dataset.pillSort !== undefined) {
        const targetSort = btn.dataset.pillSort;
        if (state.sort === targetSort) {
          state.sort = 'budget_high';
        } else {
          state.sort = targetSort;
        }
      } else if (btn.dataset.pillType !== undefined) {
        const targetType = btn.dataset.pillType;
        if (targetType === '') {
          state.taskType = '';
        } else if (state.taskType === targetType) {
          state.taskType = '';
        } else {
          state.taskType = targetType;
        }
      } else if (btn.dataset.pillTime !== undefined) {
        if (state.quickJob === 'under-30m') {
          state.quickJob = '';
        } else {
          state.quickJob = 'under-30m';
        }
      }
      markActive();
      updateUrl();
      load();
    });
  });

  /* Search Box Interactions */
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      if (searchClearBtn) {
        searchClearBtn.classList.toggle('visible', !!searchInput.value.trim());
      }
    });
  }

  if (searchClearBtn) {
    searchClearBtn.addEventListener('click', () => {
      searchInput.value = '';
      searchClearBtn.classList.remove('visible');
      state.q = '';
      state.applied = false;
      state.mine = false;
      markActive();
      updateUrl();
      load();
    });
  }

  const searchForm = document.getElementById('search-form');
  if (searchForm) {
    searchForm.addEventListener('submit', e => {
      e.preventDefault();
      state.q = searchInput ? searchInput.value.trim() : '';
      state.applied = false;
      state.mine = false;
      markActive();
      updateUrl();
      load();
    });
  }

  /* Clear All Buttons */
  if (btnClearAllChips) btnClearAllChips.addEventListener('click', clearAllFilters);
  if (btnResetSidebar) btnResetSidebar.addEventListener('click', (e) => { e.preventDefault(); clearAllFilters(); });

  const btnPostSide = document.getElementById('btn-post-side');
  if (btnPostSide) btnPostSide.addEventListener('click', () => openPostTaskModal());

  const btnToggleFilters = document.getElementById('btn-toggle-filters');
  const filtersAside = document.getElementById('tasks-filters');
  if (btnToggleFilters && filtersAside) {
    btnToggleFilters.addEventListener('click', () => {
      filtersAside.classList.toggle('open');
      const caret = btnToggleFilters.querySelector('.filter-toggle-caret');
      if (caret) caret.textContent = filtersAside.classList.contains('open') ? '▴ Hide' : '▾ Show';
    });
  }

  document.addEventListener('xe:task-posted', load);
  markActive();
  load();
});
