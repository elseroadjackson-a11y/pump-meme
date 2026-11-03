/* ---------- table games: all stacked on one scrolling page ---------- */
const ACTIVE = new Set();
const on = g => { ACTIVE.add(g); busy = true; };
const off = g => { ACTIVE.delete(g); busy = ACTIVE.size > 0; };
const bv = id => Math.floor(+$(id).value);
function setMsg(id, t, c = '') { const m = $(id); if (m) { m.textContent = t; m.className = 'msg ' + c; } }
const resultCls = (ret, stake) => ret > stake ? 'up' : ret < stake ? 'down' : '';

function betBox(id, def = 25, label = 'Bet') {
  return `<div class="betbox"><div class="betrow"><span class="label">${label}</span>
    <input id="${id}" type="number" min="1" value="${def}" class="num">
    <button class="chip c10" data-chip="10" data-for="${id}">+10</button>
    <button class="chip c50" data-chip="50" data-for="${id}">+50</button>
    <button class="chip c100" data-chip="100" data-for="${id}">+100</button>
    <button class="chip c500" data-chip="500" data-for="${id}">+500</button>
    <button class="btn ghost sm" data-half="${id}">½</button>
    <button class="btn ghost sm" data-dbl="${id}">2×</button>
    <button class="btn ghost sm" data-clr="${id}">Clear</button></div></div>`;
}
document.addEventListener('click', e => {
  const d = e.target.dataset; if (!d) return;
  if (d.chip) { const i = $(d.for); i.value = (+i.value || 0) + +d.chip; }
  if (d.half) { const i = $(d.half); i.value = Math.max(1, Math.floor((+i.value || 0) / 2)); }
  if (d.dbl) { const i = $(d.dbl); i.value = (+i.value || 0) * 2; }
  if (d.clr) { $(d.clr).value = ''; }
});
function pickGroup(elId, onPick) {
  $(elId).onclick = e => { const t = e.target.dataset.t; if (!t) return; if (onPick(t) === false) return; [...$(elId).children].forEach(b => b.classList.toggle('on', b.dataset.t === t)); };
}

/* cards */
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'], SUITS = ['♠', '♥', '♦', '♣'];
const mk = r => ({ r: r ?? RANKS[rand(13)], s: SUITS[rand(4)] });
const cardHTML = c => c.hide ? '<div class="card back"></div>' : `<div class="card ${c.s === '♥' || c.s === '♦' ? 'red' : ''}"><span class="r">${c.r}</span><span class="s">${c.s}</span></div>`;
const handHTML = h => h.map(cardHTML).join('');
function deck() { const d = []; for (const r of RANKS) for (const s of SUITS) d.push({ r, s }); for (let i = d.length - 1; i > 0; i--) { const j = rand(i + 1); [d[i], d[j]] = [d[j], d[i]]; } return d; }
const RV = r => RANKS.indexOf(r) === 0 ? 14 : RANKS.indexOf(r) + 1;

const TABLES = [
  ['blackjack', 'Blackjack'], ['roulette', 'Roulette'], ['craps', 'Craps'], ['baccarat', 'Baccarat'],
  ['threecard', 'Three Card Poker'], ['letitride', 'Let It Ride'], ['war', 'Casino War'], ['hilo', 'Hi-Lo'],
];
function renderTables() {
  $('view').innerHTML = `<div class="lobbyhead"><h1>Table games</h1></div>
    <div class="jump">${TABLES.map(([k, n]) => `<a href="#tables" data-jump="${k}">${n}</a>`).join('')}</div>
    <div class="games">${TABLES.map(([k]) => `<section class="table" id="t-${k}"></section>`).join('')}</div>`;
  $('view').querySelector('.jump').onclick = e => { const k = e.target.dataset.jump; if (!k) return; e.preventDefault(); $('t-' + k).scrollIntoView({ behavior: 'smooth' }); };
  blackjack(); roulette(); craps(); baccarat(); threecard(); letitride(); war(); hilo();
}

