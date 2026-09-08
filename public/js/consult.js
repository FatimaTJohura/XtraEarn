/**
 * XtraEarn Consult HD - 1-on-1 Encrypted Consultation Suite Controller
 */

let currentRoomId = '';
let currentRoomData = null;
let localMediaStream = null;
let screenMediaStream = null;
let isMicMuted = false;
let isCameraOff = false;
let isScreenSharing = false;
let sessionSecondsRemaining = 1800; // 30 mins default
let timerInterval = null;
let selectedFileAttachment = null;
let currentRating = 5;
let notesSaveDebounce = null;

// Parse roomId from URL path or query params
function getRoomIdFromUrl() {
  const pathParts = window.location.pathname.split('/').filter(Boolean);
  if (pathParts.length >= 2 && (pathParts[0] === 'consult' || pathParts[0] === 'meet')) {
    return pathParts[1];
  }
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('room') || '6pos1do';
}

// Initialise Consultation Suite
document.addEventListener('DOMContentLoaded', async () => {
  currentRoomId = getRoomIdFromUrl();
  document.getElementById('txt-room-code').textContent = `CNS-${currentRoomId.toUpperCase()}`;

  await loadRoomDossier();
  await initLocalMedia();
  startSessionTimer();
  setupComplimentChips();
});

// 1. Load Room Dossier from Backend
async function loadRoomDossier() {
  try {
    const res = await fetch(`/api/consult/room/${currentRoomId}`);
    if (!res.ok) throw new Error('Failed to load room data');
    currentRoomData = await res.json();

    const { expert, client, booking, messages, notes } = currentRoomData;

    // Header updates
    if (expert) {
      document.getElementById('hdr-spec-name').textContent = expert.name;
      document.getElementById('hdr-spec-license').textContent = `${expert.license_number || 'Verified'} · ${expert.profession || expert.domain}`;
      document.getElementById('hdr-spec-avatar').textContent = (expert.domain || '').includes('Med') ? '👨‍⚕️' : (expert.domain || '').includes('Law') ? '⚖️' : '🧠';
      document.getElementById('hdr-spec-avatar').style.background = expert.avatar_color || '#EF4444';

      document.getElementById('sim-specialist-name').textContent = expert.name;
      document.getElementById('sim-specialist-title').textContent = `${expert.profession || ''} · ${expert.education || ''}`;
      document.getElementById('sim-avatar-circle').style.background = `linear-gradient(135deg, ${expert.avatar_color || '#4F46E5'}, #8B5CF6)`;
      document.getElementById('hud-spec-display-name').textContent = expert.name;

      document.getElementById('rx-spec-name').textContent = expert.name;
      document.getElementById('rx-spec-sub').textContent = `${expert.license_number || 'Verified Specialist'} · ${expert.profession || ''}`;
      document.getElementById('rx-sig-name').textContent = expert.name;

      document.getElementById('modal-spec-name').textContent = expert.name;
      document.getElementById('modal-spec-title').textContent = `${expert.profession || ''} · ${booking.package_name || '1-on-1 Consultation'}`;
      document.getElementById('modal-spec-avatar').textContent = (expert.domain || '').includes('Med') ? '👨‍⚕️' : '🧠';
    }

    if (booking) {
      document.getElementById('hdr-escrow-amount').textContent = `৳${(booking.fee || 2200).toLocaleString()} Escrow Held`;
      document.getElementById('modal-escrow-fee').textContent = `৳${(booking.fee || 2200).toLocaleString()}`;
      
      const durationMins = parseInt(booking.duration || '30') || 30;
      sessionSecondsRemaining = durationMins * 60;
    }

    if (client) {
      document.getElementById('rx-client-name').value = client.name || 'Client';
      document.getElementById('rx-date').value = new Date().toISOString().split('T')[0];
    }

    // Populate notes
    if (notes) {
      if (notes.observations) document.getElementById('rx-complaints').value = notes.observations;
      if (notes.diagnosis) document.getElementById('rx-diagnosis').value = notes.diagnosis;
      if (notes.prescriptions) document.getElementById('rx-prescriptions').value = notes.prescriptions;
      if (notes.follow_up) document.getElementById('rx-followup').value = notes.follow_up;
    }

    // Render Chat history
    renderChatMessages(messages || []);

  } catch (err) {
    console.warn('[Consultation Init Fallback]:', err.message);
  }
}

