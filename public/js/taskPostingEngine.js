/**
 * XtraEarn Dynamic Task Posting Engine
 * Universal multi-step dynamic task posting system with dynamic template loading,
 * conditional field logic, Location Provider abstraction, dual draft persistence,
 * non-authoritative AI suggestions, and live quality check.
 */

// ==========================================
// 1. LOCATION PROVIDER ABSTRACTION
// ==========================================
const LocationProvider = {
  districts: [
    'Dhaka', 'Chattogram', 'Sylhet', 'Rajshahi', 'Khulna', 'Barishal', 'Rangpur', 'Mymensingh',
    'Gazipur', 'Narayanganj', 'Cumilla', 'Cox\'s Bazar', 'Bogura', 'Jashore', 'Kushtia',
    'Dinajpur', 'Tangail', 'Faridpur', 'Feni', 'Noakhali', 'Brahmanbaria', 'Pabna', 'Sirajganj'
  ],
  areasByDistrict: {
    'Dhaka': ['Dhanmondi', 'Gulshan 1', 'Gulshan 2', 'Banani', 'Uttara', 'Mirpur', 'Mohakhali', 'Badda', 'Motijheel', 'Old Dhaka', 'Mohammadpur', 'Bashundhara R/A', 'Khilgaon', 'Rampura', 'Shahbagh', 'Panthapath'],
    'Chattogram': ['Agrabad', 'GEC Circle', 'Nasirabad', 'Khulshi', 'Halishahar', 'Chawkbazar', 'Panchlaish', 'Kotwali', 'Muradpur'],
    'Sylhet': ['Zindabazar', 'Amberkhana', 'Shibganj', 'Uposhohor', 'Kumarpara', 'Chowhatta', 'Subidbazar'],
    'Rajshahi': ['Shaheb Bazar', 'Motihar', 'Boalia', 'Kazla', 'Rajpara', 'Padma R/A'],
    'Khulna': ['Shibbari', 'Sonadanga', 'Boyra', 'Khalishpur', 'Daulatpur', 'Rupsha'],
    'Barishal': ['Sadar', 'Natun Bazar', 'Rupatali', 'Band Road', 'Chowmatha'],
    'Rangpur': ['Jahaj Company Mor', 'Dhap', 'Lalbagh', 'Modern Mor', 'Radhaballav'],
    'Mymensingh': ['Ganginar Par', 'Town Hall', 'Charpara', 'Maskanda', 'Kachari']
  },
  getDistricts() {
    return this.districts;
  },
  getAreasForDistrict(district) {
    return this.areasByDistrict[district] || ['Main Town / Center', 'North Area', 'South Area', 'East Area', 'West Area'];
  },
  async geocode(query) {
    // Modular geocoding abstraction ready for Leaflet / Mapbox / Google Maps
    return {
      lat: 23.8103,
      lng: 90.4125,
      formattedAddress: query ? `${query}, Bangladesh` : 'Dhaka, Bangladesh'
    };
  }
};

// Helper to safely resolve current authenticated user without throwing ReferenceError
function getActiveUser() {
  if (typeof Auth !== 'undefined' && Auth && Auth.user) return Auth.user;
  if (typeof window !== 'undefined' && window.currentUser) return window.currentUser;
  if (typeof currentUser !== 'undefined' && currentUser) return currentUser;
  return null;
}

// ==========================================
// 2. DYNAMIC TASK POSTING ENGINE CLASS
// ==========================================
class DynamicTaskPostingEngine {
  constructor() {
    this.currentStep = 1;
    this.totalSteps = 6;
    this.taskType = 'online'; // 'online' | 'physical'
    this.activeTemplate = null;
    this.formData = {
      taskType: 'online',
      title: '',
      categoryId: '',
      categoryName: '',
      subcategory: '',
      proLevel: 'skilled',
      description: '',
      dynamicData: {},
      skills: [],
      files: [],
      deliverables: [],
      revisions: '2',
      specialInstructions: '',
      // Location
      district: 'Dhaka',
      area: 'Dhanmondi',
      locationText: '',
      exactLocationPrivacy: 'hired_only',
      mapCoordinates: null,
      // Online work mode
      workMode: 'remote',
      communicationPref: 'xtraearn_chat',
      // Schedule
      preferredDate: '',
      preferredTimeSlot: 'anytime',
      isUrgent: false,
      deliveryHours: 24,
      durationMinutes: 30,
      // Budget & Currency
      budget: 250,
      budgetType: 'fixed',
      currency: 'BDT',
      escrowBreakdown: null,
      // Worker criteria
      workerCriteria: {
        minRating: 0,
        verificationRequired: false,
        minCompletedTasks: 0,
        languages: ['Bengali', 'English']
      }
    };

    this.draftSyncTimeout = null;
    this.categoriesCache = [];
    this.currenciesCache = [
      { code: 'BDT', symbol: '৳', rate: 1.0 },
      { code: 'USD', symbol: '$', rate: 120.0 },
      { code: 'EUR', symbol: '€', rate: 130.5 },
      { code: 'GBP', symbol: '£', rate: 152.0 }
    ];
  }

  async init(categories) {
    this.categoriesCache = categories || [];
    await this.fetchCurrencies();
    await this.checkAndPromptDraft();
    document.addEventListener('xe:auth', () => {
      this.saveDraft();
    });
  }

  async fetchCurrencies() {
    try {
      const res = await api('/pricing/currencies');
      if (res && res.currencies) this.currenciesCache = res.currencies;
    } catch (e) {
      console.warn('Using default currency config:', e);
    }
  }

  // --- DRAFT PERSISTENCE (DUAL LOCAL + SERVER) ---
  async checkAndPromptDraft() {
    let savedDraft = null;
    const local = localStorage.getItem('xe_task_draft_v2');
    if (local) {
      try { savedDraft = JSON.parse(local); } catch (e) { /* ignore */ }
    }

    const activeUser = getActiveUser();
    if (activeUser) {
      try {
        const res = await api('/tasks/drafts/current');
        if (res && res.draft && res.draft.draft_data) {
          savedDraft = res.draft.draft_data;
        }
      } catch (e) {
        console.warn('Could not fetch server draft:', e);
      }
    }

    if (savedDraft && savedDraft.title && String(savedDraft.title).trim().length > 3) {
      this.showDraftResumeBanner(savedDraft);
    }
  }

  showDraftResumeBanner(draftData) {
    const banner = document.getElementById('pt-draft-resume-banner');
    if (banner) {
      banner.style.display = 'flex';
      banner.querySelector('.draft-title').textContent = `"${draftData.title.substring(0, 40)}..."`;
      banner.querySelector('.btn-resume-draft').onclick = () => {
        this.loadDraftData(draftData);
        banner.style.display = 'none';
        toast('Draft restored successfully! 📋', 'success');
      };
      banner.querySelector('.btn-dismiss-draft').onclick = () => {
        banner.style.display = 'none';
        this.clearDraft();
      };
    }
  }

  loadDraftData(draftData) {
    this.formData = { ...this.formData, ...draftData };
    this.taskType = this.formData.taskType || 'online';
    this.syncFormUiFromData();
    if (this.formData.categoryId) {
      this.loadTemplateForCategory(this.formData.categoryId, this.formData.subcategory);
    }
  }

  scheduleDraftSave() {
    if (this.draftSyncTimeout) clearTimeout(this.draftSyncTimeout);
    this.draftSyncTimeout = setTimeout(() => {
      this.saveDraft();
    }, 1500);
  }

  async saveDraft() {
    this.extractStepData();
    const payload = JSON.stringify(this.formData);
    localStorage.setItem('xe_task_draft_v2', payload);

    const activeUser = getActiveUser();
    if (activeUser) {
      try {
        await api('/tasks/drafts', {
          method: 'POST',
          body: this.formData
        });
      } catch (e) {
        console.warn('Server draft sync failed:', e);
      }
    }

    const indicator = document.getElementById('pt-draft-indicator');
    if (indicator) {
      indicator.textContent = `💾 Draft saved (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`;
      indicator.style.opacity = '1';
      setTimeout(() => { if (indicator) indicator.style.opacity = '0.7'; }, 3000);
    }
  }