/* ================= BLACKJACK ================= */
const bjv = c => c.r === 'A' ? 11 : ['10', 'J', 'Q', 'K'].includes(c.r) ? 10 : +c.r;
function bjt(h) { let t = 0, a = 0; for (const c of h) { if (c.hide) continue; t += bjv(c); if (c.r === 'A') a++; } while (t > 21 && a) { t -= 10; a--; } return t; }
function soft(h) { let t = 0, a = 0; for (const c of h) { t += bjv(c); if (c.r === 'A') a++; } while (t > 21 && a) { t -= 10; a--; } return a > 0 && t <= 21; }
const isBJ = h => h.length === 2 && bjt(h) === 21;
let BJ = {};
function blackjack() {
  $('t-blackjack').innerHTML = `<h2>Blackjack</h2><div class="rules">Blackjack pays 6:5 · Dealer hits soft 17 · Double on any two</div>
  <div class="handlab">Dealer <span id="dT"></span></div><div class="hand" id="dH"></div>
  <div class="msg" id="bjMsg"></div>
  <div class="hand" id="pH"></div><div class="handlab">You <span id="pT"></span></div>
  <div class="controls" id="bjAct"></div>${betBox('bjBet')}`;
  bjIdle();
}
function bjDraw() { $('dH').innerHTML = handHTML(BJ.d); $('pH').innerHTML = handHTML(BJ.p); $('pT').textContent = BJ.p.length ? bjt(BJ.p) : ''; $('dT').textContent = BJ.d.length ? bjt(BJ.d) : ''; }
function bjIdle() { off('bj'); $('bjAct').innerHTML = '<button class="btn" id="bjDeal">Deal</button>'; $('bjDeal').onclick = bjDeal; }
function bjDeal() {
  const s = bv('bjBet'); if (!take(s)) return; on('bj');
  BJ = { s, rig: rigged(s), p: [mk(), mk()], d: [mk(), { ...mk(), hide: true }] };
  if (BJ.rig) while (bjt(BJ.p) >= 18) BJ.p = [mk(), mk()];
  setMsg('bjMsg', ''); bjDraw();
  const dFull = [BJ.d[0], { ...BJ.d[1], hide: false }];
  if (isBJ(BJ.p)) { BJ.d[1].hide = false; bjDraw(); return isBJ(dFull) ? bjEnd(BJ.s, 'Push') : bjEnd(Math.floor(BJ.s * 2.2), 'Blackjack!'); }
  if (isBJ(dFull)) { BJ.d[1].hide = false; bjDraw(); return bjEnd(0, 'Dealer blackjack'); }
  $('bjAct').innerHTML = '<button class="btn" id="hit">Hit</button><button class="btn purple" id="stand">Stand</button><button class="btn ghost" id="dbl">Double</button>';
  $('hit').onclick = bjHit; $('stand').onclick = bjStand; $('dbl').onclick = bjDouble;
}
function bjCard() {
  if (BJ.rig && Math.random() < 0.85) {
    const bust = RANKS.filter(r => bjt([...BJ.p, { r }]) > 21);
    if (bust.length) return mk(bust[rand(bust.length)]);
    const low = RANKS.filter(r => bjt([...BJ.p, { r }]) < 17);
    if (low.length) return mk(low[rand(low.length)]);
  }
  return mk();
}
function bjHit() {
  BJ.p.push(bjCard()); bjDraw(); $('dbl')?.remove();
  if (bjt(BJ.p) > 21) { BJ.d[1].hide = false; bjDraw(); bjEnd(0, 'Bust'); }
  else if (bjt(BJ.p) === 21) bjStand();
}
function bjDouble() { if (!take(BJ.s)) return; BJ.s *= 2; BJ.p.push(bjCard()); bjDraw(); if (bjt(BJ.p) > 21) { BJ.d[1].hide = false; bjDraw(); return bjEnd(0, 'Bust'); } bjStand(); }
async function bjStand() {
  $('bjAct').innerHTML = ''; const pt = bjt(BJ.p);
  if (BJ.rig) {
    const good = RANKS.filter(r => { const t = bjt([BJ.d[0], { r }]); return t > pt && t <= 21 && t >= 17; });
    const mid = RANKS.filter(r => bjt([BJ.d[0], { r }]) < 17);
    const pool = good.length ? good : mid; if (pool.length) BJ.d[1] = mk(pool[rand(pool.length)]);
  }
  BJ.d[1].hide = false; bjDraw();
  while (bjt(BJ.d) < 17 || (bjt(BJ.d) === 17 && soft(BJ.d))) {
    await sleep(550); let c = mk();
    if (BJ.rig) {
      const win = RANKS.filter(r => { const t = bjt([...BJ.d, { r }]); return t >= 17 && t <= 21 && t > pt; });
      const keep = RANKS.filter(r => bjt([...BJ.d, { r }]) < 17);
      const pool = win.length ? win : keep; if (pool.length) c = mk(pool[rand(pool.length)]);
    }
    BJ.d.push(c); bjDraw();
  }
  const dt = bjt(BJ.d);
  if (dt > 21 || pt > dt) bjEnd(BJ.s * 2, 'You win'); else if (pt === dt) bjEnd(BJ.s, 'Push'); else bjEnd(0, 'Dealer wins');
}
function bjEnd(ret, t) { record('Blackjack', BJ.s, ret); setMsg('bjMsg', t + (ret > BJ.s ? ' +' + fmt(ret - BJ.s) : ''), resultCls(ret, BJ.s)); bjIdle(); }

