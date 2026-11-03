/* ---------- slots: 5 reels x 3 rows, 10 lines, wilds, scatter free spins ---------- */
// Symbol index: 0-3 low, 4-6 high, 7 wild (substitutes), 8 scatter (3+ anywhere = 8 free spins)
const LINES = [[1,1,1,1,1],[0,0,0,0,0],[2,2,2,2,2],[0,1,2,1,0],[2,1,0,1,2],[0,0,1,2,2],[2,2,1,0,0],[1,0,0,0,1],[1,2,2,2,1],[1,0,1,2,1]];
// Pays are line-bet multiples for 3/4/5 in a row. Tuned to roughly 87–89% payback.
const PROFILES = {
  low:  { w: [30,28,26,24,12,9,6,4,3],        pay: [[8,21,65],[10,26,78],[13,31,104],[16,39,130],[26,78,260],[39,130,520],[65,260,1300]] },
  med:  { w: [32,30,27,25,10,7,5,3,3],        pay: [[8,21,61],[10,25,82],[12,31,102],[16,41,123],[31,82,308],[51,164,615],[82,308,2050]] },
  high: { w: [34,32,29,27,9,6,4,2.5,2.5],     pay: [[8,19,64],[10,24,80],[13,32,96],[16,40,128],[32,96,400],[64,192,960],[96,400,3200]] },
};
const MACHINES = [
  { id: 'crown', name: 'Crown Royale', vol: 'med', sym: ['🍒','🍋','🍊','🍇','🔔','💎','7️⃣','👑','⭐'], bg: ['#3b0f7a','#170632'] },
  { id: 'pharaoh', name: 'Pharaoh’s Gold', vol: 'high', sym: ['🏺','🐍','🦂','🪲','🐫','👁️','💰','🔱','🔺'], bg: ['#7a4a08','#2b1602'] },
  { id: 'ocean', name: 'Deep Sea Loot', vol: 'low', sym: ['🐚','🐠','🦀','🐙','🐬','🦈','💎','🧜','⚓'], bg: ['#0a4f7a','#041b2e'] },
  { id: 'dragon', name: 'Dragon Fortune', vol: 'high', sym: ['🥟','🏮','🎋','🪭','🐉','🧧','🏯','🐲','🀄'], bg: ['#8a0f1e','#2c0309'] },
  { id: 'west', name: 'Dead Man’s Draw', vol: 'med', sym: ['🥾','🌵','🐎','🔫','🤠','💰','⭐','🃏','🎯'], bg: ['#6b3a1a','#231106'] },
  { id: 'candy', name: 'Sugar Rush', vol: 'low', sym: ['🍬','🍭','🧁','🍩','🍫','🍰','🎂','🌈','🍯'], bg: ['#b0306f','#3d0a26'] },
  { id: 'space', name: 'Orbit Heist', vol: 'high', sym: ['🛰️','🌑','☄️','👾','🚀','🪐','💫','👽','🌌'], bg: ['#141a5c','#05061c'] },
  { id: 'jungle', name: 'Jungle King', vol: 'med', sym: ['🍌','🥥','🦜','🐍','🐆','🦍','🗿','🦁','🌋'], bg: ['#1f6b2a','#071f0b'] },
  { id: 'viking', name: 'Valhalla Raid', vol: 'high', sym: ['🪓','🛡️','🍺','🐺','⛵','🔨','⚔️','🧔','🌩️'], bg: ['#2f4a63','#0b141d'] },
  { id: 'clover', name: 'Lucky Clover', vol: 'low', sym: ['🍀','🎩','🌈','🍺','🧲','🪙','🏆','🧚','🌟'], bg: ['#127a4a','#04261a'] },
  { id: 'neon', name: 'Neon Nights', vol: 'med', sym: ['🍸','🎲','🎤','🕶️','🏎️','💵','🎰','🦩','🌃'], bg: ['#7a0f6b','#1f0320'] },
  { id: 'fire', name: 'Blazing 7s', vol: 'high', sym: ['🍒','🍉','🍋','🔔','BAR','💎','7️⃣','🔥','💥'], bg: ['#8a2a05','#2a0a01'] },
];

function renderSlots() {
  $('view').innerHTML = `<div class="lobbyhead"><h1>Slots</h1><span class="muted">${MACHINES.length} machines · 10 lines · wilds and free spins</span></div>
  <div class="slotgrid">${MACHINES.map(m => `<button class="stile" data-m="${m.id}" style="background:linear-gradient(160deg,${m.bg[0]},${m.bg[1]})">
    <div class="icons">${m.sym[6]}${m.sym[7]}${m.sym[5]}</div>
    <div><h3>${esc(m.name)}</h3><div class="vol">${{ low: 'Low', med: 'Medium', high: 'High' }[m.vol]} volatility</div></div></button>`).join('')}</div>`;
  $('view').querySelector('.slotgrid').onclick = e => { const t = e.target.closest('[data-m]'); if (t) openMachine(MACHINES.find(m => m.id === t.dataset.m)); };
}

