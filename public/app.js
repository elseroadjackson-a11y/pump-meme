/* ---------- core ---------- */
const $ = id => document.getElementById(id);
const fmt = n => Math.round(n).toLocaleString();
const sfmt = n => (n > 0 ? '+' : n < 0 ? '−' : '') + fmt(Math.abs(n));
const cls = n => n > 0 ? 'up' : n < 0 ? 'down' : '';
const rand = n => Math.floor(Math.random() * n);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function toast(t) { const el = $('toast'); el.textContent = t; el.classList.remove('hidden'); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.add('hidden'), 2200); }

async function api(path, body) {
  const r = await fetch('/api/' + path, body === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'Request failed');
  return j;
}

/* ---------- house rule: big table bets almost never hit ---------- */
const BIG = 250;
const TILT = 0.05; // small bets lose an extra 5% of the time
const rigged = stake => Math.random() < (stake > BIG ? 0.95 : TILT);

/* ---------- balance (server is the source of truth) ---------- */
let ME = null, held = 0, queue = Promise.resolve();
const avail = () => ME.balance - held;
function paintBal() { $('bal').textContent = fmt(avail()); const hb = $('heroBal'); if (hb) hb.textContent = fmt(avail()); }
function take(amt) {
  amt = Math.floor(amt);
  if (!(amt > 0)) { toast('Enter a bet'); return false; }
  if (amt > avail()) { toast('Not enough chips'); return false; }
  held += amt; paintBal(); return true;
}
function release(amt) { held -= amt; paintBal(); }
function record(game, stake, ret) {
  held -= stake; ME.balance += ret - stake; paintBal(); window.onBet && window.onBet(game, stake, ret);
  queue = queue.then(() => api('play', { game, stake, ret }).then(u => { ME.balance = u.balance; paintBal(); })
    .catch(e => { toast(e.message); return api('me').then(u => { ME = u; paintBal(); }); }));
}
let busy = false;

/* ---------- login ---------- */
let needsSetup = false;
async function boot() {
  try { ME = await api('me'); return startApp(); } catch (e) {}
  try { needsSetup = (await api('status')).needsSetup; } catch (e) {}
  $('login').classList.remove('hidden'); $('app').classList.add('hidden');
  $('loginText').textContent = needsSetup ? 'First time here. Create the master account.' : 'Log in to your account.';
  $('loginBtn').textContent = needsSetup ? 'Create master account' : 'Log in';
  if (needsSetup) $('lp').autocomplete = 'new-password';
}
$('loginForm').onsubmit = async e => {
  e.preventDefault(); $('loginErr').textContent = '';
  try { ME = await api(needsSetup ? 'setup' : 'login', { username: $('lu').value, password: $('lp').value }); $('lp').value = ''; startApp(); }
  catch (err) { $('loginErr').textContent = err.message; }
};
$('logout').onclick = async () => { await api('logout', {}); ME = null; held = 0; location.hash = ''; boot(); };

/* ---------- routing ---------- */
const ROUTES = {
  casino: ['Casino', () => renderLobby()],
  sports: ['Sportsbook', () => renderSports()],
  bets: ['My Bets', () => renderMyBets()],
  accounts: ['Accounts', () => renderAccounts()],
};
let cur = 'casino';
function startApp() {
  $('login').classList.add('hidden'); $('app').classList.remove('hidden');
  $('role').textContent = ME.role + ' · ' + ME.username; paintBal(); soundBtn();
  window.onhashchange = route; route();
}
function route() {
  let r = location.hash.slice(1);
  if (busy) { toast('Finish this round first'); history.replaceState(null, '', '#' + cur); return; }
  runCleanup(); held = 0; paintBal();
  const allowed = Object.keys(ROUTES).filter(k => k !== 'accounts' || ME.role !== 'player');
  let game = null;
  if (r.startsWith('play-')) { game = GAMES.find(g => g.id === r.slice(5)); if (!game) r = 'casino'; }
  else if (!allowed.includes(r)) r = 'casino';
  cur = game ? r : r;
  const tab = game ? 'casino' : r;
  $('tabs').innerHTML = allowed.map(k => `<a class="tab ${k === tab ? 'on' : ''}" href="#${k}">${ROUTES[k][0]}</a>`).join('');
  $('view').innerHTML = ''; window.scrollTo(0, 0);
  if (game) openGame(game); else { CURGAME = null; ROUTES[r][1](); }
}