/* ================= ROULETTE ================= */
const REDS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
const POCKETS = ['0', '00', '000', ...Array.from({ length: 36 }, (_, i) => String(i + 1))];
const pc = p => p === '0' || p === '00' || p === '000' ? 'g' : REDS.has(+p) ? 'r' : '';
let rlType = 'red', rlHist = [];
const RL = { red: ['Red', 2], black: ['Black', 2], odd: ['Odd', 2], even: ['Even', 2], low: ['1–18', 2], high: ['19–36', 2], d1: ['1st 12', 3], d2: ['2nd 12', 3], d3: ['3rd 12', 3], num: ['Number', 36] };
function rlWins(t, p) {
  const n = +p; if (p === '0' || p === '00' || p === '000') return t === 'num' && $('rlNum').value === p;
  return { red: REDS.has(n), black: !REDS.has(n), odd: n % 2 === 1, even: n % 2 === 0, low: n <= 18, high: n >= 19, d1: n <= 12, d2: n > 12 && n <= 24, d3: n > 24, num: $('rlNum').value === p }[t];
}
function roulette() {
  $('t-roulette').innerHTML = `<h2>Roulette</h2><div class="rules">Triple-zero wheel: 0, 00 and 000 · Number pays 35:1</div>
  <div class="wheel" id="wh">–</div><div class="strip" id="rlStrip"></div>
  <div class="msg" id="rlMsg"></div>
  <div class="pick" id="rlPick">${Object.entries(RL).map(([k, v]) => `<button data-t="${k}" class="${k === rlType ? 'on' : ''}">${v[0]}</button>`).join('')}</div>
  <div class="pick"><label class="label" for="rlNum">Number</label><select id="rlNum">${POCKETS.map(p => `<option>${p}</option>`).join('')}</select></div>
  <div class="controls"><button class="btn" id="spin">Spin</button></div>${betBox('rlBet')}`;
  pickGroup('rlPick', t => { rlType = t; }); $('spin').onclick = rlSpin; rlStrip();
}
function rlStrip() { $('rlStrip').innerHTML = rlHist.map(p => `<span class="${pc(p)}">${p}</span>`).join(''); }
async function rlSpin() {
  const s = bv('rlBet'); if (!take(s)) return; on('rl'); $('spin').disabled = true; setMsg('rlMsg', '');
  const rig = rigged(s); let p = POCKETS[rand(39)];
  if (rig) while (rlWins(rlType, p)) p = POCKETS[rand(39)];
  const wh = $('wh');
  for (let i = 0; i < 18; i++) { const x = POCKETS[rand(39)]; wh.textContent = x; wh.className = 'wheel ' + pc(x); await sleep(40 + i * 8); }
  wh.textContent = p; wh.className = 'wheel ' + pc(p);
  rlHist.unshift(p); rlHist = rlHist.slice(0, 14); rlStrip();
  const ret = rlWins(rlType, p) ? s * RL[rlType][1] : 0;
  record('Roulette', s, ret); setMsg('rlMsg', ret ? 'Hit! +' + fmt(ret - s) : p + ', no luck', ret ? 'up' : 'down');
  $('spin').disabled = false; off('rl');
}

