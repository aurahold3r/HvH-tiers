const dataPath = 'data/results.json';

async function loadData(){
  const res = await fetch(dataPath, {cache: 'no-store'});
  if(!res.ok) throw new Error('Failed to load data');
  return res.json();
}

function renderStats(d){
  const el = document.getElementById('stats');
  el.innerHTML = '';
  const stats = d.stats || {};
  const items = [
    ['Total tests', stats.totalTests],
    ['Weekly tests', stats.weeklyTests],
    ['Active players', stats.activePlayers],
    ['Total testers', stats.totalTesters]
  ];
  items.forEach(([k,v])=>{
    const s = document.createElement('div');
    s.className = 'stat';
    s.innerHTML = `<div class="muted">${k}</div><div><strong>${v ?? '-'}</strong></div>`;
    el.appendChild(s);
  });
  document.getElementById('lastUpdated').textContent = d.lastUpdated ? `Last updated: ${d.lastUpdated}` : '';
}

function makeTableColumns(players){
  if(!players || players.length===0) return ['username'];
  const first = players[0];
  const tierKeys = first.tiers ? Object.keys(first.tiers) : [];
  return ['username', ...tierKeys];
}

function renderTable(players){
  const head = document.getElementById('tableHead');
  const body = document.getElementById('tableBody');
  head.innerHTML = '';
  body.innerHTML = '';
  const cols = makeTableColumns(players);
  const tr = document.createElement('tr');
  cols.forEach(c=>{
    const th = document.createElement('th');
    th.textContent = c.charAt(0).toUpperCase() + c.slice(1);
    tr.appendChild(th);
  });
  head.appendChild(tr);

  players.forEach(p=>{
    const r = document.createElement('tr');
    const username = document.createElement('td');
    username.textContent = p.username || p.uuid || '-';
    r.appendChild(username);
    cols.slice(1).forEach(k=>{
      const td = document.createElement('td');
      td.textContent = (p.tiers && p.tiers[k]) ? p.tiers[k] : '-';
      r.appendChild(td);
    });
    body.appendChild(r);
  });
}

function setupSearch(allPlayers){
  const input = document.getElementById('search');
  input.addEventListener('input', ()=>{
    const q = input.value.trim().toLowerCase();
    const filtered = allPlayers.filter(p=>p.username && p.username.toLowerCase().includes(q));
    renderTable(filtered);
  });
}

async function init(){
  try{
    const d = await loadData();
    const players = Array.isArray(d.players) ? d.players : [];
    renderStats(d);
    renderTable(players);
    setupSearch(players);
  }catch(err){
    console.error(err);
    document.getElementById('stats').textContent = 'Failed to load data.';
  }
}

window.addEventListener('DOMContentLoaded', init);