/* ---------- accounts ---------- */
const pl = a => a.balance - a.deposited;
async function renderAccounts() {
  const v = $('view'); v.innerHTML = '<div class="empty">Loading accounts…</div>';
  let rows; try { rows = await api('accounts'); ME = await api('me'); paintBal(); } catch (e) { v.innerHTML = `<div class="empty">${esc(e.message)}</div>`; return; }
  const isMaster = ME.role === 'master';
  const bookies = rows.filter(r => r.role === 'bookie');
  const players = rows.filter(r => r.role === 'player');
  const playersOf = id => players.filter(p => p.parent_id === id);
  const bookPL = list => -list.reduce((s, p) => s + pl(p), 0);
  const total = bookPL(players);

  const playerTable = list => list.length ? `<div class="tbl"><table>
    <thead><tr><th>Player</th><th class="n">Balance</th><th class="n">Up / down</th><th class="n">Chips added</th><th class="n">Wagered</th><th>Manage</th></tr></thead>
    <tbody>${list.map(p => `<tr>
      <td><b>${esc(p.username)}</b></td><td class="n" style="color:var(--gold)">${fmt(p.balance)}</td>
      <td class="n ${cls(pl(p))}">${sfmt(pl(p))}</td><td class="n">${fmt(p.deposited)}</td><td class="n">${fmt(p.wagered)}</td>
      <td><div class="acts"><input type="number" placeholder="± chips" id="amt-${p.id}"><button class="btn sm purple" data-chips="${p.id}">Apply</button>
      <button class="btn sm ghost" data-hist="${p.id}">History</button><button class="btn sm ghost" data-pass="${p.id}">Password</button></div></td>
    </tr>`).join('')}</tbody></table></div>` : '<div class="empty">No players yet.</div>';

  v.innerHTML = `<div class="dash">
    <div class="lobbyhead"><h1>${isMaster ? 'Master control' : 'Your book'}</h1></div>
    <div class="totals">
      ${isMaster ? `<div><div class="label">Bookies</div><div class="v">${bookies.length}</div></div>` : ''}
      <div><div class="label">Players</div><div class="v">${players.length}</div></div>
      <div><div class="label">Player chips out</div><div class="v">${fmt(players.reduce((s, p) => s + p.balance, 0))}</div></div>
      <div><div class="label">House result</div><div class="v ${cls(total)}">${sfmt(total)}</div></div>
      <div><div class="label">Your balance</div><div class="v" style="color:var(--gold)">${fmt(ME.balance)}</div></div>
    </div>
    <form class="form" id="newAcct">
      <span class="label">New account</span>
      ${isMaster ? `<select id="naRole"><option value="bookie">Bookie</option><option value="player">Player</option></select>
        <select id="naParent" class="hidden"><option value="${ME.id}">Under me</option>${bookies.map(b => `<option value="${b.id}">Under ${esc(b.username)}</option>`).join('')}</select>` : ''}
      <input id="naUser" placeholder="Username" autocapitalize="none" autocomplete="off">
      <input id="naPass" placeholder="Password" autocomplete="new-password">
      <input id="naChips" type="number" min="0" value="1000" placeholder="Starting chips">
      <button class="btn">Open account</button>
    </form>
    <div class="err" id="naErr"></div>
    ${isMaster ? `
      <div class="form" style="border-style:solid">
        <span class="label">Add chips to your own balance</span>
        <input type="number" id="amt-${ME.id}" placeholder="Chips"><button class="btn sm purple" data-chips="${ME.id}">Add</button>
      </div>
      ${bookies.map(b => { const ps = playersOf(b.id), r = bookPL(ps); return `
      <div class="bookie">
        <div class="bhead"><h3>${esc(b.username)}</h3><span class="role">bookie</span>
          <div class="stat"><span class="label">Players</span><b>${ps.length}</b></div>
          <div class="stat"><span class="label">Book result</span><b class="${cls(r)}">${sfmt(r)}</b></div>
          <div class="stat"><span class="label">Bookie balance</span><b style="color:var(--gold)">${fmt(b.balance)}</b></div>
          <span class="sp"></span>
          <div class="acts"><input type="number" placeholder="± chips" id="amt-${b.id}"><button class="btn sm purple" data-chips="${b.id}">Apply</button>
          <button class="btn sm ghost" data-pass="${b.id}">Password</button></div>
        </div>${playerTable(ps)}</div>`; }).join('')}
      ${playersOf(ME.id).length ? `<div class="bookie"><div class="bhead"><h3>Your direct players</h3></div>${playerTable(playersOf(ME.id))}</div>` : ''}
      ${!bookies.length && !players.length ? '<div class="empty">Open a bookie account to start building your book.</div>' : ''}
    ` : `<div class="bookie">${playerTable(players)}</div>`}
  </div>`;

  if (isMaster) $('naRole').onchange = () => $('naParent').classList.toggle('hidden', $('naRole').value !== 'player');
  $('newAcct').onsubmit = async e => {
    e.preventDefault(); $('naErr').textContent = '';
    try {
      await api('accounts', { username: $('naUser').value, password: $('naPass').value, chips: $('naChips').value,
        role: isMaster ? $('naRole').value : 'player', parentId: isMaster ? $('naParent').value : undefined });
      toast('Account opened'); renderAccounts();
    } catch (err) { $('naErr').textContent = err.message; }
  };
  v.onclick = async e => {
    const d = e.target.dataset;
    if (d.chips) {
      const amt = Math.floor(+$('amt-' + d.chips).value);
      if (!amt) return toast('Enter an amount');
      try { const u = await api(`accounts/${d.chips}/chips`, { amount: amt }); if (u.id === ME.id) { ME.balance = u.balance; paintBal(); } toast((amt > 0 ? 'Added ' : 'Removed ') + fmt(Math.abs(amt))); renderAccounts(); } catch (err) { toast(err.message); }
    }
    if (d.pass) passModal(d.pass);
    if (d.hist) histModal(d.hist);
  };
}
function modal(html) {
  const m = document.createElement('div'); m.className = 'modal'; m.innerHTML = `<div class="box">${html}</div>`;
  m.onclick = e => { if (e.target === m || e.target.dataset.close != null) m.remove(); };
  document.body.appendChild(m); return m;
}
function passModal(id) {
  const m = modal(`<h2>Reset password</h2><input id="np" placeholder="New password"><div class="controls"><button class="btn" id="npGo">Save</button><button class="btn ghost" data-close>Cancel</button></div>`);
  m.querySelector('#npGo').onclick = async () => { try { await api(`accounts/${id}/password`, { password: m.querySelector('#np').value }); toast('Password updated'); m.remove(); } catch (e) { toast(e.message); } };
}
async function histModal(id) {
  const m = modal('<div class="empty">Loading…</div>');
  try {
    const h = await api(`accounts/${id}/history`);
    m.querySelector('.box').innerHTML = `<h2>${esc(h.account.username)}</h2>
      <div class="label">Casino</div>${histList(h.plays.map(p => ({ t: p.game, s: p.stake, n: p.ret - p.stake })))}
      <div class="label">Sportsbook</div>${betList(h.bets)}
      <div class="controls"><button class="btn ghost" data-close>Close</button></div>`;
  } catch (e) { m.querySelector('.box').innerHTML = `<div class="empty">${esc(e.message)}</div>`; }
}
const histList = list => list.length ? `<div class="betlist">${list.map(x => `<div class="bitem"><div class="r"><span>${esc(x.t)} · ${fmt(x.s)}</span><b class="num ${cls(x.n)}">${sfmt(x.n)}</b></div></div>`).join('')}</div>` : '<div class="empty">Nothing yet.</div>';
const oddsTxt = o => (o > 0 ? '+' : '') + o;
const betList = list => list.length ? `<div class="betlist">${list.map(b => `<div class="bitem">
  <div class="r"><b>${esc(b.pick)}</b><span class="st ${b.status}">${b.status}</span></div>
  <div class="r muted"><span>${esc(b.matchup)}</span><span class="num">${oddsTxt(b.odds)}</span></div>
  <div class="r"><span class="num">Risk ${fmt(b.stake)}</span><span class="num ${b.status === 'win' ? 'up' : ''}">${b.status === 'open' ? 'To win ' + fmt(profitOf(b.stake, b.odds)) : 'Paid ' + fmt(b.payout)}</span></div>