/* ================= CRAPS ================= */
const DIE = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
let CR = { point: null }, crType = 'pass';
function craps() {
  $('t-craps').innerHTML = `<h2>Craps</h2><div class="rules">Pass line 1:1 · Field pays 1:1, 2 pays 2:1, 12 pays 3:1</div>
  <div class="dice" id="dice">⚀ ⚀</div><div class="point" id="pt">Come-out roll</div>
  <div class="msg" id="crMsg"></div>
  <div class="pick" id="crPick"><button data-t="pass" class="on">Pass line</button><button data-t="field">Field</button></div>
  <div class="controls"><button class="btn" id="roll">Roll</button></div>${betBox('crBet')}`;
  pickGroup('crPick', t => { if (CR.point) { toast('Finish the point first'); return false; } crType = t; });
  $('roll').onclick = crRoll;
}
async function rollDice() { let a, b; for (let i = 0; i < 8; i++) { a = rand(6); b = rand(6); $('dice').textContent = DIE[a] + ' ' + DIE[b]; await sleep(60); } return [a + 1, b + 1]; }
async function crRoll() {
  $('roll').disabled = true;
  if (!CR.point) { const s = bv('crBet'); if (!take(s)) { $('roll').disabled = false; return; } on('cr'); CR.s = s; CR.rig = rigged(s); }
  let [a, b] = await rollDice(), t = a + b;
  const bad = x => crType === 'field' ? [2, 3, 4, 9, 10, 11, 12].includes(x) : (CR.point ? x === CR.point : [7, 11].includes(x));
  let tries = 0; while (CR.rig && bad(t) && tries++ < 30) { a = rand(6) + 1; b = rand(6) + 1; t = a + b; }
  $('dice').textContent = DIE[a - 1] + ' ' + DIE[b - 1];
  if (crType === 'field') { const m = t === 2 ? 3 : t === 12 ? 4 : [3, 4, 9, 10, 11].includes(t) ? 2 : 0; crEnd(CR.s * m, t); }
  else if (!CR.point) {
    if ([7, 11].includes(t)) crEnd(CR.s * 2, t); else if ([2, 3, 12].includes(t)) crEnd(0, t);
    else { CR.point = t; $('pt').textContent = 'Point is ' + t + ' · roll again'; setMsg('crMsg', 'Rolled ' + t); }
  } else { if (t === CR.point) crEnd(CR.s * 2, t); else if (t === 7) crEnd(0, t); else setMsg('crMsg', 'Rolled ' + t + ' · still on ' + CR.point); }
  $('roll').disabled = false;
}
function crEnd(ret, t) {
  record(crType === 'field' ? 'Craps field' : 'Craps', CR.s, ret);
  setMsg('crMsg', 'Rolled ' + t + (ret > CR.s ? ' · +' + fmt(ret - CR.s) : ' · lose'), ret > CR.s ? 'up' : 'down');
  CR.point = null; $('pt').textContent = 'Come-out roll'; off('cr');
}