  async clearDraft() {
    localStorage.removeItem('xe_task_draft_v2');
    const activeUser = getActiveUser();
    if (activeUser) {
      try { await api('/tasks/drafts/current', { method: 'DELETE' }); }
      catch (e) { /* ignore */ }
    }
  }

  // --- STEP NAVIGATION ---
  goToStep(step) {
    if (step < 1 || step > this.totalSteps) return;
    if (step > this.currentStep && !this.validateCurrentStep()) {
      return;
    }

    this.extractStepData();
    this.currentStep = step;
    this.renderStepView();
    this.scheduleDraftSave();
  }

  nextStep() {
    if (this.currentStep < this.totalSteps) {
      this.goToStep(this.currentStep + 1);
    }
  }

  prevStep() {
    if (this.currentStep > 1) {
      this.goToStep(this.currentStep - 1);
    }
  }

  // --- TEMPLATE ENGINE INTEGRATION ---
  async loadTemplateForCategory(categoryId, subcategory = null) {
    const container = document.getElementById('pt-dynamic-fields-container');
    if (!container) return;

    container.innerHTML = `
      <div style="text-align:center;padding:30px 10px;color:#94A3B8">
        <div class="adm-spinner" style="width:28px;height:28px;margin:0 auto 12px;border:3px solid rgba(255,255,255,0.1);border-top-color:#10B981;border-radius:50%;animation:spin 0.8s linear infinite"></div>
        <div style="font-size:0.86rem">Configuring intelligent form for this category...</div>
      </div>
    `;

    try {
      const query = `categoryId=${categoryId}&subcategory=${encodeURIComponent(subcategory || '')}&taskType=${this.taskType}`;
      const res = await api(`/tasks/template-lookup?${query}`);
      if (res && res.template) {
        this.activeTemplate = res.template;
        this.renderDynamicFields(res.template);
        // Pre-fill default budget/duration if user hasn't set custom
        if (!this.formData.budget || this.formData.budget === 250) {
          this.formData.budget = res.template.default_budget || 250;
        }
        if (res.template.duration_minutes) {
          this.formData.durationMinutes = res.template.duration_minutes;
        }
        if (res.template.delivery_hours) {
          this.formData.deliveryHours = res.template.delivery_hours;
        }
        // Auto-seed template skills if empty
        if ((!this.formData.skills || !this.formData.skills.length) && res.template.skills) {
          this.formData.skills = String(res.template.skills).split(',').map(s => s.trim()).filter(Boolean);
          this.renderSkillsPills();
        }
      } else {
        container.innerHTML = `<p style="color:#94A3B8;font-size:0.85rem">Standard task format loaded. Fill in your project specifications below.</p>`;
      }
    } catch (err) {
      console.warn('Template lookup fallback:', err);
      container.innerHTML = `<p style="color:#94A3B8;font-size:0.85rem">Category configured. Complete your requirements in the next steps.</p>`;
    }
  }

  // --- DYNAMIC FIELD RENDERER ---
  renderDynamicFields(template) {
    const container = document.getElementById('pt-dynamic-fields-container');
    if (!container) return;

    if (!template.fields || !template.fields.length) {
      container.innerHTML = `
        <div style="background:#0F172A;border:1px dashed rgba(255,255,255,0.12);border-radius:10px;padding:20px;text-align:center">
          <span style="font-size:1.8rem;display:block;margin-bottom:6px">${template.emoji || '📝'}</span>
          <b style="color:#fff;font-size:0.95rem">${escapeHtml(template.title)}</b>
          <p style="color:#94A3B8;font-size:0.82rem;margin:4px 0 0">${escapeHtml(template.short_desc || 'Universal task parameters applied.')}</p>
        </div>
      `;
      return;
    }

    let html = `
      <div style="background:rgba(99,102,241,0.06);border:1px solid rgba(99,102,241,0.2);border-radius:10px;padding:12px 16px;margin-bottom:18px;display:flex;align-items:center;gap:12px">
        <span style="font-size:1.6rem">${template.emoji || '📋'}</span>
        <div>
          <b style="color:#fff;font-size:0.92rem;display:block">${escapeHtml(template.title)} <small style="color:#A78BFA;font-weight:600">v${template.version || 1}</small></b>
          <span style="color:#94A3B8;font-size:0.78rem">${escapeHtml(template.short_desc || 'Fill out the category-specific parameters below for high-quality proposals.')}</span>
        </div>
      </div>
      <div class="pt-dynamic-grid" style="display:flex;flex-direction:column;gap:14px">
    `;

    const sortedFields = [...template.fields].sort((a, b) => (a.order || 0) - (b.order || 0));

    sortedFields.forEach(field => {
      const val = this.formData.dynamicData[field.field_key] !== undefined ? this.formData.dynamicData[field.field_key] : (field.default_value !== undefined ? field.default_value : '');
      const reqAsterisk = field.required ? `<span style="color:#EF4444;font-weight:bold">*</span>` : '';
      const help = field.help_text ? `<small style="color:#94A3B8;display:block;margin-top:3px;font-size:0.75rem">${escapeHtml(field.help_text)}</small>` : '';

      html += `<div class="pt-dyn-field-wrap" id="dyn-wrap-${field.field_key}" data-key="${field.field_key}" style="display:flex;flex-direction:column">`;

      switch (field.type) {
        case 'text':
        case 'currency':
        case 'email':
        case 'phone':
        case 'url':
          html += `
            <label style="font-size:0.84rem;font-weight:600;color:#CBD5E1;margin-bottom:4px">
              ${escapeHtml(field.label)} ${reqAsterisk}
            </label>
            <input type="${field.type === 'url' ? 'url' : field.type === 'email' ? 'email' : 'text'}"
                   class="adm-input dyn-input"
                   id="dyn-${field.field_key}"
                   name="${field.field_key}"
                   placeholder="${escapeHtml(field.placeholder || '')}"
                   value="${escapeHtml(String(val))}"
                   ${field.required ? 'required' : ''}
                   style="width:100%">
            ${help}
          `;
          break;

        case 'number':
          html += `
            <label style="font-size:0.84rem;font-weight:600;color:#CBD5E1;margin-bottom:4px">
              ${escapeHtml(field.label)} ${reqAsterisk}
            </label>
            <input type="number"
                   class="adm-input dyn-input"
                   id="dyn-${field.field_key}"
                   name="${field.field_key}"
                   placeholder="${escapeHtml(field.placeholder || '')}"
                   value="${val !== '' ? Number(val) : ''}"
                   min="${field.min !== undefined ? field.min : 0}"
                   max="${field.max !== undefined ? field.max : 999999}"
                   ${field.required ? 'required' : ''}
                   style="width:100%">
            ${help}
          `;
          break;

        case 'textarea':
        case 'rich-text':
          html += `
            <label style="font-size:0.84rem;font-weight:600;color:#CBD5E1;margin-bottom:4px">
              ${escapeHtml(field.label)} ${reqAsterisk}
            </label>
            <textarea class="adm-input dyn-input"
                      id="dyn-${field.field_key}"
                      name="${field.field_key}"
                      rows="3"
                      placeholder="${escapeHtml(field.placeholder || '')}"
                      ${field.required ? 'required' : ''}
                      style="width:100%">${escapeHtml(String(val))}</textarea>
            ${help}
          `;
          break;

        case 'dropdown':
        case 'searchable-select':
          html += `
            <label style="font-size:0.84rem;font-weight:600;color:#CBD5E1;margin-bottom:4px">
              ${escapeHtml(field.label)} ${reqAsterisk}
            </label>
            <select class="adm-select dyn-input"
                    id="dyn-${field.field_key}"
                    name="${field.field_key}"
                    ${field.required ? 'required' : ''}
                    style="width:100%">
              ${(field.options || []).map(opt => `
                <option value="${escapeHtml(opt.value)}" ${String(val) === String(opt.value) ? 'selected' : ''}>
                  ${escapeHtml(opt.label || opt.value)}
                </option>
              `).join('')}
            </select>
            ${help}
          `;
          break;

        case 'multi-select':
          const selectedVals = Array.isArray(val) ? val : (val ? [val] : []);
          html += `
            <label style="font-size:0.84rem;font-weight:600;color:#CBD5E1;margin-bottom:6px">
              ${escapeHtml(field.label)} ${reqAsterisk}
            </label>
            <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(200px, 1fr));gap:8px;background:#0B1120;padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.06)">
              ${(field.options || []).map(opt => `
                <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:0.82rem;color:#E2E8F0">
                  <input type="checkbox"
                         class="dyn-multicheck"
                         name="${field.field_key}"
                         value="${escapeHtml(opt.value)}"
                         ${selectedVals.includes(opt.value) ? 'checked' : ''}
                         style="accent-color:#10B981">
                  ${escapeHtml(opt.label || opt.value)}
                </label>
              `).join('')}
            </div>
            ${help}
          `;
          break;

        case 'toggle':
        case 'yes-no':
          const isChecked = val === true || val === 'true' || val === 1 || val === '1';
          html += `
            <div style="display:flex;align-items:center;justify-content:space-between;background:#0B1120;padding:12px 14px;border-radius:8px;border:1px solid rgba(255,255,255,0.06)">
              <div>
                <b style="color:#fff;font-size:0.85rem;display:block">${escapeHtml(field.label)} ${reqAsterisk}</b>
                ${field.description ? `<small style="color:#94A3B8;font-size:0.75rem">${escapeHtml(field.description)}</small>` : ''}
              </div>
              <label class="switch" style="position:relative;display:inline-block;width:44px;height:24px;margin:0">
                <input type="checkbox"
                       class="dyn-toggle"
                       id="dyn-${field.field_key}"
                       name="${field.field_key}"
                       ${isChecked ? 'checked' : ''}
                       style="opacity:0;width:0;height:0">
                <span class="slider round" style="position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;background-color:#334155;transition:.3s;border-radius:24px"></span>
              </label>
            </div>
            ${help}
          `;
          break;

        case 'radio':
          html += `
            <label style="font-size:0.84rem;font-weight:600;color:#CBD5E1;margin-bottom:6px">
              ${escapeHtml(field.label)} ${reqAsterisk}
            </label>
            <div style="display:flex;flex-direction:column;gap:8px;background:#0B1120;padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.06)">
              ${(field.options || []).map(opt => `
                <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:0.82rem;color:#E2E8F0">
                  <input type="radio"
                         name="${field.field_key}"
                         value="${escapeHtml(opt.value)}"
                         ${String(val) === String(opt.value) ? 'checked' : ''}
                         style="accent-color:#10B981">
                  ${escapeHtml(opt.label || opt.value)}
                </label>
              `).join('')}
            </div>
            ${help}
          `;
          break;

        default:
          html += `
            <label style="font-size:0.84rem;font-weight:600;color:#CBD5E1;margin-bottom:4px">
              ${escapeHtml(field.label)} ${reqAsterisk}
            </label>
            <input type="text"
                   class="adm-input dyn-input"
                   id="dyn-${field.field_key}"
                   name="${field.field_key}"
                   value="${escapeHtml(String(val))}"
                   style="width:100%">
            ${help}
          `;
          break;
      }

      html += `</div>`;
    });

    html += `</div>`;
    container.innerHTML = html;

    // Attach real-time conditional evaluation listeners
    this.attachConditionalListeners(template);
    this.evaluateConditions(template);
  }

