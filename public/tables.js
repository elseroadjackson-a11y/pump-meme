/* ===== Table games ===== */
function spotBets(keys, opt = {}) {
  const bets = Object.fromEntries(keys.map(k => [k, 0]));
  const total = () => keys.reduce((a, k) => a + bets[k], 0);
  const paint = () => { document.querySelectorAll('.spot[data-b]').forEach(s => { const k = s.dataset.b; if (k in bets) s.querySelector('.spot-c').innerHTML = chipStack(bets[k]); }); opt.onChange && opt.onChange(total()); };
  const place = k => { if (opt.canPlace && !opt.canPlace(k)) return; if (!take(CHIP)) return; bets[k] += CHIP; sfx.chip(); paint(); };
  const clear = (f = () => true) => { let r = 0; keys.forEach(k => { if (f(k) && bets[k]) { r += bets[k]; bets[k] = 0; } }); if (r) release(r); paint(); };
  const reset = () => { keys.forEach(k => bets[k] = 0); paint(); };
  const rebet = last => { const need = last ? Object.values(last).reduce((a, b) => a + b, 0) : 0; if (!need || total()) return; if (!take(need)) return; Object.assign(bets, last); paint(); };
  document.querySelectorAll('.spot[data-b]').forEach(s => { if (s.dataset.b in bets) s.onclick = () => place(s.dataset.b); });
  return { bets, total, paint, clear, reset, rebet, snap: () => ({ ...bets }) };
}
const betline = (id, label, extra = '') => `<div class="betline"><span class="label">${label}</span><b class="num" id="${id}">0</b>${extra}</div>`;

