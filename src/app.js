/* ==========================================================================
   Tier Vault — Application Logic
   ========================================================================== */

const DATA_FILE = 'data/results.json';

const TIER_RANKS = ['HT1', 'LT1', 'HT2', 'LT2', 'HT3', 'LT3', 'HT4', 'LT4', 'HT5', 'LT5'];

const TIER_POINTS = {
  'HT1': 50, 'LT1': 45, 'HT2': 40, 'LT2': 35, 'HT3': 30, 'LT3': 25,
  'HT4': 20, 'LT4': 15, 'HT5': 10, 'LT5': 5
};

const GAMEMODES = ['crystal', 'beast', 'diapot', 'nethpot', 'mace', 'uhc', 'sword'];

const GAMEMODE_EMOJIS = {
  overall: '🏆',
  crystal: '🔮',
  beast: '👹',
  diapot: '💎',
  nethpot: '🌋',
  mace: '🔨',
  uhc: '⚔️',
  sword: '🗡️'
};

const GAMEMODE_COLORS = {
  crystal: '#a78bfa',
  beast: '#fb923c',
  diapot: '#2dd4bf',
  nethpot: '#ef4444',
  mace: '#fbbf24',
  uhc: '#22c55e',
  sword: '#3b82f6'
};

// Gemstone colors per tier
const TIER_COLORS = {
  'HT1': '#f5c96b', 'LT1': '#4ade80', 'HT2': '#22d3ee', 'LT2': '#38bdf8',
  'HT3': '#818cf8', 'LT3': '#a78bfa', 'HT4': '#fb7185', 'LT4': '#f472b6',
  'HT5': '#94a3b8', 'LT5': '#a1a1aa'
};

let allData = null;
let currentGamemode = 'overall';
let currentView = 'table';
let currentSort = 'points';
let currentQuery = '';

// ==================== Data loading ====================

async function loadData() {
  try {
    const response = await fetch(DATA_FILE, { cache: 'no-store' });
    if (!response.ok) throw new Error('Failed to load data');
    allData = await response.json();
    init();
  } catch (err) {
    console.error('Error loading data:', err);
    document.getElementById('statsGrid').innerHTML =
      '<div style="grid-column:1/-1;text-align:center;color:var(--danger);padding:40px">Failed to load archive data.</div>';
  }
}

function getTierPoints(tier) { return TIER_POINTS[tier] || 0; }

function calculatePlayerPoints(tiers) {
  let points = 0;
  for (const gm of GAMEMODES) {
    const tier = tiers[gm];
    if (tier) points += getTierPoints(tier);
  }
  return points;
}

function getTierRankValue(tier) {
  if (!tier) return 999;
  return TIER_RANKS.indexOf(tier);
}

// ==================== Sorting ====================

function sortPlayers(players, gamemode, sort) {
  const sorted = [...players].sort((a, b) => {
    const tiersA = a.tiers || {};
    const tiersB = b.tiers || {};

    if (gamemode === 'overall') {
      if (sort === 'points') {
        return calculatePlayerPoints(tiersB) - calculatePlayerPoints(tiersA);
      }
      if (sort === 'tier') {
        const ta = tiersA[currentGamemode === 'overall' ? 'crystal' : gamemode];
        const tb = tiersB[currentGamemode === 'overall' ? 'crystal' : gamemode];
        return getTierRankValue(ta) - getTierRankValue(tb);
      }
    } else {
      const tierA = tiersA[gamemode];
      const tierB = tiersB[gamemode];
      if (sort === 'tier') return getTierRankValue(tierA) - getTierRankValue(tierB);
      if (sort === 'points') return calculatePlayerPoints(tiersB) - calculatePlayerPoints(tiersA);
    }

    if (sort === 'nameAsc') {
      return (a.username || '').localeCompare(b.username || '');
    }
    if (sort === 'nameDesc') {
      return (b.username || '').localeCompare(a.username || '');
    }
    return 0;
  });
  return sorted;
}

