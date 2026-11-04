/* ===== Bando Originals ===== */
const gameById = id => GAMES.find(g => g.id === id);
const GEM_SVG = '<svg viewBox="0 0 64 64" aria-hidden="true"><polygon points="20,10 44,10 58,26 32,56 6,26" fill="#2fe07f" stroke="#d9ffe9" stroke-width="2"/><polygon points="20,10 26,26 6,26" fill="#b9ffd6" opacity=".75"/><polygon points="44,10 38,26 58,26" fill="#0b8a47" opacity=".7"/><polygon points="26,26 38,26 32,56" fill="#7cf7b0" opacity=".6"/><polygon points="20,10 44,10 38,26 26,26" fill="#e9fff2" opacity=".55"/></svg>';
const BOMB_SVG = '<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="30" cy="37" r="19" fill="#22182f" stroke="#ff5c73" stroke-width="3"/><circle cx="23" cy="30" r="6" fill="#fff" opacity=".22"/><rect x="33" y="13" width="11" height="9" rx="2" transform="rotate(38 38 17)" fill="#6b5a86"/><path d="M42 13 q6 -8 12 -4" stroke="#ffc21a" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="55" cy="8" r="4.5" fill="#ffc21a"/><circle cx="55" cy="8" r="2" fill="#fff"/></svg>';
const multTxt = m => m >= 100 ? Math.round(m) + '×' : (+m.toFixed(2)) + '×';

/* ================= CRASH ================= */
addGame({
  id: 'crash', name: 'Crash', cat: 'originals', tag: 'Bando Original · 3% edge',
  rules: '<p>Place a bet and the multiplier starts climbing. Cash out any time before it crashes to win your bet times the multiplier. If it crashes first, you lose your bet.</p><p>Set an auto cash out to bail at a target automatically. Max 1,000×.</p>',
  art(ctx, w, h) {
    artBg(ctx, w, h, '#4a14a8', '#0f0428');
    const pts = []; for (let i = 0; i <= 40; i++) { const u = i / 40; pts.push([w * .1 + u * w * .76, h * .7 - Math.pow(u, 2.3) * h * .46]); }
    const g = ctx.createLinearGradient(0, h * .2, 0, h * .7); g.addColorStop(0, 'rgba(255,194,26,.5)'); g.addColorStop(1, 'rgba(255,194,26,0)');
    ctx.beginPath(); ctx.moveTo(pts[0][0], h * .7); pts.forEach(p => ctx.lineTo(p[0], p[1])); ctx.lineTo(pts[40][0], h * .7); ctx.fillStyle = g; ctx.fill();
    ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.strokeStyle = '#ffc21a'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.stroke();
    ctx.shadowColor = '#ffc21a'; ctx.shadowBlur = 20; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(pts[40][0], pts[40][1], 6, 0, 7); ctx.fill(); ctx.shadowBlur = 0;
    bigText(ctx, '2.47×', w / 2, h * .34, h * .15);
  },
  mount: mountCrash,
});
function mountCrash() {
  gameShell(gameById('crash'), `${amountField('cBet', 10)}${numField('cAuto', 'Auto cash out (0 = off)', '2.00', 'min="0" step="0.01"', '×')}
    <button class="btn play" id="cGo" type="button">Bet</button>
    <div class="kv"><span>Profit at auto cash out</span><b class="num" id="cProfit">0</b></div>`,
    `<div class="crash"><div class="pills" id="cHist"></div><div class="cwrap"><canvas id="cCv"></canvas><div class="cmult num" id="cMult">1.00×</div><div class="cstat" id="cStat">Place a bet to launch</div></div></div>`);
  const K = .00012, genCrash = () => Math.min(1000, Math.max(1, Math.floor(EDGE / (1 - Math.random()) * 100) / 100));
  const hist = Array.from({ length: 14 }, genCrash), cv = $('cCv');
  let ctx, W, H, raf = 0, S = { phase: 'idle' };
  const paintHist = () => { $('cHist').innerHTML = pillsHTML(hist.slice(0, 14)); };
  const profit = () => { const a = +$('cAuto').value; $('cProfit').textContent = a > 1 ? fmt(Math.max(0, bv('cBet') || 0) * (a - 1)) : '—'; };
  $('cBet').oninput = profit; $('cAuto').oninput = profit; profit(); paintHist();
  function size() { W = cv.parentElement.clientWidth; H = clamp(Math.round(W * .55), 240, 420); ctx = fitCanvas(cv, W, H); draw(); }
  function draw() {
    if (!ctx) return;
    const t = S.phase === 'idle' ? 0 : S.t, m = S.phase === 'idle' ? 1 : S.m;
    ctx.clearRect(0, 0, W, H);
    const L = 48, B = 26, T = 18, Rr = 18, xMax = Math.max(8000, t * 1.15), yMax = Math.max(2, m * 1.25);
    const X = tt => L + tt / xMax * (W - L - Rr), Y = mm => H - B - (mm - 1) / (yMax - 1) * (H - B - T);
    const st = [.2, .5, 1, 2, 5, 10, 20, 50, 100, 200, 500].find(s => (yMax - 1) / s <= 5) || 500;
    ctx.font = '600 11px "JetBrains Mono",monospace'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.lineWidth = 1;
    for (let v = 1; v <= yMax + 1e-9; v += st) { const y = Y(v); ctx.strokeStyle = 'rgba(255,255,255,.07)'; ctx.beginPath(); ctx.moveTo(L, y); ctx.lineTo(W - Rr, y); ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.fillText((v < 10 ? v.toFixed(1) : Math.round(v)) + '×', L - 6, y); }
    const ts = [2000, 5000, 10000, 20000].find(s => xMax / s <= 6) || 20000;
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    for (let tt = 0; tt <= xMax; tt += ts) ctx.fillText(Math.round(tt / 1000) + 's', X(tt), H - B + 8);
    if (S.phase === 'idle') return;
    const col = S.phase === 'crashed' && !S.cashed ? '#ff5c73' : S.cashed ? '#3ddc84' : '#ffc21a';
    const N = 90, pts = []; for (let i = 0; i <= N; i++) { const tt = t * i / N; pts.push([X(tt), Y(Math.min(m, Math.exp(K * tt)))]); }
    const gr = ctx.createLinearGradient(0, T, 0, H - B); gr.addColorStop(0, col + '66'); gr.addColorStop(1, col + '00');
    ctx.beginPath(); ctx.moveTo(pts[0][0], H - B); pts.forEach(p => ctx.lineTo(p[0], p[1])); ctx.lineTo(pts[N][0], H - B); ctx.closePath(); ctx.fillStyle = gr; ctx.fill();
    ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.strokeStyle = col; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
    const [ex, ey] = pts[N];
    if (S.phase === 'crashed') {
      for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; ctx.strokeStyle = 'rgba(255,92,115,.8)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(ex + Math.cos(a) * 8, ey + Math.sin(a) * 8); ctx.lineTo(ex + Math.cos(a) * 20, ey + Math.sin(a) * 20); ctx.stroke(); }
    }
    ctx.shadowColor = col; ctx.shadowBlur = 22; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex, ey, 7, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
    if (S.cashed) { const cx = X(Math.log(S.cashed) / K), cy = Y(S.cashed); ctx.fillStyle = '#3ddc84'; ctx.beginPath(); ctx.arc(cx, cy, 5, 0, 7); ctx.fill(); ctx.font = '800 12px Nunito,sans-serif'; ctx.textAlign = 'left'; ctx.fillText('cashed ' + S.cashed.toFixed(2) + '×', cx + 8, cy - 16); }
  }
  function btn() {
    const b = $('cGo');
    if (S.phase === 'run' && !S.cashed) { b.textContent = 'Cash out'; b.className = 'btn play cash'; b.disabled = false; }
    else if (S.phase === 'run') { b.textContent = 'Cashed out'; b.disabled = true; }
    else { b.textContent = 'Bet'; b.className = 'btn play'; b.disabled = false; lock(['cBet', 'cAuto'], false); }
  }
  function tick() {
    if (S.phase !== 'run') return;
    S.t = performance.now() - S.t0; S.m = Math.exp(K * S.t);
    if (S.auto > 1 && !S.cashed && S.m >= S.auto) cashOut(S.auto);
    if (S.m >= S.crash) { S.m = S.crash; S.t = Math.log(S.crash) / K; return crashNow(); }
    $('cMult').textContent = S.m.toFixed(2) + '×';
    draw(); raf = requestAnimationFrame(tick);
  }
  function crashNow() {
    S.phase = 'crashed'; draw();
    $('cMult').textContent = S.crash.toFixed(2) + '×'; $('cMult').className = 'cmult num ' + (S.cashed ? 'won' : 'bust');
    $('cStat').textContent = 'Crashed at ' + S.crash.toFixed(2) + '×' + (S.cashed ? ' · you cashed out at ' + S.cashed.toFixed(2) + '×' : '');
    if (!S.cashed) { record('Crash', S.stake, 0); sfx.boom(); off('crash'); }
    hist.unshift(S.crash); paintHist(); btn();
  }
  function cashOut(mx) {
    if (S.phase !== 'run' || S.cashed) return;
    S.cashed = Math.floor(mx * 100) / 100; const ret = Math.floor(S.stake * S.cashed);
    record('Crash', S.stake, ret); resultFlash(ret, S.stake); off('crash');
    $('cStat').textContent = 'Cashed out at ' + S.cashed.toFixed(2) + '× · +' + fmt(ret - S.stake); btn();
  }
  function start() {
    const s = bv('cBet'), auto = +$('cAuto').value || 0;
    if (auto && auto < 1.01) return toast('Auto cash out has to be at least 1.01×');
    if (!take(s)) return;
    on('crash'); sfx.click();
    let c = genCrash();
    if (rigged(s)) c = auto > 1.01 ? Math.max(1, Math.floor((1 + Math.random() * (auto - 1) * .9) * 100) / 100) : (Math.random() < .4 ? 1 : Math.floor((1 + Math.random() * .35) * 100) / 100);
    S = { phase: 'run', t0: performance.now(), t: 0, m: 1, crash: c, stake: s, auto, cashed: 0 };
    lock(['cBet', 'cAuto'], true); $('cMult').className = 'cmult num'; $('cStat').textContent = 'Climbing…'; btn();
    if (c <= 1) { draw(); setTimeout(crashNow, 300); return; }
    raf = requestAnimationFrame(tick);
  }
  $('cGo').onclick = () => S.phase === 'run' ? cashOut(S.m) : start();
  size(); window.addEventListener('resize', size);
  onLeave(() => { cancelAnimationFrame(raf); window.removeEventListener('resize', size); });
}