  // --- RECURSIVE CONDITIONAL LOGIC ENGINE ---
  attachConditionalListeners(template) {
    const inputs = document.querySelectorAll('#pt-dynamic-fields-container input, #pt-dynamic-fields-container select, #pt-dynamic-fields-container textarea');
    inputs.forEach(input => {
      input.addEventListener('input', () => {
        this.extractDynamicData();
        this.evaluateConditions(template);
        this.scheduleDraftSave();
      });
      input.addEventListener('change', () => {
        this.extractDynamicData();
        this.evaluateConditions(template);
        this.scheduleDraftSave();
      });
    });
  }

  evaluateConditions(template) {
    if (!template.fields) return;

    template.fields.forEach(field => {
      const wrap = document.getElementById(`dyn-wrap-${field.field_key}`);
      if (!wrap) return;

      if (!field.conditions || !field.conditions.length) {
        wrap.style.display = 'flex';
        return;
      }

      let isVisible = true;
      field.conditions.forEach(cond => {
        const parentVal = this.formData.dynamicData[cond.field_key];
        if (cond.operator === 'equals' && String(parentVal) !== String(cond.value)) {
          isVisible = false;
        } else if (cond.operator === 'not_equals' && String(parentVal) === String(cond.value)) {
          isVisible = false;
        } else if (cond.operator === 'not_empty' && (!parentVal || (Array.isArray(parentVal) && !parentVal.length))) {
          isVisible = false;
        } else if (cond.operator === 'contains' && (!Array.isArray(parentVal) || !parentVal.includes(cond.value))) {
          isVisible = false;
        }
      });

      wrap.style.display = isVisible ? 'flex' : 'none';
      const input = wrap.querySelector('input, select, textarea');
      if (input && !isVisible) {
        input.removeAttribute('required');
      } else if (input && isVisible && field.required) {
        input.setAttribute('required', 'true');
      }
    });
  }

  extractDynamicData() {
    const dynData = {};
    if (!this.activeTemplate || !this.activeTemplate.fields) return dynData;

    this.activeTemplate.fields.forEach(field => {
      const wrap = document.getElementById(`dyn-wrap-${field.field_key}`);
      if (!wrap || wrap.style.display === 'none') return;

      if (field.type === 'multi-select') {
        const checked = Array.from(wrap.querySelectorAll('.dyn-multicheck:checked')).map(cb => cb.value);
        dynData[field.field_key] = checked;
      } else if (field.type === 'toggle' || field.type === 'yes-no') {
        const toggle = wrap.querySelector('.dyn-toggle');
        dynData[field.field_key] = toggle ? toggle.checked : false;
      } else if (field.type === 'radio') {
        const selected = wrap.querySelector(`input[name="${field.field_key}"]:checked`);
        dynData[field.field_key] = selected ? selected.value : null;
      } else {
        const el = document.getElementById(`dyn-${field.field_key}`);
        if (el) {
          dynData[field.field_key] = field.type === 'number' ? (el.value !== '' ? Number(el.value) : null) : el.value;
        }
      }
    });

    this.formData.dynamicData = dynData;
    return dynData;
  }