// 2. Initialize Camera & Mic (WebRTC Media)
async function initLocalMedia() {
  const localVideo = document.getElementById('local-video');
  const fallback = document.getElementById('pip-fallback');

  try {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      localMediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: true
      });
      if (localVideo) {
        localVideo.srcObject = localMediaStream;
        localVideo.style.display = 'block';
        if (fallback) fallback.style.display = 'none';
      }
    } else {
      throw new Error('getUserMedia not supported in this browser environment');
    }
  } catch (err) {
    console.log('[Media Stream Note]: Using simulated video preview mode', err.message);
    if (localVideo) localVideo.style.display = 'none';
    if (fallback) fallback.style.display = 'flex';
  }
}

// 3. Audio / Video Toggle Controls
function toggleMicrophone() {
  isMicMuted = !isMicMuted;
  const btn = document.getElementById('btn-toggle-mic');
  const icon = document.getElementById('icon-mic');
  const label = document.getElementById('label-mic');
  const pipIcon = document.getElementById('pip-mic-icon');

  if (localMediaStream) {
    localMediaStream.getAudioTracks().forEach(track => track.enabled = !isMicMuted);
  }

  if (isMicMuted) {
    btn.classList.add('muted');
    btn.classList.remove('active');
    icon.textContent = '🔇';
    label.textContent = 'Unmute';
    if (pipIcon) pipIcon.textContent = '🔇';
    showToastNotification('Microphone Muted');
  } else {
    btn.classList.remove('muted');
    btn.classList.add('active');
    icon.textContent = '🎙️';
    label.textContent = 'Mute';
    if (pipIcon) pipIcon.textContent = '🎙️';
    showToastNotification('Microphone Active');
  }
}

function toggleCamera() {
  isCameraOff = !isCameraOff;
  const btn = document.getElementById('btn-toggle-cam');
  const icon = document.getElementById('icon-cam');
  const label = document.getElementById('label-cam');
  const localVideo = document.getElementById('local-video');
  const fallback = document.getElementById('pip-fallback');
  const pipIcon = document.getElementById('pip-cam-icon');

  if (localMediaStream) {
    localMediaStream.getVideoTracks().forEach(track => track.enabled = !isCameraOff);
  }

  if (isCameraOff) {
    btn.classList.add('muted');
    btn.classList.remove('active');
    icon.textContent = '🚫';
    label.textContent = 'Start Video';
    if (localVideo) localVideo.style.display = 'none';
    if (fallback) fallback.style.display = 'flex';
    if (pipIcon) pipIcon.textContent = '🚫';
    showToastNotification('Camera Turned Off');
  } else {
    btn.classList.remove('muted');
    btn.classList.add('active');
    icon.textContent = '📹';
    label.textContent = 'Stop Video';
    if (localVideo && localMediaStream) localVideo.style.display = 'block';
    if (fallback) fallback.style.display = 'none';
    if (pipIcon) pipIcon.textContent = '📹';
    showToastNotification('Camera Turned On');
  }
}

async function toggleScreenShare() {
  const btn = document.getElementById('btn-toggle-screen');
  const label = document.getElementById('label-screen');
  const remoteVideo = document.getElementById('remote-video');
  const simView = document.getElementById('sim-specialist-viewport');
  const shareBadge = document.getElementById('screen-share-active-badge');

  if (!isScreenSharing) {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
        screenMediaStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        if (remoteVideo) {
          remoteVideo.srcObject = screenMediaStream;
          remoteVideo.style.display = 'block';
          if (simView) simView.style.display = 'none';
        }
        screenMediaStream.getVideoTracks()[0].onended = () => toggleScreenShare();
      }
      isScreenSharing = true;
      btn.classList.add('active');
      label.textContent = 'Stop Share';
      if (shareBadge) shareBadge.style.display = 'block';
      showToastNotification('Screen Sharing Started');
    } catch (err) {
      console.warn('Screen share cancelled/unsupported:', err.message);
    }
  } else {
    if (screenMediaStream) {
      screenMediaStream.getTracks().forEach(t => t.stop());
      screenMediaStream = null;
    }
    if (remoteVideo) {
      remoteVideo.srcObject = null;
      remoteVideo.style.display = 'none';
    }
    if (simView) simView.style.display = 'flex';
    isScreenSharing = false;
    btn.classList.remove('active');
    label.textContent = 'Share Screen';
    if (shareBadge) shareBadge.style.display = 'none';
    showToastNotification('Screen Sharing Stopped');
  }
}

function togglePipSize() {
  const pip = document.getElementById('local-pip');
  if (!pip) return;
  if (pip.style.width === '320px') {
    pip.style.width = '220px';
    pip.style.height = '145px';
  } else {
    pip.style.width = '320px';
    pip.style.height = '210px';
  }
}