function getPlayersForGamemode(gamemode) {
  let players = allData.players || [];
  if (gamemode === 'overall') return players;
  return players.filter(p => (p.tiers || {})[gamemode]);
}

function searchPlayers(query) {
  let players = getPlayersForGamemode(currentGamemode);
  if (!query.trim()) return players;
  const q = query.toLowerCase();
  return players.filter(p => p.username && p.username.toLowerCase().includes(q));
}

// ==================== Rendering ====================

function renderStats() {
  const stats = allData.stats || {};
  const grid = document.getElementById('statsGrid');
  grid.innerHTML = '';

  const items = [
    { label: 'Total Tests', value: stats.totalTests || 0, desc: 'gradings recorded', color: '#a78bfa' },
    { label: 'Active Players', value: stats.activePlayers || 0, desc: 'ranked testers', color: '#2dd4bf' },
    { label: 'Total Testers', value: stats.totalTesters || 0, desc: 'in the vault', color: '#fb923c' },
    { label: 'Weekly Tests', value: stats.weeklyTests || 0, desc: 'this cycle', color: '#fbbf24' }
  ];

  items.forEach((item, i) => {
    const card = document.createElement('div');
    card.className = 'stat-card';
    card.style.animationDelay = `${i * 100}ms`;
    card.style.opacity = '0';
    card.innerHTML = `
      <div class="stat-ring-wrap">
        <div class="stat-ring" style="border-top-color:${item.color};"></div>
      </div>
      <div class="stat-value count-up" data-target="${item.value}">0</div>
      <div class="stat-label">${item.label}</div>
      <div class="stat-desc">${item.desc}</div>
    `;
    grid.appendChild(card);
  });

  // count-up via intersection observer
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const target = +el.getAttribute('data-target');
        animateCount(el, target);
        observer.unobserve(el);
      }
    });
  }, { threshold: 0.3 });

  document.querySelectorAll('.count-up').forEach(el => observer.observe(el));

  if (allData.lastUpdated) {
    const el = document.getElementById('lastUpdated');
    if (el) el.textContent = `Last updated: ${allData.lastUpdated}`;
  }
}

