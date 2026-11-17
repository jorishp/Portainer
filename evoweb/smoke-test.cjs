// Runs only inside the disposable mock container created by the workflow.
const assert = require('node:assert/strict');
const { setTimeout: pause } = require('node:timers/promises');
const base = 'http://127.0.0.1:3330';

async function request(path, options = {}) {
  const response = await fetch(base + path, { ...options, signal: AbortSignal.timeout(5000) });
  assert.ok(response.ok, `Unexpected HTTP status ${response.status} for ${path}`);
  return response.json();
}

(async () => {
  assert.equal(process.env.HEATING_PROVIDER, 'mock', 'This test requires the mock provider');
  assert.ok(!process.env.HONEYWELL_USERNAME && !process.env.HONEYWELL_PASSWORD,
    'This test refuses to run when cloud credentials are configured');

  let ready = false;
  for (let attempt = 0; attempt < 30; attempt++) {
    try {
      const session = await request('/rest/session');
      if (session.provider === 'Mock') { ready = true; break; }
    } catch { /* Wait for the disposable demo to finish initializing. */ }
    await pause(1000);
  }
  assert.ok(ready, 'Mock provider did not become ready');
  const providers = await request('/rest/providers/status');
  assert.equal(providers.cloud.available, false, 'Cloud must remain unconfigured');
  const page = await fetch(base + '/', { signal: AbortSignal.timeout(5000) });
  assert.ok(page.ok && (await page.text()).includes('<html'), 'Web interface unavailable');

  const path = '/rest/getscheduleforzone/12345';
  const original = await request(path);
  assert.equal(original.name, 'Living Room');
  assert.equal(original.schedule.length, 7);
  const changed = structuredClone(original);
  changed.schedule[0].switchpoints[0].heatSetpoint = 20.5;
  const save = schedule => request('/rest/savescheduleforzone/12345', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(schedule),
  });
  try {
    await save(changed);
    assert.deepEqual(await request(path), changed, 'A saved weekly schedule must round-trip');
  } finally {
    await save(original);
  }
  assert.deepEqual(await request(path), original, 'Original demo schedule must be restored');
  console.log('PASS: demo-only provider, web interface, weekly schedule read/save/reload/restore');
})().catch(error => { console.error(error.message); process.exitCode = 1; });
