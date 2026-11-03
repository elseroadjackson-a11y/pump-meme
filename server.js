// Bando Casino server: logins (master > bookies > players), play-money balances, sportsbook on ESPN odds.
const express = require('express');
const crypto = require('crypto');
const path = require('path');
const bcrypt = require('bcryptjs');
const sports = require('./sports');

const PORT = process.env.PORT || 3000;
const SECRET = process.env.SESSION_SECRET ||
  crypto.createHash('sha256').update('bando:' + (process.env.DATABASE_URL || 'local')).digest('hex');

/* ---------------- database ---------------- */
let pool;
if (process.env.DATABASE_URL) {
  const { Pool, types } = require('pg');
  types.setTypeParser(20, v => parseInt(v, 10));       // bigint -> number
  types.setTypeParser(1700, v => parseFloat(v));       // numeric -> number
  pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.PGSSL === 'off' ? false : { rejectUnauthorized: false } });
} else {
  console.warn('No DATABASE_URL set: using in-memory database (data resets on restart).');
  const { newDb } = require('pg-mem');
  const { Pool } = newDb().adapters.createPg();
  pool = new Pool();
}
const q = (text, params) => pool.query(text, params).then(r => r.rows);
const num = v => (v == null ? v : Number(v));
const fixUser = u => u && ({ ...u, balance: num(u.balance), deposited: num(u.deposited), wagered: num(u.wagered) });

