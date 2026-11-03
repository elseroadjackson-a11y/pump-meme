// Odds and results from ESPN's public scoreboard feed (free, no key; unofficial, so parsing is defensive).
const BASE = 'https://site.api.espn.com/apis/site/v2/sports/';
const LEAGUES = [
  { key: 'nfl', name: 'NFL', path: 'football/nfl', days: 8 },
  { key: 'cfb', name: 'College Football', path: 'football/college-football', days: 8, extra: '&groups=80' },
  { key: 'nba', name: 'NBA', path: 'basketball/nba', days: 3 },
  { key: 'mlb', name: 'MLB', path: 'baseball/mlb', days: 3 },
  { key: 'epl', name: 'Premier League', path: 'soccer/eng.1', days: 7, soccer: true },
  { key: 'ucl', name: 'Champions League', path: 'soccer/uefa.champions', days: 7, soccer: true },
  { key: 'mls', name: 'MLS', path: 'soccer/usa.1', days: 7, soccer: true },
  { key: 'laliga', name: 'La Liga', path: 'soccer/esp.1', days: 7, soccer: true },
  { key: 'seriea', name: 'Serie A', path: 'soccer/ita.1', days: 7, soccer: true },
];
const TTL = 10 * 60 * 1000;
const cache = {}; // key -> {at, events}

const ymd = d => d.toISOString().slice(0, 10).replace(/-/g, '');
const toNum = v => { if (v == null || v === '') return null; if (typeof v === 'number') return v; const s = String(v).trim().toLowerCase(); if (s === 'even' || s === 'ev') return 100; const n = parseFloat(s.replace(/^[ou]/, '')); return isNaN(n) ? null : n; };
const amer = v => { const n = toNum(v); return n == null || Math.abs(n) < 100 ? null : Math.round(n); };

async function getJSON(url) {
  const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 BandoCasino' } });
  if (!r.ok) throw new Error('ESPN ' + r.status);
  return r.json();
}

function team(c) {
  const t = c.team || {};
  return { name: t.displayName || t.name || '?', short: t.shortDisplayName || t.abbreviation || '?', abbr: t.abbreviation || '', logo: t.logo || (t.logos && t.logos[0] && t.logos[0].href) || '', score: c.score != null ? Number(c.score.value ?? c.score) : null };
}

