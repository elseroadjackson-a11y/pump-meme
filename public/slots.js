/* ===== Slots: drawn symbols, 5×3 reels, 10 lines, wilds, scatter free spins ===== */
const LINES = [[1, 1, 1, 1, 1], [0, 0, 0, 0, 0], [2, 2, 2, 2, 2], [0, 1, 2, 1, 0], [2, 1, 0, 1, 2], [0, 0, 1, 2, 2], [2, 2, 1, 0, 0], [1, 0, 0, 0, 1], [1, 2, 2, 2, 1], [1, 0, 1, 2, 1]];
const LINE_COL = ['#ffc21a', '#3ddc84', '#ff5c73', '#00d4ff', '#ff7ad9', '#ff9f1a', '#b388ff', '#7cff6b', '#4fc3ff', '#ffe14f'];
// symbol slots: 0-3 low, 4-6 high, 7 wild, 8 scatter. Pays are line-bet multiples for 3/4/5 in a row (~87-89% payback).
const PROFILES = {
  low: { w: [30, 28, 26, 24, 12, 9, 6, 4, 3], pay: [[8, 21, 65], [10, 26, 78], [13, 31, 104], [16, 39, 130], [26, 78, 260], [39, 130, 520], [65, 260, 1300]] },
  med: { w: [32, 30, 27, 25, 10, 7, 5, 3, 3], pay: [[8, 21, 61], [10, 25, 82], [12, 31, 102], [16, 41, 123], [31, 82, 308], [51, 164, 615], [82, 308, 2050]] },
  high: { w: [34, 32, 29, 27, 9, 6, 4, 2.5, 2.5], pay: [[8, 19, 64], [10, 24, 80], [13, 32, 96], [16, 40, 128], [32, 96, 400], [64, 192, 960], [96, 400, 3200]] },
};