  // --- STEP VIEWS AND RENDERING ---
  renderStepView() {
    // 1. Update Step Indicator Badges
    document.querySelectorAll('.pt-step-item').forEach((item, idx) => {
      const stepNum = idx + 1;
      item.classList.toggle('active', stepNum === this.currentStep);
      item.classList.toggle('completed', stepNum < this.currentStep);
    });

    // 2. Toggle Step Panels
    for (let s = 1; s <= this.totalSteps; s++) {
      const panel = document.getElementById(`pt-step-panel-${s}`);
      if (panel) {
        panel.style.display = s === this.currentStep ? 'block' : 'none';
      }
    }

    // 3. Step Specific Actions
    if (this.currentStep === 1) {
      this.attachStep1InputListeners();
    } else if (this.currentStep === 2) {
      if (this.formData.categoryId) {
        this.loadTemplateForCategory(this.formData.categoryId, this.formData.subcategory);
      }
    } else if (this.currentStep === 3) {
      this.renderSkillsPills();
      this.renderFilesList();
      this.attachStep3Listeners();
    } else if (this.currentStep === 4) {
      this.renderLocationAndSchedule();
      this.attachStep4And5Listeners();
    } else if (this.currentStep === 5) {
      this.calculateFeeBreakdown();
      this.attachStep4And5Listeners();
    } else if (this.currentStep === 6) {
      this.renderLiveReviewAndQualityCheck();
    }

    // 4. Update Footer Buttons
    const btnBack = document.getElementById('pt-btn-back');
    const btnNext = document.getElementById('pt-btn-next');
    const btnPublish = document.getElementById('pt-btn-publish');

    if (btnBack) btnBack.style.display = this.currentStep > 1 ? 'inline-block' : 'none';
    if (btnNext) btnNext.style.display = this.currentStep < this.totalSteps ? 'inline-block' : 'none';
    if (btnPublish) btnPublish.style.display = this.currentStep === this.totalSteps ? 'inline-block' : 'none';

    // Scroll modal top smoothly
    const modal = typeof document.querySelector === 'function' ? document.querySelector('#xe-pt-modal .modal') : null;
    if (modal) modal.scrollTop = 0;
  }

  attachStep1InputListeners() {
    const titleInput = document.getElementById('pt-input-title');
    if (titleInput && !titleInput.dataset.listened) {
      titleInput.dataset.listened = '1';
      titleInput.addEventListener('input', () => {
        titleInput.classList.remove('is-invalid');
        const err = document.getElementById('err-pt-title');
        if (err) err.style.display = 'none';
        const msg = document.getElementById('pt-validation-msg');
        if (msg) msg.style.display = 'none';
        this.scheduleDraftSave();
      });
    }

    const descInput = document.getElementById('pt-input-desc');
    if (descInput && !descInput.dataset.listened) {
      descInput.dataset.listened = '1';
      const updateCounter = () => {
        const len = descInput.value.trim().length;
        const counter = document.getElementById('pt-desc-counter');
        if (counter) {
          counter.textContent = len < 10 ? `${len}/10 min characters` : `✓ ${len} characters`;
          counter.style.color = len < 10 ? '#94A3B8' : '#10B981';
        }
      };
      descInput.addEventListener('input', () => {
        descInput.classList.remove('is-invalid');
        const err = document.getElementById('err-pt-desc');
        if (err) err.style.display = 'none';
        const msg = document.getElementById('pt-validation-msg');
        if (msg) msg.style.display = 'none';
        updateCounter();
        this.scheduleDraftSave();
      });
      updateCounter();
    }

    const catSelect = document.getElementById('pt-category');
    if (catSelect && !catSelect.dataset.listened) {
      catSelect.dataset.listened = '1';
      catSelect.addEventListener('change', () => {
        catSelect.classList.remove('is-invalid');
        const err = document.getElementById('err-pt-category');
        if (err) err.style.display = 'none';
        const msg = document.getElementById('pt-validation-msg');
        if (msg) msg.style.display = 'none';
        this.scheduleDraftSave();
      });
    }

    const subSelect = document.getElementById('pt-subcategory');
    if (subSelect && !subSelect.dataset.listened) {
      subSelect.dataset.listened = '1';
      subSelect.addEventListener('change', () => {
        subSelect.classList.remove('is-invalid');
        const err = document.getElementById('err-pt-subcategory');
        if (err) err.style.display = 'none';
        this.scheduleDraftSave();
      });
    }
  }

  attachStep4And5Listeners() {
    const meetInput = document.getElementById('pt-input-meeting-point');
    if (meetInput && !meetInput.dataset.listened) {
      meetInput.dataset.listened = '1';
      meetInput.addEventListener('input', () => {
        meetInput.classList.remove('is-invalid');
        const err = document.getElementById('err-pt-meeting-point');
        if (err) err.style.display = 'none';
        const msg = document.getElementById('pt-validation-msg');
        if (msg) msg.style.display = 'none';
        this.scheduleDraftSave();
      });
    }

    const budgetInput = document.getElementById('pt-input-budget');
    if (budgetInput && !budgetInput.dataset.listened) {
      budgetInput.dataset.listened = '1';
      budgetInput.addEventListener('input', () => {
        budgetInput.classList.remove('is-invalid');
        const err = document.getElementById('err-pt-budget');
        if (err) err.style.display = 'none';
        const msg = document.getElementById('pt-validation-msg');
        if (msg) msg.style.display = 'none';
        this.formData.budget = Number(budgetInput.value) || 0;
        this.calculateFeeBreakdown();
        this.scheduleDraftSave();
      });
    }

    const deliveryInput = document.getElementById('pt-input-delivery');
    if (deliveryInput && !deliveryInput.dataset.listened) {
      deliveryInput.dataset.listened = '1';
      deliveryInput.addEventListener('input', () => {
        deliveryInput.classList.remove('is-invalid');
        const err = document.getElementById('err-pt-delivery');
        if (err) err.style.display = 'none';
        const msg = document.getElementById('pt-validation-msg');
        if (msg) msg.style.display = 'none';
        this.formData.deliveryHours = Number(deliveryInput.value) || 24;
        this.scheduleDraftSave();
      });
    }

    const durationInput = document.getElementById('pt-input-duration');
    if (durationInput && !durationInput.dataset.listened) {
      durationInput.dataset.listened = '1';
      durationInput.addEventListener('input', () => {
        durationInput.classList.remove('is-invalid');
        const err = document.getElementById('err-pt-duration');
        if (err) err.style.display = 'none';
        const msg = document.getElementById('pt-validation-msg');
        if (msg) msg.style.display = 'none';
        this.formData.durationMinutes = Number(durationInput.value) || 30;
        this.scheduleDraftSave();
      });
    }
  }

  clearInlineErrors() {
    document.querySelectorAll('#xe-pt-modal .is-invalid').forEach(el => el.classList.remove('is-invalid'));
    document.querySelectorAll('#xe-pt-modal .pt-inline-err').forEach(el => { el.textContent = ''; el.style.display = 'none'; });
    const valMsg = document.getElementById('pt-validation-msg');
    if (valMsg) { valMsg.textContent = ''; valMsg.style.display = 'none'; }
  }

  showFieldError(fieldId, errId, message) {
    const el = document.getElementById(fieldId);
    if (el) {
      el.classList.add('is-invalid');
      el.focus();
    }
    const errEl = document.getElementById(errId);
    if (errEl) {
      errEl.textContent = '⚠️ ' + message;
      errEl.style.display = 'flex';
    }
    const valMsg = document.getElementById('pt-validation-msg');
    if (valMsg) {
      valMsg.textContent = '⚠️ ' + message;
      valMsg.style.display = 'inline-block';
    }
    toast(message, 'warning');
  }