function animateCount(el, target) {
  let start = 0;
  const duration = 1200;
  const startTime = performance.now();
  const ease = t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  const step = now => {
    const progress = Math.min((now - startTime) / duration, 1);
    el.textContent = Math.floor(ease(progress) * target).toLocaleString();
    if (progress < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function getTierChipHTML(tier) {
  if (!tier || tier === 'Untested' || tier === 'Not Tested') {
    return `<span class="tier-chip empty">untested</span>`;
  }
  const color = TIER_COLORS[tier] || '#94a3b8';
  return `<span class="tier-chip" style="color:${color};border:1px solid rgba(255,255,255,0.08);background:linear-gradient(135deg,${color}15,${color}08);box-shadow:0 0 16px ${color}22;">${tier}</span>`;
}

function renderTable(players) {
  const thead = document.getElementById('tableHeader');
  const tbody = document.getElementById('tableBody');
  const emptyState = document.getElementById('emptyState');

  thead.innerHTML = '';
  tbody.innerHTML = '';

  if (players.length === 0) {
    emptyState.classList.remove('hidden');
    return;
  }
  emptyState.classList.add('hidden');

  // Header
  const headerRow = document.createElement('tr');
  if (currentGamemode === 'overall') {
    headerRow.innerHTML = `
      <th class="sortable" data-sort="points">Rank</th>
      <th class="sortable" data-sort="nameAsc">Player</th>
      ${GAMEMODES.map(gm => `<th class="sortable" data-sort="tier" style="color:${GAMEMODE_COLORS[gm]}">${GAMEMODE_EMOJIS[gm]} ${gm}</th>`).join('')}
      <th class="sortable" data-sort="points">Points</th>
    `;
  } else {
    headerRow.innerHTML = `
      <th class="sortable" data-sort="points">Rank</th>
      <th class="sortable" data-sort="nameAsc">Player</th>
      <th class="sortable" data-sort="tier" style="color:${GAMEMODE_COLORS[currentGamemode]}">Tier</th>
      <th class="sortable" data-sort="points">Points</th>
    `;
  }
  thead.appendChild(headerRow);

  // Rows
  players.forEach((player, index) => {
    const rank = index + 1;
    const row = document.createElement('tr');
    row.className = 'row-enter';
    row.style.animationDelay = `${index * 60}ms`;

    const rankTd = document.createElement('td');
    rankTd.className = 'rank-cell';
    rankTd.innerHTML = rank === 1 ? '<span class="rank-medal">👑</span>' :
                       rank === 2 ? '<span class="rank-medal">🥈</span>' :
                       rank === 3 ? '<span class="rank-medal">🥉</span>' : rank;

    const playerTd = document.createElement('td');
    playerTd.innerHTML = `
      <div class="player-cell" onclick="openPlayerModal('${player.uuid}')">
        <img class="player-avatar" src="https://mc-heads.net/avatar/${player.uuid}" alt="${player.username}" loading="lazy">
        <span class="player-name">${escapeHtml(player.username)}</span>
      </div>
    `;

    row.appendChild(rankTd);
    row.appendChild(playerTd);

    if (currentGamemode === 'overall') {
      const tiers = player.tiers || {};
      for (const gm of GAMEMODES) {
        const tier = tiers[gm];
        const tierTd = document.createElement('td');
        tierTd.innerHTML = getTierChipHTML(tier);
        row.appendChild(tierTd);
      }
      const points = calculatePlayerPoints(tiers);
      const pointsTd = document.createElement('td');
      pointsTd.className = 'points-cell';
      pointsTd.textContent = points;
      row.appendChild(pointsTd);
    } else {
      const tiers = player.tiers || {};
      const tier = tiers[currentGamemode];
      const tierTd = document.createElement('td');
      tierTd.innerHTML = getTierChipHTML(tier);
      row.appendChild(tierTd);
      const totalPoints = calculatePlayerPoints(tiers);
      const pointsTd = document.createElement('td');
      pointsTd.className = 'points-cell';
      pointsTd.textContent = totalPoints;
      row.appendChild(pointsTd);
    }

    tbody.appendChild(row);
  });

  // Staggered reveal
  requestAnimationFrame(() => {
    document.querySelectorAll('.row-enter').forEach((el, i) => {
      setTimeout(() => el.classList.add('visible'), i * 40);
    });
  });
}

function renderCards(players) {
  const container = document.getElementById('cardView');
  container.innerHTML = '';

  if (players.length === 0) {
    document.getElementById('emptyState').classList.remove('hidden');
    return;
  }
  document.getElementById('emptyState').classList.add('hidden');

  players.forEach((player, index) => {
    const tiers = player.tiers || {};
    const points = calculatePlayerPoints(tiers);
    const card = document.createElement('div');
    card.className = 'player-card';
    card.style.animationDelay = `${index * 50}ms`;
    card.innerHTML = `
      <div class="card-header">
        <img class="card-avatar" src="https://mc-heads.net/avatar/${player.uuid}" alt="${player.username}" loading="lazy">
        <span class="card-name">${escapeHtml(player.username)}</span>
        <span class="card-rank">#${index + 1}</span>
      </div>
      <div class="card-tiers">
        ${GAMEMODES.map(gm => {
          const tier = tiers[gm];
          const color = TIER_COLORS[tier] || '#6e6684';
          return `<span class="tier-chip ${tier ? '' : 'empty'}" style="color:${color};">${tier || '—'}</span>`;
        }).join('')}
      </div>
      <button class="card-action" onclick="event.stopPropagation(); openPlayerModal('${player.uuid}')" title="View profile">◈</button>
      <div class="card-points">${points} pts</div>
    `;
    card.onclick = () => openPlayerModal(player.uuid);
    container.appendChild(card);
  });

  requestAnimationFrame(() => {
    document.querySelectorAll('.player-card').forEach((el, i) => {
      setTimeout(() => el.classList.add('visible'), i * 40);
    });
  });
}

function renderLeaderboard() {
  let players = searchPlayers(currentQuery);
  players = sortPlayers(players, currentGamemode, currentSort);

  const tableView = document.getElementById('tableView');
  const cardView = document.getElementById('cardView');

  if (currentView === 'table') {
    tableView.classList.remove('hidden');
    cardView.classList.add('hidden');
    renderTable(players);
  } else {
    cardView.classList.remove('hidden');
    tableView.classList.add('hidden');
    renderCards(players);
  }
}

// ==================== Modal ====================

function openPlayerModal(uuid) {
  const player = (allData.players || []).find(p => p.uuid === uuid);
  if (!player) return;

  const tiers = player.tiers || {};
  const totalPoints = calculatePlayerPoints(tiers);

  const body = document.getElementById('modalBody');
  const tiersHtml = GAMEMODES.map(gm => {
    const tier = tiers[gm];
    const emoji = GAMEMODE_EMOJIS[gm] || '';
    const color = TIER_COLORS[tier] || '#6e6684';
    return `
      <div class="tier-row">
        <span class="tier-emoji">${emoji}</span>
        <span class="tier-name">${gm}</span>
        <span class="tier-rank-chip" style="color:${color};border:1px solid ${color}33;background:${color}0d;">${tier || '—'}</span>
      </div>
    `;
  }).join('');

  body.innerHTML = `
    <div class="modal-skin-wrap">
      <img class="modal-skin" id="modalSkin" src="https://mc-heads.net/body/${uuid}" alt="${player.username} skin" loading="lazy">
    </div>
    <div class="modal-header">
      <h2 class="modal-title">${escapeHtml(player.username)}</h2>
      <div class="modal-sub">UUID: ${player.uuid}</div>
    </div>
    <div class="modal-section-title">Tier Ranks</div>
    <div class="tiers-grid">${tiersHtml}</div>
    <div class="points-strip">
      <span class="points-label">Total Points</span>
      <span>${totalPoints}</span>
    </div>
    <div class="modal-actions">
      <button class="modal-btn primary" onclick="copyUuid('${player.uuid}')">Copy UUID</button>
      <button class="modal-btn secondary" onclick="closePlayerModal()">Close</button>
    </div>
  `;

  const modal = document.getElementById('playerModal');
  modal.classList.remove('hidden');
  requestAnimationFrame(() => modal.classList.add('visible'));

  // 3D tilt on skin
  const skinWrap = document.getElementById('modalSkinWrap') || body.querySelector('.modal-skin-wrap');
  const skin = document.getElementById('modalSkin') || body.querySelector('.modal-skin');
  if (skinWrap && skin) {
    skinWrap.addEventListener('mousemove', handleTilt);
    skinWrap.addEventListener('mouseleave', () => {
      skin.style.transform = 'rotateX(0deg) rotateY(0deg)';
    });
  }
}

let tiltHandler = null;

function handleTilt(e) {
  const wrap = e.currentTarget;
  const rect = wrap.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const centerX = rect.width / 2;
  const centerY = rect.height / 2;
  const rotateX = ((y - centerY) / centerY) * -8;
  const rotateY = ((x - centerX) / centerX) * 8;
  const skin = wrap.querySelector('.modal-skin');
  if (skin) skin.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
}

function closePlayerModal() {
  const modal = document.getElementById('playerModal');
  modal.classList.remove('visible');
  setTimeout(() => modal.classList.add('hidden'), 350);
  if (tiltHandler) {
    document.querySelector('.modal-skin-wrap')?.removeEventListener('mousemove', tiltHandler);
    tiltHandler = null;
  }
}

function copyUuid(uuid) {
  navigator.clipboard.writeText(uuid).then(() => {
    showToast('UUID copied to clipboard');
  });
}

// ==================== UI wiring ====================

function initTabs() {
  const container = document.getElementById('tabs');
  container.innerHTML = '';

  const modes = ['overall', ...GAMEMODES];
  modes.forEach(mode => {
    const btn = document.createElement('button');
    btn.className = `gm-pill ${mode === currentGamemode ? 'active' : ''}`;
    const color = GAMEMODE_COLORS[mode] || '#a78bfa';
    btn.innerHTML = `<span class="gm-emoji">${GAMEMODE_EMOJIS[mode]}</span>${mode.charAt(0).toUpperCase() + mode.slice(1)}`;
    if (mode !== 'overall') btn.style.borderColor = `${color}33`;
    btn.addEventListener('click', () => {
      currentGamemode = mode;
      document.querySelectorAll('.gm-pill').forEach(b => {
        b.classList.remove('active');
        b.style.borderColor = '';
      });
      btn.classList.add('active');
      renderLeaderboard();
    });
    container.appendChild(btn);
  });
}

function initSearch() {
  const input = document.getElementById('searchInput');
  const clearBtn = document.getElementById('clearSearch');
  const toggle = document.getElementById('searchToggle');

  toggle.addEventListener('click', () => {
    input.focus();
  });

  input.addEventListener('input', (e) => {
    currentQuery = e.target.value;
    clearBtn.style.display = currentQuery.trim() ? 'block' : 'none';
    renderLeaderboard();
  });

  clearBtn.addEventListener('click', () => {
    input.value = '';
    currentQuery = '';
    clearBtn.style.display = 'none';
    renderLeaderboard();
    input.focus();
  });

  // / to focus search
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && !document.activeElement.closest('.search-wrap') && !document.getElementById('playerModal').classList.contains('visible')) {
      e.preventDefault();
      input.focus();
    }
    if (e.key === 'Escape') {
      closePlayerModal();
    }
  });
}

