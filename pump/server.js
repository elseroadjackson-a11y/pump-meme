// pump.meme local server. One key = one wallet + its own records. Launch/sell are signed here on your computer.
const express = require('express'), crypto = require('crypto'), fs = require('fs'), path = require('path');
const { Connection, Keypair, VersionedTransaction, SystemProgram, PublicKey, Transaction } = require('@solana/web3.js');
const RPC = process.env.RPC_URL || 'https://api.mainnet-beta.solana.com', PORT = process.env.PORT || 3000;
const TX_URL = process.env.PUMP_TX_URL || 'https://pumpportal.fun/api/trade-local', IPFS_URL = process.env.IPFS_URL || 'https://pump.fun/api/ipfs';
const conn = new Connection(RPC, 'confirmed');
const NAME = /^[a-z0-9_-]{1,32}$/;
const BASE = process.env.DATA_DIR || __dirname; fs.mkdirSync(BASE, { recursive: true });
const DATA = path.join(BASE, 'data'); fs.mkdirSync(DATA, { recursive: true });

// ---- keys, sessions ----
const KEYS = path.join(BASE, 'keys.json'), SECRET_FILE = path.join(BASE, 'secret.txt');
if (!process.env.SECRET && !fs.existsSync(SECRET_FILE)) fs.writeFileSync(SECRET_FILE, crypto.randomBytes(32).toString('hex'));
const SECRET = (process.env.SECRET || fs.readFileSync(SECRET_FILE, 'utf8')).trim();
if (SECRET.length < 32) throw new Error('SECRET must be at least 32 characters');
const readKeys = () => { try { return JSON.parse(fs.readFileSync(KEYS, 'utf8')); } catch { return {}; } };
const writeKeys = k => fs.writeFileSync(KEYS, JSON.stringify(k, null, 2));
const sha = s => crypto.createHash('sha256').update(s).digest('hex'), sign = n => crypto.createHmac('sha256', SECRET).update(n).digest('hex');
// On a host with no terminal, the master key comes from the MASTER_KEY setting. Change it there to replace the key.
if (process.env.MASTER_KEY) {
  const mk = String(process.env.MASTER_KEY).trim(), mn = String(process.env.MASTER_NAME || 'owner').toLowerCase(), ks = readKeys();
  if (mk.length < 20) throw new Error('MASTER_KEY must be at least 20 characters');
  if (!NAME.test(mn)) throw new Error('MASTER_NAME must be lowercase letters, numbers, - or _');
  if (ks[mn] && (ks[mn].role || 'master') !== 'master') throw new Error('MASTER_NAME clashes with a project key');
  for (const n of Object.keys(ks)) if ((ks[n].role || 'master') === 'master' && n !== mn) delete ks[n];
  ks[mn] = { hash: sha(mk), created: (ks[mn] && ks[mn].created) || new Date().toISOString(), role: 'master' }; writeKeys(ks);
}
const cookies = q => Object.fromEntries((q.headers.cookie || '').split(';').map(c => c.trim().split(/=(.*)/s).slice(0, 2)).filter(x => x[0] && x[1]));
function who(q) {
  const v = cookies(q).pm; if (!v) return null;
  const i = v.lastIndexOf('.'), n = v.slice(0, i), a = Buffer.from(v.slice(i + 1)), b = Buffer.from(sign(n)), k = readKeys()[n];
  return k && a.length === b.length && crypto.timingSafeEqual(a, b) ? { name: n, role: k.role || 'master' } : null;
}
// wallet secrets are encrypted at rest with a key derived from secret.txt
const AES = crypto.createHash('sha256').update('wallet:' + SECRET).digest();
const enc = b => { const iv = crypto.randomBytes(12), c = crypto.createCipheriv('aes-256-gcm', AES, iv), e = Buffer.concat([c.update(b), c.final()]); return Buffer.concat([iv, c.getAuthTag(), e]).toString('base64'); };
const dec = s => { const b = Buffer.from(s, 'base64'), d = crypto.createDecipheriv('aes-256-gcm', AES, b.subarray(0, 12)); d.setAuthTag(b.subarray(12, 28)); return Buffer.concat([d.update(b.subarray(28)), d.final()]); };
const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
function b58(buf) { let n = BigInt('0x' + Buffer.from(buf).toString('hex')), s = ''; while (n > 0n) { s = B58[Number(n % 58n)] + s; n /= 58n; } for (const x of buf) { if (x === 0) s = '1' + s; else break; } return s; }

