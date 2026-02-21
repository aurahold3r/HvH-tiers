// Configuration
const DATA_FILE = 'data/results.json';
const TIER_RANKS = ['HT1', 'LT1', 'HT2', 'LT2', 'HT3', 'LT3', 'HT4', 'LT4', 'HT5', 'LT5'];
const GAMEMODES = ['crystal', 'beast', 'diapot', 'nethpot', 'mace', 'uhc', 'sword'];
const TIER_POINTS = {
  'HT1': 50, 'LT1': 45, 'HT2': 40, 'LT2': 35, 'HT3': 30, 'LT3': 25,
  'HT4': 20, 'LT4': 15, 'HT5': 10, 'LT5': 5
};
const GAMEMODE_EMOJIS = {
  overall: '📊',
  crystal: '🔮',
  beast: '👹',
  diapot: '💎',
  nethpot: '🌋',
  mace: '🔨',
  uhc: '⚔️',
  sword: '🗡️'
};

let allData = null;
let currentGamemode = 'overall';

// Load data from JSON
async function loadData() {
  try {
    const response = await fetch(DATA_FILE, { cache: 'no-store' });
    if (!response.ok) throw new Error('Failed to load data');
    allData = await response.json();
    init();
  } catch (err) {
    console.error('Error loading data:', err);
    document.getElementById('stats').innerHTML = '<p style="color: red;">Failed to load leaderboard data.</p>';
  }
}

// Get points for a single tier
function getTierPoints(tier) {
  return TIER_POINTS[tier] || 0;
}

// Calculate total points for a player
function calculatePlayerPoints(tiers) {
  let points = 0;
  for (const gamemode of GAMEMODES) {
    const tier = tiers[gamemode];
    if (tier) {
      points += getTierPoints(tier);
    }
  }
  return points;
}

// Render stats cards
function renderStats() {
  const stats = allData.stats || {};
  const statsHtml = `
    <div class="stat-card">
      <div class="stat-label">Total Tests</div>
      <div class="stat-value">${stats.totalTests || 0}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Active Players</div>
      <div class="stat-value">${stats.activePlayers || 0}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Total Testers</div>
      <div class="stat-value">${stats.totalTesters || 0}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Weekly Tests</div>
      <div class="stat-value">${stats.weeklyTests || 0}</div>
    </div>
  `;
  document.getElementById('stats').innerHTML = statsHtml;

  // Update last updated date
  if (allData.lastUpdated) {
    document.getElementById('lastUpdated').textContent = `Last updated: ${allData.lastUpdated}`;
  }
}

// Sort players by tier rank
function getTierRankValue(tier) {
  if (!tier) return 999;
  return TIER_RANKS.indexOf(tier);
}

function sortPlayersByTier(players, gamemode) {
  if (gamemode === 'overall') {
    return players.sort((a, b) => {
      const pointsA = calculatePlayerPoints(a.tiers || {});
      const pointsB = calculatePlayerPoints(b.tiers || {});
      return pointsB - pointsA;
    });
  } else {
    return players.sort((a, b) => {
      const tierA = (a.tiers || {})[gamemode];
      const tierB = (b.tiers || {})[gamemode];
      return getTierRankValue(tierA) - getTierRankValue(tierB);
    });
  }
}

// Get players for current gamemode
function getPlayersForGamemode(gamemode) {
  let players = allData.players || [];

  if (gamemode === 'overall') {
    return sortPlayersByTier(players, 'overall');
  } else {
    // Filter players who have tested in this gamemode
    players = players.filter(p => (p.tiers || {})[gamemode]);
    return sortPlayersByTier(players, gamemode);
  }
}

// Search players
function serchPlayers(query) {
  let players = getPlayersForGamemode(currentGamemode);

  if (!query.trim()) {
    return players;
  }

  const q = query.toLowerCase();
  return players.filter(p => p.username && p.username.toLowerCase().includes(q));
}