/* ================= BACCARAT ================= */
const bv10 = c => ['10', 'J', 'Q', 'K'].includes(c.r) ? 0 : c.r === 'A' ? 1 : +c.r;
const bsum = h => h.reduce((s, c) => s + bv10(c), 0) % 10;
function bacDeal() {
  const P = [mk(), mk()], B = [mk(), mk()]; let pt = bsum(P), bt = bsum(B);
  if (pt < 8 && bt < 8) {
    let p3 = null; if (pt <= 5) { p3 = mk(); P.push(p3); }
    bt = bsum(B);
    if (!p3) { if (bt <= 5) B.push(mk()); }
    else { const v = bv10(p3); if (bt <= 2 || (bt === 3 && v !== 8) || (bt === 4 && v >= 2 && v <= 7) || (bt === 5 && v >= 4 && v <= 7) || (bt === 6 && (v === 6 || v === 7))) B.push(mk()); }
  }
  return { P, B, pt: bsum(P), bt: bsum(B) };
}
let bacType = 'player';
function bacRet(t, r, s) {
  const w = r.pt > r.bt ? 'player' : r.bt > r.pt ? 'banker' : 'tie';
  if (t === 'tie') return w === 'tie' ? s * 9 : 0; if (w === 'tie') return s; if (t === w) return t === 'banker' ? Math.floor(s * 1.95) : s * 2; return 0;
}
function baccarat() {
  $('t-baccarat').innerHTML = `<h2>Baccarat</h2><div class="rules">Player 1:1 · Banker 1:1 less 5% · Tie 8:1</div>
  <div class="handlab">Player <span id="bP"></span></div><div class="hand" id="bPH"></div>
  <div class="handlab">Banker <span id="bB"></span></div><div class="hand" id="bBH"></div>
  <div class="msg" id="bacMsg"></div>
  <div class="pick" id="bacPick"><button data-t="player" class="on">Player</button><button data-t="banker">Banker</button><button data-t="tie">Tie</button></div>
  <div class="controls"><button class="btn" id="bacGo">Deal</button></div>${betBox('bacBet')}`;
  pickGroup('bacPick', t => { bacType = t; }); $('bacGo').onclick = bacGo;
}
async function bacGo() {
  const s = bv('bacBet'); if (!take(s)) return; on('bac'); $('bacGo').disabled = true; setMsg('bacMsg', '');
  let r = bacDeal(); if (rigged(s)) while (bacRet(bacType, r, s) >= s) r = bacDeal();
  $('bPH').innerHTML = ''; $('bBH').innerHTML = ''; $('bP').textContent = ''; $('bB').textContent = '';
  for (let i = 0; i < Math.max(r.P.length, r.B.length); i++) {
    if (r.P[i]) { $('bPH').innerHTML += cardHTML(r.P[i]); await sleep(300); }
    if (r.B[i]) { $('bBH').innerHTML += cardHTML(r.B[i]); await sleep(300); }
  }
  $('bP').textContent = r.pt; $('bB').textContent = r.bt;
  const ret = bacRet(bacType, r, s); record('Baccarat', s, ret);
  const w = r.pt > r.bt ? 'Player wins' : r.bt > r.pt ? 'Banker wins' : 'Tie';
  setMsg('bacMsg', w + (ret > s ? ' · +' + fmt(ret - s) : ret === s ? ' · push' : ''), resultCls(ret, s));
  $('bacGo').disabled = false; off('bac');
}