// ---- per-key account files ----
const file = n => path.join(DATA, n + '.json');
const load = n => JSON.parse(fs.readFileSync(file(n), 'utf8')), save = (n, d) => fs.writeFileSync(file(n), JSON.stringify(d, null, 2));
const kpOf = d => Keypair.fromSecretKey(dec(d.wallet.sec));
const bad = (s, m) => { const e = new Error(m); e.status = s; throw e; };
const h = fn => (q, r) => Promise.resolve().then(() => fn(q, r)).catch(e => r.status(e.status || 500).json({ error: String(e.message || e).slice(0, 300) }));
const needMaster = q => { if (q.role !== 'master') bad(403, 'Master key only'); };
function target(q) {
  const n = q.role === 'master' ? String((q.body && q.body.name) || q.query.name || '') : q.user;
  if (!NAME.test(n) || !fs.existsSync(file(n))) bad(404, 'No such key');
  return n;
}
const allNames = () => fs.readdirSync(DATA).filter(f => f.endsWith('.json')).map(f => f.slice(0, -5));

// ---- chain helpers ----
const PUMP = new PublicKey('6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P');
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function held(owner, mint) {
  const r = await conn.getParsedTokenAccountsByOwner(new PublicKey(owner), { mint: new PublicKey(mint) });
  return r.value.reduce((a, x) => a + (x.account.data.parsed.info.tokenAmount.uiAmount || 0), 0);
}
// Reads the coin's bonding curve on-chain and estimates what the holding would sell for right now.
async function curveValue(mint, tokens) {
  const [pda] = PublicKey.findProgramAddressSync([Buffer.from('bonding-curve'), new PublicKey(mint).toBuffer()], PUMP);
  const a = await conn.getAccountInfo(pda); if (!a || a.data.length < 49) return null;
  const vt = a.data.readBigUInt64LE(8), vs = a.data.readBigUInt64LE(16);
  if (a.data[48] === 1) return { graduated: true };
  const t = BigInt(Math.floor(tokens * 1e6));
  return { value: Number(vs - (vs * vt) / (vt + t)) / 1e9 * 0.99 };
}
async function pumpTx(body) {
  const r = await fetch(TX_URL, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  if (r.status !== 200) throw new Error(((await r.text()) || 'PumpPortal error ' + r.status).slice(0, 200));
  return VersionedTransaction.deserialize(new Uint8Array(await r.arrayBuffer()));
}
async function confirmSig(sig) {
  for (let i = 0; i < 40; i++) {
    const s = (await conn.getSignatureStatuses([sig])).value[0];
    if (s && s.err) throw new Error('Transaction failed on-chain');
    if (s && s.confirmationStatus && s.confirmationStatus !== 'processed') return;
    await sleep(1500);
  }
  throw new Error('Timed out waiting for confirmation. Check the wallet before trying again.');
}
async function run(tx, signers) { tx.sign(signers); const sig = await conn.sendRawTransaction(tx.serialize()); await confirmSig(sig); return sig; }

// ---- summaries (records + estimates) ----
async function summary(n) {
  const d = load(n), pub = d.wallet.pub, sum = (t, c) => d.ledger.filter(x => x.type === t && (!c || x.coin === c)).reduce((a, x) => a + x.sol, 0);
  const balance = (await conn.getBalance(new PublicKey(pub))) / 1e9, coins = [];
  for (const c of d.coins) {
    let hd = null, cv = null; try { hd = await held(pub, c.mint); if (hd > 0) cv = await curveValue(c.mint, hd); } catch {}
    const value = hd === 0 ? 0 : cv && cv.value != null ? cv.value : null, launch = sum('launch', c.mint), sold = sum('sell', c.mint);
    coins.push({ ...c, held: hd, graduated: !!(cv && cv.graduated), value, spent: -launch, sold, pnl: value != null ? sold + launch + value : null, ledger: d.ledger.filter(x => x.coin === c.mint) });
  }
  const deposited = sum('deposit'), withdrawn = -sum('sweep'), vals = coins.map(c => c.value);
  return { name: n, wallet: pub, balance, coins, ledger: d.ledger, deposited, withdrawn, value: vals.reduce((a, x) => a + (x || 0), 0), valueKnown: vals.every(x => x != null), pnl: balance + vals.reduce((a, x) => a + (x || 0), 0) + withdrawn - deposited };
}

const app = express(), tries = new Map();
app.set('trust proxy', 1);
app.use((q, r, next) => { r.set({ 'x-content-type-options': 'nosniff', 'x-frame-options': 'DENY', 'referrer-policy': 'no-referrer', 'x-robots-tag': 'noindex, nofollow' }); next(); });
app.use((q, r, next) => {
  if ((q.path === '/login' && q.method === 'POST') || q.path === '/logo.png' || q.path === '/logout') return next();
  const u = who(q); if (u) { q.user = u.name; q.role = u.role; return next(); }
  if (q.path.startsWith('/api/')) return r.status(401).json({ error: 'locked' });
  r.sendFile(path.join(__dirname, 'login.html'));
});
app.post('/login', express.json(), (q, r) => {
  const ip = q.ip, now = Date.now(), t = (tries.get(ip) || []).filter(x => now - x < 600000);
  if (t.length >= 10) return r.status(429).json({ error: 'Too many tries. Wait 10 minutes.' });
  const k = sha(String((q.body && q.body.key) || '').trim()), keys = readKeys(), name = Object.keys(keys).find(n => keys[n].hash === k);
  if (!name) { t.push(now); tries.set(ip, t); return r.status(401).json({ error: 'That key isn’t valid.' }); }
  r.cookie('pm', name + '.' + sign(name), { httpOnly: true, sameSite: 'strict', maxAge: 30 * 864e5, secure: q.secure || q.headers['x-forwarded-proto'] === 'https' });
  r.json({ ok: true });
});
app.get('/logout', (q, r) => { r.clearCookie('pm'); r.redirect(q.baseUrl + '/'); });
app.get(['/', '/index.html'], (q, r) => r.sendFile(path.join(__dirname, 'index.html')));
app.get('/logo.png', (q, r) => r.sendFile(path.join(__dirname, 'logo.png')));
app.get('/vendor/web3.js', (q, r) => r.sendFile(path.join(__dirname, '..', 'node_modules/@solana/web3.js/lib/index.iife.min.js')));

let px = { usd: 0, t: 0 };
app.get('/api/price', h(async (q, r) => {
  if (Date.now() - px.t > 60000) { let j = {}; try { j = await (await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd', { signal: AbortSignal.timeout(4000) })).json(); } catch {} px = { usd: (j.solana && j.solana.usd) || px.usd, t: Date.now() }; }
  r.json({ usd: px.usd });
}));
app.get('/api/blockhash', h(async (q, r) => r.json({ blockhash: (await conn.getLatestBlockhash()).blockhash })));
app.get('/api/me', h((q, r) => r.json({ name: q.user, role: q.role })));

// master: manage keys
app.get('/api/keys', h(async (q, r) => {
  needMaster(q); const keys = readKeys(), out = [];
  for (const n of allNames()) {
    try { const s = await summary(n); out.push({ name: n, active: !!keys[n], wallet: s.wallet, balance: s.balance, coins: s.coins.map(c => c.symbol), deposited: s.deposited, pnl: s.pnl }); }
    catch (e) { out.push({ name: n, active: !!keys[n], wallet: load(n).wallet.pub, balance: null, coins: [], deposited: 0, pnl: null }); }
  }
  r.json(out);
}));
app.post('/api/keys', express.json(), h((q, r) => {
  needMaster(q); const name = String(q.body.name || '').trim().toLowerCase(), keys = readKeys();
  if (!NAME.test(name)) bad(400, 'Use 1 to 32 lowercase letters, numbers, - or _');
  if (keys[name] || fs.existsSync(file(name))) bad(409, 'That name is already used');
  const key = 'pm-' + crypto.randomBytes(12).toString('hex'), kp = Keypair.generate();
  save(name, { created: new Date().toISOString(), wallet: { pub: kp.publicKey.toBase58(), sec: enc(Buffer.from(kp.secretKey)) }, coins: [], ledger: [] });
  keys[name] = { hash: sha(key), created: new Date().toISOString(), role: 'project' }; writeKeys(keys);
  r.json({ name, key, wallet: kp.publicKey.toBase58() });
}));
app.post('/api/keys/revoke', express.json(), h((q, r) => {
  needMaster(q); const name = String(q.body.name || ''), keys = readKeys();
  if (!keys[name] || (keys[name].role || 'master') !== 'project') bad(400, 'Only project keys can be revoked here');
  delete keys[name]; writeKeys(keys); r.json({ ok: true });
}));
app.post('/api/export', express.json(), h((q, r) => {
  needMaster(q); const d = load(target(q)); r.json({ pub: d.wallet.pub, secret: b58(dec(d.wallet.sec)) });
}));

// records for one key (master: any key, project: its own)
app.get('/api/acct', h(async (q, r) => r.json(await summary(target(q)))));
app.get('/api/ledger.csv', h((q, r) => {
  const n = target(q), d = load(n), nm = Object.fromEntries(d.coins.map(c => [c.mint, c.name + ' ($' + c.symbol + ')'])), esc = s => '"' + String(s || '').replace(/"/g, '""') + '"';
  const rows = ['time,type,coin,sol,signature'].concat(d.ledger.map(x => [new Date(x.t).toISOString(), x.type, esc(nm[x.coin]), x.sol, x.sig || ''].join(',')));
  r.set({ 'content-type': 'text/csv', 'content-disposition': 'attachment; filename="' + n + '-records.csv"' }).send(rows.join('\n'));
}));
app.post('/api/funded', express.json(), h(async (q, r) => {
  const n = target(q), d = load(n), sig = String(q.body.sig || '');
  if (d.ledger.some(x => x.sig === sig)) return r.json({ ok: true, already: true });
  const t = await conn.getParsedTransaction(sig, { maxSupportedTransactionVersion: 0, commitment: 'confirmed' });
  if (!t || (t.meta && t.meta.err)) bad(404, 'Transaction not found yet');
  let lam = 0; for (const ix of t.transaction.message.instructions) if (ix.program === 'system' && ix.parsed && ix.parsed.type === 'transfer' && ix.parsed.info.destination === d.wallet.pub) lam += Number(ix.parsed.info.lamports);
  if (!lam) bad(400, 'No transfer to this key’s wallet in that transaction');
  d.ledger.push({ t: Date.now(), type: 'deposit', sol: lam / 1e9, sig }); save(n, d); r.json({ ok: true, sol: lam / 1e9 });
}));

// actions signed on the server with the key's wallet
app.post('/api/ipfs', express.raw({ type: 'multipart/form-data', limit: '8mb' }), h(async (q, r) => {
  const x = await fetch(IPFS_URL, { method: 'POST', headers: { 'content-type': q.headers['content-type'] }, body: q.body });
  r.status(x.status).type('json').send(await x.text());
}));
app.post('/api/launch', express.json(), h(async (q, r) => {
  const n = target(q), d = load(n), kp = kpOf(d), pub = kp.publicKey.toBase58();
  const nm = String(q.body.tokenName || '').trim().slice(0, 32), sy = String(q.body.symbol || '').trim().slice(0, 10), uri = String(q.body.uri || ''), dev = Math.max(0, +q.body.devBuy || 0);
  if (!nm || !sy || !/^(https:\/\/|ipfs:\/\/)/.test(uri)) bad(400, 'Name, ticker and image are required');
  const before = await conn.getBalance(kp.publicKey);
  if (before / 1e9 < dev + 0.03) bad(400, 'Not enough SOL in this key’s wallet. It needs about ' + (dev + 0.03).toFixed(2) + ' SOL (dev buy + fees).');
  const mint = Keypair.generate(), m = mint.publicKey.toBase58();
  const tx = await pumpTx({ publicKey: pub, action: 'create', tokenMetadata: { name: nm, symbol: sy, uri }, mint: m, denominatedInSol: 'true', amount: dev, slippage: 15, priorityFee: 0.0005, pool: 'pump' });
  const coin = { mint: m, name: nm, symbol: sy, uri, t: Date.now(), status: 'unconfirmed' }; d.coins.push(coin); save(n, d);
  const sig = await run(tx, [kp, mint]);
  const after = await conn.getBalance(kp.publicKey); coin.status = 'live';
  d.ledger.push({ t: Date.now(), type: 'launch', coin: m, sol: (after - before) / 1e9, sig }); save(n, d);
  r.json({ mint: m, sig });
}));
app.post('/api/sell', express.json(), h(async (q, r) => {
  const n = target(q), d = load(n), kp = kpOf(d), mint = String(q.body.mint || ''), pct = Math.min(100, Math.max(1, Math.round(+q.body.pct || 0)));
  if (!d.coins.some(c => c.mint === mint)) bad(404, 'That coin isn’t in this key');
  const before = await conn.getBalance(kp.publicKey);
  const tx = await pumpTx({ publicKey: kp.publicKey.toBase58(), action: 'sell', mint, amount: pct + '%', denominatedInSol: 'false', slippage: 15, priorityFee: 0.0005, pool: 'auto' });
  const sig = await run(tx, [kp]), after = await conn.getBalance(kp.publicKey);
  d.ledger.push({ t: Date.now(), type: 'sell', coin: mint, sol: (after - before) / 1e9, sig, pct }); save(n, d);
  r.json({ sig, received: (after - before) / 1e9 });
}));
app.post('/api/sweep', express.json(), h(async (q, r) => {
  const n = target(q), d = load(n), kp = kpOf(d); let to; try { to = new PublicKey(String(q.body.to || '')); } catch { bad(400, 'Bad destination address'); }
  const before = await conn.getBalance(kp.publicKey), amt = before - 5000; if (amt <= 0) bad(400, 'Nothing to send back');
  const tx = new Transaction({ feePayer: kp.publicKey, recentBlockhash: (await conn.getLatestBlockhash()).blockhash }).add(SystemProgram.transfer({ fromPubkey: kp.publicKey, toPubkey: to, lamports: amt }));
  tx.sign(kp); const sig = await conn.sendRawTransaction(tx.serialize()); await confirmSig(sig);
  d.ledger.push({ t: Date.now(), type: 'sweep', sol: -before / 1e9, sig, to: to.toBase58() }); save(n, d);
  r.json({ sig, sent: amt / 1e9 });
}));

const HOST = process.env.HOST || '127.0.0.1';
if (require.main === module) app.listen(PORT, HOST, () => {
  console.log('pump.meme on http://localhost:' + PORT);
  if (HOST !== '127.0.0.1') for (const l of Object.values(require('os').networkInterfaces()).flat()) if (l && l.family === 'IPv4' && !l.internal) console.log('On your Wi-Fi, open: http://' + l.address + ':' + PORT);
});
module.exports = { b58, app };