/* ================= PLINKO ================= */
const PLINKO_BASE = {
  8: { low: [5.6, 2.1, 1.1, 1, .5, 1, 1.1, 2.1, 5.6], med: [13, 3, 1.3, .7, .4, .7, 1.3, 3, 13], high: [29, 4, 1.5, .3, .2, .3, 1.5, 4, 29] },
  12: { low: [10, 3, 1.6, 1.4, 1.1, 1, .5, 1, 1.1, 1.4, 1.6, 3, 10], med: [33, 11, 4, 2, 1.1, .6, .3, .6, 1.1, 2, 4, 11, 33], high: [170, 24, 8.1, 2, .7, .2, .2, .2, .7, 2, 8.1, 24, 170] },
  16: { low: [16, 9, 2, 1.4, 1.4, 1.2, 1.1, 1, .5, 1, 1.1, 1.2, 1.4, 1.4, 2, 9, 16], med: [110, 41, 10, 5, 3, 1.5, 1, .5, .3, .5, 1, 1.5, 3, 5, 10, 41, 110], high: [1000, 130, 26, 9, 4, 2, .2, .2, .2, .2, .2, 2, 4, 9, 26, 130, 1000] },
};
const PLINKO = {};
for (const n in PLINKO_BASE) { PLINKO[n] = {}; for (const r in PLINKO_BASE[n]) PLINKO[n][r] = scaleTo(PLINKO_BASE[n][r], binom(+n), .96); }
addGame({
  id: 'plinko', name: 'Plinko', cat: 'originals', tag: 'Bando Original · 4% edge',
  rules: '<p>Drop a ball through the pegs. It bounces left or right on every row and lands in a slot. You win your bet times that slot’s multiplier.</p><p>Higher risk means bigger edges and smaller middles. More rows means more spread. You can drop several balls at once.</p>',
  art(ctx, w, h) {
    artBg(ctx, w, h, '#a8145f', '#2a0418');
    const n = 7, s = w / 10;
    for (let r = 0; r < n; r++) for (let i = 0; i < r + 3; i++) { ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.beginPath(); ctx.arc(w / 2 + (i - (r + 2) / 2) * s, h * .14 + r * s, 2.6, 0, 7); ctx.fill(); }
    for (let k = 0; k <= n; k++) { const d = Math.abs(k - n / 2) / (n / 2); ctx.fillStyle = `hsl(${45 - 55 * d},95%,55%)`; rr(ctx, w / 2 + (k - n / 2) * s - s * .44, h * .14 + n * s, s * .88, s * .7, 4); ctx.fill(); }
    ctx.shadowColor = '#ff4fa3'; ctx.shadowBlur = 16; ctx.fillStyle = '#ffd2ea'; ctx.beginPath(); ctx.arc(w / 2 + s * .5, h * .14 + 3.4 * s, s * .3, 0, 7); ctx.fill(); ctx.shadowBlur = 0;
  },
  mount: mountPlinko,
});
function mountPlinko() {
  gameShell(gameById('plinko'), `${amountField('pBet', 10)}${segField('pRisk', 'Risk', [['low', 'Low'], ['med', 'Medium'], ['high', 'High']], 'med')}${segField('pRows', 'Rows', [[8, '8'], [12, '12'], [16, '16']], 16)}
    <button class="btn play" id="pGo" type="button">Drop ball</button>${autoField()}`,
    `<div class="plinko"><div class="pwrap"><canvas id="pCv"></canvas></div><div class="pills vert" id="pHist"></div></div>`);
  let risk = 'med', rows = 16, balls = [], hits = [], slotHit = {}, ctx, W, H, raf = 0, nid = 0; const last = [];
  const cv = $('pCv'), STEP = 125;
  segBind('pRisk', v => { risk = v; }); segBind('pRows', v => { rows = +v; });
  const geo = () => { const s = Math.min((W - 24) / (rows + 2), (H - 64) / (rows + 1.5)); return { s, top: 24 }; };
  const pegX = (g, r, i) => W / 2 + (i - (r + 2) / 2) * g.s, pegY = (g, r) => g.top + r * g.s;
  function size() { W = cv.parentElement.clientWidth; H = clamp(Math.round(W * .82), 300, 560); ctx = fitCanvas(cv, W, H); }
  function ballPos(b, el, g) {
    const n = b.rows, st = Math.min(n, Math.floor(el / STEP)), u = Math.min(1, (el - st * STEP) / STEP);
    const R = k => b.path.slice(0, k).reduce((a, x) => a + x, 0);
    const xAt = r => W / 2 + (R(r) - r / 2) * g.s, yAt = r => r >= n ? pegY(g, n) + g.s * .2 : pegY(g, r) - g.s * .34;
    if (st >= n) return [xAt(n), yAt(n)];
    const x0 = xAt(st), x1 = xAt(st + 1), y0 = yAt(st), y1 = yAt(st + 1), su = u * u * (3 - 2 * u);
    return [x0 + (x1 - x0) * su, y0 + (y1 - y0) * u * u - g.s * .32 * Math.sin(Math.PI * u) * (1 - u * .5)];
  }
  function frame(now) {
    const g = geo(); ctx.clearRect(0, 0, W, H);
    const pr = Math.max(2.2, g.s * .1);
    for (let r = 0; r < rows; r++) for (let i = 0; i < r + 3; i++) {
      const hit = hits.find(h => h.r === r && h.i === i && now - h.t < 180);
      ctx.fillStyle = hit ? '#ffc21a' : 'rgba(255,255,255,.88)';
      if (hit) { ctx.shadowColor = '#ffc21a'; ctx.shadowBlur = 12; }
      ctx.beginPath(); ctx.arc(pegX(g, r, i), pegY(g, r), hit ? pr * 1.4 : pr, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
    }
    hits = hits.filter(h => now - h.t < 200);
    const mults = PLINKO[rows][risk], sy = pegY(g, rows) - g.s * .1, sh = Math.max(20, g.s * .78);
    for (let k = 0; k <= rows; k++) {
      const d = Math.abs(k - rows / 2) / (rows / 2), bump = slotHit[k] && now - slotHit[k] < 220 ? Math.sin((now - slotHit[k]) / 220 * Math.PI) * 6 : 0;
      const x = W / 2 + (k - rows / 2) * g.s - g.s * .45;
      ctx.fillStyle = `hsl(${45 - 58 * d},95%,${52 - 6 * d}%)`; rr(ctx, x, sy + bump, g.s * .9, sh, 5); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(x + 2, sy + bump + sh - 4, g.s * .9 - 4, 3);
      ctx.fillStyle = '#1b0b00'; ctx.font = `800 ${Math.max(8, Math.min(13, g.s * .3))}px Nunito,sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const m = mults[k]; ctx.fillText(m >= 100 ? Math.round(m) : m >= 10 ? +m.toFixed(1) : +m.toFixed(2), x + g.s * .45, sy + bump + sh / 2);
    }
    for (const b of balls) {
      const el = now - b.t0, row = Math.min(b.rows, Math.floor(el / STEP));
      while (b.row < row && b.row < b.rows) { const R = b.path.slice(0, b.row).reduce((a, x) => a + x, 0); hits.push({ r: b.row, i: R + 1, t: now }); b.row++; if (b.row % 2) sfx.tick(); }
      const [x, y] = ballPos(b, el, g);
      const gr = ctx.createRadialGradient(x - 2, y - 2, 1, x, y, g.s * .26); gr.addColorStop(0, '#fff'); gr.addColorStop(1, '#ff4fa3');
      ctx.fillStyle = gr; ctx.shadowColor = '#ff4fa3'; ctx.shadowBlur = 10; ctx.beginPath(); ctx.arc(x, y, Math.max(4, g.s * .24), 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
      if (el >= b.rows * STEP + 60 && !b.done) finish(b, now);
    }
    balls = balls.filter(b => !b.done);
    raf = requestAnimationFrame(frame);
  }
  function finish(b, now) {
    b.done = true; const m = PLINKO[b.rows][b.risk][b.k], ret = Math.floor(b.s * m);
    record('Plinko', b.s, ret); off(b.key); slotHit[b.k] = now;
    m >= 1 ? (m >= 10 ? sfx.big() : sfx.pop()) : sfx.lose();
    last.unshift(m); $('pHist').innerHTML = last.slice(0, 8).map(x => `<span class="pill ${x >= 10 ? 'p' : x >= 2 ? 'g' : x >= 1 ? 'y' : 'r'}">${multTxt(x)}</span>`).join('');
    if (!balls.some(x => !x.done)) lock(['pRisk', 'pRows'], false);
  }
  async function drop() {
    const s = bv('pBet'); if (!take(s)) return false;
    const key = 'pl' + (++nid); on(key); lock(['pRisk', 'pRows'], true);
    const mults = PLINKO[rows][risk], probs = binom(rows); let k;
    if (rigged(s)) {
      const bad = mults.map((m, i) => m < 1 ? i : -1).filter(i => i >= 0), tot = bad.reduce((a, i) => a + probs[i], 0);
      let r = Math.random() * tot; k = bad.find(i => (r -= probs[i]) < 0) ?? bad[0];
    } else k = Array.from({ length: rows }, () => rand(2)).reduce((a, x) => a + x, 0);
    const path = shuffle(Array.from({ length: rows }, (_, i) => i < k ? 1 : 0));
    balls.push({ path, k, t0: performance.now(), s, key, rows, risk, row: 0, done: false }); sfx.click();
    return true;
  }
  $('pGo').onclick = drop; bindAuto(drop, 350);
  size(); raf = requestAnimationFrame(frame); window.addEventListener('resize', size);
  onLeave(() => { cancelAnimationFrame(raf); window.removeEventListener('resize', size); });
}

/* ================= MINES ================= */
addGame({
  id: 'mines', name: 'Mines', cat: 'originals', tag: 'Bando Original · 3% edge',
  rules: '<p>Pick how many mines hide in the 5×5 grid, then flip tiles. Every gem raises your multiplier. Hit a mine and you lose the bet. Cash out whenever you want.</p>',
  art(ctx, w, h) {
    artBg(ctx, w, h, '#0e6b52', '#03201a'); const s = w * .2, x0 = w / 2 - s * 1.5 - 6, y0 = h * .14;
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
      const x = x0 + c * (s + 6), y = y0 + r * (s + 6); rr(ctx, x, y, s, s, 8); ctx.fillStyle = (r + c) % 4 === 1 ? '#22182f' : '#2c4a5e'; ctx.fill();
      if ((r * 3 + c) % 3 === 0) { ctx.fillStyle = '#2fe07f'; ctx.beginPath(); ctx.moveTo(x + s * .3, y + s * .22); ctx.lineTo(x + s * .7, y + s * .22); ctx.lineTo(x + s * .88, y + s * .42); ctx.lineTo(x + s * .5, y + s * .84); ctx.lineTo(x + s * .12, y + s * .42); ctx.closePath(); ctx.fill(); }
      if (r === 1 && c === 1) { ctx.fillStyle = '#ff5c73'; ctx.beginPath(); ctx.arc(x + s / 2, y + s * .55, s * .26, 0, 7); ctx.fill(); }
    }
  },
  mount: mountMines,
});
function mountMines() {
  gameShell(gameById('mines'), `${amountField('mBet', 10)}${selectField('mCount', 'Mines', Array.from({ length: 24 }, (_, i) => [i + 1, i + 1]), 3)}
    <button class="btn play" id="mGo" type="button">Bet</button><button class="btn ghost" id="mRand" type="button" disabled>Pick random tile</button>
    <div class="kv"><span>Current</span><b class="num" id="mCur">1.00×</b></div><div class="kv"><span>Next tile</span><b class="num" id="mNext">—</b></div><div class="kv"><span>Profit if you cash out</span><b class="num" id="mProf">0</b></div>`,
    `<div class="mines"><div class="mgrid" id="mGrid">${Array.from({ length: 25 }, (_, i) => `<button class="mt" type="button" data-i="${i}" disabled aria-label="Tile ${i + 1}"></button>`).join('')}</div></div>`);
  let R = null;
  const mult = (k, m) => { let x = EDGE; for (let i = 0; i < k; i++) x *= (25 - i) / (25 - m - i); return x; };
  const tiles = () => [...$('mGrid').children];
  function stats() {
    if (!R) { $('mCur').textContent = '1.00×'; $('mNext').textContent = mult(1, +$('mCount').value).toFixed(2) + '×'; $('mProf').textContent = '0'; return; }
    const k = R.picks.length, cur = k ? mult(k, R.m) : 1;
    $('mCur').textContent = cur.toFixed(2) + '×'; $('mNext').textContent = k < 25 - R.m ? mult(k + 1, R.m).toFixed(2) + '×' : '—';
    $('mProf').textContent = k ? fmt(Math.floor(R.s * cur) - R.s) : '0';
    $('mGo').textContent = k ? 'Cash out ' + fmt(Math.floor(R.s * cur)) : 'Cash out'; $('mGo').disabled = !k;
  }
  $('mCount').onchange = stats; stats();
  function revealRest(bombAt) {
    const free = tiles().map((_, i) => i).filter(i => !R.picks.includes(i) && i !== bombAt);
    const need = R.m - (bombAt >= 0 ? 1 : 0), mines = new Set(shuffle(free).slice(0, need)); if (bombAt >= 0) mines.add(bombAt);
    tiles().forEach((t, i) => { t.disabled = true; if (R.picks.includes(i)) return; t.classList.add(mines.has(i) ? 'bomb' : 'gem', 'open'); if (i !== bombAt) t.classList.add('dim'); t.innerHTML = mines.has(i) ? BOMB_SVG : GEM_SVG; });
  }
  function end() { R = null; off('mines'); $('mGo').textContent = 'Bet'; $('mGo').disabled = false; $('mGo').classList.remove('cash'); $('mRand').disabled = true; lock(['mBet', 'mCount'], false); stats(); }
  function start() {
    const s = bv('mBet'), m = +$('mCount').value; if (!take(s)) return;
    on('mines'); sfx.click(); R = { s, m, picks: [], rig: rigged(s), rigAt: rand(2) };
    tiles().forEach(t => { t.className = 'mt'; t.innerHTML = ''; t.disabled = false; });
    lock(['mBet', 'mCount'], true); $('mGo').classList.add('cash'); $('mRand').disabled = false; stats();
  }
  function pick(i) {
    if (!R || R.picks.includes(i)) return;
    const left = 25 - R.picks.length;
    const boom = R.rig && R.picks.length >= R.rigAt ? true : Math.random() < R.m / left;
    const t = tiles()[i];
    if (boom) {
      t.classList.add('bomb', 'open'); t.innerHTML = BOMB_SVG; sfx.boom(); revealRest(i);
      record('Mines', R.s, 0); flash('<b>Boom</b>', 'lose'); end(); return;
    }
    R.picks.push(i); t.classList.add('gem', 'open'); t.innerHTML = GEM_SVG; t.disabled = true; tone(600 + R.picks.length * 60, .08, 'triangle', .05);
    stats(); if (R.picks.length === 25 - R.m) cashOut();
  }
  function cashOut() {
    if (!R || !R.picks.length) return;
    const ret = Math.floor(R.s * mult(R.picks.length, R.m)); revealRest(-1); record('Mines', R.s, ret); resultFlash(ret, R.s); end();
  }
  $('mGrid').onclick = e => { const t = e.target.closest('.mt'); if (t && !t.disabled) pick(+t.dataset.i); };
  $('mGo').onclick = () => R ? cashOut() : start();
  $('mRand').onclick = () => { if (!R) return; const free = tiles().map((_, i) => i).filter(i => !R.picks.includes(i)); pick(pickOne(free)); };
}

/* ================= DICE ================= */
addGame({
  id: 'dice', name: 'Dice', cat: 'originals', tag: 'Bando Original · 3% edge',
  rules: '<p>Pick a target and choose to roll over or under it. The lower your win chance, the bigger the payout. A number from 0 to 100 is rolled.</p>',
  art(ctx, w, h) { artBg(ctx, w, h, '#1450a8', '#04122e'); canvasDie(ctx, w * .38, h * .34, w * .36, 5, -.25); canvasDie(ctx, w * .64, h * .48, w * .36, 3, .3, '#ffc21a', '#3a2600'); },
  mount: mountDice,
});
function mountDice() {
  gameShell(gameById('dice'), `${amountField('dBet', 10)}<div class="kv"><span>Profit on win</span><b class="num" id="dProf">0</b></div><button class="btn play" id="dGo" type="button">Roll</button>${autoField()}`,
    `<div class="dice"><div class="pills" id="dHist"></div><div class="dres num" id="dRes">50.00</div>
     <div class="dslider"><div class="dtrack" id="dTrack"><div class="dmark" id="dMark"><span id="dMarkV">50.00</span></div></div><input type="range" id="dRange" min="5" max="98" step="0.01" value="50.5" aria-label="Target"><div class="dticks"><span>0</span><span>25</span><span>50</span><span>75</span><span>100</span></div></div>
     <div class="drow">${numField('dMul', 'Multiplier', '2', 'step="0.0001"', '×')}<div class="field"><label>Roll <span id="dModeL">over</span></label><button class="btn ghost mode" id="dMode" type="button"></button></div>${numField('dCh', 'Win chance', '49.5', 'step="0.01"', '%')}</div></div>`);
  let mode = 'over', T = 50.5; const hist = [];
  const chance = () => mode === 'over' ? 100 - T : T, mul = () => 97 / chance();
  function paint(skip) {
    $('dRange').min = mode === 'over' ? 5 : 2; $('dRange').max = mode === 'over' ? 98 : 95; $('dRange').value = T;
    const g = '#3ddc84', r = '#ff5c73';
    $('dTrack').style.background = mode === 'over' ? `linear-gradient(90deg,${r} ${T}%,${g} ${T}%)` : `linear-gradient(90deg,${g} ${T}%,${r} ${T}%)`;
    $('dModeL').textContent = mode; $('dMode').textContent = T.toFixed(2) + '  ⇄';
    if (skip !== 'mul') $('dMul').value = mul().toFixed(4); if (skip !== 'ch') $('dCh').value = chance().toFixed(2);
    $('dProf').textContent = fmt(Math.floor((bv('dBet') || 0) * mul()) - (bv('dBet') || 0));
  }
  const setChance = c => { c = clamp(c, 2, 95); T = mode === 'over' ? 100 - c : c; };
  $('dRange').oninput = () => { T = +$('dRange').value; paint(); };
  $('dMul').onchange = () => { setChance(97 / clamp(+$('dMul').value || 2, 1.0211, 48.5)); paint(); };
  $('dCh').onchange = () => { setChance(+$('dCh').value || 49.5); paint(); };
  $('dMode').onclick = () => { if (busy) return; mode = mode === 'over' ? 'under' : 'over'; T = 100 - T; paint(); sfx.click(); };
  $('dBet').oninput = () => paint();
  paint();
  async function roll() {
    const s = bv('dBet'); if (!take(s)) return false;
    on('dice'); $('dGo').disabled = true;
    const win = r => mode === 'over' ? r > T : r < T; let r = rand(10001) / 100;
    if (rigged(s)) { let n = 0; while (win(r) && n++ < 200) r = rand(10001) / 100; }
    const m = Math.floor(mul() * 10000) / 10000, ok = win(r);
    $('dMark').style.left = r + '%'; $('dMarkV').textContent = r.toFixed(2); $('dMark').className = 'dmark show ' + (ok ? 'w' : 'l');
    tone(ok ? 880 : 220, .08, 'triangle', .05);
    const from = +$('dRes').textContent || 50, t0 = performance.now();
    await new Promise(res => { const st = () => { const u = Math.min(1, (performance.now() - t0) / 260); $('dRes').textContent = (from + (r - from) * ease.out3(u)).toFixed(2); u < 1 ? requestAnimationFrame(st) : res(); }; st(); });
    $('dRes').className = 'dres num ' + (ok ? 'w' : 'l');
    const ret = ok ? Math.floor(s * m) : 0; record('Dice', s, ret); if (ok) sfx.win();
    hist.unshift(r); $('dHist').innerHTML = hist.slice(0, 10).map(x => `<span class="pill ${win(x) ? 'g' : 'r'}">${x.toFixed(2)}</span>`).join('');
    off('dice'); $('dGo').disabled = false; return true;
  }
  $('dGo').onclick = roll; bindAuto(roll, 200);
}

/* ================= LIMBO ================= */
addGame({
  id: 'limbo', name: 'Limbo', cat: 'originals', tag: 'Bando Original · 3% edge',
  rules: '<p>Set a target multiplier. A random multiplier is drawn. If it lands at or above your target, you win your bet times the target.</p>',
  art(ctx, w, h) { artBg(ctx, w, h, '#a85b14', '#2e1104'); bigText(ctx, '×', w / 2, h * .26, h * .2, '#ffc21a'); bigText(ctx, '24.6', w / 2, h * .48, h * .2, '#fff'); },
  mount: mountLimbo,
});
function mountLimbo() {
  gameShell(gameById('limbo'), `${amountField('lBet', 10)}${numField('lTgt', 'Target multiplier', '2.00', 'min="1.01" max="1000" step="0.01"', '×')}
    <div class="kv"><span>Win chance</span><b class="num" id="lCh">48.50%</b></div><div class="kv"><span>Profit on win</span><b class="num" id="lProf">0</b></div>
    <button class="btn play" id="lGo" type="button">Bet</button>${autoField()}`,
    `<div class="limbo"><div class="pills" id="lHist"></div><div class="lnum num" id="lNum">1.00×</div><div class="lsub" id="lSub">Target 2.00×</div></div>`);
  const hist = [];
  const tgt = () => clamp(+$('lTgt').value || 2, 1.01, 1000);
  const paint = () => { const t = tgt(); $('lCh').textContent = (97 / t).toFixed(2) + '%'; $('lSub').textContent = 'Target ' + t.toFixed(2) + '×'; $('lProf').textContent = fmt(Math.floor((bv('lBet') || 0) * t) - (bv('lBet') || 0)); };
  $('lTgt').oninput = paint; $('lBet').oninput = paint; paint();
  async function play() {
    const s = bv('lBet'), t = tgt(); if (!take(s)) return false;
    on('limbo'); $('lGo').disabled = true;
    let r = Math.max(1, Math.floor(EDGE / (1 - Math.random()) * 100) / 100);
    if (rigged(s) && r >= t) r = Math.max(1, Math.floor((1 + Math.random() * (t - 1) * .95) * 100) / 100);
    r = Math.min(r, 1e6); const ok = r >= t, el = $('lNum'), t0 = performance.now();
    el.className = 'lnum num';
    await new Promise(res => { const st = () => { const u = Math.min(1, (performance.now() - t0) / 450); el.textContent = Math.exp(Math.log(r) * ease.out3(u)).toFixed(2) + '×'; u < 1 ? requestAnimationFrame(st) : res(); }; st(); });
    el.className = 'lnum num ' + (ok ? 'w' : 'l');
    const ret = ok ? Math.floor(s * t) : 0; record('Limbo', s, ret); ok ? sfx.win() : sfx.lose();
    hist.unshift(r); $('lHist').innerHTML = pillsHTML(hist.slice(0, 12));
    off('limbo'); $('lGo').disabled = false; return true;
  }
  $('lGo').onclick = play; bindAuto(play, 250);
}

/* ================= WHEEL ================= */
const WHEEL_BASE = {
  low: [1.5, 1.2, 1.2, 1.2, 0, 1.2, 1.2, 1.2, 1.2, 0, 1.5, 1.2, 1.2, 1.2, 0, 1.2, 1.2, 1.2, 1.2, 0, 1.5, 1.2, 1.2, 1.2, 0, 1.2, 1.2, 1.2, 1.2, 0],
  med: [0, 1.5, 0, 2, 0, 1.5, 0, 3, 0, 1.5, 0, 2, 0, 1.5, 0, 1.5, 0, 2, 0, 1.5, 0, 4, 0, 1.5, 0, 2, 0, 1.5, 0, 1.5],
  high: [29.7, ...Array(29).fill(0)],
};
const WHEELS = {}; for (const k in WHEEL_BASE) WHEELS[k] = scaleTo(WHEEL_BASE[k], Array(30).fill(1 / 30), .96);
const WCOL = ['#3ddc84', '#ffc21a', '#8a3dff', '#ff7a1a', '#ff3b5c', '#00d4ff'];
function wheelColor(list, v) { if (!v) return '#2a2140'; const u = [...new Set(list.filter(Boolean))].sort((a, b) => a - b); return WCOL[u.indexOf(v) % WCOL.length]; }
addGame({
  id: 'wheel', name: 'Wheel', cat: 'originals', tag: 'Bando Original · 4% edge',
  rules: '<p>Spin the wheel and win your bet times the segment it stops on. Higher risk wheels have more blanks and bigger hits.</p>',
  art(ctx, w, h) {
    artBg(ctx, w, h, '#1f8a7a', '#04231f'); const cx = w / 2, cy = h * .4, R = w * .36, list = WHEELS.med;
    list.forEach((v, i) => { const a0 = i / 30 * Math.PI * 2, a1 = (i + 1) / 30 * Math.PI * 2; ctx.fillStyle = wheelColor(list, v); ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R, a0, a1); ctx.fill(); });
    ctx.fillStyle = '#120a22'; ctx.beginPath(); ctx.arc(cx, cy, R * .62, 0, 7); ctx.fill(); ctx.strokeStyle = '#ffc21a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(cx - 9, cy - R - 10); ctx.lineTo(cx + 9, cy - R - 10); ctx.lineTo(cx, cy - R + 6); ctx.fill();
    bigText(ctx, '3×', cx, cy, R * .5, '#8a3dff', '#fff');
  },
  mount: mountWheel,
});
function mountWheel() {
  gameShell(gameById('wheel'), `${amountField('wBet', 10)}${segField('wRisk', 'Risk', [['low', 'Low'], ['med', 'Medium'], ['high', 'High']], 'med')}<button class="btn play" id="wGo" type="button">Spin</button>${autoField()}`,
    `<div class="wheelg"><div class="wwrap"><canvas id="wCv"></canvas><div class="wcenter num" id="wRes">—</div></div><div class="wlegend" id="wLeg"></div></div>`);
  let risk = 'med', rot = 0, ctx, D, wimg = null;
  const cv = $('wCv');
  function render() {
    const list = WHEELS[risk]; wimg = document.createElement('canvas'); const c = fitCanvas(wimg, D, D), R = D / 2 - 14, cx = D / 2, a = Math.PI * 2 / 30;
    c.fillStyle = '#0c0616'; c.beginPath(); c.arc(cx, cx, R + 10, 0, 7); c.fill();
    list.forEach((v, i) => { c.fillStyle = wheelColor(list, v); c.beginPath(); c.moveTo(cx, cx); c.arc(cx, cx, R, i * a - Math.PI / 2, (i + 1) * a - Math.PI / 2); c.closePath(); c.fill(); c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = 2; c.stroke(); });
    const g = c.createRadialGradient(cx, cx, R * .5, cx, cx, R); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.25)'); c.fillStyle = g; c.beginPath(); c.arc(cx, cx, R, 0, 7); c.fill();
    c.fillStyle = '#170d2a'; c.beginPath(); c.arc(cx, cx, R * .72, 0, 7); c.fill(); c.strokeStyle = '#36225e'; c.lineWidth = 4; c.stroke();
    c.strokeStyle = '#ffc21a'; c.lineWidth = 4; c.beginPath(); c.arc(cx, cx, R + 6, 0, 7); c.stroke();
    const u = [...new Set(list)].sort((x, y) => x - y);
    $('wLeg').innerHTML = u.map(v => `<span class="wl" data-v="${v}" style="--c:${wheelColor(list, v)}">${v ? (+v.toFixed(2)) + '×' : '0×'}<small>${(list.filter(x => x === v).length / 30 * 100).toFixed(1)}%</small></span>`).join('');
  }
  function draw() {
    ctx.clearRect(0, 0, D, D); ctx.save(); ctx.translate(D / 2, D / 2); ctx.rotate(rot); ctx.drawImage(wimg, -D / 2, -D / 2, D, D); ctx.restore();
    ctx.fillStyle = '#fff'; ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 8; ctx.beginPath(); ctx.moveTo(D / 2 - 13, 2); ctx.lineTo(D / 2 + 13, 2); ctx.lineTo(D / 2, 28); ctx.closePath(); ctx.fill(); ctx.shadowBlur = 0;
  }
  function size() { D = clamp(cv.parentElement.clientWidth, 240, 440); ctx = fitCanvas(cv, D, D); render(); draw(); }
  segBind('wRisk', v => { risk = v; render(); draw(); });
  async function spin() {
    const s = bv('wBet'); if (!take(s)) return false;
    on('wheel'); lock(['wRisk'], true); $('wGo').disabled = true; $('wRes').textContent = ''; document.querySelectorAll('.wl').forEach(x => x.classList.remove('on'));
    const list = WHEELS[risk], a = Math.PI * 2 / 30; let k = rand(30);
    if (rigged(s)) { const bad = list.map((v, i) => v < 1 ? i : -1).filter(i => i >= 0); if (bad.length) k = pickOne(bad); }
    const target = -(k + .5) * a + (Math.random() - .5) * a * .7, TAU = Math.PI * 2;
    const r0 = rot, delta = ((target - r0) % TAU + TAU) % TAU + TAU * 4, t0 = performance.now(), dur = 3300; let lastIdx = -1;
    await new Promise(res => { const st = () => { const u = Math.min(1, (performance.now() - t0) / dur); rot = r0 + delta * ease.out4(u); const idx = Math.floor(((-rot % TAU) + TAU) % TAU / a); if (idx !== lastIdx) { lastIdx = idx; sfx.tick(); } draw(); u < 1 ? requestAnimationFrame(st) : res(); }; st(); });
    rot = rot % TAU; const m = list[k], ret = Math.floor(s * m);
    $('wRes').textContent = (+m.toFixed(2)) + '×'; $('wRes').style.color = m ? wheelColor(list, m) : 'var(--loss)';
    document.querySelectorAll(`.wl[data-v="${m}"]`).forEach(x => x.classList.add('on'));
    record('Wheel', s, ret); resultFlash(ret, s);
    off('wheel'); lock(['wRisk'], false); $('wGo').disabled = false; return true;
  }
  $('wGo').onclick = spin; bindAuto(spin, 400);
  size(); window.addEventListener('resize', size); onLeave(() => window.removeEventListener('resize', size));
}

/* ================= KENO ================= */
const KENO_BASE = { 1: [0, 3.96], 2: [0, 1.9, 4.5], 3: [0, 1, 3.1, 10.4], 4: [0, .8, 1.8, 5, 22.5], 5: [0, .25, 1.4, 4.1, 16.5, 36], 6: [0, 0, 1, 3.68, 7, 16.5, 40], 7: [0, 0, .47, 3, 4.5, 14, 31, 60], 8: [0, 0, 0, 2.2, 4, 13, 22, 55, 70], 9: [0, 0, 0, 1.55, 3, 8, 15, 44, 60, 85], 10: [0, 0, 0, 1.4, 2.25, 4.5, 8, 17, 50, 80, 100] };
const kenoP = (p, h) => comb(p, h) * comb(40 - p, 10 - h) / comb(40, 10);
const KENO = {}; for (const p in KENO_BASE) KENO[p] = scaleTo(KENO_BASE[p], KENO_BASE[p].map((_, h) => kenoP(+p, h)), .95);
addGame({
  id: 'keno', name: 'Keno', cat: 'originals', tag: 'Bando Original · 5% edge',
  rules: '<p>Pick 1 to 10 numbers from 40. Ten numbers are drawn. The more of yours that hit, the bigger the payout. The pay table updates as you pick.</p>',
  art(ctx, w, h) {
    artBg(ctx, w, h, '#2f5fd0', '#07123a'); const s = w * .17;
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
      const x = w / 2 - 2 * s - 6 + c * (s + 4), y = h * .1 + r * (s + 4), hit = [1, 6, 9, 14].includes(r * 4 + c);
      rr(ctx, x, y, s, s, 6); ctx.fillStyle = hit ? '#ffc21a' : 'rgba(255,255,255,.15)'; ctx.fill();
      ctx.fillStyle = hit ? '#1b0b00' : '#fff'; ctx.font = `800 ${s * .4}px Nunito`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(r * 4 + c + 1, x + s / 2, y + s / 2);
    }
  },
  mount: mountKeno,
});
function mountKeno() {
  gameShell(gameById('keno'), `${amountField('kBet', 10)}<div class="row2"><button class="btn ghost" id="kAuto" type="button">Auto pick</button><button class="btn ghost" id="kClr" type="button">Clear</button></div>
    <button class="btn play" id="kGo" type="button">Play</button>${autoField()}`,
    `<div class="keno"><div class="kgrid" id="kGrid">${Array.from({ length: 40 }, (_, i) => `<button class="kt" type="button" data-n="${i + 1}">${i + 1}</button>`).join('')}</div><div class="kpay" id="kPay"></div></div>`);
  const picks = new Set();
  const tiles = () => [...$('kGrid').children];
  function paintPay(hits) {
    const p = picks.size;
    $('kPay').innerHTML = p ? KENO[p].map((m, h) => `<div class="kp ${hits === h ? 'on' : ''}"><b>${m ? (+m.toFixed(2)) + '×' : '0×'}</b><span>${h} hit${h === 1 ? '' : 's'}</span></div>`).join('') : '<div class="muted">Pick 1–10 numbers to see the pay table.</div>';
  }
  function paintPicks() { tiles().forEach(t => t.classList.toggle('pick', picks.has(+t.dataset.n))); paintPay(); }
  $('kGrid').onclick = e => { const t = e.target.closest('.kt'); if (!t || busy) return; const n = +t.dataset.n; tiles().forEach(x => x.classList.remove('hit', 'drawn')); if (picks.has(n)) picks.delete(n); else if (picks.size < 10) picks.add(n); else return toast('10 picks max'); sfx.click(); paintPicks(); };
  $('kClr').onclick = () => { if (busy) return; picks.clear(); tiles().forEach(x => x.classList.remove('hit', 'drawn')); paintPicks(); };
  $('kAuto').onclick = () => { if (busy) return; picks.clear(); shuffle(Array.from({ length: 40 }, (_, i) => i + 1)).slice(0, 10).forEach(n => picks.add(n)); tiles().forEach(x => x.classList.remove('hit', 'drawn')); paintPicks(); sfx.click(); };
  paintPicks();
  async function play() {
    if (!picks.size) { toast('Pick at least one number'); return false; }
    const s = bv('kBet'); if (!take(s)) return false;
    on('keno'); $('kGo').disabled = true; tiles().forEach(x => x.classList.remove('hit', 'drawn'));
    const table = KENO[picks.size], drawOnce = () => shuffle(Array.from({ length: 40 }, (_, i) => i + 1)).slice(0, 10);
    let d = drawOnce(); const hitsOf = arr => arr.filter(n => picks.has(n)).length;
    if (rigged(s)) { let n = 0; while (table[hitsOf(d)] >= 1 && n++ < 400) d = drawOnce(); }
    let hits = 0;
    for (const n of d) { await sleep(110); const t = tiles()[n - 1]; t.classList.add('drawn'); if (picks.has(n)) { t.classList.add('hit'); hits++; tone(700 + hits * 90, .09, 'triangle', .05); } else sfx.tick(); }
    paintPay(hits); const ret = Math.floor(s * table[hits]); record('Keno', s, ret); resultFlash(ret, s);
    off('keno'); $('kGo').disabled = false; return true;
  }
  $('kGo').onclick = play; bindAuto(play, 700);
}

/* ================= TOWERS ================= */
const TOWER_D = { easy: { cols: 4, bombs: 1, l: 'Easy' }, medium: { cols: 3, bombs: 1, l: 'Medium' }, hard: { cols: 2, bombs: 1, l: 'Hard' }, expert: { cols: 3, bombs: 2, l: 'Expert' }, master: { cols: 4, bombs: 3, l: 'Master' } };
addGame({
  id: 'towers', name: 'Towers', cat: 'originals', tag: 'Bando Original · 3% edge',
  rules: '<p>Climb 8 levels. On each level pick one tile. Hit a gem and you move up with a bigger multiplier. Hit a skull and you lose. Cash out any time after the first level.</p>',
  art(ctx, w, h) {
    artBg(ctx, w, h, '#6b1fc2', '#160530'); const cw = w * .2, ch = h * .07;
    for (let r = 0; r < 7; r++) for (let c = 0; c < 3; c++) { const x = w / 2 - cw * 1.5 - 6 + c * (cw + 6), y = h * .66 - r * (ch + 5); rr(ctx, x, y, cw, ch, 5); ctx.fillStyle = r < 4 && c === (r * 2) % 3 ? '#2fe07f' : r === 4 && c === 1 ? '#ff5c73' : 'rgba(255,255,255,.14)'; ctx.fill(); }
  },
  mount: mountTowers,
});
function mountTowers() {
  gameShell(gameById('towers'), `${amountField('tBet', 10)}${selectField('tDiff', 'Difficulty', Object.entries(TOWER_D).map(([k, d]) => [k, d.l]), 'medium')}
    <button class="btn play" id="tGo" type="button">Bet</button><button class="btn ghost" id="tRand" type="button" disabled>Pick random tile</button>
    <div class="kv"><span>Current</span><b class="num" id="tCur">1.00×</b></div><div class="kv"><span>Profit if you cash out</span><b class="num" id="tProf">0</b></div>`,
    `<div class="towers" id="tw"></div>`);
  const LV = 8; let R = null;
  const D = () => TOWER_D[R ? R.d : $('tDiff').value], mult = L => EDGE * Math.pow(D().cols / (D().cols - D().bombs), L);
  function build() {
    const d = D();
    $('tw').innerHTML = Array.from({ length: LV }, (_, i) => LV - 1 - i).map(L => `<div class="trow" data-l="${L}"><span class="tm num">${mult(L + 1).toFixed(2)}×</span><div class="tcells" style="--c:${d.cols}">${Array.from({ length: d.cols }, (_, c) => `<button class="tc" type="button" data-l="${L}" data-c="${c}" disabled></button>`).join('')}</div></div>`).join('');
  }
  function stats() {
    const k = R ? R.level : 0, cur = k ? mult(k) : 1;
    $('tCur').textContent = cur.toFixed(2) + '×'; $('tProf').textContent = R && k ? fmt(Math.floor(R.s * cur) - R.s) : '0';
    if (R) { $('tGo').textContent = k ? 'Cash out ' + fmt(Math.floor(R.s * cur)) : 'Cash out'; $('tGo').disabled = !k; }
    document.querySelectorAll('.trow').forEach(r => r.classList.toggle('act', !!R && +r.dataset.l === R.level));
    document.querySelectorAll('.tc').forEach(b => { b.disabled = !R || +b.dataset.l !== R.level; });
  }
  $('tDiff').onchange = () => { build(); stats(); }; build(); stats();
  const cell = (L, c) => document.querySelector(`.tc[data-l="${L}"][data-c="${c}"]`);
  function showRow(L, picked, bust) {
    const d = D(), others = shuffle(Array.from({ length: d.cols }, (_, i) => i).filter(i => i !== picked)), bombs = new Set(bust ? [picked, ...others.slice(0, d.bombs - 1)] : others.slice(0, d.bombs));
    for (let c = 0; c < d.cols; c++) { const b = cell(L, c); b.classList.add('open', bombs.has(c) ? 'bomb' : 'gem'); if (c !== picked) b.classList.add('dim'); b.innerHTML = bombs.has(c) ? BOMB_SVG : GEM_SVG; }
  }
  function end() { R = null; off('towers'); $('tGo').textContent = 'Bet'; $('tGo').disabled = false; $('tGo').classList.remove('cash'); $('tRand').disabled = true; lock(['tBet', 'tDiff'], false); stats(); }
  function start() {
    const s = bv('tBet'); if (!take(s)) return;
    on('towers'); sfx.click(); R = { s, d: $('tDiff').value, level: 0, rig: rigged(s), rigAt: rand(2) };
    build(); lock(['tBet', 'tDiff'], true); $('tGo').classList.add('cash'); $('tRand').disabled = false; stats();
  }
  function pick(c) {
    if (!R) return; const d = D(), L = R.level;
    const bust = R.rig && L >= R.rigAt ? true : Math.random() < d.bombs / d.cols;
    showRow(L, c, bust);
    if (bust) { sfx.boom(); for (let l = L + 1; l < LV; l++) showRow(l, -1, false); record('Towers', R.s, 0); flash('<b>Skull</b>', 'lose'); end(); return; }
    R.level++; tone(500 + R.level * 80, .09, 'triangle', .05); stats();
    if (R.level === LV) cashOut();
  }
  function cashOut() { if (!R || !R.level) return; const ret = Math.floor(R.s * mult(R.level)); for (let l = R.level; l < LV; l++) showRow(l, -1, false); record('Towers', R.s, ret); resultFlash(ret, R.s); end(); }
  $('tw').onclick = e => { const b = e.target.closest('.tc'); if (b && !b.disabled) pick(+b.dataset.c); };
  $('tGo').onclick = () => R ? cashOut() : start();
  $('tRand').onclick = () => { if (R) pick(rand(D().cols)); };
}

/* ================= HI-LO ================= */
addGame({
  id: 'hilo', name: 'Hi-Lo', cat: 'originals', tag: 'Bando Original · 3% edge',
  rules: '<p>Guess whether the next card is higher or lower than the one showing. Ace is low, King is high, and a tie loses. Every right call grows your multiplier. Skip cards you don’t like and cash out any time.</p>',
  art(ctx, w, h) { artBg(ctx, w, h, '#c23b1f', '#300a04'); canvasCard(ctx, w * .36, h * .36, w * .38, '7', '♦', -.15); canvasCard(ctx, w * .64, h * .4, w * .38, 'Q', '♠', .15); bigText(ctx, '▲', w * .5, h * .14, h * .1, '#3ddc84'); },
  mount: mountHilo,
});
function mountHilo() {
  gameShell(gameById('hilo'), `${amountField('hBet', 10)}<button class="btn play" id="hGo" type="button">Bet</button>
    <div class="row2"><button class="btn hl" id="hHi" type="button" disabled>Higher <small id="hHiP"></small></button><button class="btn hl lo" id="hLo" type="button" disabled>Lower <small id="hLoP"></small></button></div>
    <button class="btn ghost" id="hSkip" type="button">Skip card</button>
    <div class="kv"><span>Multiplier</span><b class="num" id="hMul">1.00×</b></div><div class="kv"><span>Profit if you cash out</span><b class="num" id="hProf">0</b></div>`,
    `<div class="hilo"><div class="hl-main"><div class="hl-deck"><div class="pc down"><div class="pc-in"><div class="pc-f"></div><div class="pc-b"></div></div></div></div><div class="hl-cur" id="hCur"></div></div>
     <div class="hl-scale"><span>A</span><span>2</span><span>3</span><span>4</span><span>5</span><span>6</span><span>7</span><span>8</span><span>9</span><span>10</span><span>J</span><span>Q</span><span>K</span></div><div class="hl-hist" id="hHist"></div></div>`);
  const val = c => c.r === 'A' ? 1 : RANKS.indexOf(c.r) + 1;
  let cur = mk(), R = null;
  function showCur() { $('hCur').innerHTML = cardHTML(cur, false, 'deal big'); document.querySelectorAll('.hl-scale span').forEach((s, i) => s.classList.toggle('on', i + 1 === val(cur))); odds(); }
  function odds() {
    const v = val(cur), hi = 13 - v, lo = v - 1;
    $('hHiP').textContent = hi ? (EDGE * 13 / hi).toFixed(2) + '×' : '—'; $('hLoP').textContent = lo ? (EDGE * 13 / lo).toFixed(2) + '×' : '—';
    $('hHi').disabled = !R || !hi; $('hLo').disabled = !R || !lo;
    $('hMul').textContent = (R ? R.m : 1).toFixed(2) + '×'; $('hProf').textContent = R && R.n ? fmt(Math.floor(R.s * R.m) - R.s) : '0';
    if (R) { $('hGo').textContent = R.n ? 'Cash out ' + fmt(Math.floor(R.s * R.m)) : 'Cash out'; $('hGo').disabled = !R.n; }
  }
  const histAdd = (c, mark) => { $('hHist').insertAdjacentHTML('afterbegin', `<div class="hh">${cardHTML(c, false, 'mini')}<span class="${mark === 'x' ? 'down' : 'up'}">${mark}</span></div>`); const hh = $('hHist').children; while (hh.length > 12) hh[hh.length - 1].remove(); };
  showCur();
  function end() { R = null; off('hilo'); $('hGo').textContent = 'Bet'; $('hGo').disabled = false; $('hGo').classList.remove('cash'); lock(['hBet'], false); odds(); }
  $('hGo').onclick = () => {
    if (R) { const ret = Math.floor(R.s * R.m); record('Hi-Lo', R.s, ret); resultFlash(ret, R.s); end(); return; }
    const s = bv('hBet'); if (!take(s)) return;
    on('hilo'); sfx.click(); R = { s, m: 1, n: 0, rig: rigged(s) }; $('hHist').innerHTML = ''; lock(['hBet'], true); $('hGo').classList.add('cash'); odds();
  };
  async function call(dir) {
    if (!R) return; const v = val(cur), wins = c => dir === 'hi' ? val(c) > v : val(c) < v, n = dir === 'hi' ? 13 - v : v - 1;
    let nx = mk(); if (R.rig && Math.random() < .9) { let t = 0; while (wins(nx) && t++ < 60) nx = mk(); }
    lock(['hHi', 'hLo', 'hSkip', 'hGo'], true);
    histAdd(cur, dir === 'hi' ? '▲' : '▼'); cur = nx; showCur(); await sleep(250);
    if (!wins(nx)) { record('Hi-Lo', R.s, 0); sfx.lose(); flash('<b>Wrong call</b>', 'lose'); histAdd(nx, 'x'); lock(['hSkip'], false); end(); return; }
    R.m = Math.round(R.m * EDGE * 13 / n * 100) / 100; R.n++; tone(600 + R.n * 70, .08, 'triangle', .05);
    lock(['hSkip', 'hGo'], false); odds();
  }
  $('hHi').onclick = () => call('hi'); $('hLo').onclick = () => call('lo');
  $('hSkip').onclick = () => { histAdd(cur, '↷'); cur = mk(); showCur(); };
}