  validateCurrentStep() {
    this.clearInlineErrors();

    if (this.currentStep === 1) {
      const titleEl = document.getElementById('pt-input-title');
      const title = titleEl ? titleEl.value.trim() : '';
      const catEl = document.getElementById('pt-category');
      const cat = catEl ? catEl.value : '';
      const descEl = document.getElementById('pt-input-desc');
      const desc = descEl ? descEl.value.trim() : '';

      if (!title || title.length < 5) {
        this.showFieldError('pt-input-title', 'err-pt-title', 'Please enter a descriptive task title (min 5 chars)');
        return false;
      }
      if (!cat) {
        this.showFieldError('pt-category', 'err-pt-category', 'Please select a marketplace category');
        return false;
      }
      if (!desc || desc.length < 10) {
        this.showFieldError('pt-input-desc', 'err-pt-desc', 'Please enter at least 10 characters for description (currently ' + (desc ? desc.length : 0) + ')');
        return false;
      }
      return true;
    } else if (this.currentStep === 2) {
      this.extractDynamicData();
      if (this.activeTemplate && this.activeTemplate.fields) {
        for (const field of this.activeTemplate.fields) {
          const wrap = document.getElementById(`dyn-wrap-${field.field_key}`);
          if (wrap && wrap.style.display !== 'none' && field.required) {
            const val = this.formData.dynamicData[field.field_key];
            if (val === undefined || val === null || val === '' || (Array.isArray(val) && !val.length)) {
              const input = wrap.querySelector('input, select, textarea');
              if (input) {
                input.classList.add('is-invalid');
                input.focus();
              }
              const valMsg = document.getElementById('pt-validation-msg');
              if (valMsg) {
                valMsg.textContent = `⚠️ Required: ${field.label}`;
                valMsg.style.display = 'inline-block';
              }
              toast(`Please complete required field: ${field.label}`, 'warning');
              return false;
            }
          }
        }
      }
      return true;
    } else if (this.currentStep === 4) {
      if (this.taskType === 'physical') {
        const loc = document.getElementById('pt-input-meeting-point')?.value.trim();
        if (!loc) {
          this.showFieldError('pt-input-meeting-point', 'err-pt-meeting-point', 'Please specify a meeting point or physical address');
          return false;
        }
      }
      return true;
    } else if (this.currentStep === 5) {
      const budget = Number(document.getElementById('pt-input-budget')?.value);
      if (!budget || budget < 20) {
        const sym = this.formData.currency === 'USD' ? '$' : (this.formData.currency === 'EUR' ? '€' : (this.formData.currency === 'GBP' ? '£' : '৳'));
        this.showFieldError('pt-input-budget', 'err-pt-budget', `Budget must be at least ${sym}20`);
        return false;
      }
      const delivery = Number(document.getElementById('pt-input-delivery')?.value);
      if (!delivery || delivery < 1) {
        this.showFieldError('pt-input-delivery', 'err-pt-delivery', 'Delivery SLA must be at least 1 hour');
        return false;
      }
      const duration = Number(document.getElementById('pt-input-duration')?.value);
      if (!duration || duration < 5) {
        this.showFieldError('pt-input-duration', 'err-pt-duration', 'Estimated duration must be at least 5 minutes');
        return false;
      }
      return true;
    }
    return true;
  }

  validateAllSteps() {
    this.clearInlineErrors();

    // 1. Validate Step 1
    const title = (this.formData.title || '').trim();
    const cat = this.formData.categoryId;
    const desc = (this.formData.description || '').trim();

    if (!title || title.length < 5) {
      this.goToStep(1);
      this.showFieldError('pt-input-title', 'err-pt-title', 'Please enter a descriptive task title (min 5 chars)');
      return false;
    }
    if (!cat) {
      this.goToStep(1);
      this.showFieldError('pt-category', 'err-pt-category', 'Please select a marketplace category');
      return false;
    }
    if (!desc || desc.length < 10) {
      this.goToStep(1);
      this.showFieldError('pt-input-desc', 'err-pt-desc', 'Please enter at least 10 characters for description');
      return false;
    }

    // 2. Validate Step 2 (Dynamic Fields)
    if (this.activeTemplate && this.activeTemplate.fields) {
      for (const field of this.activeTemplate.fields) {
        if (field.required) {
          const val = this.formData.dynamicData ? this.formData.dynamicData[field.field_key] : null;
          if (val === undefined || val === null || val === '' || (Array.isArray(val) && !val.length)) {
            this.goToStep(2);
            toast(`Please complete required field: ${field.label}`, 'warning');
            return false;
          }
        }
      }
    }

    // 3. Validate Step 4 (Physical)
    if (this.taskType === 'physical') {
      const loc = (this.formData.locationText || '').trim();
      if (!loc) {
        this.goToStep(4);
        this.showFieldError('pt-input-meeting-point', 'err-pt-meeting-point', 'Please specify a meeting point or physical address');
        return false;
      }
    }

    // 4. Validate Step 5
    const budget = Number(this.formData.budget);
    if (!budget || budget < 20) {
      this.goToStep(5);
      const sym = this.formData.currency === 'USD' ? '$' : (this.formData.currency === 'EUR' ? '€' : (this.formData.currency === 'GBP' ? '£' : '৳'));
      this.showFieldError('pt-input-budget', 'err-pt-budget', `Budget must be at least ${sym}20`);
      return false;
    }
    const delivery = Number(this.formData.deliveryHours);
    if (!delivery || delivery < 1) {
      this.goToStep(5);
      this.showFieldError('pt-input-delivery', 'err-pt-delivery', 'Delivery SLA must be at least 1 hour');
      return false;
    }

    return true;
  }

  extractStepData() {
    // Step 1
    const titleEl = document.getElementById('pt-input-title');
    if (titleEl) this.formData.title = titleEl.value.trim();

    const catEl = document.getElementById('pt-category');
    if (catEl) {
      this.formData.categoryId = Number(catEl.value);
      const catObj = this.categoriesCache.find(c => String(c.id) === String(catEl.value));
      if (catObj) this.formData.categoryName = catObj.name;
    }

    const subEl = document.getElementById('pt-subcategory');
    if (subEl) this.formData.subcategory = subEl.value;

    const proEl = document.getElementById('pt-pro-level');
    if (proEl) this.formData.proLevel = proEl.value;

    const descEl = document.getElementById('pt-input-desc');
    if (descEl) this.formData.description = descEl.value.trim();

    // Step 2
    this.extractDynamicData();

    // Step 3
    const specEl = document.getElementById('pt-special-instructions');
    if (specEl) this.formData.specialInstructions = specEl.value.trim();

    // Step 4
    if (this.taskType === 'physical') {
      const distEl = document.getElementById('pt-select-district');
      if (distEl) this.formData.district = distEl.value;
      const areaEl = document.getElementById('pt-select-area');
      if (areaEl) this.formData.area = areaEl.value;
      const meetEl = document.getElementById('pt-input-meeting-point');
      if (meetEl) this.formData.locationText = meetEl.value.trim();
      const privEl = document.getElementById('pt-location-privacy');
      if (privEl) this.formData.exactLocationPrivacy = privEl.checked ? 'hired_only' : 'public';
    } else {
      const modeEl = document.querySelector('input[name="pt-work-mode"]:checked');
      if (modeEl) this.formData.workMode = modeEl.value;
      const commEl = document.getElementById('pt-comm-pref');
      if (commEl) this.formData.communicationPref = commEl.value;
    }

    const dateEl = document.getElementById('pt-preferred-date');
    if (dateEl) this.formData.preferredDate = dateEl.value;
    const timeEl = document.getElementById('pt-preferred-timeslot');
    if (timeEl) this.formData.preferredTimeSlot = timeEl.value;
    const urgEl = document.getElementById('pt-urgent-toggle');
    if (urgEl) this.formData.isUrgent = urgEl.checked;

    // Step 5
    const budgetEl = document.getElementById('pt-input-budget');
    if (budgetEl) this.formData.budget = Number(budgetEl.value) || 250;
    const curEl = document.getElementById('pt-select-currency');
    if (curEl) this.formData.currency = curEl.value;
    const durEl = document.getElementById('pt-input-duration');
    if (durEl) this.formData.durationMinutes = Number(durEl.value) || 30;
    const delEl = document.getElementById('pt-input-delivery');
    if (delEl) this.formData.deliveryHours = Number(delEl.value) || 24;

    const minRatEl = document.getElementById('pt-crit-rating');
    if (minRatEl) this.formData.workerCriteria.minRating = Number(minRatEl.value) || 0;
    const verifEl = document.getElementById('pt-crit-verified');
    if (verifEl) this.formData.workerCriteria.verificationRequired = verifEl.checked;
    const minTasksEl = document.getElementById('pt-crit-tasks');
    if (minTasksEl) this.formData.workerCriteria.minCompletedTasks = Number(minTasksEl.value) || 0;
  }