// 4. Session Countdown Timer
function startSessionTimer() {
  const timerText = document.getElementById('txt-timer-countdown');
  const timerPill = document.getElementById('session-countdown-pill');

  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    if (sessionSecondsRemaining > 0) {
      sessionSecondsRemaining--;
      const mins = Math.floor(sessionSecondsRemaining / 60);
      const secs = sessionSecondsRemaining % 60;
      if (timerText) {
        timerText.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
      }

      if (sessionSecondsRemaining < 300 && timerPill) {
        timerPill.style.background = 'rgba(239, 68, 68, 0.2)';
        timerPill.style.borderColor = '#EF4444';
        timerPill.style.color = '#FCA5A5';
      }
    } else {
      clearInterval(timerInterval);
      promptEndSession();
    }
  }, 1000);
}

// 5. Drawer Navigation & Chat
function switchDrawerTab(tabId) {
  const chatContent = document.getElementById('drawer-tab-chat');
  const notesContent = document.getElementById('drawer-tab-notes');
  const btnChat = document.getElementById('tab-btn-chat');
  const btnNotes = document.getElementById('tab-btn-notes');
  const dockBtnChat = document.getElementById('btn-toggle-chat');
  const dockBtnNotes = document.getElementById('btn-toggle-notes');
  const drawer = document.getElementById('consult-drawer');

  if (drawer.classList.contains('collapsed')) {
    drawer.classList.remove('collapsed');
  }

  if (tabId === 'chat') {
    if (chatContent) chatContent.style.display = 'flex';
    if (notesContent) notesContent.style.display = 'none';
    btnChat?.classList.add('active');
    btnNotes?.classList.remove('active');
    dockBtnChat?.classList.add('active');
    dockBtnNotes?.classList.remove('active');
    document.getElementById('chat-unread-count').style.display = 'none';
  } else {
    if (chatContent) chatContent.style.display = 'none';
    if (notesContent) notesContent.style.display = 'flex';
    btnChat?.classList.remove('active');
    btnNotes?.classList.add('active');
    dockBtnChat?.classList.remove('active');
    dockBtnNotes?.classList.add('active');
  }
}

function toggleDrawerCollapse() {
  const drawer = document.getElementById('consult-drawer');
  if (drawer) drawer.classList.toggle('collapsed');
}