async function migrate() {
  await q(`CREATE TABLE IF NOT EXISTS users(
    id SERIAL PRIMARY KEY, username TEXT UNIQUE NOT NULL, pass TEXT NOT NULL,
    role TEXT NOT NULL, parent_id INTEGER, balance BIGINT NOT NULL DEFAULT 0,
    deposited BIGINT NOT NULL DEFAULT 0, wagered BIGINT NOT NULL DEFAULT 0,
    created TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
  await q(`CREATE TABLE IF NOT EXISTS plays(
    id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL, game TEXT NOT NULL,
    stake BIGINT NOT NULL, ret BIGINT NOT NULL, created TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
  await q(`CREATE TABLE IF NOT EXISTS sbets(
    id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL, event_id TEXT NOT NULL, league TEXT NOT NULL,
    matchup TEXT NOT NULL, market TEXT NOT NULL, pick TEXT NOT NULL, side TEXT NOT NULL,
    line DOUBLE PRECISION, odds INTEGER NOT NULL, stake BIGINT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open', payout BIGINT NOT NULL DEFAULT 0,
    start_time TIMESTAMPTZ, created TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
}

/* ---------------- sessions ---------------- */
const sign = s => crypto.createHmac('sha256', SECRET).update(s).digest('base64url');
function makeToken(id) { const body = id + '.' + (Date.now() + 1000 * 60 * 60 * 24 * 30); return body + '.' + sign(body); }
function readToken(t) {
  if (!t) return null; const [id, exp, sig] = t.split('.');
  if (!sig || sign(id + '.' + exp) !== sig || +exp < Date.now()) return null; return +id;
}
function cookie(req) { const m = (req.headers.cookie || '').match(/(?:^|;\s*)bando=([^;]+)/); return m && m[1]; }
function setCookie(res, val, maxAge) {
  res.setHeader('Set-Cookie', `bando=${val}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}` + (process.env.NODE_ENV === 'production' ? '; Secure' : ''));
}

const app = express();
app.set('trust proxy', 1);
app.use(express.json());

const wrap = fn => (req, res) => fn(req, res).catch(e => { console.error(e); res.status(500).json({ error: 'Something went wrong on the server.' }); });
const fail = (res, code, msg) => res.status(code).json({ error: msg });

async function auth(req, res, next) {
  const id = readToken(cookie(req));
  if (!id) return fail(res, 401, 'Log in first.');
  const [u] = await q('SELECT * FROM users WHERE id=$1', [id]);
  if (!u) return fail(res, 401, 'Log in first.');
  req.user = fixUser(u); next();
}
const A = (fn) => [(req, res, next) => auth(req, res, next).catch(e => fail(res, 500, e.message)), wrap(fn)];
const pub = u => ({ id: u.id, username: u.username, role: u.role, parent_id: u.parent_id, balance: u.balance, deposited: u.deposited, wagered: u.wagered, created: u.created });

// Can `actor` manage account `target`?
async function canManage(actor, target) {
  if (!target) return false;
  if (actor.role === 'master') return true;
  if (actor.role === 'bookie') return target.parent_id === actor.id;
  return false;
}

/* ---------------- auth routes ---------------- */
app.get('/api/status', wrap(async (req, res) => {
  const [m] = await q("SELECT COUNT(*)::int AS n FROM users WHERE role='master'");
  res.json({ needsSetup: Number(m.n) === 0 });
}));

app.post('/api/setup', wrap(async (req, res) => {
  const [m] = await q("SELECT COUNT(*)::int AS n FROM users WHERE role='master'");
  if (Number(m.n) > 0) return fail(res, 400, 'The master account already exists.');
  const { username, password } = req.body || {};
  if (!username || !password || password.length < 4) return fail(res, 400, 'Pick a username and a password of at least 4 characters.');
  const [u] = await q('INSERT INTO users(username,pass,role,balance,deposited) VALUES($1,$2,$3,10000,10000) RETURNING *',
    [username.trim().toLowerCase(), await bcrypt.hash(password, 10), 'master']);
  setCookie(res, makeToken(u.id), 60 * 60 * 24 * 30); res.json(pub(fixUser(u)));
}));

app.post('/api/login', wrap(async (req, res) => {
  const { username, password } = req.body || {};
  const [u] = await q('SELECT * FROM users WHERE username=$1', [String(username || '').trim().toLowerCase()]);
  if (!u || !(await bcrypt.compare(String(password || ''), u.pass))) return fail(res, 401, 'Wrong username or password.');
  setCookie(res, makeToken(u.id), 60 * 60 * 24 * 30); res.json(pub(fixUser(u)));
}));
app.post('/api/logout', (req, res) => { setCookie(res, '', 0); res.json({ ok: true }); });
app.get('/api/me', ...A(async (req, res) => res.json(pub(req.user))));

/* ---------------- accounts ---------------- */
app.get('/api/accounts', ...A(async (req, res) => {
  const u = req.user;
  if (u.role === 'player') return fail(res, 403, 'Players can’t view other accounts.');
  const rows = (u.role === 'master'
    ? await q('SELECT * FROM users WHERE role<>$1 ORDER BY created', ['master'])
    : await q('SELECT * FROM users WHERE parent_id=$1 ORDER BY created', [u.id])).map(fixUser).map(pub);
  res.json(rows);
}));

app.post('/api/accounts', ...A(async (req, res) => {
  const u = req.user; let { username, password, role, parentId, chips } = req.body || {};
  if (u.role === 'player') return fail(res, 403, 'Players can’t open accounts.');
  username = String(username || '').trim().toLowerCase();
  if (!/^[a-z0-9_.-]{3,24}$/.test(username)) return fail(res, 400, 'Usernames are 3–24 letters, numbers, dots, dashes or underscores.');
  if (!password || password.length < 4) return fail(res, 400, 'Passwords need at least 4 characters.');
  chips = Math.max(0, Math.floor(+chips || 0));
  if (u.role === 'bookie') { role = 'player'; parentId = u.id; }
  else {
    if (!['bookie', 'player'].includes(role)) return fail(res, 400, 'Choose bookie or player.');
    if (role === 'bookie') parentId = u.id;
    else {
      const [p] = await q('SELECT * FROM users WHERE id=$1', [+parentId || u.id]);
      if (!p || p.role === 'player') return fail(res, 400, 'Players have to sit under a bookie or the master.');
      parentId = p.id;
    }
  }
  const [exists] = await q('SELECT id FROM users WHERE username=$1', [username]);
  if (exists) return fail(res, 400, 'That username is taken.');
  const [n] = await q('INSERT INTO users(username,pass,role,parent_id,balance,deposited) VALUES($1,$2,$3,$4,$5,$5) RETURNING *',
    [username, await bcrypt.hash(password, 10), role, parentId, chips]);
  res.json(pub(fixUser(n)));
}));

app.post('/api/accounts/:id/chips', ...A(async (req, res) => {
  const id = +req.params.id; const amt = Math.floor(+req.body.amount || 0);
  const [t] = await q('SELECT * FROM users WHERE id=$1', [id]);
  const self = id === req.user.id && req.user.role === 'master';
  if (!self && !(await canManage(req.user, t))) return fail(res, 403, 'You can’t manage that account.');
  if (!amt) return fail(res, 400, 'Enter an amount.');
  if (amt < 0 && num(t.balance) + amt < 0) return fail(res, 400, 'That would take the balance below zero.');
  const [n] = await q('UPDATE users SET balance=balance+$1, deposited=deposited+$1 WHERE id=$2 RETURNING *', [amt, id]);
  res.json(pub(fixUser(n)));
}));

app.post('/api/accounts/:id/password', ...A(async (req, res) => {
  const [t] = await q('SELECT * FROM users WHERE id=$1', [+req.params.id]);
  if (!(await canManage(req.user, t)) && +req.params.id !== req.user.id) return fail(res, 403, 'You can’t manage that account.');
  const p = String(req.body.password || ''); if (p.length < 4) return fail(res, 400, 'Passwords need at least 4 characters.');
  await q('UPDATE users SET pass=$1 WHERE id=$2', [await bcrypt.hash(p, 10), t.id]); res.json({ ok: true });
}));

app.get('/api/accounts/:id/history', ...A(async (req, res) => {
  const id = +req.params.id; const [t] = await q('SELECT * FROM users WHERE id=$1', [id]);
  if (id !== req.user.id && !(await canManage(req.user, t))) return fail(res, 403, 'You can’t view that account.');
  const plays = await q('SELECT * FROM plays WHERE user_id=$1 ORDER BY id DESC LIMIT 60', [id]);
  const bets = await q('SELECT * FROM sbets WHERE user_id=$1 ORDER BY id DESC LIMIT 60', [id]);
  res.json({ account: pub(fixUser(t)), plays: plays.map(p => ({ ...p, stake: num(p.stake), ret: num(p.ret) })), bets: bets.map(fixBet) });
}));

/* ---------------- casino ---------------- */
app.post('/api/play', ...A(async (req, res) => {
  const game = String(req.body.game || '').slice(0, 40);
  const stake = Math.floor(+req.body.stake || 0), ret = Math.floor(+req.body.ret || 0);
  if (stake <= 0 || ret < 0 || ret > stake * 10000) return fail(res, 400, 'Bad bet.');
  const rows = await q('UPDATE users SET balance=balance+$1, wagered=wagered+$2 WHERE id=$3 AND balance>=$2 RETURNING *', [ret - stake, stake, req.user.id]);
  if (!rows.length) return fail(res, 400, 'Not enough chips.');
  await q('INSERT INTO plays(user_id,game,stake,ret) VALUES($1,$2,$3,$4)', [req.user.id, game, stake, ret]);
  res.json(pub(fixUser(rows[0])));
}));

/* ---------------- sportsbook ---------------- */
const fixBet = b => ({ ...b, stake: num(b.stake), payout: num(b.payout), line: b.line == null ? null : Number(b.line), odds: Number(b.odds) });
app.get('/api/sports', ...A(async (req, res) => res.json(await sports.board())));

app.post('/api/sbet', ...A(async (req, res) => {
  const { eventId, market, side } = req.body || {}; const stake = Math.floor(+req.body.stake || 0);
  if (stake <= 0) return fail(res, 400, 'Enter a stake.');
  const ev = await sports.findEvent(String(eventId));
  if (!ev) return fail(res, 400, 'That game is no longer on the board.');
  if (ev.state !== 'pre' || new Date(ev.date) <= new Date()) return fail(res, 400, 'That game has already started.');
  const m = ev.markets[market] && ev.markets[market][side];
  if (!m) return fail(res, 400, 'That line isn’t available.');
  const rows = await q('UPDATE users SET balance=balance+$1, wagered=wagered+$2 WHERE id=$3 AND balance>=$2 RETURNING *', [-stake, stake, req.user.id]);
  if (!rows.length) return fail(res, 400, 'Not enough chips.');
  const [b] = await q(`INSERT INTO sbets(user_id,event_id,league,matchup,market,pick,side,line,odds,stake,start_time)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
    [req.user.id, ev.id, ev.league, ev.away.name + ' @ ' + ev.home.name, market, m.label, side, m.line ?? null, m.odds, stake, ev.date]);
  res.json({ me: pub(fixUser(rows[0])), bet: fixBet(b) });
}));