  syncFormUiFromData() {
    const setVal = (id, val) => { const el = document.getElementById(id); if (el && val !== undefined) el.value = val; };

    setVal('pt-input-title', this.formData.title);
    setVal('pt-category', this.formData.categoryId);
    setVal('pt-subcategory', this.formData.subcategory);
    setVal('pt-pro-level', this.formData.proLevel);
    setVal('pt-input-desc', this.formData.description);
    setVal('pt-special-instructions', this.formData.specialInstructions);
    setVal('pt-input-budget', this.formData.budget);
    setVal('pt-select-currency', this.formData.currency || 'BDT');
    setVal('pt-input-duration', this.formData.durationMinutes);
    setVal('pt-input-delivery', this.formData.deliveryHours);

    const urg = document.getElementById('pt-urgent-toggle');
    if (urg) urg.checked = !!this.formData.isUrgent;

    this.renderSkillsPills();
    this.renderFilesList();
  }

  // --- SKILLS TAGGER & AUTO-SUGGEST ---
  renderSkillsPills() {
    const box = document.getElementById('pt-skills-container');
    if (!box) return;

    box.innerHTML = (this.formData.skills || []).map(skill => `
      <span class="pt-skill-pill" style="display:inline-flex;align-items:center;gap:6px;background:rgba(16,185,129,0.12);border:1px solid rgba(16,185,129,0.3);color:#6EE7B7;padding:4px 10px;border-radius:20px;font-size:0.78rem;font-weight:600">
        ${escapeHtml(skill)}
        <button type="button" onclick="window.xePostEngine.removeSkill('${escapeHtml(skill)}')" style="background:none;border:none;color:#6EE7B7;cursor:pointer;padding:0;font-size:0.85rem;line-height:1">×</button>
      </span>
    `).join('');
  }

