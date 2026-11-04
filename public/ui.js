/* ===== Shared game UI: shell, bet controls, cards, chips, canvas helpers, sound ===== */
const EDGE = 0.97;
const CLEANUP = [];
const onLeave = fn => CLEANUP.push(fn);
function runCleanup() { while (CLEANUP.length) { try { CLEANUP.pop()(); } catch (e) { console.error(e); } } }
const ACTIVE = new Set();
const on = k => { ACTIVE.add(k); busy = true; };
const off = k => { ACTIVE.delete(k); busy = ACTIVE.size > 0; };
const bv = id => Math.floor(+$(id).value);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const pickOne = a => a[rand(a.length)];
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = rand(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const ease = { out3: t => 1 - Math.pow(1 - t, 3), out4: t => 1 - Math.pow(1 - t, 4), inout: t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2 };

/* ---------- sound ---------- */
let SOUND = true; try { SOUND = localStorage.getItem('bando.sound') !== 'off'; } catch (e) {}
let AC = null;
function tone(freq, dur = .08, type = 'sine', vol = .05, when = 0) {
  if (!SOUND) return;
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    const t = AC.currentTime + when, o = AC.createOscillator(), g = AC.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g).connect(AC.destination); o.start(t); o.stop(t + dur + .02);
  } catch (e) {}
}
const sfx = {
  click: () => tone(520, .04, 'square', .025),
  tick: () => tone(1500, .015, 'square', .012),
  card: () => tone(260 + rand(60), .05, 'triangle', .04),
  chip: () => { tone(1900, .03, 'square', .018); tone(2500, .03, 'square', .012, .025); },
  win: () => [660, 880, 1100].forEach((f, i) => tone(f, .12, 'triangle', .05, i * .07)),
  big: () => [523, 659, 784, 1046, 1318, 1568].forEach((f, i) => tone(f, .2, 'triangle', .06, i * .09)),
  lose: () => tone(150, .25, 'sawtooth', .025),
  pop: () => tone(900, .05, 'sine', .05),
  boom: () => { tone(90, .45, 'sawtooth', .06); tone(55, .55, 'square', .035, .04); },
};
function soundBtn() {
  const b = $('snd'); if (!b) return;
  b.textContent = SOUND ? 'Sound on' : 'Sound off';
  b.onclick = () => { SOUND = !SOUND; try { localStorage.setItem('bando.sound', SOUND ? 'on' : 'off'); } catch (e) {} soundBtn(); };
}

