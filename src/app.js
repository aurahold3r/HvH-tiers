const dataPath = 'data/results.json';

const gamemodes = [
  { key: 'overall', label: 'Overall', emoji: '📊' },
  { key: 'crystal', label: 'Crystal', emoji: '🔮' },
  { key: 'beast', label: 'Beast', emoji: '👹' },
  { key: 'diapot', label: 'DiaPot', emoji: '💎' },
  { key: 'nethpot', label: 'NethPot', emoji: '🌋' },
  { key: 'mace', label: 'Mace', emoji: '🔨' },
  { key: 'uhc', label: 'UHC', emoji: '⚔️' },
  { key: 'sword', label: 'Sword', emoji: '🗡️' }
];

const tierOrder = ['HT5', 'HT4', 'HT3', 'HT2', 'HT1', 'LT5', 'LT4', 'LT3', 'LT2', 'LT1'];
let allData = {};
let allPlayers = [];
let currentGamemode = 'overall';

// Tier to points conversion
function getTierPoints(tier) {
  if (!tier) return 0;
  if (tier.startsWith('HT')) return 10;
  if (tier.startsWith('LT')) return 5;
  return 0;
}

// Calculate total points for a player
function calculateTotalPoints(player) {
  let total = 0;
  ['crystal', 'beast', 'diapot', 'nethpot', 'mace', 'uhc', 'sword'].forEach(gm => {
    total += getTierPoints(player.tiers[gm]);
  });
  return total;
}

