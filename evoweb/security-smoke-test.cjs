// Security regression checks inside a disposable, password-protected MOCK container.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { setTimeout: pause } = require('node:timers/promises');
const base = 'http://127.0.0.1:3330';

(async () => {
  assert.equal(process.env.HEATING_PROVIDER, 'mock');
  assert.ok(!process.env.HONEYWELL_USERNAME && !process.env.HONEYWELL_PASSWORD);
  const password = process.env.EVOWEB_WEB_PASSWORD;
  assert.ok(password && password.length >= 16, 'CI web password missing');
  const auth = 'Basic ' + Buffer.from(`${process.env.EVOWEB_WEB_USERNAME}:${password}`).toString('base64');
  const request = (url, options = {}) => fetch(base + url, { ...options, signal: AbortSignal.timeout(3000) });
  for (let i = 0; i < 30; i++) {
    try { if ((await request('/healthz')).ok) break; } catch { /* starting */ }
    await pause(1000);
  }
  assert.equal((await request('/healthz')).status, 200);
  for (const url of ['/', '/rest/session', '/rest/getallschedules']) {
    const denied = await request(url);
    assert.equal(denied.status, 401, `${url} must require authentication`);
    assert.ok(denied.headers.get('www-authenticate').startsWith('Basic '));
  }
  assert.equal((await request('/', { headers: { Authorization: 'Basic invalid' } })).status, 401);
  const page = await request('/', { headers: { Authorization: auth } });
  assert.equal(page.status, 200);
  assert.ok((await page.text()).includes('<html'));
  const session = await request('/rest/session', { headers: { Authorization: auth } });
  assert.equal(session.headers.get('cache-control'), 'no-store');
  assert.equal((await session.json()).provider, 'Mock');
  const config = await (await request('/rest/config', { headers: { Authorization: auth } })).text();
  assert.ok(!config.includes(password));
  for (const origin of ['https://untrusted.example', 'null', 'https://127.0.0.1:3330']) {
    const forbidden = await request('/rest/selectprovider', {
      method: 'POST', headers: { Authorization: auth, Origin: origin, 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'mock' }),
    });
    assert.equal(forbidden.status, 403, 'A foreign origin must not write');
  }
  assert.equal((await request('/rest/selectprovider', {
    method: 'POST', headers: { Authorization: auth, Origin: base, 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'mock' }),
  })).status, 200);

  const { validateLiveConfiguration } = require('/app/dist/utils/WebAccess.js');
  const access = { username: 'ci-user', password };
  assert.doesNotThrow(() => validateLiveConfiguration('mock', undefined, undefined, { username: 'evohome', password: '' }));
  assert.throws(() => validateLiveConfiguration('honeywell', undefined, undefined, access));
  assert.throws(() => validateLiveConfiguration('honeywell', 'fixture-user', 'fixture-password', { username: 'evohome', password: '' }));
  assert.throws(() => validateLiveConfiguration('mock', 'fixture-user', 'fixture-password', { username: 'evohome', password: '' }));
  assert.throws(() => validateLiveConfiguration('honeywell', 'fixture-user', password, access));
  assert.throws(() => validateLiveConfiguration('mock', undefined, undefined, { username: 'x', password: 'short' }));
  assert.doesNotThrow(() => validateLiveConfiguration('honeywell', 'fixture-user', 'fixture-password', access));

  const { Logger } = require('/app/dist/utils/Logger.js');
  const lines = [];
  const originalConsoleError = console.error;
  console.error = (...args) => lines.push(JSON.stringify(args));
  try {
    Logger.error('CI fixture failure', { isAxiosError: true, message: 'Request failed with status code 401',
      code: 'ERR_BAD_REQUEST', config: { data: 'Username=private-fixture&Password=do-not-log-this',
        headers: { Authorization: 'do-not-log-header' } }, response: { status: 401, data: { access_token: 'do-not-log-token' } } });
  } finally { console.error = originalConsoleError; }
  assert.ok(lines.join('').includes('401'));
  for (const marker of ['private-fixture', 'do-not-log-this', 'do-not-log-header', 'do-not-log-token']) {
    assert.ok(!lines.join('').includes(marker), 'HTTP request data must be omitted from logs');
  }

  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'evoweb-session-test-'));
  const originalDirectory = process.cwd();
  try {
    process.chdir(temporary);
    // Require after chdir so this process uses only the disposable session file.
    const { HoneywellTccProvider } = require('/app/dist/providers/HoneywellTccProvider.js');
    const { DateTime } = require('/app/node_modules/luxon');
    const provider = new HoneywellTccProvider({ username: 'fixture-a', urlDomain: 'https://example.invalid' });
    provider.credentials = { accessToken: 'fixture-access', refreshToken: 'fixture-refresh',
      expires: DateTime.now().plus({ hours: 1 }), tokenType: 'bearer' };
    provider.saveSession();
    assert.equal(fs.statSync('.session.json').mode & 0o777, 0o600);
    assert.equal(provider.loadSession(), true);
    const other = new HoneywellTccProvider({ username: 'fixture-b', urlDomain: 'https://example.invalid' });
    assert.equal(other.loadSession(), false, 'Tokens must not be reused for a different account');
    const info = JSON.stringify(provider.getSessionInfo());
    assert.ok(!info.includes('fixture-access') && !info.includes('fixture-refresh'));
    fs.unlinkSync('.session.json');
  } finally {
    process.chdir(originalDirectory);
    fs.rmdirSync(temporary);
  }
  console.log('PASS: web authentication, cross-site protection, live configuration guards, log privacy and private account-bound session storage');
})().catch(error => { console.error(error.message); process.exitCode = 1; });