/* ================= BLACKJACK ================= */
const bjv = c => c.r === 'A' ? 11 : ['10', 'J', 'Q', 'K'].includes(c.r) ? 10 : +c.r;
function bjt(h) { let t = 0, a = 0; for (const c of h) { t += bjv(c); if (c.r === 'A') a++; } while (t > 21 && a) { t -= 10; a--; } return t; }
function bjSoft(h) { let t = 0, a = 0; for (const c of h) { t += bjv(c); if (c.r === 'A') a++; } while (t > 21 && a) { t -= 10; a--; } return a > 0 && t <= 21; }
const isBJ = h => h.length === 2 && bjt(h) === 21;
addGame({
  id: 'blackjack', name: 'Blackjack', cat: 'tables', tag: 'Pays 6:5 · Dealer hits soft 17',
  rules: '<p>Get closer to 21 than the dealer without going over. Face cards count 10, aces count 1 or 11. Blackjack pays 6 to 5, and the dealer hits soft 17.</p><p>Double on any first two cards. Split a pair once. Split aces get one card each.</p>',
  art(ctx, w, h) { artBg(ctx, w, h, '#0f6b3a', '#03200f'); canvasCard(ctx, w * .38, h * .38, w * .4, 'A', '♠', -.2); canvasCard(ctx, w * .62, h * .4, w * .4, 'K', '♥', .18); },
  mount: mountBJ,
});
function mountBJ() {
  gameShell(gameById('blackjack'), `${rackHTML(25)}${betline('bjBet', 'Bet', '<button class="btn ghost sm" id="bjClr" type="button">Clear</button><button class="btn ghost sm" id="bjRe" type="button">Rebet</button>')}
    <button class="btn play" id="bjDeal" type="button">Deal</button>
    <div class="acts4"><button class="btn" id="bjHit" type="button" disabled>Hit</button><button class="btn purple" id="bjStand" type="button" disabled>Stand</button><button class="btn ghost" id="bjDbl" type="button" disabled>Double</button><button class="btn ghost" id="bjSplit" type="button" disabled>Split</button></div>`,
    `<div class="felt bj"><div class="felt-arc">BLACKJACK PAYS 6 TO 5 · DEALER HITS SOFT 17</div>
      <div class="bj-dealer"><div class="hand" id="dH"></div><span class="tot hidden" id="dT"></span></div>
      <div class="felt-msg" id="bjMsg">Tap chips to bet, then deal</div>
      <div class="bj-hands" id="pHands"></div>
      <button class="spot round" id="bjSpot" type="button"><span class="spot-l">BET</span><span class="spot-c" id="bjChips"></span></button></div>`);
  let bet = 0, last = 0, R = null, shoe = freshDeck(6);
  const next = () => { if (shoe.length < 60) shoe = freshDeck(6); return shoe.pop(); };
  const msg = t => { $('bjMsg').textContent = t; };
  const paintBet = () => { $('bjBet').textContent = fmt(bet); $('bjChips').innerHTML = R ? '' : chipStack(bet); };
  function addChip(v) { if (R) return; if (bet + v > avail()) return toast('Not enough chips'); bet += v; paintBet(); }
  bindRack(25, v => addChip(v));
  $('bjSpot').onclick = () => { addChip(CHIP); sfx.chip(); };
  $('bjClr').onclick = () => { if (!R) { bet = 0; paintBet(); } };
  $('bjRe').onclick = () => { if (!R && last) { bet = Math.min(last, Math.floor(avail())); paintBet(); } };
  const totTxt = h => { const t = bjt(h); return bjSoft(h) && t < 21 ? `${t - 10} / ${t}` : String(t); };
  const handBox = i => $('ph' + i), handCont = i => $('ph' + i).querySelector('.hand');
  function newHand(i) { const d = document.createElement('div'); d.className = 'phand'; d.id = 'ph' + i; d.innerHTML = '<div class="hand"></div><span class="tot"></span><span class="hbet"></span>'; $('pHands').appendChild(d); return d.querySelector('.hand'); }
  function paintTot() {
    if (!R) return;
    R.hands.forEach((h, i) => { const b = handBox(i); if (!b || !h.cards.length) return; const t = b.querySelector('.tot'); t.textContent = totTxt(h.cards); t.classList.toggle('bust', bjt(h.cards) > 21); b.classList.toggle('act', i === R.active && !R.over && R.hands.length > 1); b.querySelector('.hbet').innerHTML = chipStack(h.bet); });
    const vis = R.holeShown ? R.dealer : R.dealer.slice(0, 1); $('dT').textContent = totTxt(vis); $('dT').classList.remove('hidden'); $('dT').classList.toggle('bust', bjt(vis) > 21);
  }
  const lockActs = () => ['bjHit', 'bjStand', 'bjDbl', 'bjSplit'].forEach(id => { $(id).disabled = true; });
  function acts() {
    const h = R && !R.over && R.active >= 0 ? R.hands[R.active] : null;
    $('bjHit').disabled = $('bjStand').disabled = !h;
    $('bjDbl').disabled = !h || h.cards.length !== 2 || avail() < h.bet;
    $('bjSplit').disabled = !h || R.hands.length > 1 || h.cards.length !== 2 || bjv(h.cards[0]) !== bjv(h.cards[1]) || avail() < h.bet;
    $('bjDeal').disabled = !!R; lock(['bjClr', 'bjRe'], !!R);
  }
  function rigCard(h) {
    if (R.rig && Math.random() < .85) {
      const bust = RANKS.filter(r => bjt([...h.cards, { r }]) > 21); if (bust.length) return mk(pickOne(bust));
      const low = RANKS.filter(r => bjt([...h.cards, { r }]) < 17); if (low.length) return mk(pickOne(low));
    }
    return next();
  }
  $('bjDeal').onclick = async () => {
    if (R) return; if (!bet) return toast('Tap chips to place a bet');
    if (!take(bet)) return; on('bj'); last = bet;
    $('dH').innerHTML = ''; $('pHands').innerHTML = ''; $('dT').classList.add('hidden'); msg('');
    R = { rig: rigged(bet), hands: [{ cards: [], bet, done: false }], dealer: [], active: 0, over: false, holeShown: false };
    paintBet(); lockActs(); acts();
    const h0 = newHand(0);
    let p = [next(), next()]; if (R.rig) { let n = 0; while (bjt(p) >= 18 && n++ < 50) p = [next(), next()]; }
    const d = [next(), next()];
    R.hands[0].cards.push(p[0]); await dealCard(h0, p[0]); paintTot();
    R.dealer.push(d[0]); await dealCard($('dH'), d[0]); paintTot();
    R.hands[0].cards.push(p[1]); await dealCard(h0, p[1]); paintTot();
    R.dealer.push(d[1]); R.holeEl = await dealCard($('dH'), d[1], { down: true });
    R.dBJ = isBJ(d); paintTot();
    if (isBJ(p) || R.dBJ) { reveal(); return settle(); }
    acts();
  };
  async function hit() {
    const i = R.active, h = R.hands[i]; lockActs();
    const c = rigCard(h); h.cards.push(c); await dealCard(handCont(i), c); paintTot();
    const t = bjt(h.cards);
    if (t > 21) { sfx.lose(); h.done = true; return nextHand(); }
    if (t === 21) { h.done = true; return nextHand(); }
    acts();
  }
  $('bjHit').onclick = hit;
  $('bjStand').onclick = () => { lockActs(); R.hands[R.active].done = true; nextHand(); };
  $('bjDbl').onclick = async () => {
    const i = R.active, h = R.hands[i]; if (!take(h.bet)) return; lockActs();
    h.bet *= 2; const c = rigCard(h); h.cards.push(c); await dealCard(handCont(i), c); paintTot(); h.done = true; nextHand();
  };
  $('bjSplit').onclick = async () => {
    const h = R.hands[0]; if (!take(h.bet)) return; lockActs();
    const h1 = { cards: [h.cards.pop()], bet: h.bet, done: false }; R.hands.push(h1);
    const moved = handCont(0).lastElementChild, c1 = newHand(1); c1.appendChild(moved); paintTot();
    const aces = h.cards[0].r === 'A';
    let c = rigCard(h); h.cards.push(c); await dealCard(handCont(0), c);
    c = rigCard(h1); h1.cards.push(c); await dealCard(c1, c);
    if (aces) h.done = h1.done = true;
    R.active = 0; paintTot(); nextHand();
  };
  function nextHand() {
    const i = R.hands.findIndex(h => !h.done);
    if (i >= 0) { R.active = i; if (bjt(R.hands[i].cards) === 21) { R.hands[i].done = true; return nextHand(); } paintTot(); acts(); if (R.hands.length > 1) msg('Playing hand ' + (i + 1)); return; }
    R.active = -1; paintTot(); dealerPlay();
  }
  function reveal() { R.holeShown = true; flipCard(R.holeEl, R.dealer[1]); paintTot(); }
  async function dealerPlay() {
    lockActs(); msg('');
    const live = R.hands.filter(h => bjt(h.cards) <= 21);
    if (!live.length) { reveal(); return settle(); }
    const best = Math.max(...live.map(h => bjt(h.cards)));
    if (R.rig) {
      const good = RANKS.filter(r => { const t = bjt([R.dealer[0], { r }]); return t > best && t <= 21 && t >= 17; });
      const mid = RANKS.filter(r => bjt([R.dealer[0], { r }]) < 17), pool = good.length ? good : mid;
      if (pool.length) R.dealer[1] = mk(pickOne(pool));
    }
    reveal(); await sleep(500);
    const needsHit = () => { const t = bjt(R.dealer); return t < 17 || (t === 17 && bjSoft(R.dealer)); };
    while (needsHit()) {
      let c = next();
      if (R.rig) {
        const win = RANKS.filter(r => { const nd = [...R.dealer, { r }], t = bjt(nd); return t >= 17 && t <= 21 && t > best && !(t === 17 && bjSoft(nd)); });
        const keep = RANKS.filter(r => bjt([...R.dealer, { r }]) < 17), pool = win.length ? win : keep;
        if (pool.length) c = mk(pickOne(pool));
      }
      R.dealer.push(c); await dealCard($('dH'), c); paintTot(); await sleep(250);
    }
    settle();
  }
  function settle() {
    R.over = true; const dt = bjt(R.dealer); let stake = 0, ret = 0; const res = [];
    R.hands.forEach(h => {
      stake += h.bet; const pt = bjt(h.cards), pBJ = R.hands.length === 1 && isBJ(h.cards); let r;
      if (R.dBJ) r = pBJ ? h.bet : 0;
      else if (pBJ) r = Math.floor(h.bet * 2.2);
      else if (pt > 21) r = 0;
      else if (dt > 21 || pt > dt) r = h.bet * 2;
      else if (pt === dt) r = h.bet;
      else r = 0;
      ret += r; res.push(pBJ && r > h.bet ? 'Blackjack!' : r > h.bet ? 'You win' : r === h.bet ? 'Push' : pt > 21 ? 'Bust' : R.dBJ ? 'Dealer blackjack' : 'Dealer wins');
    });
    record('Blackjack', stake, ret); paintTot();
    msg(res.length > 1 ? res.map((x, i) => `Hand ${i + 1}: ${x}`).join(' · ') : (dt > 21 && ret > stake ? 'Dealer busts · you win' : res[0]));
    resultFlash(ret, stake);
    R = null; off('bj'); bet = last <= avail() ? last : 0; paintBet(); acts();
  }
  paintBet(); acts();
}