/* ================= THREE CARD POKER ================= */
function eval3(h) {
  const v = h.map(c => RV(c.r)).sort((a, b) => b - a); const fl = h.every(c => c.s === h[0].s);
  let st = v[0] - v[1] === 1 && v[1] - v[2] === 1; if (v.join() === '14,3,2') { st = true; v.splice(0, 3, 3, 2, 1); }
  const tr = v[0] === v[2], pr = v[0] === v[1] || v[1] === v[2];
  const cat = st && fl ? 5 : tr ? 4 : st ? 3 : fl ? 2 : pr ? 1 : 0;
  if (cat === 1) { const p = v[1], k = v[0] === v[1] ? v[2] : v[0]; return [1, p, k]; }
  return [cat, ...v];
}
const cmp = (a, b) => { for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] - b[i]; return 0; };
const qual3 = e => e[0] > 0 || e[1] >= 12;
const NAMES3 = ['High card', 'Pair', 'Flush', 'Straight', 'Three of a kind', 'Straight flush'];
let TC = {};
function threecard() {
  $('t-threecard').innerHTML = `<h2>Three Card Poker</h2><div class="rules">Dealer needs queen high · Ante bonus: straight 1:1, trips 4:1, straight flush 5:1</div>
  <div class="handlab">Dealer <span id="tcD"></span></div><div class="hand" id="tcDH"></div>
  <div class="msg" id="tcMsg"></div>
  <div class="hand" id="tcPH"></div><div class="handlab">You <span id="tcP"></span></div>
  <div class="controls" id="tcAct"></div>${betBox('tcBet', 25, 'Ante')}`;
  tcIdle();
}
function tcIdle() { off('tc'); $('tcAct').innerHTML = '<button class="btn" id="tcDeal">Deal</button>'; $('tcDeal').onclick = tcDeal; }
function tcDeal() {
  const s = bv('tcBet'); if (!take(s)) return; on('tc'); setMsg('tcMsg', '');
  const rig = rigged(s); let d, P, D;
  do { d = deck(); P = d.slice(0, 3); D = d.slice(3, 6); } while (rig && !(qual3(eval3(D)) && cmp(eval3(D), eval3(P)) > 0));
  TC = { s, P, D };
  $('tcPH').innerHTML = handHTML(P); $('tcP').textContent = NAMES3[eval3(P)[0]];
  $('tcDH').innerHTML = handHTML(D.map(c => ({ ...c, hide: true }))); $('tcD').textContent = '';
  $('tcAct').innerHTML = `<button class="btn" id="tcPlay">Play (${fmt(s)})</button><button class="btn ghost" id="tcFold">Fold</button>`;
  $('tcPlay').onclick = tcPlay; $('tcFold').onclick = () => { record('3 Card Poker', s, 0); tcReveal(); setMsg('tcMsg', 'Folded', 'down'); tcIdle(); };
}
function tcReveal() { $('tcDH').innerHTML = handHTML(TC.D); $('tcD').textContent = NAMES3[eval3(TC.D)[0]]; }
function tcPlay() {
  if (!take(TC.s)) return; const s = TC.s, ep = eval3(TC.P), ed = eval3(TC.D); tcReveal();
  const bonus = [0, 0, 0, 1, 4, 5][ep[0]] * s;
  const q = qual3(ed); let ret;
  if (!q) ret = s * 3; else { const c = cmp(ep, ed); ret = c > 0 ? s * 4 : c === 0 ? s * 2 : 0; }
  ret += bonus; record('3 Card Poker', s * 2, ret);
  setMsg('tcMsg', (!q ? 'Dealer doesn’t qualify' : ret > s * 2 ? 'You win' : ret === s * 2 ? 'Push' : 'Dealer wins') + (ret > s * 2 ? ' · +' + fmt(ret - s * 2) : ''), resultCls(ret, s * 2));
  tcIdle();
}