app.get('/api/sbets', ...A(async (req, res) => {
  const rows = await q('SELECT * FROM sbets WHERE user_id=$1 ORDER BY id DESC LIMIT 100', [req.user.id]);
  res.json(rows.map(fixBet));
}));

// Settle open sports bets whose games have finished.
async function settle() {
  const open = (await q("SELECT * FROM sbets WHERE status='open'")).map(fixBet);
  const due = open.filter(b => new Date(b.start_time) < new Date(Date.now() - 90 * 60 * 1000));
  const byEvent = {};
  due.forEach(b => (byEvent[b.league + '|' + b.event_id] ||= []).push(b));
  for (const key of Object.keys(byEvent)) {
    const [league, eventId] = key.split('|');
    let r; try { r = await sports.result(league, eventId); } catch (e) { continue; }
    if (!r || !r.done) continue;
    for (const b of byEvent[key]) {
      const out = r.void ? 'void' : sports.grade(b, r);
      const payout = out === 'win' ? b.stake + sports.profit(b.stake, b.odds) : (out === 'push' || out === 'void') ? b.stake : 0;
      const upd = await q("UPDATE sbets SET status=$1, payout=$2 WHERE id=$3 AND status='open' RETURNING id", [out, payout, b.id]);
      if (upd.length && payout) await q('UPDATE users SET balance=balance+$1 WHERE id=$2', [payout, b.user_id]);
    }
  }
}

/* ---------------- static ---------------- */
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));
app.get(/^\/(?!api).*/, (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

migrate().then(() => {
  app.listen(PORT, () => console.log('Bando Casino on :' + PORT));
  setInterval(() => settle().catch(e => console.error('settle', e.message)), 10 * 60 * 1000);
  setTimeout(() => settle().catch(() => {}), 15000);
});
module.exports = { app };
