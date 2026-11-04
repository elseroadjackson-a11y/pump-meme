/* ===== Casino lobby (scroll rows of game tiles) ===== */
const GAMES = [];
const addGame = g => GAMES.push(g);
const CATS = [['originals', 'Bando Originals'], ['tables', 'Table Games'], ['slots', 'Slots']];
let lobbyCat = 'all', lobbyQ = '';

function renderLobby() {
  CURGAME = null;
  $('view').innerHTML = `<div class="lobby">
    <section class="hero">
      <img src="/logo.webp" alt="Bando Casino">
      <div class="hero-t"><h1>Welcome back, ${esc(ME.username)}</h1><p>${GAMES.length} games · play money</p></div>
      <div class="hero-b"><span class="label">Balance</span><b class="num" id="heroBal">${fmt(avail())}</b></div>
    </section>
    <div class="lbar">
      <input id="lq" type="search" placeholder="Search games" value="${esc(lobbyQ)}" autocomplete="off">
      <div class="seg" id="lcat">${[['all', 'All'], ...CATS].map(([k, n]) => `<button type="button" data-v="${k}" class="${k === lobbyCat ? 'on' : ''}">${n.replace('Bando ', '')}</button>`).join('')}</div>
    </div>
    <div id="lrows"></div>
  </div>`;
  $('lq').oninput = () => { lobbyQ = $('lq').value; paintRows(); };
  segBind('lcat', v => { lobbyCat = v; paintRows(); });
  paintRows();
  if (document.fonts) document.fonts.ready.then(() => { if ($('lrows')) drawArts(); });
}
const tileHTML = g => `<a class="tile" href="#play-${g.id}"><canvas class="tart" data-g="${g.id}"></canvas><span class="tname">${esc(g.name)}</span></a>`;
function paintRows() {
  const q = lobbyQ.trim().toLowerCase();
  const match = g => !q || g.name.toLowerCase().includes(q);
  let html = '';
  if (lobbyCat === 'all' && !q) {
    html = CATS.map(([k, n]) => {
      const list = GAMES.filter(g => g.cat === k);
      return `<section class="lrow"><div class="lrow-h"><h2>${n}</h2><span class="muted">${list.length}</span><span class="sp"></span>
        <button class="arrow" data-scroll="${k}" data-dir="-1" aria-label="Scroll left">‹</button><button class="arrow" data-scroll="${k}" data-dir="1" aria-label="Scroll right">›</button>
        <button class="btn ghost sm" data-all="${k}">See all</button></div>
        <div class="scroller" id="sc-${k}">${list.map(tileHTML).join('')}</div></section>`;
    }).join('');
  } else {
    const list = GAMES.filter(g => (lobbyCat === 'all' || g.cat === lobbyCat) && match(g));
    html = list.length ? `<div class="tgrid">${list.map(tileHTML).join('')}</div>` : '<div class="empty">No games match that search.</div>';
  }
  $('lrows').innerHTML = html;
  $('lrows').onclick = e => {
    const a = e.target.closest('[data-scroll]'); if (a) { const sc = $('sc-' + a.dataset.scroll); sc.scrollBy({ left: +a.dataset.dir * sc.clientWidth * .8, behavior: 'smooth' }); }
    const all = e.target.closest('[data-all]'); if (all) { lobbyCat = all.dataset.all; [...$('lcat').children].forEach(b => b.classList.toggle('on', b.dataset.v === lobbyCat)); paintRows(); }
  };
  drawArts();
}
function drawArts() {
  document.querySelectorAll('canvas.tart').forEach(cv => {
    const g = GAMES.find(x => x.id === cv.dataset.g); const r = cv.getBoundingClientRect();
    const w = r.width || 160, h = r.height || 213;
    const ctx = fitCanvas(cv, w, h); cv.style.width = ''; cv.style.height = '';
    try { g.art(ctx, w, h); } catch (e) { console.error(g.id, e); }
  });
}
function openGame(g) {
  window.scrollTo(0, 0);
  g.mount();
}