</div>`).join('')}</div>` : '<div class="empty">No sports bets yet.</div>';
const profitOf = (s, o) => Math.floor(o > 0 ? s * o / 100 : s * 100 / Math.abs(o));

/* ---------- my bets ---------- */
async function renderMyBets() {
  const v = $('view'); v.innerHTML = '<div class="empty">Loading…</div>';
  try {
    const h = await api(`accounts/${ME.id}/history`); ME = { ...ME, ...h.account }; paintBal();
    v.innerHTML = `<div class="dash"><div class="lobbyhead"><h1>My bets</h1></div>
      <div class="totals"><div><div class="label">Balance</div><div class="v" style="color:var(--gold)">${fmt(ME.balance)}</div></div>
      <div><div class="label">Up / down</div><div class="v ${cls(pl(ME))}">${sfmt(pl(ME))}</div></div>
      <div><div class="label">Wagered</div><div class="v">${fmt(ME.wagered)}</div></div></div>
      <div class="sbwrap" style="margin-top:0"><div><div class="label" style="margin-bottom:8px">Sportsbook</div>${betList(h.bets)}</div>
      <div><div class="label" style="margin-bottom:8px">Casino</div>${histList(h.plays.map(p => ({ t: p.game, s: p.stake, n: p.ret - p.stake })))}</div></div></div>`;
  } catch (e) { v.innerHTML = `<div class="empty">${esc(e.message)}</div>`; }
}