/* ================= ROULETTE ================= */
const RL_ORDER = ['0', '28', '9', '26', '30', '11', '7', '20', '32', '17', '5', '22', '34', '15', '3', '24', '36', '13', '1', '00', '27', '10', '25', '29', '12', '8', '19', '31', '18', '6', '21', '33', '16', '4', '23', '35', '14', '2', '000'];
const REDS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
const isZero = p => p === '0' || p === '00' || p === '000';
const pColor = p => isZero(p) ? '#0f8a4b' : REDS.has(+p) ? '#d22b3f' : '#17121f';
function rlMult(key, p) {
  if (key.startsWith('n:')) return key.slice(2) === p ? 36 : 0;
  if (isZero(p)) return 0;
  const n = +p;
  return ({ red: REDS.has(n) ? 2 : 0, black: !REDS.has(n) ? 2 : 0, odd: n % 2 ? 2 : 0, even: n % 2 ? 0 : 2, low: n <= 18 ? 2 : 0, high: n >= 19 ? 2 : 0, d1: n <= 12 ? 3 : 0, d2: n > 12 && n <= 24 ? 3 : 0, d3: n > 24 ? 3 : 0, c1: n % 3 === 1 ? 3 : 0, c2: n % 3 === 2 ? 3 : 0, c3: n % 3 === 0 ? 3 : 0 })[key] || 0;
}
function rlWheelImg(D) {
  const cv = document.createElement('canvas'), c = fitCanvas(cv, D, D), R = D / 2, cx = R, N = RL_ORDER.length, a = Math.PI * 2 / N;
  let g = c.createRadialGradient(cx, cx, R * .84, cx, cx, R); g.addColorStop(0, '#5a2f10'); g.addColorStop(.45, '#b9772c'); g.addColorStop(1, '#3a1d08');
  c.fillStyle = g; c.beginPath(); c.arc(cx, cx, R, 0, Math.PI * 2); c.fill();
  g = c.createRadialGradient(cx, cx, R * .74, cx, cx, R * .9); g.addColorStop(0, '#120a04'); g.addColorStop(1, '#3e2612');
  c.fillStyle = g; c.beginPath(); c.arc(cx, cx, R * .9, 0, Math.PI * 2); c.fill();
  for (let i = 0; i < N; i++) {
    const a0 = i * a - Math.PI / 2 - a / 2, a1 = a0 + a;
    c.fillStyle = pColor(RL_ORDER[i]); c.beginPath(); c.arc(cx, cx, R * .76, a0, a1); c.arc(cx, cx, R * .55, a1, a0, true); c.closePath(); c.fill();
    c.strokeStyle = '#d9b45a'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(cx + Math.cos(a0) * R * .55, cx + Math.sin(a0) * R * .55); c.lineTo(cx + Math.cos(a0) * R * .76, cx + Math.sin(a0) * R * .76); c.stroke();
    c.save(); c.translate(cx, cx); c.rotate(i * a); c.fillStyle = '#fff'; c.font = `800 ${Math.max(7, R * .068)}px Nunito,sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(RL_ORDER[i], 0, -R * .695); c.restore();
  }
  c.strokeStyle = '#d9b45a'; c.lineWidth = 2; [R * .76, R * .64, R * .55].forEach(r => { c.beginPath(); c.arc(cx, cx, r, 0, Math.PI * 2); c.stroke(); });
  c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.arc(cx, cx, R * .64, 0, Math.PI * 2); c.arc(cx, cx, R * .55, 0, Math.PI * 2, true); c.fill();
  g = c.createRadialGradient(cx - R * .12, cx - R * .12, R * .04, cx, cx, R * .55); g.addColorStop(0, '#9a6a35'); g.addColorStop(.55, '#55300f'); g.addColorStop(1, '#2a1606');
  c.fillStyle = g; c.beginPath(); c.arc(cx, cx, R * .55, 0, Math.PI * 2); c.fill();
  c.strokeStyle = 'rgba(217,180,90,.35)'; c.lineWidth = 1; for (let i = 0; i < 8; i++) { const an = i * Math.PI / 4; c.beginPath(); c.moveTo(cx + Math.cos(an) * R * .16, cx + Math.sin(an) * R * .16); c.lineTo(cx + Math.cos(an) * R * .55, cx + Math.sin(an) * R * .55); c.stroke(); }
  g = c.createLinearGradient(cx - R * .2, cx - R * .2, cx + R * .2, cx + R * .2); g.addColorStop(0, '#fff1b0'); g.addColorStop(.5, '#d9a53a'); g.addColorStop(1, '#7a5212'); c.fillStyle = g;
  for (let i = 0; i < 4; i++) { c.save(); c.translate(cx, cx); c.rotate(i * Math.PI / 2); rr(c, -R * .025, -R * .3, R * .05, R * .3, R * .02); c.fill(); c.beginPath(); c.arc(0, -R * .3, R * .04, 0, Math.PI * 2); c.fill(); c.restore(); }
  c.beginPath(); c.arc(cx, cx, R * .09, 0, Math.PI * 2); c.fill();
  return cv;
}
addGame({
  id: 'roulette', name: 'Roulette', cat: 'tables', tag: 'Triple zero wheel',
  rules: '<p>Pick a chip, tap the board to bet, then spin. Numbers pay 35 to 1, dozens and columns pay 2 to 1, red/black, odd/even and high/low pay 1 to 1.</p><p>This wheel has 0, 00 and 000. Any zero loses every outside bet.</p>',
  art(ctx, w, h) { artBg(ctx, w, h, '#7a0f1e', '#200306'); const D = w * .86; ctx.drawImage(rlWheelImg(D), (w - D) / 2, h * .4 - D / 2, D, D); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(w / 2 + D * .3, h * .4 - D * .1, 5, 0, 7); ctx.fill(); },
  mount: mountRoulette,
});
function rlBoardHTML() {
  let h = '';
  [['0', 1], ['000', 2], ['00', 3]].forEach(([z, r]) => { h += `<button type="button" class="rc z" data-b="n:${z}" style="grid-column:1;grid-row:${r}"><span>${z}</span></button>`; });
  for (let ri = 0; ri < 3; ri++) for (let ci = 0; ci < 12; ci++) { const n = ci * 3 + (3 - ri); h += `<button type="button" class="rc ${REDS.has(n) ? 'red' : 'blk'}" data-b="n:${n}" style="grid-column:${ci + 2};grid-row:${ri + 1}"><span>${n}</span></button>`; }
  ['c3', 'c2', 'c1'].forEach((c, ri) => { h += `<button type="button" class="rc o" data-b="${c}" style="grid-column:14;grid-row:${ri + 1}"><span>2:1</span></button>`; });
  [['d1', '1st 12'], ['d2', '2nd 12'], ['d3', '3rd 12']].forEach(([k, l], i) => { h += `<button type="button" class="rc o" data-b="${k}" style="grid-column:${2 + i * 4}/span 4;grid-row:4"><span>${l}</span></button>`; });
  [['low', '1–18'], ['even', 'EVEN'], ['red', ''], ['black', ''], ['odd', 'ODD'], ['high', '19–36']].forEach(([k, l], i) => { h += `<button type="button" class="rc o ${k === 'red' ? 'rd' : k === 'black' ? 'bd' : ''}" data-b="${k}" style="grid-column:${2 + i * 2}/span 2;grid-row:5"><span>${l}</span></button>`; });
  return h;
}
function mountRoulette() {
  gameShell(gameById('roulette'), `${rackHTML(5)}${betline('rlTot', 'Total bet')}
    <div class="row4"><button class="btn ghost sm" id="rlUndo" type="button">Undo</button><button class="btn ghost sm" id="rlClr" type="button">Clear</button><button class="btn ghost sm" id="rlDbl" type="button">2×</button><button class="btn ghost sm" id="rlRe" type="button">Rebet</button></div>
    <button class="btn play" id="rlSpin" type="button">Spin</button>`,
    `<div class="rlg"><div class="rl-top"><div class="rl-wheel"><canvas id="rlCv"></canvas></div><div class="rl-side"><div class="rl-res" id="rlRes">—</div><div class="label">Last numbers</div><div class="rl-hist" id="rlHist"></div></div></div>
     <div class="rl-bw"><div class="rl-board" id="rlBoard">${rlBoardHTML()}</div></div></div>`);
  bindRack(5);
  let bets = {}, stack = [], lastBets = null, spinning = false, ctx, D, img, wRot = 0, bAng = null, bRad = 0, raf = 0, locked = null;
  const hist = [], TAU = Math.PI * 2, N = RL_ORDER.length, a = TAU / N, cv = $('rlCv');
  const total = () => Object.values(bets).reduce((x, y) => x + y, 0);
  function paint() {
    document.querySelectorAll('.rc').forEach(c => { const v = bets[c.dataset.b] || 0; let ch = c.querySelector('.pchip'); if (ch) ch.remove(); if (v) c.insertAdjacentHTML('beforeend', chipStack(v)); });
    $('rlTot').textContent = fmt(total());
  }
  $('rlBoard').onclick = e => {
    const c = e.target.closest('.rc'); if (!c || spinning) return; const k = c.dataset.b;
    if (!take(CHIP)) return; bets[k] = (bets[k] || 0) + CHIP; stack.push([k, CHIP]); sfx.chip(); paint();
  };
  $('rlUndo').onclick = () => { if (spinning || !stack.length) return; const [k, v] = stack.pop(); bets[k] -= v; if (!bets[k]) delete bets[k]; release(v); paint(); };
  $('rlClr').onclick = () => { if (spinning) return; release(total()); bets = {}; stack = []; paint(); };
  $('rlDbl').onclick = () => { if (spinning || !total()) return; if (!take(total())) return; for (const k in bets) { stack.push([k, bets[k]]); bets[k] *= 2; } paint(); };
  $('rlRe').onclick = () => { if (spinning || total() || !lastBets) return; const need = Object.values(lastBets).reduce((x, y) => x + y, 0); if (!take(need)) return; bets = { ...lastBets }; stack = Object.entries(bets); paint(); };
  function size() { D = clamp(cv.parentElement.clientWidth, 220, 380); ctx = fitCanvas(cv, D, D); img = rlWheelImg(D); }
  function draw() {
    ctx.clearRect(0, 0, D, D); ctx.save(); ctx.translate(D / 2, D / 2); ctx.rotate(wRot); ctx.drawImage(img, -D / 2, -D / 2, D, D); ctx.restore();
    if (bAng !== null) {
      const ang = locked ? wRot + locked : bAng, r = locked ? D / 2 * .6 : bRad, x = D / 2 + Math.cos(ang) * r, y = D / 2 + Math.sin(ang) * r;
      const g = ctx.createRadialGradient(x - 2, y - 2, 1, x, y, D * .025); g.addColorStop(0, '#fff'); g.addColorStop(1, '#bfb8cc');
      ctx.fillStyle = g; ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 6; ctx.beginPath(); ctx.arc(x, y, D * .022, 0, TAU); ctx.fill(); ctx.shadowBlur = 0;
    }
  }
  function idle() { if (!spinning) { wRot += .0025; draw(); } raf = requestAnimationFrame(idle); }
  async function spinTo(target) {
    const k = RL_ORDER.indexOf(target), pa = k * a - Math.PI / 2;
    locked = null; const W0 = wRot, Wd = TAU * (1.4 + Math.random() * .5), Wend = W0 + Wd;
    const B0 = bAng === null ? -Math.PI / 2 : bAng, Bend = Wend + pa, Bd = ((B0 - Bend) % TAU + TAU) % TAU + TAU * 5, t0 = performance.now(), dur = 5600;
    let bounced = 0;
    await new Promise(res => {
      const st = () => {
        const u = Math.min(1, (performance.now() - t0) / dur);
        wRot = W0 + Wd * ease.out3(u);
        let ang = B0 - Bd * ease.out3(u);
        if (u > .78) { const s = ease.inout((u - .78) / .22), lockA = wRot + pa, diff = ((lockA - ang + Math.PI) % TAU + TAU) % TAU - Math.PI; ang += diff * s; }
        bAng = ang;
        if (u < .62) bRad = D / 2 * .83;
        else if (u < .86) { const s = (u - .62) / .24; bRad = D / 2 * (.83 - .23 * ease.out3(s)) + Math.abs(Math.sin(s * Math.PI * 3)) * (1 - s) * D * .03; const b = Math.floor(s * 3); if (b > bounced) { bounced = b; sfx.tick(); } }
        else bRad = D / 2 * .6;
        draw(); u < 1 ? requestAnimationFrame(st) : res();
      };
      st();
    });
    locked = pa; draw();
  }
  $('rlSpin').onclick = async () => {
    const tot = total(); if (spinning) return; if (!tot) return toast('Tap the board to place a bet');
    spinning = true; on('rl'); $('rlSpin').disabled = true; document.querySelectorAll('.rc.win').forEach(c => c.classList.remove('win'));
    const ret = p => Object.entries(bets).reduce((s, [k, v]) => s + v * rlMult(k, p), 0);
    let p = pickOne(RL_ORDER);
    if (rigged(tot)) { const lose = RL_ORDER.filter(x => ret(x) < tot); if (lose.length) p = pickOne(lose); }
    $('rlRes').textContent = '…'; $('rlRes').style.background = '';
    await spinTo(p);
    const r = ret(p); record('Roulette', tot, r);
    $('rlRes').textContent = p; $('rlRes').style.background = pColor(p);
    hist.unshift(p); $('rlHist').innerHTML = hist.slice(0, 14).map(x => `<span style="background:${pColor(x)}">${x}</span>`).join('');
    document.querySelectorAll('.rc').forEach(c => { if (rlMult(c.dataset.b, p) > 0) c.classList.add('win'); });
    resultFlash(r, tot); if (r < tot && r > 0) flash(`<span>Back ${fmt(r)}</span>`);
    lastBets = { ...bets }; bets = {}; stack = []; paint();
    spinning = false; off('rl'); $('rlSpin').disabled = false;
  };
  size(); draw(); raf = requestAnimationFrame(idle);
  const onR = () => { size(); draw(); }; window.addEventListener('resize', onR);
  onLeave(() => { cancelAnimationFrame(raf); window.removeEventListener('resize', onR); });
}

/* ================= CRAPS ================= */
const pipsHTML = n => `<div class="pips">${PIPS[n].map(([x, y]) => `<i style="grid-column:${x + 1};grid-row:${y + 1}"></i>`).join('')}</div>`;
const cubeHTML = () => `<div class="cube">${[1, 2, 3, 4, 5, 6].map(n => `<div class="face f${n}">${pipsHTML(n)}</div>`).join('')}</div>`;
const FACE_ROT = { 1: [0, 0], 2: [0, -90], 3: [-90, 0], 4: [90, 0], 5: [0, 90], 6: [0, 180] };
addGame({
  id: 'craps', name: 'Craps', cat: 'tables', tag: 'Pass line · field · props',
  rules: '<p><b>Pass Line:</b> on the come-out roll, 7 or 11 wins and 2, 3 or 12 loses. Any other number becomes the point. Roll the point again before a 7 to win.</p><p><b>Don’t Pass</b> is the opposite (12 pushes). <b>Field</b> is a one-roll bet on 2, 3, 4, 9, 10, 11 or 12. <b>Any Seven</b> pays 4 to 1 and <b>Any Craps</b> pays 7 to 1.</p>',
  art(ctx, w, h) { artBg(ctx, w, h, '#1f6b2a', '#06200b'); canvasDie(ctx, w * .37, h * .36, w * .34, 6, -.35, '#e0344d', '#fff'); canvasDie(ctx, w * .63, h * .44, w * .34, 1, .25, '#e0344d', '#fff'); },
  mount: mountCraps,
});
function mountCraps() {
  gameShell(gameById('craps'), `${rackHTML(25)}${betline('crTot', 'On the table', '<button class="btn ghost sm" id="crClr" type="button">Clear</button>')}
    <button class="btn play" id="crRoll" type="button">Roll</button><p class="muted small">Pick a chip and tap a betting area. Pass and Don’t Pass lock in once a point is set.</p>`,
    `<div class="felt craps"><div class="cr-pts" id="crPts">${[4, 5, 6, 8, 9, 10].map(n => `<div class="cr-pt" data-p="${n}"><b>${n === 6 ? 'SIX' : n === 9 ? 'NINE' : n}</b></div>`).join('')}</div>
      <div class="cr-dice" id="crDice"><div class="die3" id="cd1">${cubeHTML()}</div><div class="die3" id="cd2">${cubeHTML()}</div></div>
      <div class="felt-msg" id="crMsg">Come-out roll · place your bets</div>
      <div class="cr-grid">
        <button type="button" class="spot cr-field" data-b="field"><span class="spot-l">FIELD</span><small>2 · 3 · 4 · 9 · 10 · 11 · 12</small><small>2 pays double · 12 pays triple</small><span class="spot-c"></span></button>
        <button type="button" class="spot" data-b="any7"><span class="spot-l">ANY SEVEN</span><small>4 to 1</small><span class="spot-c"></span></button>
        <button type="button" class="spot" data-b="anycraps"><span class="spot-l">ANY CRAPS</span><small>2 · 3 · 12 · 7 to 1</small><span class="spot-c"></span></button>
        <button type="button" class="spot cr-dont" data-b="dont"><span class="spot-l">DON’T PASS BAR</span><small>12 pushes</small><span class="spot-c"></span></button>
        <button type="button" class="spot cr-pass" data-b="pass"><span class="spot-l">PASS LINE</span><span class="spot-c"></span></button>
      </div></div>`);
  bindRack(25);
  let point = null, rolling = false; const spins = { cd1: [0, 0], cd2: [0, 0] };
  const SB = spotBets(['pass', 'dont', 'field', 'any7', 'anycraps'], {
    canPlace: k => { if (rolling) return false; if ((k === 'pass' || k === 'dont') && point) { toast('Line bets only go down on the come-out roll'); return false; } return true; },
    onChange: t => { $('crTot').textContent = fmt(t); },
  });
  const B = SB.bets;
  function paintPuck() { document.querySelectorAll('.cr-pt').forEach(p => p.classList.toggle('on', +p.dataset.p === point)); }
  $('crClr').onclick = () => { if (!rolling) SB.clear(k => !(point && (k === 'pass' || k === 'dont'))); };
  function evalRoll(t) {
    let ret = 0, staked = 0, wins = 0, np = point; const res = {};
    const s = (k, r) => { if (!B[k]) return; staked += B[k]; ret += r; if (r > B[k]) wins++; res[k] = r; };
    s('field', [3, 4, 9, 10, 11].includes(t) ? B.field * 2 : t === 2 ? B.field * 3 : t === 12 ? B.field * 4 : 0);
    s('any7', t === 7 ? B.any7 * 5 : 0);
    s('anycraps', [2, 3, 12].includes(t) ? B.anycraps * 8 : 0);
    if (point === null) {
      if (t === 7 || t === 11) { s('pass', B.pass * 2); s('dont', 0); }
      else if (t === 2 || t === 3) { s('pass', 0); s('dont', B.dont * 2); }
      else if (t === 12) s('pass', 0);
      else np = t;
    } else if (t === point) { s('pass', B.pass * 2); s('dont', 0); np = null; }
    else if (t === 7) { s('pass', 0); s('dont', B.dont * 2); np = null; }
    return { ret, staked, wins, res, np };
  }
  function setDie(id, n) {
    const sp = spins[id]; sp[0] += 2 + rand(2); sp[1] += 2 + rand(2); const [x, y] = FACE_ROT[n];
    $(id).querySelector('.cube').style.transform = `rotateX(${x + 360 * sp[0]}deg) rotateY(${y + 360 * sp[1]}deg)`;
  }
  $('crRoll').onclick = async () => {
    if (rolling) return; const tot = SB.total(); if (!tot) return toast('Place a bet first');
    rolling = true; on('craps'); $('crRoll').disabled = true;
    let d1 = rand(6) + 1, d2 = rand(6) + 1;
    if (rigged(tot)) {
      const opts = []; for (let x = 1; x <= 6; x++) for (let y = 1; y <= 6; y++) opts.push({ x, y, e: evalRoll(x + y) });
      const safe = opts.filter(o => o.e.wins === 0), pool = safe.length ? safe : opts.sort((p, q) => p.e.ret - q.e.ret).slice(0, 2), o = pickOne(pool); d1 = o.x; d2 = o.y;
    }
    $('crDice').classList.remove('throw'); void $('crDice').offsetWidth; $('crDice').classList.add('throw');
    setDie('cd1', d1); setDie('cd2', d2);
    for (let i = 0; i < 6; i++) { await sleep(160); sfx.tick(); }
    const t = d1 + d2, e = evalRoll(t), was = point;
    for (const k in e.res) B[k] = 0;
    if (e.staked) record('Craps', e.staked, e.ret);
    point = e.np; paintPuck(); SB.paint();
    let m = 'Rolled ' + t;
    if (was === null && point) m += ' · the point is ' + point;
    else if (was === null && (t === 7 || t === 11)) m = t + ' · natural winner';
    else if (was === null && [2, 3, 12].includes(t)) m = 'Craps ' + t;
    else if (was && t === was) m = 'Point ' + t + ' hit · winner';
    else if (was && t === 7) m = 'Seven out';
    else if (was) m += ' · still on ' + was;
    $('crMsg').textContent = m;
    if (e.staked) resultFlash(e.ret, e.staked);
    rolling = false; $('crRoll').disabled = false;
    if (!(point && (B.pass || B.dont))) off('craps');
  };
  SB.paint(); setDie('cd1', 5); setDie('cd2', 2);
}

/* ================= BACCARAT ================= */
const bv10 = c => ['10', 'J', 'Q', 'K'].includes(c.r) ? 0 : c.r === 'A' ? 1 : +c.r;
const bsum = h => h.reduce((s, c) => s + bv10(c), 0) % 10;
function bacDeal() {
  const P = [mk(), mk()], B = [mk(), mk()]; let pt = bsum(P), bt = bsum(B), p3 = null;
  if (pt < 8 && bt < 8) {
    if (pt <= 5) { p3 = mk(); P.push(p3); }
    if (!p3) { if (bt <= 5) B.push(mk()); }
    else { const v = bv10(p3); if (bt <= 2 || (bt === 3 && v !== 8) || (bt === 4 && v >= 2 && v <= 7) || (bt === 5 && v >= 4 && v <= 7) || (bt === 6 && (v === 6 || v === 7))) B.push(mk()); }
  }
  pt = bsum(P); bt = bsum(B);
  return { P, B, pt, bt, w: pt > bt ? 'player' : bt > pt ? 'banker' : 'tie' };
}
addGame({
  id: 'baccarat', name: 'Baccarat', cat: 'tables', tag: 'Banker pays 0.95 · Tie 8:1',
  rules: '<p>Bet on Player, Banker or Tie. Hands closest to 9 win. Face cards and tens count 0, aces count 1. Third cards follow the standard tableau. Banker wins pay 0.95 to 1, ties pay 8 to 1 and push Player and Banker bets.</p>',
  art(ctx, w, h) { artBg(ctx, w, h, '#0f3a7a', '#020c20'); canvasCard(ctx, w * .36, h * .37, w * .38, '9', '♦', -.16); canvasCard(ctx, w * .64, h * .39, w * .38, 'K', '♣', .16); },
  mount: mountBac,
});
function mountBac() {
  gameShell(gameById('baccarat'), `${rackHTML(25)}${betline('bcTot', 'Total bet', '<button class="btn ghost sm" id="bcClr" type="button">Clear</button><button class="btn ghost sm" id="bcRe" type="button">Rebet</button>')}<button class="btn play" id="bcGo" type="button">Deal</button>`,
    `<div class="felt bac"><div class="bac-hands"><div class="bac-h"><div class="bac-l">PLAYER <b id="bcPT"></b></div><div class="hand" id="bcP"></div></div><div class="bac-h"><div class="bac-l">BANKER <b id="bcBT"></b></div><div class="hand" id="bcB"></div></div></div>
      <div class="felt-msg" id="bcMsg">Tap Player, Banker or Tie to bet</div>
      <div class="bac-spots"><button type="button" class="spot bp" data-b="player"><span class="spot-l">PLAYER</span><small>pays 1 to 1</small><span class="spot-c"></span></button><button type="button" class="spot bt" data-b="tie"><span class="spot-l">TIE</span><small>pays 8 to 1</small><span class="spot-c"></span></button><button type="button" class="spot bb" data-b="banker"><span class="spot-l">BANKER</span><small>pays 0.95 to 1</small><span class="spot-c"></span></button></div>
      <div class="road" id="bcRoad"></div></div>`);
  bindRack(25);
  let dealing = false, last = null; const road = [];
  const SB = spotBets(['player', 'banker', 'tie'], { canPlace: () => !dealing, onChange: t => { $('bcTot').textContent = fmt(t); } });
  const B = SB.bets;
  const retOf = r => r.w === 'tie' ? B.tie * 9 + B.player + B.banker : r.w === 'player' ? B.player * 2 : Math.floor(B.banker * 1.95);
  const paintRoad = () => { $('bcRoad').innerHTML = road.slice(-48).map(x => `<i class="rb ${x}">${x === 'player' ? 'P' : x === 'banker' ? 'B' : 'T'}</i>`).join(''); };
  $('bcClr').onclick = () => { if (!dealing) SB.clear(); };
  $('bcRe').onclick = () => { if (!dealing) SB.rebet(last); };
  $('bcGo').onclick = async () => {
    const tot = SB.total(); if (dealing) return; if (!tot) return toast('Tap a betting area first');
    dealing = true; on('bac'); $('bcGo').disabled = true;
    let r = bacDeal(); if (rigged(tot)) { let n = 0; while (retOf(r) >= tot && n++ < 300) r = bacDeal(); }
    $('bcP').innerHTML = ''; $('bcB').innerHTML = ''; $('bcPT').textContent = ''; $('bcBT').textContent = ''; $('bcMsg').textContent = '';
    document.querySelectorAll('.bac-spots .spot').forEach(s => s.classList.remove('win'));
    const seq = [['P', 0], ['B', 0], ['P', 1], ['B', 1]];
    for (const [s, i] of seq) { await dealCard($(s === 'P' ? 'bcP' : 'bcB'), r[s][i]); $(s === 'P' ? 'bcPT' : 'bcBT').textContent = bsum(r[s].slice(0, i + 1)); await sleep(150); }
    if (r.P[2]) { await sleep(350); await dealCard($('bcP'), r.P[2]); $('bcPT').textContent = r.pt; }
    if (r.B[2]) { await sleep(350); await dealCard($('bcB'), r.B[2]); $('bcBT').textContent = r.bt; }
    const ret = retOf(r); record('Baccarat', tot, ret);
    $('bcMsg').textContent = r.w === 'tie' ? `Tie ${r.pt}` : `${r.w === 'player' ? 'Player' : 'Banker'} wins ${Math.max(r.pt, r.bt)} to ${Math.min(r.pt, r.bt)}`;
    document.querySelector(`.bac-spots .spot[data-b="${r.w}"]`).classList.add('win');
    resultFlash(ret, tot); road.push(r.w); paintRoad();
    last = SB.snap(); SB.reset(); dealing = false; off('bac'); $('bcGo').disabled = false;
  };
  SB.paint(); paintRoad();
}

/* ================= THREE CARD POKER ================= */
function eval3(h) {
  const v = h.map(c => RV(c.r)).sort((a, b) => b - a), fl = h.every(c => c.s === h[0].s);
  let st = v[0] - v[1] === 1 && v[1] - v[2] === 1; if (v.join() === '14,3,2') { st = true; v.splice(0, 3, 3, 2, 1); }
  const tr = v[0] === v[2], pr = v[0] === v[1] || v[1] === v[2], cat = st && fl ? 5 : tr ? 4 : st ? 3 : fl ? 2 : pr ? 1 : 0;
  if (cat === 1) { const p = v[1], k = v[0] === v[1] ? v[2] : v[0]; return [1, p, k]; }
  return [cat, ...v];
}
const cmpH = (a, b) => { for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] - b[i]; return 0; };
const qual3 = e => e[0] > 0 || e[1] >= 12;
const NAMES3 = ['High card', 'Pair', 'Flush', 'Straight', 'Three of a kind', 'Straight flush'];
const PP_PAY = [0, 1, 3, 6, 30, 40], ANTE_BONUS = [0, 0, 0, 1, 4, 5];
addGame({
  id: 'threecard', name: 'Three Card Poker', cat: 'tables', tag: 'Ante · Play · Pair Plus',
  rules: '<p>Bet the Ante (and Pair Plus if you want), get three cards, then Play (match your ante) or Fold. Dealer needs queen high to qualify. If the dealer doesn’t qualify, Ante pays 1 to 1 and Play pushes.</p><p>Ante bonus: straight 1 to 1, trips 4 to 1, straight flush 5 to 1. Pair Plus pays on its own: pair 1, flush 3, straight 6, trips 30, straight flush 40.</p>',
  art(ctx, w, h) { artBg(ctx, w, h, '#5a1fa8', '#130430'); canvasCard(ctx, w * .3, h * .4, w * .34, 'Q', '♥', -.3); canvasCard(ctx, w * .5, h * .36, w * .34, 'K', '♥', 0); canvasCard(ctx, w * .7, h * .4, w * .34, 'A', '♥', .3); },
  mount: mountTC,
});
function mountTC() {
  gameShell(gameById('threecard'), `${rackHTML(25)}${betline('tcTot', 'Total bet', '<button class="btn ghost sm" id="tcClr" type="button">Clear</button><button class="btn ghost sm" id="tcRe" type="button">Rebet</button>')}
    <button class="btn play" id="tcDeal" type="button">Deal</button><div class="row2"><button class="btn" id="tcPlay" type="button" disabled>Play</button><button class="btn ghost" id="tcFold" type="button" disabled>Fold</button></div>`,
    `<div class="felt tcp"><div class="bac-l">DEALER <b id="tcDN"></b></div><div class="hand" id="tcD"></div><div class="felt-msg" id="tcMsg">Bet the Ante to start</div><div class="hand" id="tcP"></div><div class="bac-l">YOU <b id="tcPN"></b></div>
      <div class="tc-spots"><button type="button" class="spot" data-b="pp"><span class="spot-l">PAIR PLUS</span><span class="spot-c"></span></button><button type="button" class="spot" data-b="ante"><span class="spot-l">ANTE</span><span class="spot-c"></span></button><div class="spot dead" id="tcPlaySpot"><span class="spot-l">PLAY</span><span class="spot-c" id="tcPlayC"></span></div></div></div>`);
  bindRack(25);
  let R = null, last = null;
  const SB = spotBets(['ante', 'pp'], { canPlace: () => !R, onChange: t => { $('tcTot').textContent = fmt(t + (R && R.played ? R.ante : 0)); } });
  const B = SB.bets;
  $('tcClr').onclick = () => { if (!R) SB.clear(); }; $('tcRe').onclick = () => { if (!R) SB.rebet(last); };
  const btns = () => { $('tcDeal').disabled = !!R; $('tcPlay').disabled = $('tcFold').disabled = !R || R.done; lock(['tcClr', 'tcRe'], !!R); };
  $('tcDeal').onclick = async () => {
    if (R) return; if (!B.ante) return toast('Put chips on the Ante first');
    on('tc'); const rig = rigged(B.ante * 2 + B.pp); let d, P, D, n = 0;
    do { d = freshDeck(); P = d.slice(0, 3); D = d.slice(3, 6); } while (rig && n++ < 600 && !(qual3(eval3(D)) && cmpH(eval3(D), eval3(P)) > 0 && eval3(P)[0] === 0));
    R = { P, D, ante: B.ante, pp: B.pp, played: false, done: true, els: [] }; btns();
    $('tcP').innerHTML = ''; $('tcD').innerHTML = ''; $('tcDN').textContent = ''; $('tcPN').textContent = ''; $('tcPlayC').innerHTML = ''; $('tcMsg').textContent = '';
    for (let i = 0; i < 3; i++) { await dealCard($('tcP'), P[i]); R.els.push(await dealCard($('tcD'), D[i], { down: true, fast: true })); }
    $('tcPN').textContent = NAMES3[eval3(P)[0]]; $('tcMsg').textContent = 'Play or fold?'; R.done = false; btns();
  };
  function finish(played) {
    R.done = true; btns(); const ep = eval3(R.P), ed = eval3(R.D); R.els.forEach((el, i) => flipCard(el, R.D[i])); $('tcDN').textContent = NAMES3[ed[0]];
    let ret = 0, stake = R.ante + R.pp + (played ? R.ante : 0), m;
    if (!played) m = 'Folded';
    else {
      const q = qual3(ed), c = cmpH(ep, ed);
      if (!q) { ret += R.ante * 2 + R.ante; m = 'Dealer doesn’t qualify'; }
      else if (c > 0) { ret += R.ante * 4; m = 'You win'; }
      else if (c === 0) { ret += R.ante * 2; m = 'Push'; }
      else m = 'Dealer wins';
      ret += R.ante * ANTE_BONUS[ep[0]];
    }
    if (R.pp && PP_PAY[ep[0]]) { ret += R.pp * (PP_PAY[ep[0]] + 1); m += ' · Pair Plus hits'; }
    record('Three Card Poker', stake, ret); $('tcMsg').textContent = m; resultFlash(ret, stake);
    last = { ante: R.ante, pp: R.pp }; SB.reset(); $('tcPlayC').innerHTML = ''; R = null; off('tc'); btns();
  }
  $('tcPlay').onclick = () => { if (!R || R.done) return; if (!take(R.ante)) return; R.played = true; $('tcPlayC').innerHTML = chipStack(R.ante); sfx.chip(); finish(true); };
  $('tcFold').onclick = () => { if (R && !R.done) finish(false); };
  SB.paint(); btns();
}

/* ================= LET IT RIDE ================= */
function eval5(h) {
  const v = h.map(c => RV(c.r)).sort((a, b) => b - a), fl = h.every(c => c.s === h[0].s), u = [...new Set(v)];
  const st = u.length === 5 && (v[0] - v[4] === 4 || v.join() === '14,5,4,3,2'), cnt = {}; v.forEach(x => cnt[x] = (cnt[x] || 0) + 1);
  const c = Object.values(cnt).sort((a, b) => b - a);
  if (st && fl) return v[0] === 14 && v[1] === 13 ? ['Royal flush', 1000] : ['Straight flush', 200];
  if (c[0] === 4) return ['Four of a kind', 50]; if (c[0] === 3 && c[1] === 2) return ['Full house', 11];
  if (fl) return ['Flush', 8]; if (st) return ['Straight', 5]; if (c[0] === 3) return ['Three of a kind', 3];
  if (c[0] === 2 && c[1] === 2) return ['Two pair', 2];
  if (c[0] === 2) { const p = +Object.keys(cnt).find(k => cnt[k] === 2); return p >= 10 ? ['Tens or better', 1] : ['Small pair', 0]; }
  return ['High card', 0];
}
addGame({
  id: 'letitride', name: 'Let It Ride', cat: 'tables', tag: 'Tens or better pays',
  rules: '<p>Place three equal bets and get three cards. Two community cards are dealt face down. Before each one is turned, pull back a bet or let it ride. Your final five-card hand pays on every bet still up.</p><p>Tens or better 1:1, two pair 2:1, trips 3:1, straight 5:1, flush 8:1, full house 11:1, quads 50:1, straight flush 200:1, royal 1000:1.</p>',
  art(ctx, w, h) { artBg(ctx, w, h, '#a8145f', '#2a0418'); ['10', 'J', 'Q', 'K', 'A'].forEach((r, i) => canvasCard(ctx, w * (.24 + i * .13), h * (.4 - Math.abs(i - 2) * -.015), w * .3, r, '♠', (i - 2) * .16)); },
  mount: mountLIR,
});
function mountLIR() {
  gameShell(gameById('letitride'), `${amountField('lrBet', 10, 'Each bet (×3)')}<button class="btn play" id="lrDeal" type="button">Deal</button><div class="row2"><button class="btn" id="lrRide" type="button" disabled>Let it ride</button><button class="btn ghost" id="lrPull" type="button" disabled>Pull back</button></div>`,
    `<div class="felt lir"><div class="bac-l">COMMUNITY</div><div class="hand" id="lrB"></div><div class="felt-msg" id="lrMsg">Set your bet and deal</div><div class="hand" id="lrP"></div><div class="bac-l">YOU <b id="lrN"></b></div>
      <div class="tc-spots" id="lrSpots"><div class="spot dead"><span class="spot-l">1</span><span class="spot-c"></span></div><div class="spot dead"><span class="spot-l">2</span><span class="spot-c"></span></div><div class="spot dead"><span class="spot-l">$</span><span class="spot-c"></span></div></div>
      <div class="paygrid"><span>Pair 10s+ 1:1</span><span>Two pair 2:1</span><span>Trips 3:1</span><span>Straight 5:1</span><span>Flush 8:1</span><span>Full house 11:1</span><span>Quads 50:1</span><span>Str. flush 200:1</span><span>Royal 1000:1</span></div></div>`);
  let R = null;
  const spotsPaint = () => [...$('lrSpots').children].forEach((s, i) => { s.querySelector('.spot-c').innerHTML = R && R.up[i] ? chipStack(R.s) : ''; });
  const btns = () => { $('lrDeal').disabled = !!R; $('lrRide').disabled = $('lrPull').disabled = !R || R.busy; lock(['lrBet'], !!R); };
  $('lrDeal').onclick = async () => {
    const s = bv('lrBet'); if (R) return; if (!take(s * 3)) return;
    on('lir'); const rig = rigged(s * 3); let d; do { d = freshDeck(); } while (rig && eval5(d.slice(0, 5))[1] > 0);
    R = { s, P: d.slice(0, 3), B: d.slice(3, 5), up: [1, 1, 1], step: 0, busy: true, els: [] }; btns(); spotsPaint();
    $('lrP').innerHTML = ''; $('lrB').innerHTML = ''; $('lrN').textContent = ''; $('lrMsg').textContent = '';
    for (const c of R.P) await dealCard($('lrP'), c);
    for (const c of R.B) R.els.push(await dealCard($('lrB'), c, { down: true }));
    $('lrMsg').textContent = 'Pull back bet 1 or let it ride?'; R.busy = false; btns();
  };
  async function step(pull) {
    if (!R || R.busy) return; R.busy = true; btns();
    if (pull) { R.up[R.step] = 0; release(R.s); spotsPaint(); sfx.chip(); }
    flipCard(R.els[R.step], R.B[R.step]); R.step++; await sleep(350);
    if (R.step < 2) { $('lrMsg').textContent = 'Pull back bet 2 or let it ride?'; R.busy = false; btns(); return; }
    const [name, m] = eval5([...R.P, ...R.B]), stake = R.up.filter(Boolean).length * R.s, ret = m > 0 ? stake * (m + 1) : 0;
    $('lrN').textContent = name; $('lrMsg').textContent = m ? name + ' pays ' + m + ' to 1' : name + ' · no pay';
    record('Let It Ride', stake, ret); resultFlash(ret, stake); R = null; off('lir'); btns(); spotsPaint();
  }
  $('lrRide').onclick = () => step(false); $('lrPull').onclick = () => step(true);
  btns();
}

/* ================= CASINO WAR ================= */
addGame({
  id: 'war', name: 'Casino War', cat: 'tables', tag: 'High card wins',
  rules: '<p>You and the dealer each get one card. Higher card wins 1 to 1 (aces high). On a tie, go to war by matching your bet, or surrender half. Win the war and you’re paid on your original bet while the raise pushes.</p>',
  art(ctx, w, h) { artBg(ctx, w, h, '#7a3a0f', '#200e03'); canvasCard(ctx, w * .32, h * .38, w * .38, 'J', '♣', -.2); canvasCard(ctx, w * .68, h * .38, w * .38, 'Q', '♦', .2); bigText(ctx, 'VS', w / 2, h * .42, h * .1, '#ffc21a'); },
  mount: mountWar,
});
function mountWar() {
  gameShell(gameById('war'), `${amountField('wrBet', 25)}<button class="btn play" id="wrDeal" type="button">Deal</button><div class="row2"><button class="btn" id="wrGo" type="button" disabled>Go to war</button><button class="btn ghost" id="wrSur" type="button" disabled>Surrender</button></div>`,
    `<div class="felt war"><div class="war-row"><div><div class="bac-l">DEALER</div><div class="hand" id="wrD"></div></div><div class="war-vs">VS</div><div><div class="bac-l">YOU</div><div class="hand" id="wrP"></div></div></div><div class="felt-msg" id="wrMsg">Set your bet and deal</div></div>`);
  let R = null;
  const btns = () => { $('wrDeal').disabled = !!R; $('wrGo').disabled = $('wrSur').disabled = !R || !R.tie; lock(['wrBet'], !!R); };
  const done = (stake, ret, m) => { record('Casino War', stake, ret); $('wrMsg').textContent = m; resultFlash(ret, stake); R = null; off('war'); btns(); };
  $('wrDeal').onclick = async () => {
    const s = bv('wrBet'); if (R || !take(s)) return; on('war');
    const rig = rigged(s); let p, d; do { p = mk(); d = mk(); } while (rig && RV(p.r) >= RV(d.r));
    R = { s, rig, tie: false }; btns(); $('wrP').innerHTML = ''; $('wrD').innerHTML = ''; $('wrMsg').textContent = '';
    await dealCard($('wrD'), d); await dealCard($('wrP'), p);
    if (RV(p.r) > RV(d.r)) return done(s, s * 2, 'You win');
    if (RV(p.r) < RV(d.r)) return done(s, 0, 'Dealer wins');
    R.tie = true; $('wrMsg').textContent = 'Tie · go to war or surrender?'; btns();
  };
  $('wrSur').onclick = () => { if (R && R.tie) done(R.s, Math.floor(R.s / 2), 'Surrendered half'); };
  $('wrGo').onclick = async () => {
    if (!R || !R.tie || !take(R.s)) return; R.tie = false; btns();
    let p, d; do { p = mk(); d = mk(); } while (R.rig && RV(p.r) >= RV(d.r));
    for (let i = 0; i < 3; i++) { await dealCard($('wrD'), mk(), { down: true, fast: true }); await dealCard($('wrP'), mk(), { down: true, fast: true }); }
    await dealCard($('wrD'), d); await dealCard($('wrP'), p);
    RV(p.r) >= RV(d.r) ? done(R.s * 2, R.s * 3, 'You won the war') : done(R.s * 2, 0, 'Lost the war');
  };
  btns();
}