/* ================= LET IT RIDE ================= */
function eval5(h) {
  const v = h.map(c => RV(c.r)).sort((a, b) => b - a); const fl = h.every(c => c.s === h[0].s);
  const u = [...new Set(v)]; const st = u.length === 5 && (v[0] - v[4] === 4 || v.join() === '14,5,4,3,2');
  const cnt = {}; v.forEach(x => cnt[x] = (cnt[x] || 0) + 1); const c = Object.values(cnt).sort((a, b) => b - a);
  if (st && fl) return v[0] === 14 && v[1] === 13 ? ['Royal flush', 1000] : ['Straight flush', 200];
  if (c[0] === 4) return ['Four of a kind', 50]; if (c[0] === 3 && c[1] === 2) return ['Full house', 11];
  if (fl) return ['Flush', 8]; if (st) return ['Straight', 5]; if (c[0] === 3) return ['Three of a kind', 3];
  if (c[0] === 2 && c[1] === 2) return ['Two pair', 2];
  if (c[0] === 2) { const p = +Object.keys(cnt).find(k => cnt[k] === 2); return p >= 10 ? ['Tens or better', 1] : ['Small pair', 0]; }
  return ['High card', 0];
}
let LR = {};
function letitride() {
  $('t-letitride').innerHTML = `<h2>Let It Ride</h2><div class="rules">Three equal bets · Pull back two of them · Tens or better pays</div>
  <div class="handlab">Board</div><div class="hand" id="lrB"></div>
  <div class="msg" id="lrMsg"></div>
  <div class="hand" id="lrP"></div><div class="handlab">Your bets: <span id="lrBets" class="num"></span></div>
  <div class="controls" id="lrAct"></div>${betBox('lrBet', 10, 'Each bet')}
  <div class="pay"><span>Pair 10s+ 1:1</span><span>Two pair 2:1</span><span>Trips 3:1</span><span>Straight 5:1</span><span>Flush 8:1</span><span>Full house 11:1</span><span>Quads 50:1</span><span>Str. flush 200:1</span><span>Royal 1000:1</span></div>`;
  lrIdle();
}
function lrIdle() { off('lr'); $('lrAct').innerHTML = '<button class="btn" id="lrDeal">Deal</button>'; $('lrDeal').onclick = lrDeal; }
function lrDraw() { $('lrP').innerHTML = handHTML(LR.P); $('lrB').innerHTML = handHTML(LR.B.map((c, i) => i < LR.shown ? c : { ...c, hide: true })); $('lrBets').textContent = LR.up.map(u => u ? fmt(LR.s) : '—').join(' / '); }
function lrDeal() {
  const s = bv('lrBet'); if (!take(s * 3)) return; on('lr'); setMsg('lrMsg', '');
  const rig = rigged(s * 3); let d; do { d = deck(); } while (rig && eval5(d.slice(0, 5))[1] > 0);
  LR = { s, P: d.slice(0, 3), B: d.slice(3, 5), up: [1, 1, 1], shown: 0, step: 0 }; lrDraw(); lrAsk();
}
function lrAsk() {
  $('lrAct').innerHTML = `<button class="btn" id="lrRide">Let it ride</button><button class="btn ghost" id="lrPull">Pull back ${fmt(LR.s)}</button>`;
  $('lrRide').onclick = () => lrNext(false); $('lrPull').onclick = () => lrNext(true);
}
function lrNext(pull) {
  if (pull) { LR.up[LR.step] = 0; release(LR.s); }
  LR.step++; LR.shown++; lrDraw();
  if (LR.step < 2) return lrAsk();
  const [name, m] = eval5([...LR.P, ...LR.B]); const stake = LR.up.filter(Boolean).length * LR.s;
  const ret = m > 0 ? stake * (m + 1) : 0; record('Let It Ride', stake, ret);
  setMsg('lrMsg', name + (ret ? ' · +' + fmt(ret - stake) : ''), ret ? 'up' : 'down'); lrIdle();
}

/* ================= CASINO WAR ================= */
function war() {
  $('t-war').innerHTML = `<h2>Casino War</h2><div class="rules">High card wins 1:1 · On a tie, go to war (raise your bet) or surrender half</div>
  <div class="handlab">Dealer</div><div class="hand" id="wD"></div>
  <div class="msg" id="wMsg"></div>
  <div class="hand" id="wP"></div><div class="handlab">You</div>
  <div class="controls" id="wAct"></div>${betBox('wBet')}`;
  wIdle();
}
let WR = {};
function wIdle() { off('war'); $('wAct').innerHTML = '<button class="btn" id="wDeal">Deal</button>'; $('wDeal').onclick = wDeal; }
function wDeal() {
  const s = bv('wBet'); if (!take(s)) return; on('war'); setMsg('wMsg', '');
  const rig = rigged(s); let p, d; do { p = mk(); d = mk(); } while (rig && RV(p.r) >= RV(d.r));
  WR = { s, rig }; $('wP').innerHTML = cardHTML(p); $('wD').innerHTML = cardHTML(d);
  if (RV(p.r) > RV(d.r)) { record('Casino War', s, s * 2); setMsg('wMsg', 'You win +' + fmt(s), 'up'); return wIdle(); }
  if (RV(p.r) < RV(d.r)) { record('Casino War', s, 0); setMsg('wMsg', 'Dealer wins', 'down'); return wIdle(); }
  setMsg('wMsg', 'Tie! Go to war?');
  $('wAct').innerHTML = `<button class="btn" id="wGo">Go to war (+${fmt(s)})</button><button class="btn ghost" id="wSur">Surrender</button>`;
  $('wSur').onclick = () => { record('Casino War', s, Math.floor(s / 2)); setMsg('wMsg', 'Surrendered half', 'down'); wIdle(); };
  $('wGo').onclick = () => {
    if (!take(s)) return; let p2, d2; do { p2 = mk(); d2 = mk(); } while (WR.rig && RV(p2.r) >= RV(d2.r));
    $('wP').innerHTML += cardHTML(p2); $('wD').innerHTML += cardHTML(d2);
    const ret = RV(p2.r) >= RV(d2.r) ? s * 3 : 0; // war win pays the original bet, raise pushes
    record('Casino War', s * 2, ret); setMsg('wMsg', ret ? 'Won the war +' + fmt(ret - s * 2) : 'Lost the war', ret ? 'up' : 'down'); wIdle();
  };
}

