/* XtraEarn — Advanced Enterprise Wallet Experience */
document.addEventListener('DOMContentLoaded', () => {
  const root = document.getElementById('wallet-root');

  if (!requireLogin('Login to view your wallet')) return;

  const TX_META = {
    deposit:        { icon: '⬇️', label: 'Wallet Top-Up', cls: 'tx-in', color: '#10B981' },
    withdrawal:     { icon: '⬆️', label: 'Payout / Withdrawal', cls: 'tx-out', color: '#F59E0B' },
    escrow_hold:    { icon: '🔒', label: 'Escrow Hold', cls: 'tx-out', color: '#6366F1' },
    escrow_release: { icon: '💰', label: 'Payment Earned', cls: 'tx-in', color: '#10B981' },
    refund:         { icon: '↩️', label: 'Escrow Refund', cls: 'tx-in', color: '#38BDF8' },
    transfer_out:   { icon: '💸', label: 'P2P Sent', cls: 'tx-out', color: '#EC4899' },
    transfer_in:    { icon: '🎁', label: 'P2P Received', cls: 'tx-in', color: '#10B981' },
    admin_credit:   { icon: '⚖️', label: 'Admin Adjustment (+)', cls: 'tx-in', color: '#8B5CF6' },
    admin_debit:    { icon: '⚠️', label: 'Admin Adjustment (-)', cls: 'tx-out', color: '#EF4444' }
  };

  let activeTab = 'overview';
  let walletData = null;
  let payoutAccounts = null;
  let txFilterType = 'all';
  let txSearchQuery = '';

  async function load() {
    try {
      const [wData, pData] = await Promise.all([
        api('/wallet'),
        api('/wallet/payout-methods').catch(() => ({}))
      ]);
      walletData = wData;
      payoutAccounts = pData;
      render();
    } catch (err) {
      if (err.status === 401) { Auth.logout(); requireLogin('Session expired — login again'); return; }
      root.innerHTML = `<div class="empty-state" style="grid-column:auto"><span class="big">⚠️</span>${escapeHtml(err.message)}</div>`;
    }
  }

  function render() {
    if (!walletData) return;

    const user = Auth.user || {};
    const bal = Number(walletData.balance || 0);
    const txs = walletData.transactions || [];

    const totalDeposited = txs.filter(t => t.type === 'deposit').reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const totalEarned = Number(user.total_earned || 0) || txs.filter(t => t.type === 'escrow_release' || t.type === 'transfer_in').reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const totalWithdrawn = txs.filter(t => t.type === 'withdrawal').reduce((sum, t) => sum + Math.abs(Number(t.amount || 0)), 0);

    let filteredTxs = txs;
    if (txFilterType !== 'all') {
      filteredTxs = filteredTxs.filter(t => t.type === txFilterType);
    }
    if (txSearchQuery) {
      const q = txSearchQuery.toLowerCase();
      filteredTxs = filteredTxs.filter(t => (t.note || '').toLowerCase().includes(q) || (t.type || '').toLowerCase().includes(q) || (t.method || '').toLowerCase().includes(q));
    }

    if (location.hash === '#referrals') activeTab = 'referrals';
    else if (location.hash === '#loyalty') activeTab = 'loyalty';

    root.innerHTML = `
      <!-- TOP TAB NAVIGATION -->
      <!-- TOP TAB NAVIGATION -->
      <div class="wallet-tabs-container">
        <button class="wallet-tab-btn tab-overview ${activeTab === 'overview' ? 'active' : ''}" onclick="switchWalletTab('overview')">
          <span class="wallet-tab-icon">📊</span>
          <span>Overview &amp; Balances</span>
        </button>
        <button class="wallet-tab-btn tab-referrals ${activeTab === 'referrals' ? 'active' : ''}" onclick="switchWalletTab('referrals')">
          <span class="wallet-tab-icon">🤝</span>
          <span>Refer &amp; Earn</span>
          <span class="wallet-tab-badge green">Bonus</span>
        </button>
        <button class="wallet-tab-btn tab-loyalty ${activeTab === 'loyalty' ? 'active' : ''}" onclick="switchWalletTab('loyalty')">
          <span class="wallet-tab-icon">🎁</span>
          <span>Loyalty &amp; Rewards</span>
          <span class="wallet-tab-badge gold">XP</span>
        </button>
        <button class="wallet-tab-btn tab-transfer ${activeTab === 'transfer' ? 'active' : ''}" onclick="switchWalletTab('transfer')">
          <span class="wallet-tab-icon">💸</span>
          <span>P2P Transfer</span>
        </button>
        <button class="wallet-tab-btn tab-payout ${activeTab === 'payout' ? 'active' : ''}" onclick="switchWalletTab('payout')">
          <span class="wallet-tab-icon">📱</span>
          <span>Payout Accounts</span>
        </button>
        <button class="wallet-tab-btn tab-statement ${activeTab === 'statement' ? 'active' : ''}" onclick="switchWalletTab('statement')">
          <span class="wallet-tab-icon">📜</span>
          <span>Full Statement</span>
        </button>
      </div>

      <!-- TAB 1: OVERVIEW & BALANCES -->
      <div id="tab-sec-overview" style="display:${activeTab === 'overview' ? 'block' : 'none'}">
        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:16px;margin-bottom:24px">
          <!-- Balance Hero Card -->
          <div class="wallet-hero-card" style="background:linear-gradient(135deg, #1E1B4B 0%, #312E81 100%);border:1px solid rgba(99,102,241,0.3);border-radius:16px;padding:24px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
              <span style="color:#C7D2FE;font-size:0.85rem;font-weight:700;text-transform:uppercase">Available Liquid Balance</span>
              <span style="background:rgba(16,185,129,0.2);color:#34D399;font-size:0.75rem;padding:3px 10px;border-radius:20px;font-weight:700">● 100% Guarded</span>
            </div>
            <div style="font-size:2.4rem;font-weight:800;color:#fff;margin-bottom:16px">
              ${money(bal)}
            </div>
            <div style="display:flex;flex-wrap:wrap;gap:10px">
              <button class="btn btn-green" id="btn-deposit-hero" style="font-weight:700;padding:10px 20px">
                ⬇️ Deposit Funds
              </button>
              <button class="btn btn-white" id="btn-withdraw-hero" style="font-weight:700;padding:10px 20px">
                ⬆️ Withdraw Earnings
              </button>
              <button class="btn btn-outline-light" onclick="switchWalletTab('transfer')" style="font-weight:700;padding:10px 18px">
                💸 Send Money
              </button>
            </div>
            <p style="color:#A5B4FC;font-size:0.76rem;margin:16px 0 0;line-height:1.5">
              🔒 When you hire someone or book a consultation, funds are safely secured in Escrow and released only when work is completed.
            </p>
          </div>

          <!-- Total Lifetime Earned -->
          <div style="background:#131B2E;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:20px;display:flex;flex-direction:column;justify-content:center">
            <span style="color:#94A3B8;font-size:0.8rem;font-weight:700">Lifetime Earnings</span>
            <div style="font-size:1.6rem;font-weight:800;color:#10B981;margin:4px 0">${money(totalEarned)}</div>
            <small style="color:#64748B;font-size:0.75rem">Tasks &amp; Consultations</small>
          </div>

          <!-- Total Top-Ups -->
          <div style="background:#131B2E;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:20px;display:flex;flex-direction:column;justify-content:center">
            <span style="color:#94A3B8;font-size:0.8rem;font-weight:700">Total Deposits</span>
            <div style="font-size:1.6rem;font-weight:800;color:#38BDF8;margin:4px 0">${money(totalDeposited)}</div>
            <small style="color:#64748B;font-size:0.75rem">bKash, Nagad &amp; Cards</small>
          </div>
        </div>

        <!-- Recent Transactions Preview -->
        <div style="background:#131B2E;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:22px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
            <h3 style="margin:0;font-size:1.1rem;font-weight:800;color:#fff">Recent Activity</h3>
            <button class="btn btn-sm btn-outline-light" onclick="switchWalletTab('statement')">View All (${txs.length}) →</button>
          </div>
          <div class="tx-list">
            ${txs.slice(0, 6).map(tx => renderTxRow(tx)).join('') || '<p style="color:#94A3B8;font-size:0.9rem;padding:16px 0">No transactions recorded yet.</p>'}
          </div>
        </div>
      </div>

      <!-- TAB: REFERRAL PROGRAM SUITE -->
      <div id="tab-sec-referrals" style="display:${activeTab === 'referrals' ? 'block' : 'none'}">
        <div id="referrals-hub-container">
          <div class="empty-state"><span class="big">⏳</span>Loading referral dashboard...</div>
        </div>
      </div>

      <!-- TAB: LOYALTY & REWARDS HUB -->
      <div id="tab-sec-loyalty" style="display:${activeTab === 'loyalty' ? 'block' : 'none'}">
        <div id="loyalty-hub-container">
          <div class="empty-state"><span class="big">⏳</span>Loading loyalty status &amp; rewards...</div>
        </div>
      </div>

      <!-- TAB 2: P2P INSTANT TRANSFER -->
      <div id="tab-sec-transfer" style="display:${activeTab === 'transfer' ? 'block' : 'none'}">
        <div style="max-width:560px;background:#131B2E;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:24px">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
            <div style="width:44px;height:44px;border-radius:12px;background:rgba(236,72,153,0.15);color:#EC4899;font-size:1.4rem;display:flex;align-items:center;justify-content:center">💸</div>
            <div>
              <h3 style="margin:0;font-size:1.15rem;font-weight:800;color:#fff">P2P Instant Send Money</h3>
              <p style="margin:2px 0 0;color:#94A3B8;font-size:0.78rem">Transfer funds instantly to any registered XtraEarn user with 0% fee</p>
            </div>
          </div>

          <form id="p2p-transfer-form">
            <div style="background:#1E293B;border-radius:10px;padding:12px 14px;margin-bottom:16px">
              <small style="color:#94A3B8;font-size:0.75rem;display:block">Your Available Balance</small>
              <b style="color:#10B981;font-size:1.1rem">${money(bal)}</b>
            </div>

            <div style="margin-bottom:14px">
              <label style="color:#94A3B8;font-size:0.78rem;font-weight:700;text-transform:uppercase;display:block;margin-bottom:6px">Recipient (Email or Phone Number)</label>
              <input type="text" id="p2p-recipient" class="adm-input" placeholder="e.g. freelancer@example.com or 017XXXXXXXX" required style="width:100%;box-sizing:border-box">
            </div>

            <div style="margin-bottom:14px">
              <label style="color:#94A3B8;font-size:0.78rem;font-weight:700;text-transform:uppercase;display:block;margin-bottom:6px">Amount (৳ BDT)</label>
              <input type="number" id="p2p-amount" class="adm-input" placeholder="Min ৳10" min="10" max="${bal}" step="1" required style="width:100%;box-sizing:border-box">
            </div>

            <div style="margin-bottom:20px">
              <label style="color:#94A3B8;font-size:0.78rem;font-weight:700;text-transform:uppercase;display:block;margin-bottom:6px">Personal Note (Optional)</label>
              <input type="text" id="p2p-note" class="adm-input" placeholder="e.g. Thanks for your great work!" style="width:100%;box-sizing:border-box">
            </div>

            <button type="submit" class="btn btn-purple btn-block" style="font-weight:700;padding:12px">
              ⚡ Transfer Funds Now
            </button>
          </form>
        </div>
      </div>

      <!-- TAB 3: CONNECTED PAYOUT ACCOUNTS -->
      <div id="tab-sec-payout" style="display:${activeTab === 'payout' ? 'block' : 'none'}">
        <div style="max-width:620px;background:#131B2E;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:24px">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:18px">
            <div style="width:44px;height:44px;border-radius:12px;background:rgba(56,189,248,0.15);color:#38BDF8;font-size:1.4rem;display:flex;align-items:center;justify-content:center">📱</div>
            <div>
              <h3 style="margin:0;font-size:1.15rem;font-weight:800;color:#fff">Saved Payout Accounts</h3>
              <p style="margin:2px 0 0;color:#94A3B8;font-size:0.78rem">Configure default mobile financial service (MFS) or bank details for fast withdrawals</p>
            </div>
          </div>

          <form id="payout-accounts-form">
            <div style="margin-bottom:14px">
              <label style="color:#94A3B8;font-size:0.78rem;font-weight:700;text-transform:uppercase;display:block;margin-bottom:6px">bKash Personal Account Number</label>
              <input type="text" id="payout-bkash" class="adm-input" value="${escapeHtml(payoutAccounts?.bkash || user.phone || '')}" placeholder="01XXXXXXXXX" style="width:100%;box-sizing:border-box">
            </div>

            <div style="margin-bottom:14px">
              <label style="color:#94A3B8;font-size:0.78rem;font-weight:700;text-transform:uppercase;display:block;margin-bottom:6px">Nagad Personal Account Number</label>
              <input type="text" id="payout-nagad" class="adm-input" value="${escapeHtml(payoutAccounts?.nagad || '')}" placeholder="01XXXXXXXXX" style="width:100%;box-sizing:border-box">
            </div>

            <div style="margin-bottom:14px">
              <label style="color:#94A3B8;font-size:0.78rem;font-weight:700;text-transform:uppercase;display:block;margin-bottom:6px">Rocket Account Number</label>
              <input type="text" id="payout-rocket" class="adm-input" value="${escapeHtml(payoutAccounts?.rocket || '')}" placeholder="01XXXXXXXXX" style="width:100%;box-sizing:border-box">
            </div>

            <div style="background:#1E293B;border-radius:10px;padding:14px;margin-bottom:20px">
              <span style="color:#60A5FA;font-size:0.8rem;font-weight:700;display:block;margin-bottom:10px">🏦 Bank Account (BEFTN Payout)</span>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
                <input type="text" id="payout-bank-name" class="adm-input" value="${escapeHtml(payoutAccounts?.bank?.bank_name || '')}" placeholder="Bank Name (e.g. City Bank)" style="width:100%;box-sizing:border-box">
                <input type="text" id="payout-bank-acc-no" class="adm-input" value="${escapeHtml(payoutAccounts?.bank?.account_number || '')}" placeholder="Account Number" style="width:100%;box-sizing:border-box">
              </div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
                <input type="text" id="payout-bank-acc-name" class="adm-input" value="${escapeHtml(payoutAccounts?.bank?.account_name || '')}" placeholder="Account Holder Name" style="width:100%;box-sizing:border-box">
                <input type="text" id="payout-bank-branch" class="adm-input" value="${escapeHtml(payoutAccounts?.bank?.branch_name || '')}" placeholder="Branch Name" style="width:100%;box-sizing:border-box">
              </div>
            </div>

            <button type="submit" class="btn btn-green btn-block" style="font-weight:700;padding:12px">
              💾 Save Payout Accounts
            </button>
          </form>
        </div>
      </div>

      <!-- TAB 4: FULL STATEMENT & RECEIPTS -->
      <div id="tab-sec-statement" style="display:${activeTab === 'statement' ? 'block' : 'none'}">
        <div style="background:#131B2E;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:24px">
          <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:12px;margin-bottom:18px">
            <div>
              <h3 style="margin:0;font-size:1.15rem;font-weight:800;color:#fff">Wallet Statement &amp; Transaction Ledger</h3>
              <p style="margin:2px 0 0;color:#94A3B8;font-size:0.78rem">Filter and download official tax and accounting receipts</p>
            </div>
            <div style="display:flex;flex-wrap:wrap;gap:10px">
              <input type="text" id="tx-search-input" class="adm-input" placeholder="🔍 Search note, type, method..." value="${escapeHtml(txSearchQuery)}" style="width:200px">
              <select id="tx-filter-select" class="adm-select" onchange="handleTxFilterChange(this.value)">
                <option value="all" ${txFilterType === 'all' ? 'selected' : ''}>All Transaction Types</option>
                <option value="deposit" ${txFilterType === 'deposit' ? 'selected' : ''}>⬇️ Deposits</option>
                <option value="withdrawal" ${txFilterType === 'withdrawal' ? 'selected' : ''}>⬆️ Withdrawals</option>
                <option value="escrow_hold" ${txFilterType === 'escrow_hold' ? 'selected' : ''}>🔒 Escrow Holds</option>
                <option value="escrow_release" ${txFilterType === 'escrow_release' ? 'selected' : ''}>💰 Payments Received</option>
                <option value="refund" ${txFilterType === 'refund' ? 'selected' : ''}>↩️ Refunds</option>
                <option value="transfer_out" ${txFilterType === 'transfer_out' ? 'selected' : ''}>💸 P2P Sent</option>
                <option value="transfer_in" ${txFilterType === 'transfer_in' ? 'selected' : ''}>🎁 P2P Received</option>
              </select>
            </div>
          </div>

          <div class="tx-list">
            ${filteredTxs.map(tx => renderTxRow(tx)).join('') || '<p style="color:#94A3B8;font-size:0.9rem;padding:24px 0;text-align:center">No transactions matching your criteria.</p>'}
          </div>
        </div>
      </div>
    `;

    // Bind event handlers
    root.querySelector('#btn-deposit-hero')?.addEventListener('click', () => openMoneyModal('deposit'));
    root.querySelector('#btn-withdraw-hero')?.addEventListener('click', () => openMoneyModal('withdraw'));

    const p2pForm = root.querySelector('#p2p-transfer-form');
    if (p2pForm) {
      p2pForm.addEventListener('submit', async e => {
        e.preventDefault();
        const recipient = document.getElementById('p2p-recipient').value;
        const amount = Number(document.getElementById('p2p-amount').value);
        const note = document.getElementById('p2p-note').value;

        if (!amount || amount <= 0) { toast('Please enter a valid transfer amount', 'error'); return; }

        const btn = p2pForm.querySelector('button[type=submit]');
        btn.disabled = true;
        try {
          const res = await api('/wallet/transfer', {
            method: 'POST',
            body: { recipient, amount, note }
          });
          toast(`Successfully sent ৳${amount.toLocaleString()} to ${res.recipient_name}! New balance: ৳${res.new_balance.toLocaleString()}`, 'success');
          load();
        } catch (err) {
          toast(err.message, 'error');
        }
        btn.disabled = false;
      });
    }

    const payoutForm = root.querySelector('#payout-accounts-form');
    if (payoutForm) {
      payoutForm.addEventListener('submit', async e => {
        e.preventDefault();
        const btn = payoutForm.querySelector('button[type=submit]');
        btn.disabled = true;
        try {
          const body = {
            bkash: document.getElementById('payout-bkash').value,
            nagad: document.getElementById('payout-nagad').value,
            rocket: document.getElementById('payout-rocket').value,
            bank: {
              bank_name: document.getElementById('payout-bank-name').value,
              account_number: document.getElementById('payout-bank-acc-no').value,
              account_name: document.getElementById('payout-bank-acc-name').value,
              branch_name: document.getElementById('payout-bank-branch').value
            }
          };
          await api('/wallet/payout-methods', { method: 'POST', body });
          toast('Payout accounts saved successfully!', 'success');
          load();
        } catch (err) {
          toast(err.message, 'error');
        }
        btn.disabled = false;
      });
    }

    const searchInput = root.querySelector('#tx-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', e => {
        txSearchQuery = e.target.value;
        render();
      });
    }
  }

  function renderTxRow(tx) {
    const m = TX_META[tx.type] || { icon: '•', label: tx.type, cls: '', color: '#94A3B8' };
    const isPos = Number(tx.amount) >= 0;
    return `
      <div class="tx-row ${m.cls}" style="display:flex;align-items:center;justify-content:space-between;padding:12px;border-bottom:1px solid rgba(255,255,255,0.06);transition:background 0.2s">
        <div style="display:flex;align-items:center;gap:12px">
          <span class="tx-icon" style="font-size:1.3rem;background:rgba(255,255,255,0.05);width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center">${m.icon}</span>
          <div class="tx-info">
            <b style="color:#fff;font-size:0.88rem">${m.label}</b>
            <small style="color:#94A3B8;display:block;font-size:0.75rem">${escapeHtml(tx.note || '')}</small>
            <small class="tx-date" style="color:#64748B;font-size:0.7rem">${new Date(tx.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}${tx.method ? ' · ' + escapeHtml(tx.method) : ''}</small>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:10px">
          <span class="tx-amount" style="font-weight:800;font-size:0.95rem;color:${isPos ? '#10B981' : '#EF4444'}">
            ${isPos ? '+' : ''}${money(tx.amount)}
          </span>
          <button class="btn btn-sm" onclick="openInvoiceModal('transaction', '${tx.id}')" style="padding:4px 9px;font-size:0.75rem;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);color:var(--text);border-radius:6px;cursor:pointer" title="Download Official Receipt">📄 Receipt</button>
        </div>
      </div>`;
  }

  window.switchWalletTab = function(tab) {
    activeTab = tab;
    history.replaceState(null, '', '/wallet#' + tab);
    render();
    if (tab === 'referrals') loadReferralHub();
    else if (tab === 'loyalty') loadLoyaltyHub();
  };

  async function loadReferralHub() {
    const container = document.getElementById('referrals-hub-container');
    if (!container) return;
    try {
      const res = await api('/referrals/me');
      const stats = res.stats || {};
      const milestones = res.milestones || [];
      const invites = res.invites || [];

      container.innerHTML = `
        <div style="background:#131B2E;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:24px;margin-bottom:20px">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;margin-bottom:16px">
            <div>
              <div style="display:inline-flex;align-items:center;gap:6px;background:rgba(52,211,153,0.2);color:#34D399;font-size:0.75rem;font-weight:800;padding:4px 10px;border-radius:12px;margin-bottom:6px">
                🤝 REFERRAL PROGRAM · EARN ৳100 PER FRIEND
              </div>
              <h3 style="color:#fff;font-size:1.3rem;font-weight:800;margin:0">Invite Friends &amp; Earn Unlimited Cash</h3>
              <p style="color:#94A3B8;font-size:0.85rem;margin:4px 0 0">Give ৳50 welcome bonus, earn ৳100 + 150 XP on their first completed task.</p>
            </div>
            ${stats.pending_rewards > 0 ? `
              <button class="btn btn-green" onclick="claimMyReferralRewards()" style="font-weight:800">
                🎁 Claim ৳${stats.pending_rewards} Approved Bonus
              </button>
            ` : ''}
          </div>

          <!-- Share Link Box -->
          <div style="background:#0B1120;border:1px solid rgba(255,255,255,0.12);border-radius:12px;padding:12px 16px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px">
            <div style="display:flex;align-items:center;gap:10px;min-width:0;flex:1">
              <span style="font-size:1.2rem">🔗</span>
              <input type="text" id="wallet-ref-link-inp" value="${escapeHtml(res.share_url)}" readonly style="background:none;border:none;color:#38BDF8;font-family:monospace;font-size:0.92rem;font-weight:700;outline:none;width:100%">
            </div>
            <div style="display:flex;gap:8px">
              <button class="btn btn-green btn-sm" onclick="copyWalletReferralLink()" style="font-weight:700">📋 Copy Link</button>
              <button class="btn btn-outline-light btn-sm" onclick="openVanityCodeModal('${escapeHtml(res.referral_code)}')">✏️ Custom Code</button>
            </div>
          </div>

          <!-- Social Share Buttons -->
          <div style="display:flex;align-items:center;gap:8px;margin-top:14px;flex-wrap:wrap">
            <span style="color:#94A3B8;font-size:0.78rem;font-weight:700;text-transform:uppercase">Share via:</span>
            <button class="ref-share-btn btn-share-whatsapp" onclick="shareWalletRefVia('whatsapp', '${escapeHtml(res.share_url)}')">💬 WhatsApp</button>
            <button class="ref-share-btn btn-share-telegram" onclick="shareWalletRefVia('telegram', '${escapeHtml(res.share_url)}')">✈️ Telegram</button>
            <button class="ref-share-btn btn-share-facebook" onclick="shareWalletRefVia('facebook', '${escapeHtml(res.share_url)}')">👥 Facebook</button>
            <button class="ref-share-btn btn-share-email" onclick="shareWalletRefVia('email', '${escapeHtml(res.share_url)}')">✉️ Email</button>
          </div>
        </div>

        <!-- 4 KPI Cards -->
        <div style="display:grid;grid-template-columns:repeat(4, 1fr);gap:14px;margin-bottom:24px">
          <div style="background:#131B2E;border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:16px">
            <span style="color:#94A3B8;font-size:0.75rem;font-weight:700;text-transform:uppercase">Total Invites</span>
            <div style="color:#fff;font-size:1.6rem;font-weight:800;margin-top:4px">${stats.total_invites}</div>
          </div>
          <div style="background:#131B2E;border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:16px">
            <span style="color:#94A3B8;font-size:0.75rem;font-weight:700;text-transform:uppercase">Qualified Friends</span>
            <div style="color:#10B981;font-size:1.6rem;font-weight:800;margin-top:4px">${stats.qualified_count}</div>
          </div>
          <div style="background:#131B2E;border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:16px">
            <span style="color:#94A3B8;font-size:0.75rem;font-weight:700;text-transform:uppercase">Total Earned</span>
            <div style="color:#FBBF24;font-size:1.6rem;font-weight:800;margin-top:4px">৳${stats.total_rewards_earned}</div>
          </div>
          <div style="background:#131B2E;border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:16px">
            <span style="color:#94A3B8;font-size:0.75rem;font-weight:700;text-transform:uppercase">Pending Qualification</span>
            <div style="color:#38BDF8;font-size:1.6rem;font-weight:800;margin-top:4px">${stats.pending_count}</div>
          </div>
        </div>

        <!-- Milestones Progression Grid -->
        <div style="background:#131B2E;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:20px;margin-bottom:24px">
          <h4 style="color:#fff;font-size:1rem;font-weight:800;margin:0 0 14px">🏆 Referral Milestones &amp; Badges</h4>
          <div style="display:grid;grid-template-columns:repeat(4, 1fr);gap:12px">
            ${milestones.map(m => `
              <div style="background:${m.unlocked ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.03)'};border:1px solid ${m.unlocked ? '#10B981' : 'rgba(255,255,255,0.08)'};border-radius:12px;padding:14px">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
                  <span style="font-size:1.2rem">${m.unlocked ? '✅' : '🔒'}</span>
                  <span style="color:${m.unlocked ? '#10B981' : '#94A3B8'};font-size:0.75rem;font-weight:800">${m.target} Invites</span>
                </div>
                <div style="color:#fff;font-size:0.84rem;font-weight:700">${escapeHtml(m.reward)}</div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Invited Friends Activity Table -->
        <div style="background:#131B2E;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:20px">
          <h4 style="color:#fff;font-size:1rem;font-weight:800;margin:0 0 14px">Recent Invite Activity</h4>
          ${invites.length ? `
            <div class="tx-list">
              ${invites.map(inv => `
                <div style="display:flex;align-items:center;justify-content:space-between;padding:12px;border-bottom:1px solid rgba(255,255,255,0.06)">
                  <div>
                    <b style="color:#fff;font-size:0.9rem">${escapeHtml(inv.referee_name)}</b>
                    <small style="color:#94A3B8;display:block;font-size:0.75rem">Joined on ${new Date(inv.created_at).toLocaleDateString('en-GB')}</small>
                  </div>
                  <div style="text-align:right">
                    <span style="background:${inv.status === 'reward_paid' ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)'};color:${inv.status === 'reward_paid' ? '#34D399' : '#FCD34D'};font-size:0.75rem;font-weight:800;padding:3px 8px;border-radius:6px">
                      ${inv.status === 'reward_paid' ? '✅ Paid ৳100' : (inv.status === 'reward_approved' ? '🎁 Approved' : '⏳ Pending Task')}
                    </span>
                  </div>
                </div>
              `).join('')}
            </div>
          ` : '<p style="color:#94A3B8;font-size:0.86rem;margin:0">No friends invited yet. Share your referral link to get started!</p>'}
        </div>
      `;
    } catch (err) {
      container.innerHTML = `<div class="empty-state"><span class="big">⚠️</span>${escapeHtml(err.message)}</div>`;
    }
  }

  window.copyWalletReferralLink = function() {
    const input = document.getElementById('wallet-ref-link-inp');
    if (!input) return;
    navigator.clipboard.writeText(input.value).then(() => {
      toast('📋 Referral link copied to clipboard!', 'success');
    }).catch(() => {
      input.select();
      document.execCommand('copy');
      toast('📋 Referral link copied!', 'success');
    });
  };

  window.shareWalletRefVia = function(platform, url) {
    const encoded = encodeURIComponent(url);
    const text = encodeURIComponent('Join XtraEarn using my link and get ৳50 bonus credit on your first task! 🚀');
    if (platform === 'whatsapp') window.open(`https://api.whatsapp.com/send?text=${text}%20${encoded}`, '_blank');
    else if (platform === 'telegram') window.open(`https://t.me/share/url?url=${encoded}&text=${text}`, '_blank');
    else if (platform === 'facebook') window.open(`https://www.facebook.com/sharer/sharer.php?u=${encoded}`, '_blank');
    else if (platform === 'email') window.open(`mailto:?subject=Earn%20Extra%20Income%20on%20XtraEarn&body=${text}%0A%0A${encoded}`, '_blank');
  };

  window.claimMyReferralRewards = async function() {
    try {
      const res = await api('/referrals/claim', { method: 'POST' });
      toast(res.message || '🎉 Bonus claimed and added to your wallet!', 'success');
      load();
      loadReferralHub();
    } catch (err) {
      toast('Could not claim bonus: ' + err.message, 'error');
    }
  };

  window.closeVanityCodeModal = function() {
    if (typeof closeModal === 'function') {
      closeModal('modal-custom-ref-code');
    } else {
      const modal = document.getElementById('modal-custom-ref-code');
      if (modal) modal.classList.remove('open');
    }
  };

  window.ensureVanityCodeModal = function(currCode) {
    let modal = document.getElementById('modal-custom-ref-code');
    if (!modal) {
      modal = document.createElement('div');
      modal.className = 'modal-overlay';
      modal.id = 'modal-custom-ref-code';
      modal.onclick = function(e) { if (e.target === modal) window.closeVanityCodeModal(); };
      document.body.appendChild(modal);
    }
    const cleanCode = (currCode || '').toUpperCase();
    modal.innerHTML = `
      <div class="modal" style="max-width:500px;background:#0F172A;border:1px solid rgba(255,255,255,0.12);border-radius:18px;box-shadow:0 25px 50px -12px rgba(0,0,0,0.7);padding:26px;color:#F8FAFC;position:relative">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:18px">
          <div style="display:flex;align-items:center;gap:12px">
            <div style="width:46px;height:46px;border-radius:12px;background:linear-gradient(135deg,rgba(16,185,129,0.2) 0%,rgba(52,211,153,0.1) 100%);border:1px solid rgba(52,211,153,0.3);color:#34D399;font-size:1.5rem;display:flex;align-items:center;justify-content:center">
              🏷️
            </div>
            <div>
              <h3 style="margin:0;font-size:1.15rem;font-weight:800;color:#fff">Customize Referral Code</h3>
              <p style="margin:2px 0 0;color:#94A3B8;font-size:0.78rem">Create a personalized, branded handle for your invite link</p>
            </div>
          </div>
          <button class="modal-x" onclick="window.closeVanityCodeModal()" style="background:rgba(255,255,255,0.06);border:none;color:#94A3B8;font-size:1.1rem;width:32px;height:32px;border-radius:8px;cursor:pointer;display:flex;align-items:center;justify-content:center" aria-label="Close">✕</button>
        </div>

        <form id="form-custom-ref-code" onsubmit="submitCustomRefCode(event)">
          <div style="margin-bottom:14px">
            <label style="display:flex;justify-content:space-between;color:#CBD5E1;font-size:0.78rem;font-weight:700;text-transform:uppercase;margin-bottom:6px">
              <span>Your Custom Referral Code</span>
              <span id="ref-code-char-count" style="color:#34D399;font-weight:700;text-transform:none">${cleanCode.length}/20 chars</span>
            </label>
            <div style="position:relative">
              <span style="position:absolute;left:14px;top:50%;transform:translateY(-50%);color:#64748B;font-weight:800;font-family:monospace;font-size:0.95rem">?ref=</span>
              <input type="text" id="inp-custom-ref-code" value="${escapeHtml(cleanCode)}" placeholder="e.g. VIP2026, PROEARNER" maxlength="20" minlength="3" autocomplete="off" spellcheck="false" required style="width:100%;padding:12px 14px 12px 64px;background:#1E293B;border:1.5px solid #334155;border-radius:10px;color:#38BDF8;font-family:monospace;font-size:1.05rem;font-weight:800;letter-spacing:1px;box-sizing:border-box;outline:none;transition:border 0.2s" onfocus="this.style.borderColor='#10B981'" onblur="this.style.borderColor='#334155'" oninput="onCustomRefCodeInput(this)">
            </div>
            <div id="ref-code-validation-hint" style="font-size:0.74rem;margin-top:6px;color:#94A3B8">
              Alphanumeric characters only (A-Z, 0-9). Min 3, max 20 letters.
            </div>
          </div>

          <!-- Live Share Link Preview Card -->
          <div style="background:rgba(30,41,59,0.7);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:12px 14px;margin-bottom:18px">
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
              <span style="font-size:0.75rem;color:#94A3B8;font-weight:700;text-transform:uppercase">🔗 Live Invite Link Preview:</span>
            </div>
            <div id="preview-custom-ref-link" style="color:#34D399;font-family:monospace;font-size:0.84rem;font-weight:700;word-break:break-all">
              ${window.location.origin}/?ref=${escapeHtml(cleanCode || 'YOURCODE')}
            </div>
          </div>

          <!-- Benefits Highlight -->
          <div style="background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.22);border-radius:10px;padding:12px 14px;margin-bottom:20px;font-size:0.78rem;color:#A7F3D0;line-height:1.5">
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
              <span>✨</span><span><b>Invited Friend Receives:</b> ৳50 Welcome Credit upon registration.</span>
            </div>
            <div style="display:flex;align-items:center;gap:6px">
              <span>🎁</span><span><b>You Earn:</b> ৳100 Direct Cash + 150 Loyalty XP on their first completed task!</span>
            </div>
          </div>

          <div style="display:flex;justify-content:flex-end;gap:10px;border-top:1px solid rgba(255,255,255,0.08);padding-top:16px">
            <button type="button" class="btn btn-outline-light btn-sm" onclick="window.closeVanityCodeModal()" style="font-weight:700;padding:9px 18px">Cancel</button>
            <button type="submit" id="btn-save-custom-ref-code" class="btn btn-green btn-sm" style="font-weight:800;padding:9px 22px">Save Custom Code ✨</button>
          </div>
        </form>
      </div>
    `;
  };

  window.openVanityCodeModal = function(currCode) {
    ensureVanityCodeModal(currCode);
    if (typeof openModal === 'function') {
      openModal('modal-custom-ref-code');
    } else {
      const modal = document.getElementById('modal-custom-ref-code');
      if (modal) modal.classList.add('open');
    }
    setTimeout(() => {
      const inp = document.getElementById('inp-custom-ref-code');
      if (inp) {
        inp.focus();
        inp.select();
      }
    }, 100);
  };

  window.onCustomRefCodeInput = function(inp) {
    const val = inp.value.toUpperCase().replace(/[^A-Z0-9_-]/g, '');
    inp.value = val;
    const preview = document.getElementById('preview-custom-ref-link');
    if (preview) {
      preview.textContent = `${window.location.origin}/?ref=${val || 'YOURCODE'}`;
    }
    const count = document.getElementById('ref-code-char-count');
    if (count) {
      count.textContent = `${val.length}/20 chars`;
      count.style.color = (val.length >= 3 && val.length <= 20) ? '#34D399' : '#F87171';
    }
    const btn = document.getElementById('btn-save-custom-ref-code');
    if (btn) {
      btn.disabled = val.length < 3 || val.length > 20;
    }
  };

  window.submitCustomRefCode = async function(e) {
    e.preventDefault();
    const inp = document.getElementById('inp-custom-ref-code');
    const code = inp ? inp.value.trim().toUpperCase() : '';
    if (!code || code.length < 3) {
      toast('Please enter a valid code (at least 3 characters).', 'error');
      return;
    }
    const btn = document.getElementById('btn-save-custom-ref-code');
    if (btn) { btn.disabled = true; btn.textContent = 'Saving...'; }
    try {
      const res = await api('/referrals/custom-code', {
        method: 'POST',
        body: { code }
      });
      window.closeVanityCodeModal();
      toast(res.message || '🎉 Custom referral code updated successfully!', 'success');
      loadReferralHub();
    } catch (err) {
      toast('Failed to update referral code: ' + err.message, 'error');
    }
    if (btn) { btn.disabled = false; btn.textContent = 'Save Custom Code ✨'; }
  };

  async function loadLoyaltyHub() {
    const container = document.getElementById('loyalty-hub-container');
    if (!container) return;
    try {
      const [profile, rewardsRes, lbRes] = await Promise.all([
        api('/loyalty/me'),
        api('/loyalty/rewards'),
        api('/loyalty/leaderboard?limit=5')
      ]);

      const rewards = rewardsRes.items || [];
      const leaders = lbRes.items || [];

      container.innerHTML = `
        <!-- Level Progress Hero Card -->
        <div class="loyalty-level-card">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:12px">
            <div style="display:flex;align-items:center;gap:12px">
              <span style="font-size:2.4rem">${profile.level_icon || '🏆'}</span>
              <div>
                <h3 style="color:#fff;font-size:1.4rem;font-weight:800;margin:0">Level ${profile.level}: ${escapeHtml(profile.level_title)}</h3>
                <small style="color:#C7D2FE;font-size:0.84rem">⭐ <b>${profile.fee_discount_pct}% Platform Fee Discount</b> Active</small>
              </div>
            </div>
            <div>
              <button class="streak-flame-badge" onclick="executeWalletDailyCheckin()" style="cursor:pointer;border:none">
                🔥 Day ${profile.streak_days || 1} Streak ${profile.can_check_in_today ? '(Check-in Ready!)' : '(Done Today)'}
              </button>
            </div>
          </div>

          <!-- XP Progress Bar -->
          <div style="display:flex;justify-content:space-between;align-items:center;font-size:0.82rem;color:#E0E7FF">
            <span><b>${profile.xp.toLocaleString()} XP</b> Earned</span>
            <span>Next: <b>${escapeHtml(profile.next_level_title)}</b> (${profile.xp_to_next} XP needed)</span>
          </div>
          <div class="loyalty-progress-track">
            <div class="loyalty-progress-fill" style="width:${profile.progress_pct}%"></div>
          </div>

          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:14px;flex-wrap:wrap;gap:8px">
            <div style="font-size:0.84rem;color:#C7D2FE">
              🪙 Loyalty Points Balance: <b style="color:#FBBF24;font-size:1.1rem">${profile.points_balance} Pts</b>
            </div>
            <div style="font-size:0.8rem;color:#A5B4FC">
              ${escapeHtml(profile.tier_perks)}
            </div>
          </div>
        </div>

        <!-- 6 Tier Progress Matrix -->
        <div style="background:#131B2E;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:20px;margin-bottom:24px">
          <h4 style="color:#fff;font-size:1rem;font-weight:800;margin:0 0 14px">👑 VIP Loyalty Tier Matrix</h4>
          <div style="display:grid;grid-template-columns:repeat(6, 1fr);gap:10px">
            ${(profile.all_tiers || []).map(tier => `
              <div style="background:${tier.level === profile.level ? 'rgba(59,130,246,0.18)' : 'rgba(255,255,255,0.03)'};border:1px solid ${tier.level === profile.level ? '#3B82F6' : 'rgba(255,255,255,0.08)'};border-radius:12px;padding:12px;text-align:center">
                <div style="font-size:1.6rem;margin-bottom:4px">${tier.icon}</div>
                <b style="color:#fff;font-size:0.78rem;display:block">${tier.level}. ${escapeHtml(tier.title.split(' ')[0])}</b>
                <span style="color:#10B981;font-size:0.72rem;font-weight:800">${tier.fee_discount_pct}% OFF</span>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Rewards Exchange Shop -->
        <div style="background:#131B2E;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:22px;margin-bottom:24px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
            <div>
              <h4 style="color:#fff;font-size:1.1rem;font-weight:800;margin:0">🎁 Rewards Exchange Shop</h4>
              <p style="color:#94A3B8;font-size:0.8rem;margin:2px 0 0">Redeem your loyalty points for wallet cash, fee vouchers, and profile boosts.</p>
            </div>
            <div style="background:rgba(251,191,36,0.15);border:1px solid rgba(251,191,36,0.3);color:#FBBF24;font-size:0.84rem;font-weight:800;padding:4px 12px;border-radius:12px">
              🪙 ${profile.points_balance} Points Available
            </div>
          </div>

          <div class="rewards-shop-grid">
            ${rewards.map(r => `
              <div class="reward-shop-card">
                <div>
                  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px">
                    <span style="font-size:1.4rem">🎁</span>
                    <span style="color:#FBBF24;font-weight:800;font-size:0.95rem">🪙 ${r.points_cost} Pts</span>
                  </div>
                  <b style="color:#fff;font-size:0.92rem;display:block;margin-bottom:4px">${escapeHtml(r.title)}</b>
                  <small style="color:#94A3B8;display:block;font-size:0.76rem">Type: ${escapeHtml(r.reward_type)}</small>
                </div>
                <button class="btn btn-green btn-block" onclick="executeRedeemReward(${r.id})" style="font-weight:700;font-size:0.8rem;padding:8px;margin-top:12px" ${profile.points_balance < r.points_cost ? 'disabled' : ''}>
                  ${profile.points_balance < r.points_cost ? 'Need More Points' : '⚡ Redeem Now'}
                </button>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- XP Leaderboard -->
        <div style="background:#131B2E;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:20px">
          <h4 style="color:#fff;font-size:1rem;font-weight:800;margin:0 0 14px">🏆 Top XP Champions Leaderboard</h4>
          <div class="tx-list">
            ${leaders.map((u, idx) => `
              <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border-bottom:1px solid rgba(255,255,255,0.06)">
                <div style="display:flex;align-items:center;gap:10px">
                  <span style="font-size:1.2rem">${['🥇', '🥈', '🥉', '🎖️', '🎖️'][idx] || '🎖️'}</span>
                  <div>
                    <b style="color:#fff;font-size:0.88rem">${escapeHtml(u.name)}</b>
                    <small style="color:#94A3B8;display:block;font-size:0.74rem">Level ${u.level}: ${escapeHtml(u.level_title)} · 🔥 Day ${u.streak_days || 1}</small>
                  </div>
                </div>
                <span style="color:#FBBF24;font-weight:800;font-size:0.95rem">${u.xp.toLocaleString()} XP</span>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    } catch (err) {
      container.innerHTML = `<div class="empty-state"><span class="big">⚠️</span>${escapeHtml(err.message)}</div>`;
    }
  }

  window.executeWalletDailyCheckin = async function() {
    try {
      const res = await api('/loyalty/daily-checkin', { method: 'POST' });
      toast(res.message, res.already_checked_in ? 'info' : 'success');
      loadLoyaltyHub();
    } catch (err) {
      toast('Check-in failed: ' + err.message, 'error');
    }
  };

  window.executeRedeemReward = async function(rewardId) {
    try {
      const res = await api('/loyalty/redeem', {
        method: 'POST',
        body: { rewardId }
      });
      toast(`🎉 ${res.message}`, 'success');
      load();
      loadLoyaltyHub();
    } catch (err) {
      toast('Redemption failed: ' + err.message, 'error');
    }
  };

  window.handleTxFilterChange = function(val) {
    txFilterType = val;
    render();
  };

  function openMoneyModal(kind) {
    ensureMoneyModal(kind);
    openModal('xe-money-modal');
  }

  let moneyModalBuilt = null;
  function ensureMoneyModal(kind) {
    if (moneyModalBuilt) moneyModalBuilt.remove();
    const wrap = document.createElement('div');
    wrap.innerHTML = `
    <div class="modal-overlay" id="xe-money-modal">
      <div class="modal" style="max-width:480px">
        <button class="modal-x" data-close="xe-money-modal" aria-label="Close">✕</button>
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
          <span style="font-size:1.4rem">${kind === 'deposit' ? '⬇️' : '⬆️'}</span>
          <div>
            <h2 class="modal-title" style="margin:0">${kind === 'deposit' ? 'Top-Up Wallet' : 'Withdraw Earnings'}</h2>
            <p class="modal-sub" style="margin:2px 0 0">${kind === 'deposit' ? 'Instant simulated deposit via MFS or Card' : 'Fast payout to your bKash, Nagad or Bank'}</p>
          </div>
        </div>

        <form id="money-form">
          <label style="color:#94A3B8;font-size:0.78rem;font-weight:700;text-transform:uppercase;display:block;margin-bottom:6px">Amount (৳ BDT)
            <input type="number" id="inp-money-amount" name="amount" min="${kind === 'deposit' ? 20 : 100}" step="10" value="${kind === 'deposit' ? 500 : 100}" required class="adm-input" style="width:100%;box-sizing:border-box;margin-top:4px">
          </label>

          <!-- Quick presets -->
          <div style="display:flex;gap:6px;margin:8px 0 16px;flex-wrap:wrap">
            ${[100, 500, 1000, 2000, 5000].map(amt => `
              <button type="button" class="btn btn-sm btn-outline-light" onclick="document.getElementById('inp-money-amount').value = ${amt}" style="padding:3px 8px;font-size:0.75rem">৳${amt.toLocaleString()}</button>
            `).join('')}
          </div>

          <label style="color:#94A3B8;font-size:0.78rem;font-weight:700;text-transform:uppercase;display:block;margin-bottom:6px">Payment Gateway / Channel
            <select name="method" class="adm-select" style="width:100%;box-sizing:border-box;margin-top:4px">
              ${(kind === 'deposit'
                ? ['bkash 📱 (bKash Direct)', 'nagad 📱 (Nagad Instant)', 'card 💳 (Visa / Mastercard)', 'bank 🏦 (Direct Bank EFT)']
                : ['bkash 📱 (bKash Payout)', 'nagad 📱 (Nagad Payout)', 'bank 🏦 (Bank Account Transfer)'])
                .map(o => `<option value="${o.split(' ')[0]}">${o}</option>`).join('')}
            </select>
          </label>

          ${kind === 'withdraw' ? `
            <label style="color:#94A3B8;font-size:0.78rem;font-weight:700;text-transform:uppercase;display:block;margin:12px 0 6px">Account / Wallet Number
              <input type="text" name="account" value="${escapeHtml(payoutAccounts?.bkash || Auth.user?.phone || '')}" placeholder="01XXXXXXXXX" minlength="5" required class="adm-input" style="width:100%;box-sizing:border-box;margin-top:4px">
            </label>` : ''}

          <button class="btn btn-green btn-block" type="submit" style="font-weight:700;padding:12px;margin-top:16px">
            ${kind === 'deposit' ? '💳 Deposit Now' : '💸 Request Withdrawal'}
          </button>
        </form>
      </div>
    </div>`;
    document.body.appendChild(wrap);
    moneyModalBuilt = wrap;

    wrap.querySelector('#money-form').addEventListener('submit', async e => {
      e.preventDefault();
      const f = e.target;
      const btn = f.querySelector('button[type=submit]');
      btn.disabled = true;
      try {
        const res = await api(`/wallet/${kind}`, {
          method: 'POST',
          body: { amount: Number(f.amount.value), method: f.method.value, account: f.account ? f.account.value : undefined }
        });
        closeModal('xe-money-modal');
        toast(kind === 'deposit'
          ? `Deposited ${money(Number(f.amount.value))} — new balance ${money(res.balance)}`
          : `Withdrawal of ${money(Number(f.amount.value))} requested — pending approval`);
        load();
      } catch (err) { toast(err.message, 'error'); }
      btn.disabled = false;
    });
  }

  document.addEventListener('xe:auth', () => { if (!Auth.user) location.href = '/'; });
  load().then(() => {
    if (activeTab === 'referrals') loadReferralHub();
    else if (activeTab === 'loyalty') loadLoyaltyHub();
  });
});

