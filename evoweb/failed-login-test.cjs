// This container uses only a loopback HTTP stub, never the real Honeywell API.
const assert = require('node:assert/strict');
const { setTimeout: pause } = require('node:timers/promises');
(async () => {
  assert.equal(process.env.HONEYWELL_URL_DOMAIN, 'http://127.0.0.1:4444');
  let health;
  for (let i = 0; i < 30; i++) {
    try {
      health = await fetch('http://127.0.0.1:3330/healthz', { signal: AbortSignal.timeout(1000) });
      if (health.status === 503) break;
    } catch { /* starting */ }
    await pause(1000);
  }
  assert.equal(health?.status, 503, 'Failed cloud initialization must be visible as unhealthy');
  const auth = 'Basic ' + Buffer.from(`evohome:${process.env.EVOWEB_WEB_PASSWORD}`).toString('base64');
  const session = await fetch('http://127.0.0.1:3330/rest/session', { headers: { Authorization: auth } });
  assert.equal(session.status, 503, 'No silent fallback to a demo account');
  assert.ok((await session.json()).error.includes('Portainer'));
  const count = async () => (await (await fetch('http://127.0.0.1:4444/count')).json()).requests;
  assert.equal(await count(), 1);
  await pause(2000);
  assert.equal(await count(), 1, 'Failed credentials must not be retried in a process restart loop');
  console.log('PASS: failed cloud login is reported once without restart loop or demo fallback');
})().catch(error => { console.error(error.message); process.exitCode = 1; });
