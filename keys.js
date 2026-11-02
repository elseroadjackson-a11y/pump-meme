// Manage site keys. Usage: node keys.js add sarah | list | revoke sarah
const fs = require('fs'), crypto = require('crypto'), F = (process.env.DATA_DIR || __dirname) + '/keys.json';
const load = () => { try { return JSON.parse(fs.readFileSync(F, 'utf8')); } catch { return {}; } };
const [cmd, name] = process.argv.slice(2), keys = load();
if (cmd === 'add' && /^[a-z0-9_-]{1,32}$/.test(name || '')) {
  if (keys[name]) { console.log('That name already has a key. Revoke it first.'); process.exit(1); }
  const key = 'pm-' + crypto.randomBytes(12).toString('hex');
  keys[name] = { hash: crypto.createHash('sha256').update(key).digest('hex'), created: new Date().toISOString(), role: 'master' };
  fs.writeFileSync(F, JSON.stringify(keys, null, 2));
  console.log('\nKey for ' + name + ':\n\n  ' + key + '\n\nCopy it now. It can’t be shown again.\n');
} else if (cmd === 'list') {
  const n = Object.keys(keys); console.log(n.length ? n.map(x => x + '  (made ' + keys[x].created.slice(0, 10) + ')').join('\n') : 'No keys yet.');
} else if (cmd === 'revoke' && keys[name]) {
  delete keys[name]; fs.writeFileSync(F, JSON.stringify(keys, null, 2)); console.log('Revoked ' + name + '. They are locked out right away.');
} else console.log('Use:\n  node keys.js add sarah\n  node keys.js list\n  node keys.js revoke sarah\n(names: lowercase letters, numbers, - or _)');