// Render leaderboard table
function renderTable(players) {
  const thead = document.getElementById('tableHeader');
  const tbody = document.getElementById('tableBody');
  const emptyState = document.getElementById('emptyState');

  thead.innerHTML = '';
  tbody.innerHTML = '';

  if (players.length === 0) {
    emptyState.style.display = 'block';
    return;
  }

  emptyState.style.display = 'none';

  // Build header
  const headerRow = document.createElement('tr');

  if (currentGamemode === 'overall') {
    headerRow.innerHTML = `
      <th style="width: 50px;">Rank</th>
      <th style="width: 200px;">Player</th>
      <th>🔮 Crystal</th>
      <th>👹 Beast</th>
      <th>💎 DiaPot</th>
      <th>🌋 NethPot</th>
      <th>🔨 Mace</th>
      <th>⚔️ UHC</th>
      <th>🗡️ Sword</th>
      <th style="width: 100px;">Points</th>
    `;
  } else {
    headerRow.innerHTML = `
      <th style="width: 50px;">Rank</th>
      <th>Player</th>
      <th>Tier</th>
      <th>Points</th>
    `;
  }

  thead.appendChild(headerRow);

  // Build rows
  players.forEach((player, index) => {
    const row = document.createElement('tr');
    const rank = index + 1;
    const rankEmoji = rank === 1 ? '👑' : rank;

    let playerCellHtml = `
      <div class="player-cell" onclick="openPlayerModal('${player.uuid}')">
        <img class="player-avatar" src="https://mc-heads.net/avatar/${player.uuid}" alt="${player.username}" />
        <span class="player-name">${player.username}</span>
      </div>
    `;

    let rowHtml = `<td class="rank-cell">${rankEmoji}</td><td>${playerCellHtml}</td>`;

    if (currentGamemode === 'overall') {
      const tiers = player.tiers || {};
      for (const gm of GAMEMODES) {
        const tier = tiers[gm] || 'Untested';
        const tierClass = tier === 'Untested' ? 'tier-empty' : (tier.startsWith('HT') ? 'tier-ht' : 'tier-lt');
        rowHtml += `<td><span class="tier-badge ${tierClass}">${tier}</span></td>`;
      }
      const points = calculatePlayerPoints(tiers);
      rowHtml += `<td class="points-cell">${points}</td>`;
    } else {
      const tiers = player.tiers || {};
      const tier = tiers[currentGamemode] || 'Untested';
      const tierClass = tier === 'Untested' ? 'tier-empty' : (tier.startsWith('HT') ? 'tier-ht' : 'tier-lt');
      rowHtml += `<td><span class="tier-badge ${tierClass}">${tier}</span></td>`;
      const totalPoints = calculatePlayerPoints(tiers);
      rowHtml += `<td class="points-cell">${totalPoints}</td>`;
    }

    row.innerHTML = rowHtml;
    tbody.appendChild(row);
  });
}

// Open player modal
function openPlayerModal(uuid) {
  const player = (allData.players || []).find(p => p.uuid === uuid);
  if (!player) return;

  const tiers = player.tiers || {};
  const totalPoints = calculatePlayerPoints(tiers);

  document.getElementById('modalUsername').textContent = player.username;
  document.getElementById('modalUUID').textContent = `UUID: ${uuid}`;
  document.getElementById('modalSkinImage').src = `https://mc-heads.net/body/${uuid}`;
  document.getElementById('modalTotalPoints').textContent = totalPoints;

  // Render all tiers
  let tiersHtml = '';
  for (const gm of GAMEMODES) {
    const tier = tiers[gm] || 'Not Tested';
    const tierClass = tier === 'Not Tested' ? 'not-tested' : (tier.startsWith('HT') ? 'ht' : 'lt');
    const emoji = GAMEMODE_EMOJIS[gm] || '';
    tiersHtml += `
      <div class="modal-tier-item">
        <span class="modal-tier-name">${emoji} ${gm}</span>
        <span class="modal-tier-rank ${tierClass}">${tier}</span>
      </div>
    `;
  }
  document.getElementById('modalTiers').innerHTML = tiersHtml;

  // Show modal
  document.getElementById('playerModal').classList.add('active');
}

// Close modal
function closePlayerModal() {
  document.getElementById('playerModal').classList.remove('active');
}

// Tab switching
function switchGamemode(gamemode) {
  currentGamemode = gamemode;

  // Update active tab
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  document.querySelector(`[data-gamemode="${gamemode}"]`).classList.add('active');

  // Render table
  const players = getPlayersForGamemode(gamemode);
  renderTable(players);
}

// Search handler
function handleSearch(event) {
  const query = event.target.value;
  const players = serchPlayers(query);
  renderTable(players);
}

// Initialize
function init() {
  if (!allData || !allData.players) {
    console.error('Invalid data format');
    return;
  }

  // Render stats
  renderStats();

  // Render initial leaderboard
  const players = getPlayersForGamemode('overall');
  renderTable(players);

  // Setup event listeners
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const gamemode = btn.dataset.gamemode;
      switchGamemode(gamemode);
    });
  });

  document.getElementById('searchInput').addEventListener('input', handleSearch);

  // Modal close handlers
  document.querySelector('.modal-close').addEventListener('click', closePlayerModal);
  document.getElementById('playerModal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('playerModal')) {
      closePlayerModal();
    }
  });
}

// Load data when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadData);
} else {
  loadData();
}
