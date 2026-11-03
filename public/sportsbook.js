/* ---------- sportsbook ---------- */
let SB = { data: null, league: 'all', sel: null };
function renderSports() {
  $('view').innerHTML = `<div class="lobbyhead"><h1>Sportsbook</h1><span class="muted">Lines from the major books · refreshed every 10 minutes</span></div>
  <div class="lchips" id="lchips"></div>
  <div class="sbwrap"><div id="board"><div class="empty">Loading the board…</div></div>
  <aside><div class="slip" id="slip"></div><div class="label" style="margin:14px 0 8px">Open bets</div><div id="openBets"></div></aside></div>`;
  paintSlip(); loadOpen();
  api('sports').then(d => { SB.data = d; paintBoard(); }).catch(e => { $('board').innerHTML = `<div class="empty">${esc(e.message)}</div>`; });
}
async function loadOpen() { try { const b = await api('sbets'); $('openBets').innerHTML = betList(b.filter(x => x.status === 'open')); } catch (e) {} }
const oddsStr = o => o == null ? '' : (o > 0 ? '+' : '') + o;
function when(d) {
  const t = new Date(d), now = new Date(), tm = t.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const same = (a, b) => a.toDateString() === b.toDateString();
  const tmr = new Date(now.getTime() + 864e5);
  return same(t, now) ? 'Today ' + tm : same(t, tmr) ? 'Tomorrow ' + tm : t.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }) + ' ' + tm;
}
function paintBoard() {
  const leagues = SB.data.filter(l => l.events.length);
  $('lchips').innerHTML = `<button data-l="all" class="${SB.league === 'all' ? 'on' : ''}">All</button>` +
    SB.data.map(l => `<button data-l="${l.key}" class="${SB.league === l.key ? 'on' : ''}">${esc(l.name)} <span class="muted">${l.events.length}</span></button>`).join('');
  $('lchips').onclick = e => { const b = e.target.closest('[data-l]'); if (!b) return; SB.league = b.dataset.l; paintBoard(); };
  const show = SB.league === 'all' ? leagues : SB.data.filter(l => l.key === SB.league);
  if (!show.length || !show.some(l => l.events.length)) { $('board').innerHTML = '<div class="empty">No games on the board for this league right now.</div>'; return; }
  $('board').innerHTML = show.map(l => `<div class="lgroup"><h3>${esc(l.name)}</h3>${l.events.map(evHTML).join('')}</div>`).join('');
  $('board').onclick = e => {
    const b = e.target.closest('[data-ev]'); if (!b || b.classList.contains('na')) return;
    const ev = findEv(b.dataset.ev); const o = ev.markets[b.dataset.mk][b.dataset.sd];
    SB.sel = { ev, market: b.dataset.mk, side: b.dataset.sd, o };
    document.querySelectorAll('.ob.on').forEach(x => x.classList.remove('on')); b.classList.add('on'); paintSlip();
  };
}
const findEv = id => { for (const l of SB.data) { const e = l.events.find(x => x.id === id); if (e) return e; } };
function ob(ev, mk, sd, top) {
  const o = ev.markets[mk] && ev.markets[mk][sd];
  const live = ev.state !== 'pre';
  if (!o || live) return `<div class="ob na">${live ? 'Live' : '—'}</div>`;
  const on = SB.sel && SB.sel.ev.id === ev.id && SB.sel.market === mk && SB.sel.side === sd ? 'on' : '';
  return `<button class="ob ${on}" data-ev="${ev.id}" data-mk="${mk}" data-sd="${sd}">${top ? `<b>${top}</b>` : ''}${oddsStr(o.odds)}</button>`;
}
function evHTML(ev) {
  const sp = s => { const o = ev.markets.spread && ev.markets.spread[s]; return o ? (o.line > 0 ? '+' : '') + o.line : ''; };
  const tl = s => { const o = ev.markets.total && ev.markets.total[s]; return o ? (s === 'over' ? 'O ' : 'U ') + o.line : ''; };
  const soccer = !!(ev.markets.ml && ev.markets.ml.draw);
  const status = ev.state === 'in' ? `<span class="st" style="background:#4d1220;color:var(--loss)">Live · ${esc(ev.detail)}</span> ${ev.away.score ?? ''}–${ev.home.score ?? ''}` : when(ev.date);
  const row = (t, side, s2) => `<div class="tm">${t.logo ? `<img src="${esc(t.logo)}" alt="" loading="lazy">` : ''}<span>${esc(t.name)}</span></div>
    ${ob(ev, 'spread', side, sp(side))}${ob(ev, 'ml', side)}${ob(ev, 'total', s2, tl(s2))}`;
  return `<div class="ev"><div class="when">${status}</div>
    <div></div><div class="mh">Spread</div><div class="mh">Money</div><div class="mh">Total</div>
    ${row(ev.away, 'away', 'over')}${row(ev.home, 'home', 'under')}
    ${soccer ? `<div class="tm"><span class="muted">Draw</span></div><div></div>${ob(ev, 'ml', 'draw')}<div></div>` : ''}
  </div>`;
}
function paintSlip() {
  const s = SB.sel;
  if (!s) { $('slip').innerHTML = '<div class="label">Bet slip</div><div class="muted">Tap any line to add it here.</div>'; return; }
  $('slip').innerHTML = `<div class="label">Bet slip</div>
    <div class="pk">${esc(s.o.label)} <span class="num" style="color:var(--gold)">${oddsStr(s.o.odds)}</span></div>
    <div class="muted" style="font-size:13px">${esc(s.ev.away.name)} @ ${esc(s.ev.home.name)} · ${{ ml: 'Moneyline', spread: 'Spread', total: 'Total' }[s.market]}</div>
    <input id="sbStake" type="number" min="1" value="50" class="num" placeholder="Risk">
    <div class="muted num" id="sbWin"></div>
    <div class="controls"><button class="btn" id="sbPlace">Place bet</button><button class="btn ghost sm" id="sbClear">Clear</button></div>`;
  const upd = () => { const st = Math.floor(+$('sbStake').value) || 0; $('sbWin').textContent = `To win ${fmt(profitOf(st, s.o.odds))} · Pays ${fmt(st + profitOf(st, s.o.odds))}`; };
  $('sbStake').oninput = upd; upd();
  $('sbClear').onclick = () => { SB.sel = null; document.querySelectorAll('.ob.on').forEach(x => x.classList.remove('on')); paintSlip(); };
  $('sbPlace').onclick = async () => {
    const st = Math.floor(+$('sbStake').value);
    if (!(st > 0)) return toast('Enter a stake');
    if (st > avail()) return toast('Not enough chips');
    $('sbPlace').disabled = true;
    try {
      const r = await api('sbet', { eventId: s.ev.id, market: s.market, side: s.side, stake: st });
      ME.balance = r.me.balance; paintBal(); toast('Bet placed'); SB.sel = null;
      document.querySelectorAll('.ob.on').forEach(x => x.classList.remove('on')); paintSlip(); loadOpen();
    } catch (e) { toast(e.message); $('sbPlace').disabled = false; }
  };
}