  attachStep3Listeners() {
    const skillInput = document.getElementById('pt-skill-input');
    const addBtn = document.getElementById('pt-btn-add-skill');

    if (skillInput && !skillInput.dataset.listened) {
      skillInput.dataset.listened = '1';
      skillInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.addSkill(skillInput.value);
        }
      });
    }

    if (addBtn && !addBtn.dataset.listened) {
      addBtn.dataset.listened = '1';
      addBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const val = skillInput ? skillInput.value : '';
        this.addSkill(val);
      });
    }
  }

  addSkill(skillInput) {
    const raw = String(skillInput || '').trim();
    if (!raw) {
      toast('Please enter a skill name to add (e.g. Photoshop, Excel)', 'info');
      const input = document.getElementById('pt-skill-input');
      if (input) input.focus();
      return;
    }
    const items = raw.split(/[,;\n]+/).map(s => s.trim().toLowerCase()).filter(Boolean);
    if (!this.formData.skills) this.formData.skills = [];
    let added = 0;
    for (const clean of items) {
      if (!this.formData.skills.includes(clean)) {
        this.formData.skills.push(clean);
        added++;
      }
    }
    if (added > 0) {
      this.renderSkillsPills();
      this.scheduleDraftSave();
      toast(`Added ${added} skill tag${added > 1 ? 's' : ''}! 🏷️`, 'success');
    } else {
      toast(`"${raw}" is already in your skills list`, 'warning');
    }
    const input = document.getElementById('pt-skill-input');
    if (input) {
      input.value = '';
      input.focus();
    }
  }

  removeSkill(skillName) {
    this.formData.skills = (this.formData.skills || []).filter(s => s !== skillName);
    this.renderSkillsPills();
    this.scheduleDraftSave();
  }

  // --- FILE ATTACHMENTS MANAGER ---
  renderFilesList() {
    const box = document.getElementById('pt-files-list');
    if (!box) return;

    if (!this.formData.files || !this.formData.files.length) {
      box.innerHTML = `<span style="color:#64748B;font-size:0.78rem">No files attached yet.</span>`;
      return;
    }

    box.innerHTML = this.formData.files.map((file, idx) => `
      <div style="display:flex;align-items:center;justify-content:space-between;background:#0F172A;padding:8px 12px;border-radius:6px;border:1px solid rgba(255,255,255,0.08);margin-bottom:6px">
        <div style="display:flex;align-items:center;gap:8px;overflow:hidden">
          <span style="font-size:1.1rem">📎</span>
          <span style="color:#E2E8F0;font-size:0.82rem;text-overflow:ellipsis;white-space:nowrap;overflow:hidden">${escapeHtml(file.name)}</span>
          <small style="color:#94A3B8;font-size:0.72rem">(${file.sizeStr || 'Ready'})</small>
        </div>
        <button type="button" onclick="window.xePostEngine.removeFile(${idx})" style="background:none;border:none;color:#EF4444;cursor:pointer;font-size:0.9rem">🗑️</button>
      </div>
    `).join('');
  }

  handleFileUpload(filesList) {
    if (!filesList || !filesList.length) return;
    for (let i = 0; i < filesList.length; i++) {
      const file = filesList[i];
      if (file.size > 25 * 1024 * 1024) {
        toast(`File "${file.name}" exceeds 25MB limit.`, 'error');
        continue;
      }
      const sizeStr = file.size > 1024 * 1024 ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` : `${Math.round(file.size / 1024)} KB`;
      this.formData.files.push({
        name: file.name,
        size: file.size,
        sizeStr,
        type: file.type,
        url: `/uploads/sample-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
      });
    }
    this.renderFilesList();
    this.scheduleDraftSave();
    toast(`${filesList.length} file(s) attached.`, 'info');
  }

  removeFile(idx) {
    this.formData.files.splice(idx, 1);
    this.renderFilesList();
    this.scheduleDraftSave();
  }

  // --- LOCATION AND MAP ABSTRACTION ---
  renderLocationAndSchedule() {
    const isPhysical = this.taskType === 'physical';
    const locSection = document.getElementById('pt-physical-location-box');
    const onlineSection = document.getElementById('pt-online-workmode-box');

    if (locSection) locSection.style.display = isPhysical ? 'block' : 'none';
    if (onlineSection) onlineSection.style.display = isPhysical ? 'none' : 'block';

    if (isPhysical) {
      const distSelect = document.getElementById('pt-select-district');
      const areaSelect = document.getElementById('pt-select-area');
      if (distSelect && !distSelect.children.length) {
        distSelect.innerHTML = LocationProvider.getDistricts().map(d => `<option value="${d}" ${d === this.formData.district ? 'selected' : ''}>${d}</option>`).join('');
        distSelect.addEventListener('change', () => {
          this.formData.district = distSelect.value;
          this.updateAreasDropdown(distSelect.value);
        });
        this.updateAreasDropdown(this.formData.district || 'Dhaka');
      }
    }
  }

  updateAreasDropdown(district) {
    const areaSelect = document.getElementById('pt-select-area');
    if (!areaSelect) return;
    const areas = LocationProvider.getAreasForDistrict(district);
    areaSelect.innerHTML = areas.map(a => `<option value="${escapeHtml(a)}" ${a === this.formData.area ? 'selected' : ''}>${escapeHtml(a)}</option>`).join('');
  }

  // --- NON-AUTHORITATIVE AI SUGGESTIONS ---
  async triggerAiAssistance() {
    const btn = document.getElementById('pt-btn-ai-assist');
    const title = document.getElementById('pt-input-title')?.value.trim() || '';
    const desc = document.getElementById('pt-input-desc')?.value.trim() || '';

    if (title.length < 5 && desc.length < 10) {
      toast('Please write at least a basic title or sentence in description first so AI can analyze.', 'info');
      return;
    }

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `✨ Analyzing Scope...`;
    }

    try {
      const catId = document.getElementById('pt-category')?.value;
      const res = await api('/tasks/ai-assist', {
        method: 'POST',
        body: { title, description: desc, categoryId: catId }
      });

      if (res && res.suggestions) {
        this.displayAiSuggestionsModal(res.suggestions);
      }
    } catch (err) {
      toast('Could not generate AI suggestions. You can proceed manually.', 'warning');
    }

    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `✨ AI Auto-Suggest`;
    }
  }

  displayAiSuggestionsModal(sug) {
    const box = document.getElementById('pt-ai-suggestions-panel');
    if (!box) return;

    box.style.display = 'block';
    box.innerHTML = `
      <div style="background:#0F172A;border:1px solid rgba(139,92,246,0.3);border-radius:10px;padding:16px;margin-bottom:18px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
          <div style="display:flex;align-items:center;gap:8px">
            <span style="font-size:1.3rem">🤖</span>
            <div>
              <b style="color:#fff;font-size:0.92rem">AI Recommendations</b>
              <small style="color:#A78BFA;display:block">Confidence: ${sug.confidence_score}%</small>
            </div>
          </div>
          <button type="button" onclick="document.getElementById('pt-ai-suggestions-panel').style.display='none'" style="background:none;border:none;color:#94A3B8;cursor:pointer">✕</button>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">
          <div style="background:#1E293B;padding:10px;border-radius:8px">
            <small style="color:#94A3B8;display:block">Category & Subcategory</small>
            <b style="color:#10B981;font-size:0.86rem">${escapeHtml(sug.suggested_category_name)} → ${escapeHtml(sug.suggested_subcategory)}</b>
          </div>
          <div style="background:#1E293B;padding:10px;border-radius:8px">
            <small style="color:#94A3B8;display:block">Recommended Budget Range</small>
            <b style="color:#FBBF24;font-size:0.86rem">৳${sug.suggested_budget_range.min} – ৳${sug.suggested_budget_range.max}</b>
          </div>
        </div>

        <div style="margin-bottom:12px">
          <small style="color:#94A3B8;display:block;margin-bottom:4px">Recommended Skills:</small>
          <div style="display:flex;flex-wrap:wrap;gap:6px">
            ${(sug.suggested_skills || []).map(sk => `
              <span style="background:rgba(99,102,241,0.15);color:#A5B4FC;font-size:0.75rem;padding:3px 8px;border-radius:12px;font-weight:600">${escapeHtml(sk)}</span>
            `).join('')}
          </div>
        </div>

        ${sug.missing_info_tips && sug.missing_info_tips.length ? `
          <div style="background:rgba(234,179,8,0.1);border-left:3px solid #EAB308;padding:8px 12px;border-radius:4px;margin-bottom:12px">
            <b style="color:#FDE047;font-size:0.78rem">💡 Quality Tip:</b>
            <span style="color:#CBD5E1;font-size:0.78rem;display:block">${escapeHtml(sug.missing_info_tips[0])}</span>
          </div>
        ` : ''}

        <div style="display:flex;gap:10px;justify-content:flex-end">
          <button type="button" class="btn btn-outline-light btn-sm" onclick="document.getElementById('pt-ai-suggestions-panel').style.display='none'">Dismiss</button>
          <button type="button" class="btn btn-purple btn-sm" id="btn-apply-ai-suggestions">✓ Apply Suggestions</button>
        </div>
      </div>
    `;

    document.getElementById('btn-apply-ai-suggestions').onclick = () => {
      if (sug.suggested_category_id) {
        const catSel = document.getElementById('pt-category');
        if (catSel) {
          catSel.value = sug.suggested_category_id;
          catSel.dispatchEvent(new Event('change'));
        }
      }
      if (sug.suggested_subcategory) {
        setTimeout(() => {
          const subSel = document.getElementById('pt-subcategory');
          if (subSel) subSel.value = sug.suggested_subcategory;
        }, 100);
      }
      if (sug.suggested_skills) {
        sug.suggested_skills.forEach(sk => this.addSkill(sk));
      }
      if (sug.suggested_budget_range && sug.suggested_budget_range.min) {
        this.formData.budget = Math.round((sug.suggested_budget_range.min + sug.suggested_budget_range.max) / 2);
        const bInput = document.getElementById('pt-input-budget');
        if (bInput) bInput.value = this.formData.budget;
      }
      box.style.display = 'none';
      toast('AI suggestions applied! You can customize further.', 'success');
      this.scheduleDraftSave();
    };
  }

  // --- PRICING & ESCROW CALCULATOR ---
  async calculateFeeBreakdown() {
    const budget = Number(this.formData.budget) || 250;
    const currency = this.formData.currency || 'BDT';
    const sym = currency === 'USD' ? '$' : (currency === 'EUR' ? '€' : (currency === 'GBP' ? '£' : '৳'));
    const escrowBox = document.getElementById('pt-escrow-calculation-box');

    try {
      const res = await fetch('/api/pricing/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: budget,
          currency: currency,
          task: {
            category: this.formData.categoryName || this.formData.category,
            subcategory: this.formData.subcategory,
            task_type: this.taskType || 'online',
            campaign_code: this.formData.campaignCode || null
          }
        })
      });
      const data = await res.json();
      const calc = data.calculation || {};
      const clientFee = calc.client ? calc.client.fee_amount : 0;
      const clientFeePct = calc.client ? calc.client.effective_rate_percent : 0;
      const totalEscrow = calc.client ? calc.client.total_amount : budget;
      const workerCommissionPct = calc.worker ? calc.worker.effective_rate_percent : 10;
      const platformCommission = calc.worker ? calc.worker.fee_amount : Math.round(budget * (workerCommissionPct / 100));
      const workerNet = calc.worker ? calc.worker.net_amount : Math.max(0, budget - platformCommission);
      const appliedRuleName = (calc.rules_applied && calc.rules_applied[0]) ? calc.rules_applied[0].name : 'Standard Platform Base';

      this.formData.escrowBreakdown = {
        budget,
        currency,
        client_fee: clientFee,
        total_escrow_deposit: totalEscrow,
        platform_commission: platformCommission,
        estimated_worker_payout: workerNet,
        commission_pct: workerCommissionPct,
        applied_rule: appliedRuleName
      };

      if (escrowBox) {
        escrowBox.innerHTML = `
          <div style="background:#0F172A;border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:16px">
            <div style="display:flex;justify-content:space-between;margin-bottom:8px">
              <span style="color:#94A3B8;font-size:0.85rem">Task Budget:</span>
              <b style="color:#fff;font-size:0.95rem">${sym}${budget.toLocaleString()}</b>
            </div>
            <div style="display:flex;justify-content:space-between;margin-bottom:8px">
              <span style="color:#94A3B8;font-size:0.85rem">Platform Posting Fee (${clientFeePct}%):</span>
              <b style="color:${clientFee === 0 ? '#10B981' : '#F59E0B'};font-size:0.85rem">${clientFee === 0 ? `${sym}0.00 (FREE)` : `${sym}${clientFee}`}</b>
            </div>
            <div style="display:flex;justify-content:space-between;margin-bottom:12px;padding-top:8px;border-top:1px solid rgba(255,255,255,0.08)">
              <span style="color:#E2E8F0;font-size:0.9rem;font-weight:700">Total Escrow Hold:</span>
              <b style="color:#10B981;font-size:1.15rem;font-weight:800">${sym}${totalEscrow.toLocaleString()}</b>
            </div>
            <div style="background:rgba(16,185,129,0.06);border-left:3px solid #10B981;padding:8px 12px;border-radius:4px;font-size:0.75rem;color:#94A3B8">
              🔒 <b>Escrow Protection:</b> Funds remain safely in platform escrow until you approve the completed delivery.
              Freelancer receives net <b>${sym}${workerNet}</b> (${workerCommissionPct}% take-rate via <i>${appliedRuleName}</i>).
            </div>
          </div>
        `;
      }
    } catch (err) {
      console.warn('[pricing] Failed to fetch live pricing breakdown:', err);
    }
  }

  // --- LIVE REVIEW & QUALITY CHECK ---
  async renderLiveReviewAndQualityCheck() {
    this.extractStepData();
    const reviewBox = document.getElementById('pt-review-summary-card');
    const qualityBox = document.getElementById('pt-quality-check-card');
    const sym = this.formData.currency === 'USD' ? '$' : (this.formData.currency === 'EUR' ? '€' : (this.formData.currency === 'GBP' ? '£' : '৳'));

    // 1. Render Preview Card
    if (reviewBox) {
      reviewBox.innerHTML = `
        <div style="background:#0F172A;border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:20px">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px">
            <div>
              <span class="adm-status-chip ${this.taskType === 'online' ? 'blue' : 'green'}" style="margin-bottom:6px;display:inline-block">
                ${this.taskType === 'online' ? '💻 Online Task' : '🤝 Physical / On-Site Help'}
              </span>
              <h3 style="color:#fff;font-size:1.15rem;font-weight:800;margin:0 0 4px">${escapeHtml(this.formData.title || 'Untitled Task')}</h3>
              <small style="color:#A78BFA;font-weight:600">${escapeHtml(this.formData.categoryName || 'Category')} → ${escapeHtml(this.formData.subcategory || 'General')}</small>
            </div>
            <div style="text-align:right">
              <span style="color:#10B981;font-size:1.35rem;font-weight:800">${sym}${this.formData.budget}</span>
              <small style="color:#94A3B8;display:block">Delivery: ${this.formData.deliveryHours}h</small>
            </div>
          </div>

          <p style="color:#CBD5E1;font-size:0.86rem;line-height:1.5;margin-bottom:14px;white-space:pre-line">${escapeHtml(this.formData.description)}</p>

          ${this.taskType === 'physical' ? `
            <div style="background:#1E293B;padding:10px 14px;border-radius:8px;margin-bottom:14px;font-size:0.82rem;color:#E2E8F0">
              📍 <b>Location:</b> ${escapeHtml(this.formData.area || '')}, ${escapeHtml(this.formData.district || '')} • <i>${escapeHtml(this.formData.locationText || 'Meeting Point')}</i>
            </div>
          ` : ''}

          ${Object.keys(this.formData.dynamicData).length ? `
            <div style="background:#1E293B;padding:12px;border-radius:8px;margin-bottom:14px">
              <b style="color:#A5B4FC;font-size:0.78rem;text-transform:uppercase;letter-spacing:0.5px;display:block;margin-bottom:8px">⚙️ Task Specifications:</b>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:0.8rem">
                ${Object.entries(this.formData.dynamicData).map(([k, v]) => `
                  <div><span style="color:#94A3B8">${k.replace(/_/g, ' ')}:</span> <b style="color:#fff">${Array.isArray(v) ? v.join(', ') : String(v)}</b></div>
                `).join('')}
              </div>
            </div>
          ` : ''}

          <div style="display:flex;flex-wrap:wrap;gap:6px">
            ${(this.formData.skills || []).map(s => `
              <span style="background:rgba(255,255,255,0.06);color:#94A3B8;font-size:0.74rem;padding:3px 8px;border-radius:10px">${escapeHtml(s)}</span>
            `).join('')}
          </div>
        </div>
      `;
    }

    // 2. Perform Live Quality Assessment
    if (qualityBox) {
      qualityBox.innerHTML = `
        <div style="text-align:center;padding:14px;color:#94A3B8">
          <div class="adm-spinner" style="width:20px;height:20px;margin:0 auto 8px;border:2px solid rgba(255,255,255,0.1);border-top-color:#10B981;border-radius:50%;animation:spin 0.8s linear infinite"></div>
          Evaluating Task Quality & Readiness...
        </div>
      `;

      try {
        const res = await api('/tasks/quality-check', {
          method: 'POST',
          body: {
            title: this.formData.title,
            description: this.formData.description,
            budget: this.formData.budget,
            categoryId: this.formData.categoryId,
            taskType: this.taskType,
            locationText: this.formData.locationText,
            dynamicData: this.formData.dynamicData
          }
        });

        if (res && res.analysis) {
          const a = res.analysis;
          qualityBox.innerHTML = `
            <div style="background:#0F172A;border:1px solid ${a.is_ready ? 'rgba(16,185,129,0.3)' : 'rgba(234,179,8,0.3)'};border-radius:10px;padding:14px">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
                <div style="display:flex;align-items:center;gap:8px">
                  <span style="font-size:1.2rem">${a.is_ready ? '✅' : '⚠️'}</span>
                  <b style="color:#fff;font-size:0.9rem">Task Readiness Score: <span style="color:${a.is_ready ? '#10B981' : '#FBBF24'}">${a.score}/100</span></b>
                </div>
                <span class="adm-status-chip ${a.is_ready ? 'green' : 'orange'}">${a.status_label}</span>
              </div>

              ${a.warnings && a.warnings.length ? `
                <div style="color:#F87171;font-size:0.78rem;margin-bottom:6px">
                  ${a.warnings.map(w => `• ${escapeHtml(w)}`).join('<br>')}
                </div>
              ` : ''}

              ${a.recommendations && a.recommendations.length ? `
                <div style="color:#94A3B8;font-size:0.76rem">
                  💡 ${escapeHtml(a.recommendations[0])}
                </div>
              ` : ''}
            </div>
          `;
        }
      } catch (err) {
        qualityBox.innerHTML = '';
      }
    }
  }

  // --- PUBLISH TASK EXECUTION ---
  async publishTask() {
    this.extractStepData();
    if (!this.validateAllSteps()) return;

    const activeUser = getActiveUser();
    if (!activeUser) {
      if (typeof requireLogin === 'function') {
        requireLogin('Please login or create an account to publish your task and fund escrow');
      } else if (typeof openAuthModal === 'function') {
        openAuthModal('login');
      }
      return;
    }

    const btn = document.getElementById('pt-btn-publish');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Publishing Task to Marketplace...';
    }

    try {
      const res = await api('/tasks', {
        method: 'POST',
        body: {
          title: this.formData.title,
          description: this.formData.description,
          categoryId: Number(this.formData.categoryId),
          subcategory: this.formData.subcategory || null,
          proLevel: this.formData.proLevel || 'skilled',
          budget: Number(this.formData.budget),
          durationMinutes: Number(this.formData.durationMinutes),
          deliveryHours: Number(this.formData.deliveryHours),
          tags: this.formData.skills,
          taskType: this.taskType,
          locationText: this.taskType === 'physical' ? this.formData.locationText : null,
          area: this.taskType === 'physical' ? this.formData.area : null,
          district: this.taskType === 'physical' ? this.formData.district : null,
          isUrgent: !!this.formData.isUrgent,
          // Dynamic fields & schemas
          templateId: this.activeTemplate ? this.activeTemplate.id : null,
          templateVersion: this.activeTemplate ? this.activeTemplate.version : 1,
          templateSchemaSnapshot: this.activeTemplate ? this.activeTemplate.fields : null,
          dynamicData: this.formData.dynamicData,
          skills: this.formData.skills,
          workerCriteria: this.formData.workerCriteria,
          files: this.formData.files,
          workMode: this.formData.workMode,
          communicationPref: this.formData.communicationPref,
          budgetType: this.formData.budgetType,
          currency: this.formData.currency,
          escrowBreakdown: this.formData.escrowBreakdown,
          exactLocationPrivacy: this.formData.exactLocationPrivacy,
          initialStatus: 'open'
        }
      });

      // Clear draft upon successful creation
      await this.clearDraft();

      if (typeof closeModal === 'function') closeModal('xe-pt-modal');
      toast('🚀 Task published successfully! Qualified freelancers will apply in minutes.', 'success');
      document.dispatchEvent(new CustomEvent('xe:task-posted', { detail: res.task }));

      // If user is on /tasks or /task page, trigger refresh
      if (typeof loadTasks === 'function') loadTasks();

    } catch (err) {
      toast(err.message || 'Could not publish task. Please check your inputs.', 'error');
    }

    if (btn) {
      btn.disabled = false;
      btn.textContent = '🚀 Publish Task & Fund Escrow';
    }
  }
}

window.DynamicTaskPostingEngine = DynamicTaskPostingEngine;