/* ---------- symbol painters (draw into an S×S box) ---------- */
function shade(hex, amt) {
  let c = hex.replace('#', ''); if (c.length === 3) c = c.split('').map(x => x + x).join('');
  const n = parseInt(c, 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  const f = v => Math.round(amt >= 0 ? v + (255 - v) * amt : v * (1 + amt));
  return `rgb(${f(r)},${f(g)},${f(b)})`;
}
const lg = (ctx, x0, y0, x1, y1, stops) => { const g = ctx.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, c]) => g.addColorStop(o, c)); return g; };
const rg = (ctx, x, y, r0, r, stops) => { const g = ctx.createRadialGradient(x, y, r0, x, y, r); stops.forEach(([o, c]) => g.addColorStop(o, c)); return g; };
function gloss(ctx, S, cx, cy, rx, ry) { ctx.save(); ctx.globalAlpha = .35; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, -.4, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
function starPath(ctx, cx, cy, n, R, r, rot = -Math.PI / 2) { ctx.beginPath(); for (let i = 0; i < n * 2; i++) { const a = rot + i * Math.PI / n, rad = i % 2 ? r : R; ctx.lineTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad); } ctx.closePath(); }
function outlined(ctx, S, w = .045, col = 'rgba(20,8,30,.85)') { ctx.lineJoin = 'round'; ctx.lineWidth = S * w; ctx.strokeStyle = col; ctx.stroke(); }
const P = {
  letter(ctx, S, t, col) {
    ctx.font = `${S * (t.length > 1 ? .5 : .66)}px ${DISPLAY}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    const y = S * .55; ctx.lineWidth = S * .14; ctx.strokeStyle = 'rgba(15,5,25,.9)'; ctx.strokeText(t, S / 2, y);
    ctx.lineWidth = S * .06; ctx.strokeStyle = '#fff'; ctx.strokeText(t, S / 2, y);
    ctx.fillStyle = lg(ctx, 0, S * .25, 0, S * .8, [[0, shade(col, .55)], [.5, col], [1, shade(col, -.45)]]); ctx.fillText(t, S / 2, y);
  },
  gem(ctx, S, col) {
    const p = [[.3, .2], [.7, .2], [.88, .4], [.5, .88], [.12, .4]].map(([x, y]) => [x * S, y * S]);
    ctx.beginPath(); p.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); ctx.fillStyle = col; ctx.fill(); outlined(ctx, S);
    const f = (pts, c) => { ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x * S, y * S) : ctx.moveTo(x * S, y * S)); ctx.closePath(); ctx.fillStyle = c; ctx.fill(); };
    f([[.3, .2], [.7, .2], [.62, .4], [.38, .4]], shade(col, .6)); f([[.3, .2], [.38, .4], [.12, .4]], shade(col, .35)); f([[.7, .2], [.88, .4], [.62, .4]], shade(col, -.15));
    f([[.12, .4], [.38, .4], [.5, .88]], shade(col, -.25)); f([[.38, .4], [.62, .4], [.5, .88]], shade(col, .2)); f([[.62, .4], [.88, .4], [.5, .88]], shade(col, -.45));
    ctx.fillStyle = '#fff'; starPath(ctx, S * .34, S * .27, 4, S * .07, S * .02); ctx.fill();
  },
  seven(ctx, S, col) {
    ctx.font = `${S * .92}px ${DISPLAY}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    ctx.lineWidth = S * .16; ctx.strokeStyle = 'rgba(20,6,10,.9)'; ctx.strokeText('7', S / 2, S * .56);
    ctx.lineWidth = S * .08; ctx.strokeStyle = lg(ctx, 0, S * .1, 0, S, [[0, '#fff6c2'], [.5, '#ffc21a'], [1, '#a86a00']]); ctx.strokeText('7', S / 2, S * .56);
    ctx.fillStyle = lg(ctx, 0, S * .15, 0, S * .95, [[0, shade(col, .5)], [.45, col], [1, shade(col, -.5)]]); ctx.fillText('7', S / 2, S * .56);
  },
  bar(ctx, S, n, col = '#15101f') {
    const h = S * .2, gap = S * .04, tot = n * h + (n - 1) * gap, y0 = S / 2 - tot / 2;
    for (let i = 0; i < n; i++) {
      const y = y0 + i * (h + gap); rr(ctx, S * .12, y, S * .76, h, h * .3); ctx.fillStyle = lg(ctx, 0, y, 0, y + h, [[0, shade(col, .25)], [1, col]]); ctx.fill();
      ctx.lineWidth = S * .025; ctx.strokeStyle = '#ffc21a'; ctx.stroke();
      ctx.font = `${h * .78}px ${DISPLAY}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#ffe9a0'; ctx.fillText('BAR', S / 2, y + h * .56);
    }
  },
  bell(ctx, S) {
    ctx.beginPath(); ctx.moveTo(S * .5, S * .14); ctx.bezierCurveTo(S * .28, S * .14, S * .26, S * .4, S * .24, S * .58); ctx.quadraticCurveTo(S * .2, S * .7, S * .12, S * .74); ctx.lineTo(S * .88, S * .74); ctx.quadraticCurveTo(S * .8, S * .7, S * .76, S * .58); ctx.bezierCurveTo(S * .74, S * .4, S * .72, S * .14, S * .5, S * .14); ctx.closePath();
    ctx.fillStyle = lg(ctx, S * .2, 0, S * .8, 0, [[0, '#a86a00'], [.35, '#ffe27a'], [.6, '#ffc21a'], [1, '#8a5200']]); ctx.fill(); outlined(ctx, S);
    ctx.beginPath(); ctx.arc(S * .5, S * .8, S * .08, 0, Math.PI * 2); ctx.fillStyle = '#d98a00'; ctx.fill(); outlined(ctx, S, .03);
    ctx.beginPath(); ctx.arc(S * .5, S * .12, S * .05, 0, Math.PI * 2); ctx.fill(); gloss(ctx, S, S * .4, S * .36, S * .05, S * .12);
  },
  cherry(ctx, S) {
    ctx.strokeStyle = '#2f8a2f'; ctx.lineWidth = S * .045; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(S * .34, S * .6); ctx.quadraticCurveTo(S * .4, S * .3, S * .62, S * .16); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(S * .68, S * .62); ctx.quadraticCurveTo(S * .66, S * .35, S * .62, S * .16); ctx.stroke();
    ctx.fillStyle = '#4cc24c'; ctx.beginPath(); ctx.ellipse(S * .74, S * .2, S * .14, S * .06, -.5, 0, Math.PI * 2); ctx.fill(); outlined(ctx, S, .025);
    [[.32, .68], [.68, .7]].forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x * S, y * S, S * .19, 0, Math.PI * 2); ctx.fillStyle = rg(ctx, x * S - S * .06, y * S - S * .06, S * .02, S * .2, [[0, '#ff8a9a'], [.5, '#e0102f'], [1, '#7a0010']]); ctx.fill(); outlined(ctx, S, .035); gloss(ctx, S, x * S - S * .07, y * S - S * .07, S * .05, S * .03); });
  },
  lemon(ctx, S) { ctx.beginPath(); ctx.ellipse(S / 2, S * .54, S * .36, S * .27, -.25, 0, Math.PI * 2); ctx.fillStyle = rg(ctx, S * .4, S * .42, S * .03, S * .4, [[0, '#fff7a8'], [.6, '#ffd600'], [1, '#c79400']]); ctx.fill(); outlined(ctx, S); gloss(ctx, S, S * .38, S * .42, S * .1, S * .05); ctx.fillStyle = '#4cc24c'; ctx.beginPath(); ctx.ellipse(S * .7, S * .24, S * .12, S * .05, -.7, 0, Math.PI * 2); ctx.fill(); outlined(ctx, S, .025); },
  orange(ctx, S) { ctx.beginPath(); ctx.arc(S / 2, S * .55, S * .33, 0, Math.PI * 2); ctx.fillStyle = rg(ctx, S * .4, S * .44, S * .03, S * .38, [[0, '#ffd2a0'], [.55, '#ff8a00'], [1, '#b34d00']]); ctx.fill(); outlined(ctx, S); ctx.fillStyle = 'rgba(120,50,0,.25)'; for (let i = 0; i < 14; i++) { ctx.beginPath(); ctx.arc(S * (.32 + (i * 37 % 36) / 100), S * (.45 + (i * 53 % 30) / 100), S * .008, 0, 7); ctx.fill(); } gloss(ctx, S, S * .4, S * .42, S * .09, S * .05); ctx.fillStyle = '#4cc24c'; ctx.beginPath(); ctx.ellipse(S * .58, S * .2, S * .12, S * .05, -.3, 0, Math.PI * 2); ctx.fill(); outlined(ctx, S, .025); },
  plum(ctx, S) { ctx.beginPath(); ctx.ellipse(S / 2, S * .56, S * .3, S * .33, .2, 0, Math.PI * 2); ctx.fillStyle = rg(ctx, S * .4, S * .44, S * .03, S * .38, [[0, '#e3a8ff'], [.55, '#8a2bd9'], [1, '#40106b']]); ctx.fill(); outlined(ctx, S); ctx.strokeStyle = 'rgba(40,10,60,.4)'; ctx.lineWidth = S * .02; ctx.beginPath(); ctx.moveTo(S * .5, S * .26); ctx.quadraticCurveTo(S * .42, S * .55, S * .52, S * .88); ctx.stroke(); gloss(ctx, S, S * .38, S * .42, S * .07, S * .05); ctx.strokeStyle = '#5a3a1a'; ctx.lineWidth = S * .04; ctx.beginPath(); ctx.moveTo(S * .5, S * .25); ctx.lineTo(S * .55, S * .12); ctx.stroke(); },
  grape(ctx, S) { const pts = [[.36, .34], [.5, .34], [.64, .34], [.43, .48], [.57, .48], [.36, .6], [.5, .62], [.64, .6], [.5, .76]]; pts.forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x * S, y * S, S * .095, 0, Math.PI * 2); ctx.fillStyle = rg(ctx, x * S - S * .03, y * S - S * .03, S * .01, S * .1, [[0, '#d8b0ff'], [.6, '#7a2bd9'], [1, '#3a0f6b']]); ctx.fill(); outlined(ctx, S, .022); }); ctx.fillStyle = '#4cc24c'; ctx.beginPath(); ctx.ellipse(S * .62, S * .18, S * .14, S * .06, -.4, 0, Math.PI * 2); ctx.fill(); outlined(ctx, S, .025); },
  crown(ctx, S) {
    ctx.beginPath(); ctx.moveTo(S * .14, S * .7); ctx.lineTo(S * .1, S * .3); ctx.lineTo(S * .32, S * .48); ctx.lineTo(S * .5, S * .2); ctx.lineTo(S * .68, S * .48); ctx.lineTo(S * .9, S * .3); ctx.lineTo(S * .86, S * .7); ctx.closePath();
    ctx.fillStyle = lg(ctx, 0, S * .2, 0, S * .7, [[0, '#fff3b0'], [.4, '#ffc21a'], [1, '#a86a00']]); ctx.fill(); outlined(ctx, S);
    rr(ctx, S * .12, S * .68, S * .76, S * .14, S * .04); ctx.fillStyle = lg(ctx, 0, S * .68, 0, S * .82, [[0, '#ffd84d'], [1, '#a86a00']]); ctx.fill(); outlined(ctx, S, .035);
    [[.1, .3, '#ff3b5c'], [.5, .2, '#8a3dff'], [.9, .3, '#3ddc84']].forEach(([x, y, c]) => { ctx.beginPath(); ctx.arc(x * S, y * S, S * .055, 0, 7); ctx.fillStyle = c; ctx.fill(); outlined(ctx, S, .025); });
    [[.3, '#ff3b5c'], [.5, '#00d4ff'], [.7, '#3ddc84']].forEach(([x, c]) => { ctx.beginPath(); ctx.arc(x * S, S * .75, S * .04, 0, 7); ctx.fillStyle = c; ctx.fill(); });
  },
  star(ctx, S, col = '#ffd23f') { starPath(ctx, S / 2, S * .53, 5, S * .4, S * .18); ctx.fillStyle = lg(ctx, 0, S * .1, 0, S * .9, [[0, shade(col, .6)], [.5, col], [1, shade(col, -.45)]]); ctx.fill(); outlined(ctx, S); starPath(ctx, S / 2, S * .53, 5, S * .2, S * .09); ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fill(); },
  coin(ctx, S, mark = '$', col = '#ffc21a') {
    ctx.beginPath(); ctx.arc(S / 2, S / 2, S * .38, 0, Math.PI * 2); ctx.fillStyle = rg(ctx, S * .4, S * .38, S * .03, S * .42, [[0, shade(col, .65)], [.6, col], [1, shade(col, -.5)]]); ctx.fill(); outlined(ctx, S);
    ctx.beginPath(); ctx.arc(S / 2, S / 2, S * .29, 0, Math.PI * 2); ctx.lineWidth = S * .03; ctx.strokeStyle = shade(col, -.35); ctx.stroke();
    if (mark === 'hole') { rr(ctx, S * .42, S * .42, S * .16, S * .16, S * .02); ctx.fillStyle = 'rgba(40,10,0,.75)'; ctx.fill(); }
    else { ctx.font = `${S * .36}px ${DISPLAY}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = shade(col, -.45); ctx.fillText(mark, S / 2, S * .53); }
    gloss(ctx, S, S * .38, S * .32, S * .1, S * .05);
  },
  clover(ctx, S) {
    const leaf = (a) => { ctx.save(); ctx.translate(S / 2, S * .46); ctx.rotate(a); ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(-S * .26, -S * .08, -S * .2, -S * .36, 0, -S * .22); ctx.bezierCurveTo(S * .2, -S * .36, S * .26, -S * .08, 0, 0); ctx.fillStyle = lg(ctx, 0, -S * .3, 0, 0, [[0, '#8dff8d'], [1, '#128a2f']]); ctx.fill(); outlined(ctx, S, .03); ctx.restore(); };
    ctx.strokeStyle = '#0f6b25'; ctx.lineWidth = S * .05; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(S * .5, S * .5); ctx.quadraticCurveTo(S * .56, S * .75, S * .66, S * .88); ctx.stroke();
    [0, Math.PI / 2, Math.PI, Math.PI * 1.5].forEach(leaf);
  },
  horseshoe(ctx, S) {
    ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(S / 2, S * .44, S * .27, Math.PI * .82, Math.PI * 2.18); ctx.lineWidth = S * .17; ctx.strokeStyle = 'rgba(20,8,30,.85)'; ctx.stroke();
    ctx.lineWidth = S * .12; ctx.strokeStyle = lg(ctx, S * .2, 0, S * .8, 0, [[0, '#a86a00'], [.5, '#ffe27a'], [1, '#a86a00']]); ctx.stroke();
    ctx.fillStyle = '#5a3a00'; for (let i = 0; i < 7; i++) { const a = Math.PI * (.9 + i * .2); ctx.beginPath(); ctx.arc(S / 2 + Math.cos(a) * S * .27, S * .44 + Math.sin(a) * S * .27, S * .018, 0, 7); ctx.fill(); }
  },
  heart(ctx, S, col = '#ff3b6b') { ctx.beginPath(); ctx.moveTo(S / 2, S * .84); ctx.bezierCurveTo(S * .1, S * .58, S * .08, S * .22, S * .32, S * .2); ctx.bezierCurveTo(S * .44, S * .19, S * .5, S * .3, S / 2, S * .34); ctx.bezierCurveTo(S * .5, S * .3, S * .56, S * .19, S * .68, S * .2); ctx.bezierCurveTo(S * .92, S * .22, S * .9, S * .58, S / 2, S * .84); ctx.fillStyle = lg(ctx, 0, S * .2, 0, S * .84, [[0, shade(col, .45)], [1, shade(col, -.35)]]); ctx.fill(); outlined(ctx, S); gloss(ctx, S, S * .33, S * .34, S * .08, S * .05); },
  planet(ctx, S, col = '#ff8a3d') {
    ctx.save(); ctx.translate(S / 2, S / 2); ctx.rotate(-.35);
    ctx.beginPath(); ctx.ellipse(0, 0, S * .45, S * .12, 0, Math.PI, Math.PI * 2); ctx.lineWidth = S * .05; ctx.strokeStyle = '#ffe0b0'; ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, S * .27, 0, Math.PI * 2); ctx.fillStyle = rg(ctx, -S * .08, -S * .08, S * .02, S * .3, [[0, shade(col, .6)], [.6, col], [1, shade(col, -.5)]]); ctx.fill(); outlined(ctx, S);
    ctx.beginPath(); ctx.ellipse(0, 0, S * .45, S * .12, 0, 0, Math.PI); ctx.lineWidth = S * .05; ctx.strokeStyle = '#ffe0b0'; ctx.stroke(); ctx.restore();
  },
  moon(ctx, S) { ctx.beginPath(); ctx.arc(S * .5, S * .5, S * .34, 0, Math.PI * 2); ctx.fillStyle = rg(ctx, S * .4, S * .4, S * .03, S * .36, [[0, '#fffbe0'], [1, '#d9c46a']]); ctx.fill(); ctx.globalCompositeOperation = 'destination-out'; ctx.beginPath(); ctx.arc(S * .66, S * .4, S * .3, 0, Math.PI * 2); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = '#fff'; starPath(ctx, S * .74, S * .7, 4, S * .07, S * .02); ctx.fill(); },
  lightning(ctx, S, col = '#ffe14f') { ctx.beginPath(); [[.58, .08], [.24, .56], [.46, .56], [.38, .92], [.78, .4], [.54, .4], [.66, .08]].forEach(([x, y], i) => i ? ctx.lineTo(x * S, y * S) : ctx.moveTo(x * S, y * S)); ctx.closePath(); ctx.fillStyle = lg(ctx, 0, 0, 0, S, [[0, '#fffbe0'], [.5, col], [1, shade(col, -.4)]]); ctx.fill(); outlined(ctx, S); },
  flame(ctx, S) {
    const fl = (s, c1, c2, dy) => { ctx.beginPath(); ctx.moveTo(S / 2, S * (.1 + dy)); ctx.bezierCurveTo(S * (.5 + .32 * s), S * (.36 + dy), S * (.5 + .34 * s), S * .7, S / 2, S * .88); ctx.bezierCurveTo(S * (.5 - .34 * s), S * .7, S * (.5 - .3 * s), S * (.46 + dy), S * (.5 - .06 * s), S * (.3 + dy)); ctx.closePath(); ctx.fillStyle = lg(ctx, 0, S * .2, 0, S * .9, [[0, c1], [1, c2]]); ctx.fill(); };
    fl(1, '#ff7a00', '#c21a00', 0); outlined(ctx, S); fl(.7, '#ffc21a', '#ff5a00', .14); fl(.38, '#fff6c2', '#ffd23f', .32);
  },
  pyramid(ctx, S) { ctx.beginPath(); ctx.moveTo(S * .5, S * .14); ctx.lineTo(S * .9, S * .82); ctx.lineTo(S * .1, S * .82); ctx.closePath(); ctx.fillStyle = '#d9a53a'; ctx.fill(); outlined(ctx, S); ctx.beginPath(); ctx.moveTo(S * .5, S * .14); ctx.lineTo(S * .9, S * .82); ctx.lineTo(S * .58, S * .82); ctx.closePath(); ctx.fillStyle = '#8a5a12'; ctx.fill(); ctx.strokeStyle = 'rgba(80,40,0,.4)'; ctx.lineWidth = S * .012; for (let i = 1; i < 5; i++) { const y = S * (.14 + i * .136), hw = (y - S * .14) / (S * .68) * S * .4; ctx.beginPath(); ctx.moveTo(S / 2 - hw, y); ctx.lineTo(S / 2 + hw, y); ctx.stroke(); } ctx.fillStyle = '#fff3b0'; ctx.beginPath(); ctx.moveTo(S * .5, S * .14); ctx.lineTo(S * .56, S * .24); ctx.lineTo(S * .44, S * .24); ctx.fill(); },
  eye(ctx, S) {
    ctx.beginPath(); ctx.moveTo(S * .08, S * .45); ctx.quadraticCurveTo(S * .5, S * .08, S * .92, S * .45); ctx.quadraticCurveTo(S * .5, S * .78, S * .08, S * .45); ctx.closePath(); ctx.fillStyle = '#fff8e6'; ctx.fill(); outlined(ctx, S, .06, '#1b3a8a');
    ctx.beginPath(); ctx.arc(S * .5, S * .44, S * .15, 0, Math.PI * 2); ctx.fillStyle = rg(ctx, S * .46, S * .4, S * .01, S * .16, [[0, '#7fc8ff'], [1, '#1b3a8a']]); ctx.fill(); ctx.beginPath(); ctx.arc(S * .5, S * .44, S * .06, 0, 7); ctx.fillStyle = '#0a0a1a'; ctx.fill();
    ctx.strokeStyle = '#1b3a8a'; ctx.lineWidth = S * .055; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(S * .44, S * .62); ctx.lineTo(S * .4, S * .86); ctx.stroke(); ctx.beginPath(); ctx.moveTo(S * .6, S * .6); ctx.quadraticCurveTo(S * .72, S * .86, S * .84, S * .76); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(S * .12, S * .3); ctx.quadraticCurveTo(S * .5, S * .02, S * .9, S * .26); ctx.stroke();
  },
  anchor(ctx, S) {
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'; const path = () => { ctx.beginPath(); ctx.arc(S * .5, S * .2, S * .08, 0, Math.PI * 2); ctx.moveTo(S * .5, S * .28); ctx.lineTo(S * .5, S * .84); ctx.moveTo(S * .3, S * .38); ctx.lineTo(S * .7, S * .38); ctx.moveTo(S * .16, S * .58); ctx.quadraticCurveTo(S * .22, S * .84, S * .5, S * .84); ctx.quadraticCurveTo(S * .78, S * .84, S * .84, S * .58); };
    path(); ctx.lineWidth = S * .13; ctx.strokeStyle = 'rgba(10,20,30,.85)'; ctx.stroke(); path(); ctx.lineWidth = S * .075; ctx.strokeStyle = lg(ctx, S * .2, 0, S * .8, 0, [[0, '#7a8aa0'], [.5, '#f0f6ff'], [1, '#7a8aa0']]); ctx.stroke();
    [[.16, .58, -1], [.84, .58, 1]].forEach(([x, y, d]) => { ctx.beginPath(); ctx.moveTo(x * S, y * S - S * .08); ctx.lineTo(x * S - d * S * .06, y * S + S * .04); ctx.lineTo(x * S + d * S * .07, y * S + S * .02); ctx.closePath(); ctx.fillStyle = '#d0dcea'; ctx.fill(); outlined(ctx, S, .025); });
  },
  shield(ctx, S) {
    ctx.beginPath(); ctx.moveTo(S * .18, S * .16); ctx.lineTo(S * .82, S * .16); ctx.lineTo(S * .82, S * .46); ctx.quadraticCurveTo(S * .8, S * .76, S * .5, S * .9); ctx.quadraticCurveTo(S * .2, S * .76, S * .18, S * .46); ctx.closePath();
    ctx.fillStyle = lg(ctx, 0, S * .16, 0, S * .9, [[0, '#4f86c6'], [1, '#13335e']]); ctx.fill(); ctx.lineWidth = S * .07; ctx.strokeStyle = lg(ctx, 0, 0, S, S, [[0, '#f0f6ff'], [.5, '#8a9ab0'], [1, '#e0e8f0']]); ctx.stroke(); outlined(ctx, S, .025);
    ctx.fillStyle = '#ffc21a'; rr(ctx, S * .45, S * .26, S * .1, S * .5, S * .02); ctx.fill(); rr(ctx, S * .3, S * .4, S * .4, S * .1, S * .02); ctx.fill();
  },
  swords(ctx, S) {
    [-1, 1].forEach(d => { ctx.save(); ctx.translate(S / 2, S / 2); ctx.rotate(d * Math.PI / 4);
      ctx.beginPath(); ctx.moveTo(-S * .045, S * .16); ctx.lineTo(-S * .045, -S * .3); ctx.lineTo(0, -S * .42); ctx.lineTo(S * .045, -S * .3); ctx.lineTo(S * .045, S * .16); ctx.closePath();
      ctx.fillStyle = lg(ctx, -S * .05, 0, S * .05, 0, [[0, '#9aa8bb'], [.5, '#ffffff'], [1, '#7a8aa0']]); ctx.fill(); outlined(ctx, S, .025);
      rr(ctx, -S * .14, S * .15, S * .28, S * .055, S * .02); ctx.fillStyle = '#ffc21a'; ctx.fill(); outlined(ctx, S, .02);
      rr(ctx, -S * .03, S * .2, S * .06, S * .17, S * .02); ctx.fillStyle = '#6b3a16'; ctx.fill(); ctx.beginPath(); ctx.arc(0, S * .4, S * .045, 0, 7); ctx.fillStyle = '#ffc21a'; ctx.fill(); ctx.restore(); });
  },
  pearl(ctx, S) {
    ctx.beginPath(); ctx.moveTo(S * .5, S * .86); for (let i = 0; i <= 8; i++) { const a = Math.PI * (1.08 + i * .105); ctx.lineTo(S * .5 + Math.cos(a) * S * .42, S * .7 + Math.sin(a) * S * .5); } ctx.closePath();
    ctx.fillStyle = lg(ctx, 0, S * .2, 0, S * .86, [[0, '#ffd9e8'], [1, '#d97aa0']]); ctx.fill(); outlined(ctx, S, .035);
    ctx.strokeStyle = 'rgba(140,40,80,.4)'; ctx.lineWidth = S * .015; for (let i = 1; i < 8; i++) { const a = Math.PI * (1.08 + i * .105); ctx.beginPath(); ctx.moveTo(S * .5, S * .86); ctx.lineTo(S * .5 + Math.cos(a) * S * .42, S * .7 + Math.sin(a) * S * .5); ctx.stroke(); }
    ctx.beginPath(); ctx.arc(S * .5, S * .62, S * .17, 0, Math.PI * 2); ctx.fillStyle = rg(ctx, S * .45, S * .56, S * .01, S * .18, [[0, '#ffffff'], [.6, '#e8e6ff'], [1, '#a8a0d0']]); ctx.fill(); outlined(ctx, S, .025);
  },
  candy(ctx, S, col = '#ff4fa3') {
    const tri = d => { ctx.beginPath(); ctx.moveTo(S / 2 + d * S * .2, S / 2); ctx.lineTo(S / 2 + d * S * .44, S * .3); ctx.lineTo(S / 2 + d * S * .44, S * .7); ctx.closePath(); ctx.fillStyle = shade(col, .3); ctx.fill(); outlined(ctx, S, .03); };
    tri(-1); tri(1); ctx.beginPath(); ctx.arc(S / 2, S / 2, S * .23, 0, Math.PI * 2); ctx.fillStyle = rg(ctx, S * .44, S * .44, S * .02, S * .25, [[0, shade(col, .6)], [1, col]]); ctx.fill(); outlined(ctx, S);
    ctx.save(); ctx.clip(); ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = S * .04; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(S * (.3 + i * .12), S * .25); ctx.lineTo(S * (.5 + i * .12), S * .75); ctx.stroke(); } ctx.restore();
  },
  lollipop(ctx, S) {
    rr(ctx, S * .47, S * .5, S * .06, S * .42, S * .03); ctx.fillStyle = '#fff'; ctx.fill(); outlined(ctx, S, .025);
    ctx.beginPath(); ctx.arc(S / 2, S * .38, S * .28, 0, Math.PI * 2); ctx.fillStyle = '#ff4fa3'; ctx.fill(); outlined(ctx, S);
    ctx.save(); ctx.beginPath(); ctx.arc(S / 2, S * .38, S * .28, 0, Math.PI * 2); ctx.clip(); ctx.strokeStyle = '#ffe14f'; ctx.lineWidth = S * .06; ctx.beginPath();
    for (let t = 0; t < 14; t += .1) { const r = t * S * .021; ctx.lineTo(S / 2 + Math.cos(t * 1.4) * r, S * .38 + Math.sin(t * 1.4) * r); } ctx.stroke(); ctx.restore(); gloss(ctx, S, S * .4, S * .28, S * .07, S * .04);
  },
  donut(ctx, S) {
    ctx.beginPath(); ctx.arc(S / 2, S / 2, S * .38, 0, Math.PI * 2); ctx.arc(S / 2, S / 2, S * .13, 0, Math.PI * 2, true); ctx.fillStyle = '#d98a3a'; ctx.fill('evenodd'); outlined(ctx, S);
    ctx.beginPath(); for (let i = 0; i <= 24; i++) { const a = i / 24 * Math.PI * 2, r = S * (.33 + (i % 2 ? .03 : 0)); ctx.lineTo(S / 2 + Math.cos(a) * r, S / 2 + Math.sin(a) * r); } ctx.arc(S / 2, S / 2, S * .16, 0, Math.PI * 2, true); ctx.fillStyle = '#ff7ad9'; ctx.fill('evenodd');
    const cs = ['#fff', '#ffe14f', '#39d7ff', '#7cff6b']; for (let i = 0; i < 16; i++) { const a = i * 2.4, r = S * (.2 + (i * 7 % 10) / 100); ctx.save(); ctx.translate(S / 2 + Math.cos(a) * r, S / 2 + Math.sin(a) * r); ctx.rotate(a * 3); ctx.fillStyle = cs[i % 4]; rr(ctx, -S * .025, -S * .008, S * .05, S * .016, S * .008); ctx.fill(); ctx.restore(); }
  },
  chip(ctx, S, col = '#e0344d') {
    ctx.beginPath(); ctx.arc(S / 2, S / 2, S * .38, 0, Math.PI * 2); ctx.fillStyle = col; ctx.fill(); outlined(ctx, S);
    ctx.fillStyle = '#fff'; for (let i = 0; i < 8; i++) { ctx.save(); ctx.translate(S / 2, S / 2); ctx.rotate(i * Math.PI / 4); rr(ctx, -S * .04, -S * .38, S * .08, S * .09, S * .01); ctx.fill(); ctx.restore(); }
    ctx.beginPath(); ctx.arc(S / 2, S / 2, S * .25, 0, Math.PI * 2); ctx.fillStyle = shade(col, -.2); ctx.fill(); ctx.lineWidth = S * .02; ctx.strokeStyle = '#fff'; ctx.setLineDash([S * .03, S * .03]); ctx.stroke(); ctx.setLineDash([]);
    ctx.font = `${S * .24}px ${DISPLAY}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff'; ctx.fillText('$', S / 2, S * .52);
  },
  lantern(ctx, S) {
    ctx.strokeStyle = '#ffc21a'; ctx.lineWidth = S * .03; ctx.beginPath(); ctx.moveTo(S / 2, S * .04); ctx.lineTo(S / 2, S * .14); ctx.stroke();
    rr(ctx, S * .36, S * .12, S * .28, S * .07, S * .02); ctx.fillStyle = '#ffc21a'; ctx.fill(); rr(ctx, S * .36, S * .76, S * .28, S * .07, S * .02); ctx.fill();
    ctx.beginPath(); ctx.ellipse(S / 2, S * .48, S * .32, S * .3, 0, 0, Math.PI * 2); ctx.fillStyle = rg(ctx, S * .5, S * .48, S * .05, S * .34, [[0, '#ffb0a0'], [.5, '#e01a2a'], [1, '#7a0010']]); ctx.fill(); outlined(ctx, S);
    ctx.strokeStyle = 'rgba(255,200,60,.55)'; ctx.lineWidth = S * .018; [-.18, 0, .18].forEach(d => { ctx.beginPath(); ctx.ellipse(S / 2, S * .48, Math.abs(d) * S + S * .02, S * .3, 0, 0, Math.PI * 2); ctx.stroke(); });
    ctx.strokeStyle = '#ffc21a'; ctx.lineWidth = S * .025; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(S / 2 + i * S * .02, S * .83); ctx.lineTo(S / 2 + i * S * .03, S * .96); ctx.stroke(); }
  },
  rocket(ctx, S) {
    ctx.save(); ctx.translate(S / 2, S / 2); ctx.rotate(.6);
    const fl = ctx.createLinearGradient(0, S * .2, 0, S * .5); fl.addColorStop(0, '#ffe14f'); fl.addColorStop(1, 'rgba(255,90,0,0)'); ctx.fillStyle = fl; ctx.beginPath(); ctx.moveTo(-S * .08, S * .22); ctx.lineTo(0, S * .5); ctx.lineTo(S * .08, S * .22); ctx.fill();
    [-1, 1].forEach(d => { ctx.beginPath(); ctx.moveTo(d * S * .1, S * .05); ctx.lineTo(d * S * .22, S * .25); ctx.lineTo(d * S * .1, S * .2); ctx.closePath(); ctx.fillStyle = '#ff3b5c'; ctx.fill(); outlined(ctx, S, .025); });
    ctx.beginPath(); ctx.moveTo(0, -S * .42); ctx.bezierCurveTo(S * .16, -S * .28, S * .14, S * .1, S * .1, S * .22); ctx.lineTo(-S * .1, S * .22); ctx.bezierCurveTo(-S * .14, S * .1, -S * .16, -S * .28, 0, -S * .42);
    ctx.fillStyle = lg(ctx, -S * .14, 0, S * .14, 0, [[0, '#9aa8bb'], [.5, '#ffffff'], [1, '#8a9ab0']]); ctx.fill(); outlined(ctx, S);
    ctx.beginPath(); ctx.moveTo(0, -S * .42); ctx.bezierCurveTo(S * .08, -S * .35, S * .11, -S * .28, S * .12, -S * .24); ctx.lineTo(-S * .12, -S * .24); ctx.bezierCurveTo(-S * .11, -S * .28, -S * .08, -S * .35, 0, -S * .42); ctx.fillStyle = '#ff3b5c'; ctx.fill();
    ctx.beginPath(); ctx.arc(0, -S * .08, S * .065, 0, Math.PI * 2); ctx.fillStyle = '#39d7ff'; ctx.fill(); ctx.lineWidth = S * .025; ctx.strokeStyle = '#2a3a50'; ctx.stroke(); ctx.restore();
  },
  wild(ctx, S, t = 'WILD', col = '#ffc21a') {
    rr(ctx, S * .06, S * .24, S * .88, S * .52, S * .12); ctx.fillStyle = lg(ctx, 0, S * .24, 0, S * .76, [[0, shade(col, .1)], [1, shade(col, -.55)]]); ctx.fill();
    ctx.lineWidth = S * .05; ctx.strokeStyle = lg(ctx, 0, S * .24, 0, S * .76, [[0, '#fff6c2'], [.5, '#ffc21a'], [1, '#a86a00']]); ctx.stroke(); outlined(ctx, S, .02);
    ctx.font = `${S * .3}px ${DISPLAY}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round'; ctx.lineWidth = S * .07; ctx.strokeStyle = 'rgba(15,5,25,.85)'; ctx.strokeText(t, S / 2, S * .52);
    ctx.fillStyle = lg(ctx, 0, S * .38, 0, S * .64, [[0, '#ffffff'], [1, '#ffe27a']]); ctx.fillText(t, S / 2, S * .52);
    ctx.fillStyle = '#fff'; [[.16, .2], [.86, .8], [.84, .2]].forEach(([x, y]) => { starPath(ctx, x * S, y * S, 4, S * .06, S * .018); ctx.fill(); });
  },
  scatter(ctx, S, t = 'BONUS', col = '#ff4fd8') {
    starPath(ctx, S / 2, S / 2, 12, S * .46, S * .34, 0); ctx.fillStyle = rg(ctx, S / 2, S / 2, S * .05, S * .46, [[0, shade(col, .55)], [.7, col], [1, shade(col, -.45)]]); ctx.fill(); outlined(ctx, S);
    ctx.beginPath(); ctx.arc(S / 2, S / 2, S * .27, 0, Math.PI * 2); ctx.fillStyle = 'rgba(20,6,30,.55)'; ctx.fill(); ctx.lineWidth = S * .025; ctx.strokeStyle = '#fff'; ctx.stroke();
    ctx.font = `${S * (t.length > 5 ? .14 : .17)}px ${DISPLAY}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineWidth = S * .05; ctx.strokeStyle = 'rgba(15,5,25,.9)'; ctx.strokeText(t, S / 2, S * .52); ctx.fillStyle = '#fff'; ctx.fillText(t, S / 2, S * .52);
  },
};
function paintSym(ctx, spec, S) {
  const [name, ...args] = spec; ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = S * .05; ctx.shadowOffsetY = S * .03;
  P[name](ctx, S, ...args); ctx.restore();
}

/* ---------- machines ---------- */
const L4 = (a, b, c, d) => [['letter', 'J', a], ['letter', 'Q', b], ['letter', 'K', c], ['letter', 'A', d]];
const MACHINES = [
  { id: 'crown', name: 'Crown Royale', vol: 'med', bg: ['#3b0f7a', '#12052e'], frame: '#ffc21a', sym: [...L4('#4fd1ff', '#3ddc84', '#ff6b8b', '#ffb21a'), ['gem', '#a855f7'], ['crown'], ['seven', '#ff3b5c'], ['wild', 'WILD', '#ffc21a'], ['scatter', 'BONUS', '#ff4fd8']] },
  { id: 'blaze', name: 'Blazing 7s', vol: 'high', bg: ['#8a1a05', '#220402'], frame: '#ff7a00', sym: [['cherry'], ['lemon'], ['orange'], ['plum'], ['bell'], ['bar', 3], ['seven', '#ff2a2a'], ['wild', 'WILD', '#ff5a00'], ['scatter', 'BONUS', '#ffb800']] },
  { id: 'pharaoh', name: 'Pharaoh’s Gold', vol: 'high', bg: ['#6b4407', '#1c1003'], frame: '#d9a53a', sym: [['letter', '10', '#2f7de1'], ...L4('#2fb5e1', '#e1b12f', '#e1722f', '#d9a53a').slice(0, 3), ['gem', '#2f6fe1'], ['pyramid'], ['eye'], ['wild', 'WILD', '#d9a53a'], ['scatter', 'BONUS', '#2f7de1']] },
  { id: 'orbit', name: 'Orbit Heist', vol: 'high', bg: ['#1a1f6b', '#04051a'], frame: '#00e5ff', sym: [...L4('#00e5ff', '#b388ff', '#ff4081', '#69f0ae'), ['moon'], ['planet', '#ff8a3d'], ['rocket'], ['wild', 'WILD', '#00b8d4'], ['scatter', 'BONUS', '#b388ff']] },
  { id: 'sugar', name: 'Sugar Rush', vol: 'low', bg: ['#b0306f', '#3d0a26'], frame: '#ff9ad5', sym: [['candy', '#ff4fa3'], ['candy', '#39d7ff'], ['heart', '#ff3b6b'], ['gem', '#7cff6b'], ['donut'], ['lollipop'], ['star', '#ffd23f'], ['wild', 'WILD', '#ff7ad9'], ['scatter', 'SWEET', '#ffb800']] },
  { id: 'clover', name: 'Lucky Clover', vol: 'low', bg: ['#0f6b3f', '#03200f'], frame: '#ffd23f', sym: [...L4('#7ee787', '#ffd23f', '#ff8f8f', '#8fd3ff'), ['horseshoe'], ['coin', '$', '#ffc21a'], ['clover'], ['wild', 'WILD', '#22b35a'], ['scatter', 'BONUS', '#ffd23f']] },
  { id: 'valhalla', name: 'Valhalla Raid', vol: 'high', bg: ['#2f4a63', '#070d14'], frame: '#9fd3ff', sym: [...L4('#9fd3ff', '#c0c8d8', '#6fa8dc', '#ffd23f'), ['shield'], ['swords'], ['lightning', '#7fdcff'], ['wild', 'WILD', '#4f86c6'], ['scatter', 'BONUS', '#7fdcff']] },
  { id: 'ocean', name: 'Deep Sea Loot', vol: 'low', bg: ['#0a5f7a', '#021820'], frame: '#22e3c4', sym: [...L4('#22e3c4', '#4fc3ff', '#ff8fb0', '#ffd23f'), ['gem', '#22e3c4'], ['anchor'], ['pearl'], ['wild', 'WILD', '#0aa3a3'], ['scatter', 'BONUS', '#ff8fb0']] },
  { id: 'neon', name: 'Neon Nights', vol: 'med', bg: ['#6b0f6a', '#14031a'], frame: '#ff2bd6', sym: [['bar', 1, '#2a0f3a'], ['bar', 2, '#2a0f3a'], ['cherry'], ['chip', '#e0344d'], ['star', '#fff04f'], ['gem', '#ff2bd6'], ['seven', '#00f0ff'], ['wild', 'WILD', '#ff2bd6'], ['scatter', 'BONUS', '#00f0ff']] },
  { id: 'dragon', name: 'Dragon Fortune', vol: 'high', bg: ['#8a0f1e', '#250308'], frame: '#ffd23f', sym: [['letter', '10', '#ffd23f'], ...L4('#ff6b4f', '#ffd23f', '#3ddc84', '#ff3b3b').slice(0, 3), ['lantern'], ['coin', 'hole', '#ffc21a'], ['gem', '#1fbf6b'], ['wild', 'WILD', '#e01a2a'], ['scatter', 'BONUS', '#ffd23f']] },
];
const SPRITES = {};
function sprites(M, S) {
  const key = M.id + ':' + S; if (SPRITES[key]) return SPRITES[key];
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  return SPRITES[key] = M.sym.map(spec => { const c = document.createElement('canvas'); c.width = c.height = Math.round(S * dpr); const x = c.getContext('2d'); x.scale(dpr, dpr); paintSym(x, spec, S); return c; });
}
MACHINES.forEach(M => addGame({
  id: 'slot-' + M.id, name: M.name, cat: 'slots', tag: ({ low: 'Low', med: 'Medium', high: 'High' })[M.vol] + ' volatility · 10 lines', feedName: M.name,
  rules: '<p>5 reels, 3 rows, 10 paylines. Line wins pay left to right for 3, 4 or 5 matching symbols. The WILD stands in for any symbol except the scatter.</p><p>Land 3 or more scatters anywhere for 8 free spins. Scatters during free spins add 8 more.</p>',
  art(ctx, w, h) {
    artBg(ctx, w, h, M.bg[0], M.bg[1]); const sp = sprites(M, 128), s = w * .5;
    ctx.drawImage(sp[4], w * .02, h * .26, s * .8, s * .8); ctx.drawImage(sp[5], w * .58, h * .26, s * .8, s * .8); ctx.drawImage(sp[6], w / 2 - s / 2, h * .12, s, s);
    ctx.drawImage(sp[7], w / 2 - s * .38, h * .44, s * .76, s * .76);
  },
  mount: () => mountSlot(M),
}));

function mountSlot(M) {
  const g = gameById('slot-' + M.id), PR = PROFILES[M.vol], T = PR.w.reduce((a, b) => a + b, 0);
  const LEVELS = [10, 20, 50, 100, 200, 500, 1000, 2500];
  gameShell(g, `<div class="field"><label>Total bet</label><div class="stepper"><button type="button" id="sMinus">−</button><b class="num" id="sBetV">20</b><button type="button" id="sPlus">+</button></div><small class="muted">Line bet <span id="sLine" class="num">2</span> × 10 lines</small></div>
    <button class="btn play" id="sSpin" type="button">Spin</button>
    <div class="field"><label>Auto spins</label><div class="seg" id="sAuto"><button type="button" data-v="10">10</button><button type="button" data-v="25">25</button><button type="button" data-v="50">50</button></div></div>
    <div class="field"><label>Speed</label><div class="seg" id="sTurbo"><button type="button" data-v="0" class="on">Normal</button><button type="button" data-v="1">Turbo</button></div></div>
    <button class="btn ghost" id="sPay" type="button">Pay table</button>`,
    `<div class="slot" style="--sb1:${M.bg[0]};--sb2:${M.bg[1]};--sf:${M.frame}"><div class="slot-top"><b>${esc(M.name)}</b><span class="fs hidden" id="sFs"></span></div><div class="slot-cab"><canvas id="sCv"></canvas><div class="bigwin hidden" id="sBig"></div></div>
     <div class="slot-bar"><div><span class="label">Win</span><b class="num" id="sWin">0</b></div><div><span class="label">Balance</span><b class="num" id="sBal"></b></div></div></div>`);
  let lvl = 1, turbo = false, spinning = false, autoLeft = 0, ctx, W, H, cw, ch, pad, gap, sp, raf = 0;
  const pick = () => { let r = Math.random() * T; for (let i = 0; i < PR.w.length; i++) if ((r -= PR.w[i]) < 0) return i; return 0; };
  const spinGrid = () => [0, 1, 2, 3, 4].map(() => [pick(), pick(), pick()]);
  let grid = spinGrid(), reels = null, hitSet = new Set(), winLines = [], t0w = 0, freeMode = false;
  const bet = () => LEVELS[lvl], paintBet = () => { $('sBetV').textContent = fmt(bet()); $('sLine').textContent = shortN(bet() / 10); };
  const paintBalS = () => { if ($('sBal')) $('sBal').textContent = fmt(avail()); };
  $('sMinus').onclick = () => { if (!spinning && lvl > 0) { lvl--; paintBet(); sfx.click(); } };
  $('sPlus').onclick = () => { if (!spinning && lvl < LEVELS.length - 1) { lvl++; paintBet(); sfx.click(); } };
  segBind('sTurbo', v => { turbo = v === '1'; });
  paintBet(); paintBalS();
  function evaluate(gr, lineBet) {
    let win = 0; const hits = new Set(), lines = [];
    LINES.forEach((L, li) => {
      const s = L.map((r, c) => gr[c][r]); let base = s.find(x => x !== 7); if (base === undefined) base = 6; if (base === 8) return;
      let n = 0; for (const x of s) { if (x === base || x === 7) n++; else break; }
      if (n >= 3) { const amt = PR.pay[base][n - 3] * lineBet; win += amt; lines.push({ li, n, amt }); for (let c = 0; c < n; c++) hits.add(c + ',' + L[c]); }
    });
    const sc = []; gr.forEach((col, c) => col.forEach((x, r) => { if (x === 8) sc.push(c + ',' + r); }));
    if (sc.length >= 3) sc.forEach(k => hits.add(k));
    return { win, hits, lines, scatters: sc.length };
  }
  function size() {
    W = Math.min($('sCv').parentElement.clientWidth, 780); pad = Math.max(8, W * .02); gap = Math.max(4, W * .012);
    cw = (W - pad * 2 - gap * 4) / 5; ch = cw * .92; H = Math.round(ch * 3 + pad * 2); ctx = fitCanvas($('sCv'), W, H); sp = sprites(M, Math.round(cw));
  }
  function draw(now) {
    ctx.clearRect(0, 0, W, H);
    for (let c = 0; c < 5; c++) {
      const x = pad + c * (cw + gap);
      ctx.save(); rr(ctx, x, pad, cw, ch * 3, cw * .08); ctx.fillStyle = 'rgba(255,255,255,.94)'; ctx.fill(); ctx.clip();
      ctx.fillStyle = lg(ctx, 0, pad, 0, pad + ch * 3, [[0, 'rgba(0,0,0,.18)'], [.12, 'rgba(0,0,0,0)'], [.88, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,.2)']]); ctx.fillRect(x, pad, cw, ch * 3);
      const R = reels && reels[c];
      if (R && !R.done) {
        const p = R.pos, i0 = Math.floor(p / ch), off = p - i0 * ch, blur = R.speed > ch * .25;
        for (let k = -1; k <= 3; k++) { const idx = i0 + k; if (idx < 0 || idx >= R.strip.length) continue; const y = pad + k * ch - off; drawSym(R.strip[idx], x, y, 1, blur); }
      } else {
        for (let r = 0; r < 3; r++) { const hit = hitSet.has(c + ',' + r); const sc = hit ? 1 + .07 * Math.sin((now - t0w) / 140) : 1; drawSym(grid[c][r], x, pad + r * ch, sc, false, hit ? 1 : hitSet.size ? .45 : 1); }
      }
      ctx.restore();
      ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(0,0,0,.35)'; rr(ctx, x, pad, cw, ch * 3, cw * .08); ctx.stroke();
    }
    if (winLines.length && !reels) {
      const showAll = (now - t0w) < 1400, cur = winLines[Math.floor((now - t0w - 1400) / 1100) % winLines.length];
      (showAll ? winLines : [cur]).forEach(wl => {
        const L = LINES[wl.li]; ctx.save(); ctx.strokeStyle = LINE_COL[wl.li]; ctx.lineWidth = Math.max(3, cw * .045); ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.shadowColor = LINE_COL[wl.li]; ctx.shadowBlur = 12;
        ctx.beginPath(); L.forEach((r, c) => { const px = pad + c * (cw + gap) + cw / 2, py = pad + r * ch + ch / 2; c ? ctx.lineTo(px, py) : ctx.moveTo(pad * .3, py); }); ctx.lineTo(W - pad * .3, pad + L[4] * ch + ch / 2); ctx.stroke(); ctx.restore();
        if (!showAll) { const px = pad + (wl.n - 1) * (cw + gap) + cw / 2, py = pad + L[wl.n - 1] * ch + ch * .86; ctx.save(); ctx.font = `800 ${Math.max(12, cw * .16)}px Nunito,sans-serif`; ctx.textAlign = 'center'; ctx.lineWidth = 4; ctx.strokeStyle = '#000'; ctx.strokeText(fmt(wl.amt), px, py); ctx.fillStyle = '#ffe14f'; ctx.fillText(fmt(wl.amt), px, py); ctx.restore(); }
      });
    }
  }
  function drawSym(i, x, y, sc = 1, blur = false, alpha = 1) {
    const s = sp[i], m = cw * .08, w = cw - m * 2, hh = Math.min(ch - m * 2, w), dx = x + cw / 2, dy = y + ch / 2;
    ctx.globalAlpha = alpha;
    if (blur) { ctx.globalAlpha = .5 * alpha; ctx.drawImage(s, dx - w / 2, dy - hh / 2 - ch * .12, w, hh * 1.25); ctx.globalAlpha = .5 * alpha; ctx.drawImage(s, dx - w / 2, dy - hh / 2 + ch * .05, w, hh * 1.1); }
    else ctx.drawImage(s, dx - w * sc / 2, dy - hh * sc / 2, w * sc, hh * sc);
    ctx.globalAlpha = 1;
  }
  function loop(now) { draw(now); raf = requestAnimationFrame(loop); }
  async function animate(final) {
    hitSet = new Set(); winLines = [];
    const base = turbo ? 380 : 750, stag = turbo ? 110 : 230, t0 = performance.now(); let scSeen = 0;
    let seen = 0, anti = 0;
    reels = final.map((col, c) => {
      if (seen >= 2 && c > 0) anti += turbo ? 300 : 650;
      seen += col.filter(x => x === 8).length;
      const extra = 14 + c * (turbo ? 3 : 5) + (anti ? 8 : 0), strip = [...grid[c], ...Array.from({ length: extra }, pick), ...col];
      return { strip, end: (strip.length - 3) * ch, pos: 0, speed: 0, done: false, dur: base + c * stag + anti };
    });
    await new Promise(res => {
      const st = () => {
        const now = performance.now(); let all = true;
        reels.forEach((R, c) => {
          if (R.done) return; const u = Math.min(1, (now - t0) / R.dur);
          let p = R.end * (u < 1 ? 1 - Math.pow(1 - u, 3) : 1);
          if (u > .85) p += Math.sin((u - .85) / .15 * Math.PI) * ch * .08;
          R.speed = Math.abs(p - R.pos); R.pos = p;
          if (u >= 1) { R.done = true; R.pos = R.end; grid[c] = final[c]; sfx.click(); const s = final[c].filter(x => x === 8).length; scSeen += s; if (s) tone(980 + scSeen * 120, .12, 'triangle', .05); }
          else all = false;
        });
        all ? res() : requestAnimationFrame(st);
      };
      st();
    });
    reels = null; grid = final.map(c => [...c]);
  }
  async function bigWin(amount, x) {
    const el = $('sBig'), label = x >= 100 ? 'EPIC WIN' : x >= 50 ? 'MEGA WIN' : 'BIG WIN';
    el.classList.remove('hidden'); el.innerHTML = `<b>${label}</b><span class="num" id="sBigN">0</span>`; sfx.big();
    const t0 = performance.now(), dur = Math.min(4000, 1600 + x * 20);
    await new Promise(res => { const st = () => { const u = Math.min(1, (performance.now() - t0) / dur); const n = $('sBigN'); if (n) n.textContent = fmt(amount * ease.out3(u)); u < 1 && $('sBig') ? requestAnimationFrame(st) : res(); }; st(); });
    await sleep(900); if ($('sBig')) el.classList.add('hidden');
  }
  async function spinOnce() {
    const b = bet(); if (!take(b)) return false;
    spinning = true; on('slot'); $('sSpin').disabled = true; lock(['sMinus', 'sPlus'], true); $('sWin').textContent = '0'; paintBalS();
    const lb = b / 10; let gr = spinGrid(), r = evaluate(gr, lb);
    if (rigged(b)) { let n = 0; while ((r.win > 0 || r.scatters >= 3) && n++ < 300) { gr = spinGrid(); r = evaluate(gr, lb); } }
    await animate(gr); let total = r.win;
    if (r.win) { hitSet = r.hits; winLines = r.lines; t0w = performance.now(); $('sWin').textContent = fmt(total); r.win >= b * 3 ? sfx.win() : sfx.pop(); await sleep(turbo ? 500 : 900); }
    if (r.scatters >= 3) {
      hitSet = r.hits; t0w = performance.now(); flash('<b>FREE SPINS</b><span>8 spins</span>', 'win'); sfx.big(); await sleep(1500);
      let free = 8, played = 0; freeMode = true; document.querySelector('.slot').classList.add('free');
      while (free > 0 && $('sCv')) {
        free--; played++; $('sFs').classList.remove('hidden'); $('sFs').textContent = `Free spin ${played} · ${free} left`;
        const fg = spinGrid(), fr = evaluate(fg, lb); await animate(fg); total += fr.win; $('sWin').textContent = fmt(total);
        if (fr.win) { hitSet = fr.hits; winLines = fr.lines; t0w = performance.now(); sfx.pop(); await sleep(turbo ? 450 : 800); }
        if (fr.scatters >= 3) { free += 8; flash('<b>+8 SPINS</b>', 'win'); sfx.big(); await sleep(900); }
        await sleep(turbo ? 120 : 250);
      }
      freeMode = false; const sl = document.querySelector('.slot'); if (sl) sl.classList.remove('free'); if ($('sFs')) $('sFs').classList.add('hidden');
    }
    const ret = Math.floor(total); record(M.name, b, ret); paintBalS();
    if (ret >= b * 15 && $('sBig')) await bigWin(ret, ret / b); else if (ret > b) flash(`<b>+${fmt(ret - b)}</b>`, 'win'); else if (!ret) sfx.lose();
    spinning = false; off('slot'); if ($('sSpin')) { $('sSpin').disabled = false; lock(['sMinus', 'sPlus'], false); }
    return true;
  }
  $('sSpin').onclick = () => { if (autoLeft) { autoLeft = 0; return; } if (!spinning) spinOnce(); };
  $('sAuto').onclick = async e => {
    const b = e.target.closest('[data-v]'); if (!b) return;
    if (autoLeft) { autoLeft = 0; return; } if (spinning) return;
    autoLeft = +b.dataset.v; b.classList.add('on');
    while (autoLeft > 0 && $('sCv')) { $('sSpin').textContent = 'Stop (' + autoLeft + ')'; autoLeft--; if (!(await spinOnce())) break; $('sSpin').disabled = false; await sleep(turbo ? 150 : 350); }
    autoLeft = 0; if ($('sSpin')) { $('sSpin').textContent = 'Spin'; [...$('sAuto').children].forEach(x => x.classList.remove('on')); }
  };
  $('sPay').onclick = () => {
    const S = 64, sp2 = sprites(M, S), img = i => `<img src="${sp2[i].toDataURL()}" alt="" width="${S}" height="${S}">`;
    modal(`<h2>${esc(M.name)} pay table</h2><p class="muted">Pays are per line bet (total bet ÷ 10), left to right.</p><div class="paytable">${[6, 5, 4, 3, 2, 1, 0].map(i => `<div class="pt">${img(i)}<span>5× <b>${PR.pay[i][2]}</b></span><span>4× <b>${PR.pay[i][1]}</b></span><span>3× <b>${PR.pay[i][0]}</b></span></div>`).join('')}
      <div class="pt">${img(7)}<span>Wild. Substitutes for every symbol except the scatter.</span></div><div class="pt">${img(8)}<span>3+ anywhere: 8 free spins.</span></div></div><div class="controls"><button class="btn ghost" data-close>Close</button></div>`);
  };
  size(); raf = requestAnimationFrame(loop);
  const onR = () => { size(); }; window.addEventListener('resize', onR);
  onLeave(() => { cancelAnimationFrame(raf); autoLeft = 0; window.removeEventListener('resize', onR); });
}