function parseOdds(o, home, away, soccer) {
  const m = {};
  if (!o) return m;
  // moneyline
  const ml = {
    home: amer(o.moneyline?.home?.close?.odds ?? o.moneyline?.home?.open?.odds ?? o.homeTeamOdds?.moneyLine),
    away: amer(o.moneyline?.away?.close?.odds ?? o.moneyline?.away?.open?.odds ?? o.awayTeamOdds?.moneyLine),
    draw: amer(o.moneyline?.draw?.close?.odds ?? o.moneyline?.draw?.open?.odds ?? o.drawOdds?.moneyLine),
  };
  if (ml.home && ml.away) {
    m.ml = { home: { label: home.name, odds: ml.home }, away: { label: away.name, odds: ml.away } };
    if (soccer && ml.draw) m.ml.draw = { label: 'Draw', odds: ml.draw };
  }
  // spread (from home team's point of view)
  let hl = toNum(o.pointSpread?.home?.close?.line ?? o.pointSpread?.home?.open?.line);
  let hOdds = amer(o.pointSpread?.home?.close?.odds ?? o.homeTeamOdds?.spreadOdds) || -110;
  let aOdds = amer(o.pointSpread?.away?.close?.odds ?? o.awayTeamOdds?.spreadOdds) || -110;
  if (hl == null && typeof o.spread === 'number') {
    const fav = o.homeTeamOdds?.favorite ? 'home' : o.awayTeamOdds?.favorite ? 'away' : null;
    const mag = Math.abs(o.spread);
    hl = fav === 'home' ? -mag : fav === 'away' ? mag : o.spread;
  }
  if (hl == null && typeof o.details === 'string') {
    const d = o.details.match(/^([A-Z0-9&.'-]+)\s+([+-]?\d+(\.\d+)?)$/i);
    if (d && !soccer) { const v = Math.abs(parseFloat(d[2])); hl = d[1] === home.abbr ? -v : d[1] === away.abbr ? v : null; }
  }
  if (hl != null && !soccer) {
    const fmt = x => (x > 0 ? '+' : '') + x;
    m.spread = { home: { label: `${home.short} ${fmt(hl)}`, line: hl, odds: hOdds }, away: { label: `${away.short} ${fmt(-hl)}`, line: -hl, odds: aOdds } };
  }
  // total
  const tl = toNum(o.total?.over?.close?.line ?? o.total?.over?.open?.line ?? o.overUnder);
  if (tl != null && tl > 0) {
    m.total = {
      over: { label: `Over ${tl}`, line: tl, odds: amer(o.total?.over?.close?.odds ?? o.overOdds) || -110 },
      under: { label: `Under ${tl}`, line: tl, odds: amer(o.total?.under?.close?.odds ?? o.underOdds) || -110 },
    };
  }
  return m;
}

function parseEvent(e, L) {
  const c = e.competitions && e.competitions[0]; if (!c) return null;
  const hc = c.competitors.find(x => x.homeAway === 'home'), ac = c.competitors.find(x => x.homeAway === 'away');
  if (!hc || !ac) return null;
  const home = team(hc), away = team(ac);
  const st = c.status || e.status || {}; const ty = st.type || {};
  const odds = (c.odds || []).find(o => o && (o.moneyline || o.homeTeamOdds || o.details)) || null;
  return {
    id: String(e.id), league: L.key, leagueName: L.name, date: e.date, state: ty.state || 'pre', detail: ty.shortDetail || ty.detail || '',
    completed: !!ty.completed, statusName: ty.name || '', home, away, markets: parseOdds(odds, home, away, L.soccer),
  };
}

async function load(L) {
  const c = cache[L.key]; if (c && Date.now() - c.at < TTL) return c.events;
  const now = new Date(), end = new Date(Date.now() + L.days * 864e5);
  const url = `${BASE}${L.path}/scoreboard?dates=${ymd(now)}-${ymd(end)}&limit=300${L.extra || ''}`;
  try {
    const j = await getJSON(url);
    const events = (j.events || []).map(e => parseEvent(e, L)).filter(Boolean)
      .filter(e => e.state !== 'post').sort((a, b) => new Date(a.date) - new Date(b.date));
    cache[L.key] = { at: Date.now(), events }; return events;
  } catch (err) {
    console.error('odds', L.key, err.message);
    return c ? c.events : [];
  }
}

async function board() {
  const out = await Promise.all(LEAGUES.map(async L => ({ key: L.key, name: L.name, events: await load(L) })));
  return out;
}
async function findEvent(id) {
  for (const L of LEAGUES) { const ev = (await load(L)).find(e => e.id === id); if (ev) return ev; }
  return null;
}

async function result(leagueKey, eventId) {
  const L = LEAGUES.find(l => l.key === leagueKey); if (!L) return null;
  const j = await getJSON(`${BASE}${L.path}/summary?event=${eventId}`);
  const comp = j.header?.competitions?.[0]; if (!comp) return null;
  const ty = comp.status?.type || {};
  const name = (ty.name || '').toUpperCase();
  const h = comp.competitors.find(x => x.homeAway === 'home'), a = comp.competitors.find(x => x.homeAway === 'away');
  if (/POSTPONED|CANCELED|CANCELLED|ABANDONED/.test(name)) return { done: true, void: true };
  if (!ty.completed) return { done: false };
  return { done: true, home: Number(h.score), away: Number(a.score) };
}

function grade(b, r) {
  const { home, away } = r;
  if (b.market === 'ml') {
    if (b.side === 'draw') return home === away ? 'win' : 'loss';
    if (home === away) return 'loss';
    return (b.side === 'home') === (home > away) ? 'win' : 'loss';
  }
  if (b.market === 'spread') {
    const diff = (b.side === 'home' ? home - away : away - home) + b.line;
    return diff > 0 ? 'win' : diff === 0 ? 'push' : 'loss';
  }
  if (b.market === 'total') {
    const t = home + away;
    if (t === b.line) return 'push';
    return (b.side === 'over') === (t > b.line) ? 'win' : 'loss';
  }
  return 'void';
}
const profit = (stake, odds) => Math.floor(odds > 0 ? stake * odds / 100 : stake * 100 / Math.abs(odds));

module.exports = { board, findEvent, result, grade, profit, parseEvent, LEAGUES };