/* ---------- game shell ---------- */
const FEED = [];
let CURGAME = null;
window.onBet = (game, stake, ret) => {
  FEED.unshift({ game, stake, ret, t: Date.now() }); if (FEED.length > 300) FEED.pop();
  if ($('feed') && CURGAME) paintFeed();
};
function gameShell(g, panel, stage) {
  CURGAME = g;
  $('view').innerHTML = `<div class="gv">
    <div class="gv-top"><a class="back" href="#casino">‹ Lobby</a><h1>${esc(g.name)}</h1><span class="gtag">${esc(g.tag)}</span><span class="sp"></span><button class="btn ghost sm" id="gInfo" type="button">How to play</button></div>
    <div class="gv-main ${g.wide ? 'wide' : ''}"><aside class="panel" id="panel">${panel}</aside><section class="stage" id="stage">${stage}</section></div>
    <div class="gv-feed"><div class="label">Your ${esc(g.name)} bets this session</div><div id="feed"></div></div></div>`;
  $('gInfo').onclick = () => modal(`<h2>${esc(g.name)}</h2><div class="rulestext">${g.rules}</div><div class="controls"><button class="btn ghost" data-close>Close</button></div>`);
  paintFeed();
}
function paintFeed() {
  const name = CURGAME.feedName || CURGAME.name;
  const rows = FEED.filter(f => f.game === name).slice(0, 10);
  $('feed').innerHTML = rows.length ? `<div class="tbl"><table class="ftab"><thead><tr><th>Time</th><th class="n">Bet</th><th class="n">Multiplier</th><th class="n">Payout</th></tr></thead><tbody>${rows.map(r =>
    `<tr><td>${new Date(r.t).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' })}</td><td class="n">${fmt(r.stake)}</td><td class="n ${r.ret > r.stake ? 'up' : r.ret < r.stake ? 'down' : ''}">${(r.ret / r.stake).toFixed(2)}×</td><td class="n ${cls(r.ret - r.stake)}">${sfmt(r.ret - r.stake)}</td></tr>`).join('')}</tbody></table></div>` : '<div class="empty">No bets yet.</div>';
}
function flash(html, kind = '') {
  const st = $('stage'); if (!st) return;
  const d = document.createElement('div'); d.className = 'flash ' + kind; d.innerHTML = html; st.appendChild(d);
  setTimeout(() => d.remove(), 1700);
}
const resultFlash = (ret, stake) => {
  if (ret > stake) { flash(`<b>${(ret / stake).toFixed(2)}×</b><span>+${fmt(ret - stake)}</span>`, 'win'); ret >= stake * 10 ? sfx.big() : sfx.win(); }
  else if (ret === stake) flash('<b>Push</b>', '');
  else sfx.lose();
};

/* ---------- panel controls ---------- */
function amountField(id, def = 10, label = 'Bet amount') {
  return `<div class="field"><label for="${id}">${label}</label><div class="amt"><span class="coin"></span><input id="${id}" type="number" min="1" step="1" value="${def}" class="num" inputmode="numeric"><button type="button" data-half="${id}">½</button><button type="button" data-dbl="${id}">2×</button></div></div>`;
}
function numField(id, label, val, attrs = '', suffix = '') {
  return `<div class="field"><label for="${id}">${label}</label><div class="amt"><input id="${id}" type="number" value="${val}" class="num" ${attrs}>${suffix ? `<span class="suffix">${suffix}</span>` : ''}</div></div>`;
}
function segField(id, label, opts, val) {
  return `<div class="field"><label>${label}</label><div class="seg" id="${id}">${opts.map(([v, l]) => `<button type="button" data-v="${v}" class="${String(v) === String(val) ? 'on' : ''}">${l}</button>`).join('')}</div></div>`;
}
function segBind(id, fn) {
  $(id).onclick = e => {
    const b = e.target.closest('[data-v]'); if (!b || $(id).classList.contains('lock')) return;
    [...$(id).children].forEach(x => x.classList.toggle('on', x === b)); sfx.click(); fn(b.dataset.v);
  };
}
function selectField(id, label, opts, val) {
  return `<div class="field"><label for="${id}">${label}</label><select id="${id}">${opts.map(([v, l]) => `<option value="${v}" ${String(v) === String(val) ? 'selected' : ''}>${l}</option>`).join('')}</select></div>`;
}
const autoField = () => `<div class="field"><label for="autoN">Auto bet</label><div class="amt"><input id="autoN" type="number" min="1" value="10" class="num"><button type="button" id="autoGo" class="wide">Start</button></div></div>`;
function bindAuto(playOnce, gap = 300) {
  let running = false;
  $('autoGo').onclick = async () => {
    if (running) { running = false; return; }
    running = true; $('autoGo').textContent = 'Stop'; $('autoGo').classList.add('stop');
    let n = Math.max(1, Math.floor(+$('autoN').value || 1));
    while (running && n > 0 && $('autoGo')) { const ok = await playOnce(); if (!ok) break; n--; if ($('autoN')) $('autoN').value = n || 10; await sleep(gap); }
    running = false; if ($('autoGo')) { $('autoGo').textContent = 'Start'; $('autoGo').classList.remove('stop'); }
  };
  onLeave(() => { running = false; });
}
function lock(ids, v) { ids.forEach(id => { const el = typeof id === 'string' ? $(id) : id; if (!el) return; if (el.classList.contains('seg')) el.classList.toggle('lock', v); else el.disabled = v; }); }
document.addEventListener('click', e => {
  const d = e.target.dataset; if (!d) return;
  if (d.half && $(d.half) && !$(d.half).disabled) { const i = $(d.half); i.value = Math.max(1, Math.floor((+i.value || 0) / 2)); i.dispatchEvent(new Event('input')); }
  if (d.dbl && $(d.dbl) && !$(d.dbl).disabled) { const i = $(d.dbl); i.value = Math.max(1, Math.min(Math.floor(avail()), (+i.value || 0) * 2)); i.dispatchEvent(new Event('input')); }
});

/* ---------- chips ---------- */
const CHIPV = [1, 5, 25, 100, 500, 1000];
const shortN = v => v >= 1e6 ? +(v / 1e6).toFixed(1) + 'M' : v >= 1000 ? +(v / 1000).toFixed(1) + 'K' : String(Math.round(v));
const chipCls = v => v >= 1000 ? 'c1000' : v >= 500 ? 'c500' : v >= 100 ? 'c100' : v >= 25 ? 'c25' : v >= 5 ? 'c5' : 'c1';
let CHIP = 25;
const rackHTML = (def = 25) => `<div class="field"><label>Chip value</label><div class="rack" id="rack">${CHIPV.map(v => `<button type="button" class="chip ${chipCls(v)} ${v === def ? 'on' : ''}" data-cv="${v}">${shortN(v)}</button>`).join('')}</div></div>`;
function bindRack(def = 25, onPick) {
  CHIP = def;
  $('rack').onclick = e => { const b = e.target.closest('[data-cv]'); if (!b) return; CHIP = +b.dataset.cv; [...$('rack').children].forEach(x => x.classList.toggle('on', x === b)); sfx.chip(); onPick && onPick(CHIP); };
}
const chipStack = v => v > 0 ? `<span class="pchip ${chipCls(v)}">${shortN(v)}</span>` : '';

/* ---------- playing cards ---------- */
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'], SUITS = ['♠', '♥', '♦', '♣'];
const mk = r => ({ r: r ?? RANKS[rand(13)], s: SUITS[rand(4)] });
function freshDeck(n = 1) { const d = []; for (let k = 0; k < n; k++) for (const r of RANKS) for (const s of SUITS) d.push({ r, s }); return shuffle(d); }
const RV = r => r === 'A' ? 14 : RANKS.indexOf(r) + 1;
const isRed = s => s === '♥' || s === '♦';
function cardFront(c) {
  const mid = ['J', 'Q', 'K', 'A'].includes(c.r) ? `<span class="pc-face">${c.r}</span>` : `<span class="pc-pip">${c.s}</span>`;
  return `<div class="pc-f ${isRed(c.s) ? 'red' : ''}"><span class="pc-i">${c.r}<em>${c.s}</em></span>${mid}<span class="pc-i pc-br">${c.r}<em>${c.s}</em></span></div>`;
}
const cardHTML = (c, down = false, extra = '') => `<div class="pc ${down ? 'down' : ''} ${extra}"><div class="pc-in">${cardFront(c)}<div class="pc-b"></div></div></div>`;
function dealCard(container, c, opt = {}) {
  return new Promise(res => setTimeout(() => {
    if (!container.isConnected) return res(null);
    const w = document.createElement('div'); w.innerHTML = cardHTML(c, !!opt.down, 'deal'); const el = w.firstChild;
    container.appendChild(el); sfx.card(); setTimeout(() => res(el), opt.fast ? 120 : 300);
  }, opt.delay || 0));
}
function flipCard(el, c) {
  if (!el) return; if (c) { const f = el.querySelector('.pc-f'); const w = document.createElement('div'); w.innerHTML = cardFront(c); f.replaceWith(w.firstChild); }
  el.classList.remove('down'); sfx.card();
}

/* ---------- math ---------- */
function comb(n, k) { if (k < 0 || k > n) return 0; let r = 1; for (let i = 1; i <= k; i++) r = r * (n - k + i) / i; return r; }
const binom = n => Array.from({ length: n + 1 }, (_, k) => comb(n, k) / 2 ** n);
function scaleTo(values, probs, target) {
  const ev = values.reduce((s, v, i) => s + v * probs[i], 0), k = target / ev;
  return values.map(v => v === 0 ? 0 : Math.round(v * k * 100) / 100);
}

/* ---------- canvas helpers ---------- */
function fitCanvas(cv, w, h) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); cv.style.width = w + 'px'; cv.style.height = h + 'px';
  const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); return ctx;
}
function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
const DISPLAY = '"Lilita One","Arial Rounded MT Bold",system-ui,sans-serif';
function bigText(ctx, t, x, y, size, fill = '#fff', stroke = 'rgba(0,0,0,.55)') {
  ctx.save(); ctx.font = `${size}px ${DISPLAY}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  ctx.lineWidth = size * .16; ctx.strokeStyle = stroke; ctx.strokeText(t, x, y); ctx.fillStyle = fill; ctx.fillText(t, x, y); ctx.restore();
}
function artBg(ctx, w, h, c1, c2) {
  const g = ctx.createLinearGradient(0, 0, w * .4, h); g.addColorStop(0, c1); g.addColorStop(1, c2); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  ctx.save(); ctx.globalAlpha = .07; ctx.fillStyle = '#fff'; ctx.translate(w / 2, h * .4);
  for (let i = 0; i < 12; i++) { ctx.rotate(Math.PI / 6); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(h, -h * .12); ctx.lineTo(h, h * .12); ctx.fill(); }
  ctx.restore();
  const v = ctx.createRadialGradient(w / 2, h * .4, 0, w / 2, h * .4, h * .85); v.addColorStop(0, 'rgba(255,255,255,.12)'); v.addColorStop(1, 'rgba(0,0,0,.5)');
  ctx.fillStyle = v; ctx.fillRect(0, 0, w, h);
}
function canvasCard(ctx, x, y, w, r, s, rot = 0) {
  const h = w * 1.4; ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 5;
  rr(ctx, -w / 2, -h / 2, w, h, w * .1); ctx.fillStyle = '#fff'; ctx.fill(); ctx.shadowColor = 'transparent';
  ctx.fillStyle = isRed(s) ? '#e0344d' : '#15101f'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.font = `800 ${w * .26}px Nunito,system-ui,sans-serif`; ctx.fillText(r, -w / 2 + w * .09, -h / 2 + w * .07);
  ctx.font = `${w * .2}px system-ui,sans-serif`; ctx.fillText(s, -w / 2 + w * .1, -h / 2 + w * .36);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if (['J', 'Q', 'K', 'A'].includes(r)) { ctx.font = `${w * .62}px ${DISPLAY}`; ctx.fillText(r, w * .06, h * .08); }
  else { ctx.font = `${w * .55}px system-ui,sans-serif`; ctx.fillText(s, w * .06, h * .08); }
  ctx.restore();
}
const PIPS = { 1: [[1, 1]], 2: [[0, 0], [2, 2]], 3: [[0, 0], [1, 1], [2, 2]], 4: [[0, 0], [2, 0], [0, 2], [2, 2]], 5: [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2]], 6: [[0, 0], [2, 0], [0, 1], [2, 1], [0, 2], [2, 2]] };
function canvasDie(ctx, x, y, s, n, rot = 0, body = '#fff', pip = '#15101f') {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 5;
  const g = ctx.createLinearGradient(-s / 2, -s / 2, s / 2, s / 2); g.addColorStop(0, body); g.addColorStop(1, body === '#fff' ? '#d9d2ea' : body);
  rr(ctx, -s / 2, -s / 2, s, s, s * .18); ctx.fillStyle = g; ctx.fill(); ctx.shadowColor = 'transparent';
  ctx.fillStyle = pip; for (const [cx, cy] of PIPS[n]) { ctx.beginPath(); ctx.arc(-s / 2 + s * (.25 + cx * .25), -s / 2 + s * (.25 + cy * .25), s * .085, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}
function pillsHTML(list) { return list.map(m => `<span class="pill ${m >= 10 ? 'p' : m >= 2 ? 'g' : m >= 1 ? 'y' : 'r'}">${m.toFixed(2)}×</span>`).join(''); }