function openMachine(M) {
  const P = PROFILES[M.vol], T = P.w.reduce((a, b) => a + b, 0);
  const pick = () => { let r = Math.random() * T; for (let i = 0; i < P.w.length; i++) if ((r -= P.w[i]) < 0) return i; return 0; };
  const spinGrid = () => [0, 1, 2, 3, 4].map(() => [pick(), pick(), pick()]);
  const sy = i => M.sym[i] === 'BAR' ? '<b style="font-family:var(--display);font-size:.55em;color:#151020">BAR</b>' : M.sym[i];
  function evaluate(g, lineBet) {
    let win = 0; const hits = new Set();
    LINES.forEach(L => {
      const s = L.map((r, c) => g[c][r]); let base = s.find(x => x !== 7); if (base === undefined) base = 6; if (base === 8) return;
      let n = 0; for (const x of s) { if (x === base || x === 7) n++; else break; }
      if (n >= 3) { win += P.pay[base][n - 3] * lineBet; for (let c = 0; c < n; c++) hits.add(c + ',' + L[c]); }
    });
    const sc = []; g.forEach((col, c) => col.forEach((x, r) => { if (x === 8) sc.push(c + ',' + r); }));
    if (sc.length >= 3) sc.forEach(k => hits.add(k));
    return { win, hits, scatters: sc.length };
  }

  const el = document.createElement('div'); el.className = 'machine';
  el.innerHTML = `<div class="cab" style="background:linear-gradient(170deg,${M.bg[0]},${M.bg[1]})">
    <div class="cabtop"><h2>${esc(M.name)}</h2><button class="btn ghost sm" id="mClose">Back to lobby</button></div>
    <div class="grid5" id="mGrid"></div>
    <div class="fsbanner" id="mFs"></div>
    <div class="msg" id="mMsg"></div>
    <div class="slotbar">
      <span class="label">Total bet</span><input id="mBet" type="number" min="10" step="10" value="20" class="num">
      <button class="btn ghost sm" data-half="mBet">½</button><button class="btn ghost sm" data-dbl="mBet">2×</button>
      <button class="btn" id="mSpin">Spin</button>
      <button class="btn purple sm" id="mAuto">Auto 10</button>
    </div>
    <div class="paytab">
      ${[6, 5, 4, 3, 2, 1, 0].map(i => `<span>${sy(i)}${sy(i)}${sy(i)} ${P.pay[i][0]}× · 4: ${P.pay[i][1]}× · 5: ${P.pay[i][2]}×</span>`).join('')}
      <span>${sy(7)} Wild, stands in for anything</span><span>${sy(8)}×3+ anywhere: 8 free spins</span>
      <span class="muted">Pays are per line bet (total ÷ 10)</span>
    </div></div>`;
  document.body.appendChild(el);
  let grid = spinGrid(), spinning = false, autoLeft = 0;
  const paint = (g, hits = new Set(), blur = false) => {
    $('mGrid').innerHTML = [0, 1, 2].map(r => [0, 1, 2, 3, 4].map(c => `<div class="cell ${hits.has(c + ',' + r) ? 'hit' : ''} ${blur ? 'blur' : ''}">${sy(g[c][r])}</div>`).join('')).join('');
  };
  paint(grid);
  const close = () => { if (spinning) return toast('Wait for the reels to stop'); autoLeft = 0; el.remove(); closeMachine = null; };
  closeMachine = () => { autoLeft = 0; el.remove(); closeMachine = null; };
  $('mClose').onclick = close;
  el.addEventListener('click', e => { if (e.target === el) close(); });

  async function animate(final) {
    const cols = [0, 1, 2, 3, 4];
    for (let stop = 0; stop < 5; stop++) {
      for (let k = 0; k < 5; k++) { const g = cols.map(c => c < stop ? final[c] : [pick(), pick(), pick()]); paint(g, new Set(), true); await sleep(45); }
      const g = cols.map(c => c <= stop ? final[c] : [pick(), pick(), pick()]); paint(g); await sleep(70);
    }
  }
  async function spinOnce() {
    const bet = Math.floor(+$('mBet').value);
    if (!(bet >= 10)) { toast('Minimum bet is 10'); return false; }
    if (!take(bet)) return false;
    spinning = true; on('slot'); $('mSpin').disabled = true; setMsg('mMsg', ''); $('mFs').textContent = '';
    const lineBet = bet / 10, rig = rigged(bet);
    let g = spinGrid(), r = evaluate(g, lineBet);
    if (rig) { let t = 0; while ((r.win > 0 || r.scatters >= 3) && t++ < 200) { g = spinGrid(); r = evaluate(g, lineBet); } }
    await animate(g); paint(g, r.hits);
    let total = r.win, free = r.scatters >= 3 ? 8 : 0, played = 0;
    if (free) { setMsg('mMsg', 'Free spins!', 'up'); await sleep(900); }
    while (free > 0) {
      free--; played++; $('mFs').textContent = `Free spin ${played} · ${free} left · won ${fmt(total)}`;
      const fg = spinGrid(), fr = evaluate(fg, lineBet); await animate(fg); paint(fg, fr.hits);
      total += fr.win; if (fr.scatters >= 3) { free += 8; setMsg('mMsg', '+8 more free spins!', 'up'); }
      await sleep(fr.win ? 700 : 300);
    }
    const ret = Math.floor(total); record(M.name, bet, ret);
    setMsg('mMsg', ret ? (ret >= bet * 20 ? 'BIG WIN ' : 'Win ') + '+' + fmt(ret) : 'No win', ret > bet ? 'up' : ret ? '' : 'down');
    spinning = false; off('slot'); $('mSpin').disabled = false; return true;
  }
  $('mSpin').onclick = () => { if (!spinning) spinOnce(); };
  $('mAuto').onclick = async () => {
    if (spinning) return; autoLeft = 10; $('mAuto').disabled = true;
    while (autoLeft > 0 && document.body.contains(el)) { autoLeft--; $('mAuto').textContent = 'Auto ' + autoLeft; if (!(await spinOnce())) break; await sleep(350); }
    if (document.body.contains(el)) { $('mAuto').disabled = false; $('mAuto').textContent = 'Auto 10'; }
  };
}
