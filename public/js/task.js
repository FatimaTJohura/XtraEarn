/* XtraEarn — task workspace: detail + applicants + deliveries + chat + review */
document.addEventListener('DOMContentLoaded', () => {
  const id = new URLSearchParams(location.search).get('id');
  const detail = document.getElementById('task-detail');
  if (!id) { location.href = '/tasks'; return; }

  let task = null;
  let data = null;

  async function load() {
    try {
      data = await api(`/tasks/${id}`);
      task = data.task;
      render();
    } catch (err) {
      detail.innerHTML = `<div class="td-main"><div class="empty-state"><span class="big">😕</span>${escapeHtml(err.message)}</div></div><aside class="td-side"></aside>`;
    }
  }

  function render() {
    const t = task;
    document.title = `${t.title} — XtraEarn`;
    const me = Auth.user;
    const isOwner = me && t.clientId === me.id;
    const isHired = me && t.acceptedFreelancerId === me.id;

    detail.innerHTML = `
      <div class="td-main">
        ${categoryThumb(t)}
        <span class="chip chip-cat">${t.category?.icon || ''} ${escapeHtml(t.category?.name || 'Task')}</span>
        ${(t.isFeatured || t.is_featured) ? '<span class="chip" style="background:#FEF3C7;color:#D97706;border:1px solid #FCD34D;font-weight:800">🔥 Featured Bounty</span>' : ''}
        ${t.taskType === 'physical' ? '<span class="chip chip-physical">🤝 On-site work</span>' : ''}
        ${(t.isUrgent || t.is_urgent) ? '<span class="chip chip-urgent">⚡ Urgent</span>' : ''}
        <h1 class="td-title">${escapeHtml(t.title)}</h1>
        <div class="task-rating">${starsHtml(t.rating, t.ratingCount)}</div>
        ${t.taskType === 'physical' ? `
          <div class="location-banner">
            <b>📍 Location</b>
            <span>${escapeHtml(t.locationText || '—')}</span>
            <small>${escapeHtml([t.area, t.district].filter(Boolean).join(', '))}</small>
          </div>` : ''}
        <p class="td-desc">${escapeHtml(t.description)}</p>
        <div class="td-tags">${(t.tags || []).map(tag => `<span class="chip">#${escapeHtml(tag)}</span>`).join('')}</div>
        <div class="info-row"><span>Posted by</span><b>${escapeHtml(t.clientName || 'Anonymous')}</b></div>
        <div class="info-row"><span>Posted</span><b>${new Date(t.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</b></div>
        <div class="info-row"><span>Status</span><b>${statusLabel(t.status)}</b></div>
        <div id="workflow-area"></div>
      </div>
      <aside class="td-side">
        <div class="side-card" style="text-align:center">
          <div style="font-size:1.9rem;font-weight:800;letter-spacing:-.02em">${money(t.budget)}</div>
          <small style="color:var(--muted)">Fixed price · held in escrow until you approve</small>
          <div id="apply-area" style="margin-top:16px"></div>
          ${isOwner && t.status === 'open' ? `
            <div style="margin-top:12px;border-top:1px solid rgba(255,255,255,0.08);padding-top:12px">
              <button class="btn btn-block" onclick="openBoostTaskModal()" style="background:linear-gradient(135deg,#F59E0B,#D97706);color:#fff;font-weight:800;font-size:0.88rem;box-shadow:0 4px 14px rgba(245,158,11,0.35)">🚀 Boost &amp; Feature Task</button>
            </div>
          ` : ''}
          ${['completed', 'delivered'].includes(t.status) ? `
            <div style="margin-top:14px;border-top:1px solid rgba(255,255,255,0.08);padding-top:14px">
              <button class="btn btn-block" onclick="openInvoiceModal('task', '${t.id}')" style="background:#16A34A;color:#fff;font-weight:700;font-size:0.85rem">📄 Official Invoice</button>
            </div>
          ` : ''}
        </div>
        <div class="side-card">
          <h3>Task details</h3>
          <div class="info-row"><span>⏱ Time needed</span><b>~${timeLabel(t.durationMinutes)}</b></div>
          <div class="info-row"><span>🚚 Delivery</span><b>within ${t.deliveryHours}h</b></div>
          <div class="info-row"><span>📂 Category</span><b>${escapeHtml(t.category?.name || '')}</b></div>
          <div class="info-row"><span>🧾 Platform fee</span><b>${t.platformFee != null ? money(t.platformFee) + ' (10%)' : '10% on accept'}</b></div>
          <div class="info-row"><span>💰 Worker gets</span><b>${t.workerPayout != null ? money(t.workerPayout) : money(Math.round(t.budget * 0.9))}</b></div>
        </div>
        <div class="side-card" id="applicants-card">
          <h3>Applicants (${data.applications.filter(a => a.status !== 'withdrawn').length})</h3>
          <div id="applicants">
            ${data.applications.filter(a => a.status !== 'withdrawn').length ? data.applications.filter(a => a.status !== 'withdrawn').map(a => `
              <div class="applicant">
                ${avatarHtml(a.user.name, a.user.avatar_color, 32)}
                <div style="flex:1">
                  <b><a href="/profile?id=${a.user.id}" class="app-link">${escapeHtml(a.user.name)}</a>
                  ${a.user.is_verified && a.user.verified_as ? `<span class="vbadge">✔ ${escapeHtml(a.user.verified_as)}</span>` : ''}</b>
                  <small>${starsHtml(a.user.rating, undefined, true)} · ${a.user.tasks_completed || 0} tasks</small>
                </div>
                ${isOwner && a.status === 'pending' && t.status === 'open'
                  ? `<div class="app-actions">
                       <button class="btn-accept" data-app="${a.id}">Accept</button>
                       <button class="btn-reject" data-app="${a.id}">Reject</button>
                     </div>`
                  : `<span class="app-status">${{ pending: '⏳ pending', accepted: '✅ accepted', rejected: '❌ rejected' }[a.status] || a.status}</span>`}
              </div>`).join('') : '<p style="color:var(--muted);font-size:.86rem">No applicants yet — be the first!</p>'}
          </div>
        </div>
      </aside>`;

    renderWorkflow(isOwner, isHired);
    renderApplyArea(isOwner, isHired);
    bindActions(isOwner, isHired);
  }

  /* ---- workflow: deliveries + chat + review ---- */
  function renderWorkflow(isOwner, isHired) {
    const area = document.getElementById('workflow-area');
    if (!isOwner && !isHired) { area.innerHTML = ''; return; }

    const deliveryHtml = data.deliveries.length ? data.deliveries.map(d => `
      <div class="delivery ${d.status}">
        <div class="delivery-head">
          ${avatarHtml(d.workerName, d.workerColor, 28)}
          <b>${escapeHtml(d.workerName)}</b> submitted work
          <span class="delivery-status">${{ submitted: '⏳ Awaiting review', approved: '✅ Approved & paid', rejected: '❌ Sent back for rework' }[d.status]}</span>
          <small>${new Date(d.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</small>
        </div>
        ${d.note ? `<p class="delivery-note">${escapeHtml(d.note)}</p>` : ''}
        ${d.file_path ? `<a class="delivery-file" href="${d.file_path}" download>📎 ${escapeHtml(d.file_name || 'Attached file')}</a>` : ''}
        ${d.link ? `<a class="delivery-file" href="${escapeHtml(d.link)}" target="_blank" rel="noopener">🔗 Open submitted link</a>` : ''}
        ${isOwner && d.status === 'submitted' ? `
          <div class="delivery-actions">
            <button class="btn btn-green btn-sm" data-approve="${d.id}">Approve & Pay ${money(t.workerPayout || task.workerPayout || Math.round(task.budget * 0.9))}</button>
            <button class="btn btn-sm btn-reject2" data-rejectd="${d.id}">Request rework</button>
          </div>` : ''}
      </div>`).join('') : '';

    const chatHtml = `
      <div class="chat-card">
        <h3>💬 Task chat</h3>
        <div class="chat-log" id="chat-log">
          ${data.messages.length ? data.messages.map(m => `
            <div class="chat-msg ${Auth.user && m.sender_id === Auth.user.id ? 'mine' : ''}">
              <b>${escapeHtml(m.senderName || 'User')}</b>
              <span>${escapeHtml(m.body)}</span>
              <small>${new Date(m.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</small>
            </div>`).join('') : '<p class="chat-empty">No messages yet — say hello 👋</p>'}
        </div>
        <form class="chat-form" id="chat-form">
          <input type="text" id="chat-input" placeholder="Type a message..." maxlength="2000" autocomplete="off">
          <button class="btn btn-green" type="submit">Send</button>
        </form>
      </div>`;

    const workerSubmit = (isHired && ['in_progress', 'delivered'].includes(task.status)) ? `
      <div class="submit-card">
        <h3>📤 Submit your work</h3>
        <form id="delivery-form">
          <input type="hidden" name="taskId" value="${task.id}">
          <label>Note for the client
            <textarea name="note" rows="2" placeholder="Describe what you did or add instructions"></textarea>
          </label>
          <div class="form-row">
            <label>Attach file <small>(optional, max 10MB)</small>
              <input type="file" name="file">
            </label>
            <label>Or a link <small>(Drive/WeTransfer)</small>
              <input type="url" name="link" placeholder="https://...">
            </label>
          </div>
          <button class="btn btn-green btn-block" type="submit">Submit delivery</button>
        </form>
      </div>` : '';

    const reviewHtml = task.status === 'completed' ? (`
      <div class="review-card">
        <h3>⭐ ${data.review ? 'Task reviewed' : isOwner ? 'Rate the worker' : isHired ? 'Client review' : ''}</h3>
        ${data.review
          ? `<div class="review-done">${'★'.repeat(data.review.rating)} <span class="stars-off">${'★'.repeat(5 - data.review.rating)}</span>
             ${data.review.comment ? `<p>"${escapeHtml(data.review.comment)}"</p>` : ''}</div>`
          : isOwner ? `
          <form id="review-form">
            <div class="star-picker" id="star-picker">
              ${[1, 2, 3, 4, 5].map(i => `<button type="button" class="star-btn" data-star="${i}">★</button>`).join('')}
              <input type="hidden" name="rating" id="review-rating" value="5">
            </div>
            <label>Comment <small>(optional)</small>
              <textarea name="comment" rows="2" placeholder="How was the work?"></textarea>
            </label>
            <button class="btn btn-green btn-block" type="submit">Submit review</button>
          </form>` : '<p style="color:var(--muted);font-size:.86rem">The client has not reviewed yet.</p>'}
      </div>`) : '';

    area.innerHTML = `
      <div class="workspace">
        <h3 class="ws-title">${isOwner ? '🛠 Manage this task' : '🛠 Your workspace'}</h3>
        ${workerSubmit}
        ${deliveryHtml}
        ${reviewHtml}
        ${chatHtml}
      </div>`;
  }

  function renderApplyArea(isOwner, isHired) {
    const area = document.getElementById('apply-area');
    if (isOwner) {
      area.innerHTML = `<div class="applied-note">📌 You posted this task</div>`;
      return;
    }
    if (isHired) {
      area.innerHTML = `<div class="applied-note">🎉 You are hired for this task</div>`;
      return;
    }
    if (task.status !== 'open') {
      area.innerHTML = `<div class="applied-note" style="background:#FEF3C7;border-color:#FDE68A;color:#92400E">🔒 This task is no longer accepting applications</div>`;
      return;
    }
    if (data.applied) {
      area.innerHTML = `
        <div class="applied-note">✅ Application submitted!</div>
        <button class="btn btn-block" id="btn-withdraw" style="margin-top:10px;border:1.5px solid var(--line)">Withdraw application</button>`;
      return;
    }
    area.innerHTML = `
      <button class="btn btn-green btn-block btn-lg" id="btn-apply">Apply for this task</button>
      <small style="display:block;color:var(--muted);margin-top:10px">One click to apply · cancel anytime</small>`;
  }

  function bindActions(isOwner, isHired) {
    // accept / reject applications
    detail.querySelectorAll('.btn-accept, .btn-reject').forEach(btn => {
      btn.addEventListener('click', async () => {
        const accepting = btn.classList.contains('btn-accept');
        try {
          const res = await api(`/applications/${btn.dataset.app}/${accepting ? 'accept' : 'reject'}`, { method: 'POST' });
          if (accepting) {
            toast(`Accepted! ${money(res.escrow.payout)} escrow held — fee ${money(res.escrow.fee)} 🎉`);
          } else {
            toast('Application rejected');
          }
          load();
        } catch (err) {
          if (err.status === 402) {
            toast(err.message, 'error');
            if (confirm(`Your balance is ${money(err.balance || 0)} but escrow needs ${money(err.needed || 0)}.\nOpen your wallet to deposit?`)) {
              location.href = '/wallet';
            }
          } else toast(err.message, 'error');
        }
      });
    });

    // apply / withdraw
    const applyBtn = detail.querySelector('#btn-apply');
    if (applyBtn) applyBtn.addEventListener('click', async () => {
      if (!requireLogin('Login to apply for this task')) return;
      try {
        await api(`/tasks/${id}/apply`, { method: 'POST', body: { message: 'I can complete this task on time with high quality.' } });
        toast('Applied successfully! The client will review your profile 🎉');
        load();
      } catch (err) { toast(err.message, 'error'); }
    });
    const wd = detail.querySelector('#btn-withdraw');
    if (wd) wd.addEventListener('click', async () => {
      try {
        await api(`/tasks/${id}/apply`, { method: 'DELETE' });
        toast('Application withdrawn');
        load();
      } catch (err) { toast(err.message, 'error'); }
    });

    // approve / reject delivery
    detail.querySelectorAll('[data-approve]').forEach(btn => btn.addEventListener('click', async () => {
      try {
        const res = await api(`/deliveries/${btn.dataset.approve}/approve`, { method: 'POST' });
        toast(`Payment released: ${money(res.payout)} sent to the worker 🤑`);
        load();
      } catch (err) { toast(err.message, 'error'); }
    }));
    detail.querySelectorAll('[data-rejectd]').forEach(btn => btn.addEventListener('click', async () => {
      try {
        await api(`/deliveries/${btn.dataset.rejectd}/reject`, { method: 'POST' });
        toast('Sent back for rework');
        load();
      } catch (err) { toast(err.message, 'error'); }
    }));

    // submit delivery (multipart)
    const dform = detail.querySelector('#delivery-form');
    if (dform) dform.addEventListener('submit', async e => {
      e.preventDefault();
      const fd = new FormData(dform);
      const hasFile = fd.get('file') && fd.get('file').size > 0;
      if (!fd.get('note') && !fd.get('link') && !hasFile) { toast('Add a note, link or file', 'error'); return; }
      const btn = dform.querySelector('button[type=submit]');
      btn.disabled = true; btn.textContent = 'Submitting...';
      try {
        const res = await fetch('/api/deliveries', {
          method: 'POST',
          headers: { Authorization: `Bearer ${Auth.token}` },
          body: fd
        });
        const json = await res.json().catch(() => null);
        if (!res.ok) throw new Error((json && json.error) || 'Upload failed');
        toast('Work submitted! The client will review it 📤');
        load();
      } catch (err) { toast(err.message, 'error'); }
      btn.disabled = false; btn.textContent = 'Submit delivery';
    });

    // chat
    const cform = detail.querySelector('#chat-form');
    if (cform) cform.addEventListener('submit', async e => {
      e.preventDefault();
      const input = document.getElementById('chat-input');
      const body = input.value.trim();
      if (!body) return;
      try {
        await api(`/tasks/${id}/messages`, { method: 'POST', body: { body } });
        input.value = '';
        load();
      } catch (err) { toast(err.message, 'error'); }
    });

    // star picker
    detail.querySelectorAll('.star-btn').forEach(b => b.addEventListener('click', () => {
      const v = Number(b.dataset.star);
      document.getElementById('review-rating').value = v;
      detail.querySelectorAll('.star-btn').forEach(x =>
        x.classList.toggle('on', Number(x.dataset.star) <= v));
    }));
    // default 5 stars lit
    detail.querySelectorAll('.star-btn').forEach(x => x.classList.add('on'));

    // review
    const rform = detail.querySelector('#review-form');
    if (rform) rform.addEventListener('submit', async e => {
      e.preventDefault();
      try {
        await api(`/tasks/${id}/review`, {
          method: 'POST',
          body: { rating: Number(document.getElementById('review-rating').value), comment: rform.comment.value }
        });
        toast('Thanks for the review! ⭐');
        load();
      } catch (err) { toast(err.message, 'error'); }
    });
  }

  /* ============================================================
     CLIENT TASK BOOST & PROMOTION CONTROLLER
     ============================================================ */
  let activeBoostPlans = [];
  let selectedBoostPlanKey = 'category_spotlight';

  window.openBoostTaskModal = async function() {
    try {
      const res = await api('/tasks/boost-plans');
      activeBoostPlans = res.items || [];
      const selector = document.getElementById('boost-plans-selector');
      if (selector && activeBoostPlans.length) {
        selector.innerHTML = activeBoostPlans.map((p, idx) => `
          <div class="boost-plan-card ${p.key === selectedBoostPlanKey ? 'selected' : ''}" data-bp-key="${p.key}" onclick="selectBoostPlan('${p.key}', ${p.price})">
            <div class="boost-plan-top">
              <span class="boost-plan-title">${escapeHtml(p.title)}</span>
              <span class="boost-plan-price">৳${p.price}</span>
            </div>
            <div style="font-size:0.75rem;color:#38BDF8;font-weight:700">⏱ ${p.duration_days} Days · ${p.reach_multiplier} reach boost</div>
            <ul class="boost-plan-perks">
              ${(p.perks || []).map(perk => `<li>${escapeHtml(perk)}</li>`).join('')}
            </ul>
          </div>
        `).join('');
      }
      openModal('modal-boost-task');
    } catch (err) {
      toast('Could not load boost plans: ' + err.message, 'error');
    }
  };

  window.selectBoostPlan = function(key, price) {
    selectedBoostPlanKey = key;
    document.querySelectorAll('#boost-plans-selector .boost-plan-card').forEach(c => {
      c.classList.toggle('selected', c.getAttribute('data-bp-key') === key);
    });
    setElText('boost-plan-fee-display', `৳${Number(price || 100).toLocaleString()}`);
  };

  window.handleBoostTaskSubmit = async function(e) {
    e.preventDefault();
    try {
      const res = await api(`/tasks/${id}/boost`, {
        method: 'POST',
        body: { plan: selectedBoostPlanKey }
      });
      closeModal('modal-boost-task');
      toast(`🚀 Success! Task promoted with ${res.plan.title}.`, 'success');
      load();
    } catch (err) {
      if (err.needed) {
        toast(`Insufficient wallet balance. Needed: ৳${err.needed}, Balance: ৳${err.balance}. Please top up your wallet.`, 'error');
      } else {
        toast('Boost failed: ' + err.message, 'error');
      }
    }
  };

  document.addEventListener('xe:auth', load);
  load();
});