/* ================= HI-LO ================= */
let HL = null;
function hilo() {
  $('t-hilo').innerHTML = `<h2>Hi-Lo</h2><div class="rules">Call higher or lower on the next card · Each correct call grows your multiplier · Ties lose · Cash out any time</div>
  <div class="hand" id="hlC"></div>
  <div class="msg" id="hlMsg"></div>
  <div class="controls" id="hlAct"></div>${betBox('hlBet')}`;
  hlIdle();
}
function hlIdle() { off('hl'); HL = null; $('hlAct').innerHTML = '<button class="btn" id="hlStart">Deal</button>'; $('hlStart').onclick = hlStart; }
const hlMult = (v, dir) => { const n = dir === 'hi' ? 14 - v : v - 2; return n <= 0 ? 0 : +(0.94 * 12 / n).toFixed(2); };
function hlStart() {
  const s = bv('hlBet'); if (!take(s)) return; on('hl'); setMsg('hlMsg', '');
  HL = { s, rig: rigged(s), cards: [mk()], mult: 1 }; hlPaint();
}
function hlPaint() {
  const c = HL.cards[HL.cards.length - 1], v = RV(c.r);
  $('hlC').innerHTML = handHTML(HL.cards.slice(-6));
  const hi = hlMult(v, 'hi'), lo = hlMult(v, 'lo');
  $('hlAct').innerHTML = `${hi ? `<button class="btn" id="hlHi">Higher ×${hi}</button>` : ''}${lo ? `<button class="btn purple" id="hlLo">Lower ×${lo}</button>` : ''}
    <button class="btn ghost" id="hlCash" ${HL.cards.length < 2 ? 'disabled' : ''}>Cash out ${fmt(Math.floor(HL.s * HL.mult))}</button>`;
  if (hi) $('hlHi').onclick = () => hlCall('hi', hi); if (lo) $('hlLo').onclick = () => hlCall('lo', lo);
  $('hlCash').onclick = () => { const ret = Math.floor(HL.s * HL.mult); record('Hi-Lo', HL.s, ret); setMsg('hlMsg', 'Cashed out +' + fmt(ret - HL.s), resultCls(ret, HL.s)); hlIdle(); };
}
function hlCall(dir, m) {
  const v = RV(HL.cards[HL.cards.length - 1].r); let n;
  const wins = c => dir === 'hi' ? RV(c.r) > v : RV(c.r) < v;
  n = mk(); if (HL.rig && Math.random() < 0.9) { let t = 0; while (wins(n) && t++ < 50) n = mk(); }
  HL.cards.push(n);
  if (!wins(n)) { $('hlC').innerHTML = handHTML(HL.cards.slice(-6)); record('Hi-Lo', HL.s, 0); setMsg('hlMsg', 'Wrong call', 'down'); return hlIdle(); }
  HL.mult = +(HL.mult * m).toFixed(2); setMsg('hlMsg', '×' + HL.mult); hlPaint();
}