function initSort() {
  const select = document.getElementById('sortSelect');
  select.addEventListener('change', (e) => {
    currentSort = e.target.value;
    renderLeaderboard();
  });

  // Header click sorting
  document.getElementById('tableHeader').addEventListener('click', (e) => {
    const th = e.target.closest('[data-sort]');
    if (!th) return;
    const sort = th.getAttribute('data-sort');
    currentSort = sort;
    select.value = sort;
    renderLeaderboard();
  });
}

function initTheme() {
  const btn = document.getElementById('themeToggle');
  const html = document.documentElement;
  btn.addEventListener('click', () => {
    const isDark = html.getAttribute('data-theme') === 'dark';
    html.setAttribute('data-theme', isDark ? 'light' : 'dark');
    btn.textContent = isDark ? '☀️' : '🌙';
  });
}

function initView() {
  const btn = document.getElementById('viewToggle');
  btn.addEventListener('click', () => {
    currentView = currentView === 'table' ? 'card' : 'table';
    btn.setAttribute('data-view', currentView);
    btn.textContent = currentView === 'table' ? '▧' : '☰';
    renderLeaderboard();
  });
}

function initScroll() {
  const progress = document.getElementById('scrollProgress');
  const backToTop = document.getElementById('backToTop');

  window.addEventListener('scroll', () => {
    const scrolled = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
    progress.style.width = `${Math.max(0, Math.min(100, scrolled))}%`;

    if (window.scrollY > 300) backToTop.classList.add('show');
    else backToTop.classList.remove('show');

    // Reveal on scroll
    document.querySelectorAll('.reveal').forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight - 80) el.classList.add('visible');
    });
  });

  backToTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

function initFooter() {
  document.getElementById('year').textContent = new Date().getFullYear();
}

function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ==================== Init ====================

function init() {
  if (!allData || !allData.players) return;

  renderStats();
  initTabs();
  initSearch();
  initSort();
  initTheme();
  initView();
  initScroll();
  initFooter();

  // Modal close handlers
  document.getElementById('modalClose').addEventListener('click', closePlayerModal);
  document.getElementById('modalBackdrop').addEventListener('click', closePlayerModal);

  renderLeaderboard();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadData);
} else {
  loadData();
}

// Expose for inline handlers
window.openPlayerModal = openPlayerModal;
window.closePlayerModal = closePlayerModal;