// Load data
async function loadData() {
  try {
    const res = await fetch(dataPath, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to load data');
    allData = await res.json();
    allPlayers = (allData.players || []).map(p => ({
      ...p,
      totalPoints: calculateTotalPoints(p)
    }));
    renderStats();
    renderGamemodeTabs();
    renderLeaderboard('overall');
  } catch (err) {
    console.error(err);
    document.getElementById('stats').innerHTML = '<p>Failed to load data.</p>';
  }
}

// Render stats cards
function renderStats() {
  const el = document.getElementById('stats');
  el.innerHTML = '';
  const stats = allData.stats || {};
  const items = [
    { label: 'Total Tests', value: stats.totalTests },
    { label: 'Active Players', value: stats.activePlayers },
    { label: 'Total Testers', value: stats.totalTesters },
    { label: 'Weekly Tests', value: stats.weeklyTests }
  ];
  items.forEach(item => {
    const card = document.createElement('div');
    card.className = 'stat-card';
    card.innerHTML = `<div class="stat-label">${item.label}</div><div class="stat-value">${item.value}</div>`;
    el.appendChild(card);
  });
  document.getElementById('lastUpdated').textContent = `Last updated: ${allData.lastUpdated || 'N/A'}`;
}

// Render gamemode tabs
function renderGamemodeTabs() {
  const container = document.getElementById('gamemodeTabs');
  container.innerHTML = '';
  gamemodes.forEach(gm => {
    const btn = document.createElement('button');
    btn.className = `tab-btn ${gm.key === 'overall' ? 'active' : ''}`;
    btn.textContent = `${gm.emoji} ${gm.label}`;
    btn.onclick = () => switchGamemode(gm.key);
    container.appendChild(btn);
  });
}

// Switch gamemode and render leaderboard
function switchGamemode(key) {
  currentGamemode = key;
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  event.target.classList.add('active');
  renderLeaderboard(key);
}

// Sort players by tier
function sortByTier(players, gamemode) {
  return players.sort((a, b) => {
    const tierA = a.tiers[gamemode] || '';
    const tierB = b.tiers[gamemode] || '';
    return tierOrder.indexOf(tierA) - tierOrder.indexOf(tierB);
  });
}

// Get players for a gamemode
function getPlayersForGamemode(gamemode) {
  if (gamemode === 'overall') {
    return allPlayers.sort((a, b) => b.totalPoints - a.totalPoints);
  }
  const filtered = allPlayers.filter(p => p.tiers[gamemode]);
  return sortByTier(filtered, gamemode);
}

// Render leaderboard
function renderLeaderboard(gamemode) {
  const head = document.getElementById('tableHead');
  const body = document.getElementById('tableBody');
  head.innerHTML = '';
  body.innerHTML = '';

  const players = getPlayersForGamemode(gamemode);

  // Build header
  const headerRow = document.createElement('tr');
  const headers = gamemode === 'overall'
    ? ['Rank', 'Player', 'Crystal', 'Beast', 'DiaPot', 'NethPot', 'Mace', 'UHC', 'Sword', 'Total Points']
    : ['Rank', 'Player', gamemode.charAt(0).toUpperCase() + gamemode.slice(1)];

  headers.forEach(h => {
    const th = document.createElement('th');
    th.textContent = h;
    headerRow.appendChild(th);
  });
  head.appendChild(headerRow);

  // Build rows
  players.forEach((p, idx) => {
    const row = document.createElement('tr');
    row.className = 'player-row';

    // Rank
    const rankCell = document.createElement('td');
    rankCell.className = 'rank-cell';
    rankCell.textContent = idx === 0 ? '👑 #1' : `#${idx + 1}`;
    row.appendChild(rankCell);

    // Player with skin
    const playerCell = document.createElement('td');
    playerCell.className = 'player-cell';
    const playerContent = document.createElement('div');
    playerContent.style.display = 'flex';
    playerContent.style.alignItems = 'center';
    playerContent.style.gap = '10px';
    playerContent.style.cursor = 'pointer';
    playerContent.onclick = () => showPlayerModal(p);

    const skin = document.createElement('img');
    skin.src = `https://mc-heads.net/avatar/${p.uuid}`;
    skin.alt = p.username;
    skin.className = 'player-head';
    skin.onerror = () => { skin.src = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2232%22 height=%2232%22%3E%3Crect fill=%22%23888%22 width=%2232%22 height=%2232%22/%3E%3C/svg%3E'; };

    const name = document.createElement('span');
    name.textContent = p.username;
    name.style.cursor = 'pointer';

    playerContent.appendChild(skin);
    playerContent.appendChild(name);
    playerCell.appendChild(playerContent);
    row.appendChild(playerCell);

    // Tier columns
    if (gamemode === 'overall') {
      ['crystal', 'beast', 'diapot', 'nethpot', 'mace', 'uhc', 'sword'].forEach(gm => {
        const cell = document.createElement('td');
        cell.className = 'tier-cell';
        cell.textContent = p.tiers[gm] || '-';
        row.appendChild(cell);
      });
      // Total points
      const pointsCell = document.createElement('td');
      pointsCell.className = 'points-cell';
      pointsCell.textContent = p.totalPoints;
      row.appendChild(pointsCell);
    } else {
      const cell = document.createElement('td');
      cell.className = 'tier-cell';
      cell.textContent = p.tiers[gamemode] || '-';
      row.appendChild(cell);
    }

    body.appendChild(row);
  });
}

// Show player modal
function showPlayerModal(player) {
  const modal = document.getElementById('playerModal');
  document.getElementById('modalSkin').src = `https://mc-heads.net/body/${player.uuid}`;
  document.getElementById('modalSkin').onerror = function() {
    this.src = 'https://mc-heads.net/avatar/' + player.uuid;
  };
  document.getElementById('modalUsername').textContent = player.username;
  document.getElementById('modalUUID').textContent = `UUID: ${player.uuid}`;
  document.getElementById('modalPoints').textContent = player.totalPoints;

  const tiersDiv = document.getElementById('modalTiers');
  tiersDiv.innerHTML = '';
  ['crystal', 'beast', 'diapot', 'nethpot', 'mace', 'uhc', 'sword'].forEach(gm => {
    const gm_obj = gamemodes.find(g => g.key === gm);
    const tier = player.tiers[gm] || 'Not Tested';
    const tierDiv = document.createElement('div');
    tierDiv.className = 'modal-tier';
    tierDiv.textContent = `${gm_obj.emoji} ${gm_obj.label}: ${tier}`;
    tiersDiv.appendChild(tierDiv);
  });

  modal.style.display = 'block';
}

// Close modal
document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('playerModal');
  const closeBtn = document.querySelector('.close');
  
  closeBtn.onclick = () => {
    modal.style.display = 'none';
  };

  window.onclick = (event) => {
    if (event.target === modal) {
      modal.style.display = 'none';
    }
  };

  loadData();
});