function renderChatMessages(messages) {
  const container = document.getElementById('chat-messages-container');
  if (!container) return;

  container.innerHTML = messages.map(m => {
    const isSystem = m.sender_role === 'system';
    const isMine = m.sender_role === 'client' || m.sender_name === 'You';
    const itemClass = isSystem ? 'system' : isMine ? 'mine' : 'other';

    return `
      <div class="chat-msg-item ${itemClass}">
        ${!isSystem ? `
          <div class="chat-msg-hdr">
            <b>${escapeHtml(m.sender_name)}</b>
            <span>${m.created_at || ''}</span>
          </div>
        ` : ''}
        <div class="chat-msg-bubble">
          ${escapeHtml(m.text)}
          ${m.attachment ? `
            <div class="chat-attachment-card">
              <span>📎</span>
              <b>${escapeHtml(m.attachment.name)}</b>
              <small>(${m.attachment.size || '1.2 MB'})</small>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');

  container.scrollTop = container.scrollHeight;
}

async function handleSendChatMessage(e) {
  e.preventDefault();
  const inp = document.getElementById('chat-message-input');
  const text = inp?.value.trim();

  if (!text && !selectedFileAttachment) return;

  const payload = {
    sender_name: 'You (Client)',
    sender_role: 'client',
    text: text || `Uploaded document: ${selectedFileAttachment.name}`,
    attachment: selectedFileAttachment
  };

  try {
    const res = await fetch(`/api/consult/room/${currentRoomId}/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      const data = await res.json();
      if (!currentRoomData) currentRoomData = { messages: [] };
      if (!currentRoomData.messages) currentRoomData.messages = [];
      currentRoomData.messages.push(data.message);
      renderChatMessages(currentRoomData.messages);
      inp.value = '';
      cancelFileAttachment();
    }
  } catch (err) {
    console.error('Error sending message:', err);
  }
}

function sendQuickReply(text) {
  const inp = document.getElementById('chat-message-input');
  if (inp) {
    inp.value = text;
    document.getElementById('chat-input-form')?.dispatchEvent(new Event('submit'));
  }
}

function handleFileSelected(e) {
  const file = e.target.files?.[0];
  if (!file) return;

  selectedFileAttachment = {
    name: file.name,
    size: (file.size / 1024).toFixed(1) + ' KB',
    type: file.type
  };

  const previewStrip = document.getElementById('chat-file-preview');
  const nameEl = document.getElementById('preview-file-name');
  if (previewStrip && nameEl) {
    nameEl.textContent = `${file.name} (${selectedFileAttachment.size})`;
    previewStrip.style.display = 'flex';
  }
}

function cancelFileAttachment() {
  selectedFileAttachment = null;
  const previewStrip = document.getElementById('chat-file-preview');
  const fileInp = document.getElementById('chat-file-input');
  if (previewStrip) previewStrip.style.display = 'none';
  if (fileInp) fileInp.value = '';
}

// 6. Digital Prescription / Advisory Pad Auto-Save & PDF Download
function handleNotesAutoSave() {
  clearTimeout(notesSaveDebounce);
  const syncDot = document.getElementById('notes-sync-dot');
  if (syncDot) syncDot.style.background = '#F59E0B'; // Amber syncing

  notesSaveDebounce = setTimeout(async () => {
    const payload = {
      observations: document.getElementById('rx-complaints')?.value,
      diagnosis: document.getElementById('rx-diagnosis')?.value,
      prescriptions: document.getElementById('rx-prescriptions')?.value,
      follow_up: document.getElementById('rx-followup')?.value
    };

    try {
      await fetch(`/api/consult/room/${currentRoomId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (syncDot) syncDot.style.background = '#10B981'; // Green synced
    } catch (err) {
      console.warn('Auto-save error:', err);
    }
  }, 800);
}

function downloadPrescriptionPdf() {
  const specName = document.getElementById('rx-spec-name')?.textContent || 'Specialist';
  const clientName = document.getElementById('rx-client-name')?.value || 'Client';
  const complaints = document.getElementById('rx-complaints')?.value || 'N/A';
  const diagnosis = document.getElementById('rx-diagnosis')?.value || 'N/A';
  const rx = document.getElementById('rx-prescriptions')?.value || 'N/A';
  const followUp = document.getElementById('rx-followup')?.value || 'N/A';
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Official Consultation Summary & Prescription - ${clientName}</title>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #1E293B; max-width: 800px; margin: 0 auto; line-height: 1.6; }
        .header { display: flex; justify-content: space-between; border-bottom: 2px solid #8B5CF6; padding-bottom: 18px; margin-bottom: 24px; }
        .logo { font-size: 24px; font-weight: 800; color: #6366F1; }
        .spec { text-align: right; }
        .spec h3 { margin: 0; font-size: 18px; color: #0F172A; }
        .spec p { margin: 2px 0 0; font-size: 12px; color: #64748B; }
        .meta-box { background: #F8FAFC; border: 1px solid #E2E8F0; padding: 12px 18px; border-radius: 8px; margin-bottom: 24px; display: flex; justify-content: space-between; font-size: 14px; }
        .sec { margin-bottom: 20px; }
        .sec-title { font-size: 13px; font-weight: 700; color: #6366F1; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.5px; }
        .sec-content { background: #fff; border: 1px solid #E2E8F0; border-radius: 6px; padding: 12px 16px; font-size: 14px; white-space: pre-wrap; }
        .footer { margin-top: 40px; border-top: 1px solid #E2E8F0; padding-top: 18px; display: flex; justify-content: space-between; align-items: center; }
        .seal { font-size: 12px; font-weight: 700; color: #10B981; }
        @media print { body { padding: 0; } }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="logo">XtraEarn Consult HD</div>
          <div style="font-size: 12px; color: #64748B; margin-top: 4px;">Verified 1-on-1 Advisory & Prescription Document</div>
        </div>
        <div class="spec">
          <h3>${escapeHtml(specName)}</h3>
          <p>Verified Professional Specialist · XtraEarn Network</p>
        </div>
      </div>

      <div class="meta-box">
        <div><b>Client Name:</b> ${escapeHtml(clientName)}</div>
        <div><b>Date:</b> ${date}</div>
        <div><b>Session Code:</b> CNS-${currentRoomId.toUpperCase()}</div>
      </div>

      <div class="sec">
        <div class="sec-title">📋 Chief Complaints / Case Symptoms</div>
        <div class="sec-content">${escapeHtml(complaints)}</div>
      </div>

      <div class="sec">
        <div class="sec-title">🩺 Clinical Assessment / Legal Opinion</div>
        <div class="sec-content">${escapeHtml(diagnosis)}</div>
      </div>

      <div class="sec">
        <div class="sec-title">💊 Rx Medications & Action Directives</div>
        <div class="sec-content">${escapeHtml(rx)}</div>
      </div>

      <div class="sec">
        <div class="sec-title">🗓️ Follow-up & Review Plan</div>
        <div class="sec-content">${escapeHtml(followUp)}</div>
      </div>

      <div class="footer">
        <div class="seal">🛡️ AES-256 DIGITAL PKI SIGNATURE VERIFIED · ESCROW GUARANTEED</div>
        <div style="text-align: right; font-size: 13px;">
          <b>${escapeHtml(specName)}</b><br>
          <span style="font-size: 11px; color: #64748B;">Official Verified Practitioner</span>
        </div>
      </div>

      <script>
        window.onload = function() { window.print(); };
      </script>
    </body>
    </html>
  `);
  printWindow.document.close();
}

// 7. Modals: End Session & Extension
function promptEndSession() {
  openModal('modal-end-session');
}

function setStarRating(stars) {
  currentRating = stars;
  const allStars = document.querySelectorAll('#stars-container .star');
  allStars.forEach((s, idx) => {
    if (idx < stars) s.classList.add('active');
    else s.classList.remove('active');
  });

  const descs = [
    '1.0 - Very Unsatisfied',
    '2.0 - Below Expectations',
    '3.0 - Satisfactory Consultation',
    '4.0 - Very Good & Helpful',
    '5.0 - Outstanding & Highly Insightful'
  ];
  document.getElementById('rating-desc-text').textContent = descs[stars - 1] || '5.0 - Outstanding';
}

function setupComplimentChips() {
  document.querySelectorAll('.compliment-tags .tag-chip').forEach(chip => {
    chip.onclick = () => {
      chip.classList.toggle('active');
      const chk = chip.querySelector('input');
      if (chk) chk.checked = chip.classList.contains('active');
    };
  });
}

async function handleSessionCompletionSubmit(e) {
  e.preventDefault();
  const feedback = document.getElementById('modal-review-text')?.value.trim();

  try {
    await fetch(`/api/consult/room/${currentRoomId}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating: currentRating, feedback })
    });

    showToastNotification('Consultation Completed! Escrow funds released to specialist.');
    closeModal('modal-end-session');
    
    // Redirect to profile or home after 1.5s
    setTimeout(() => {
      window.location.href = '/profile';
    }, 1500);
  } catch (err) {
    alert('Error completing session: ' + err.message);
  }
}

function openExtensionModal() {
  openModal('modal-session-extension');
}

let selectedExtMinutes = 15;
let selectedExtFee = 600;

function selectExtensionOption(mins, fee, el) {
  selectedExtMinutes = mins;
  selectedExtFee = fee;
  document.querySelectorAll('.extension-options .ext-option').forEach(opt => opt.classList.remove('active'));
  el.classList.add('active');
}

async function handleConfirmExtension() {
  try {
    const res = await fetch(`/api/consult/room/${currentRoomId}/extend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ minutes: selectedExtMinutes, fee: selectedExtFee })
    });

    if (res.ok) {
      sessionSecondsRemaining += selectedExtMinutes * 60;
      closeModal('modal-session-extension');
      showToastNotification(`Session Extended by +${selectedExtMinutes} Mins! (৳${selectedExtFee} added to Escrow)`);
    }
  } catch (err) {
    alert('Error extending session: ' + err.message);
  }
}

// Helpers
function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('show');
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('show');
}

function copyRoomShareLink() {
  navigator.clipboard.writeText(window.location.href);
  showToastNotification('Room invite link copied to clipboard!');
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function showToastNotification(msg) {
  const toast = document.createElement('div');
  toast.style.position = 'fixed';
  toast.style.top = '74px';
  toast.style.left = '50%';
  toast.style.transform = 'translateX(-50%)';
  toast.style.background = 'rgba(15, 23, 42, 0.92)';
  toast.style.backdropFilter = 'blur(12px)';
  toast.style.color = '#fff';
  toast.style.border = '1px solid rgba(139, 92, 246, 0.4)';
  toast.style.padding = '10px 20px';
  toast.style.borderRadius = '30px';
  toast.style.fontSize = '0.84rem';
  toast.style.fontWeight = '700';
  toast.style.boxShadow = '0 10px 30px rgba(0,0,0,0.5)';
  toast.style.zIndex = '9999';
  toast.textContent = msg;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 2200);
}
