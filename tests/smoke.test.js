const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');

function waitForServer(url, timeoutMs = 10000) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const attempt = async () => {
      try {
        const res = await fetch(url);
        if (res.ok) {
          resolve();
          return;
        }
      } catch {
        // keep polling
      }

      if (Date.now() - started > timeoutMs) {
        reject(new Error(`Server did not become ready at ${url}`));
        return;
      }

      setTimeout(attempt, 200);
    };

    attempt();
  });
}

test('serves the frontend and three.js assets', async () => {
  const server = spawn(process.execPath, ['server.js'], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, PORT: '3100' },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  let output = '';
  server.stdout.on('data', (chunk) => {
    output += chunk.toString();
  });
  server.stderr.on('data', (chunk) => {
    output += chunk.toString();
  });

  try {
    await waitForServer('http://127.0.0.1:3100/api/clusters');

    const indexRes = await fetch('http://127.0.0.1:3100/');
    assert.equal(indexRes.status, 200);

    const healthRes = await fetch('http://127.0.0.1:3100/healthz');
    assert.equal(healthRes.status, 200);

    const interpretRes = await fetch('http://127.0.0.1:3100/api/clusters/alpha/interpret', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ request: 'scale deployment payments to 4 replicas in production' })
    });
    assert.equal(interpretRes.status, 200);
    const interpretation = await interpretRes.json();
    assert.equal(interpretation.command, 'kubectl scale deployment/payments --replicas=4 --namespace production');

    const commandRes = await fetch('http://127.0.0.1:3100/api/clusters/alpha/command', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command: interpretation.command })
    });
    assert.equal(commandRes.status, 409);
    const commandResult = await commandRes.json();
    assert.equal(commandResult.confirmationRequired, true);

    const historyRes = await fetch('http://127.0.0.1:3100/api/clusters/alpha/history');
    assert.equal(historyRes.status, 200);
    const history = await historyRes.json();
    assert.ok(history.some((event) => event.type === 'interpretation'));
    assert.ok(history.some((event) => event.type === 'command'));

    const applyRes = await fetch('http://127.0.0.1:3100/api/clusters/alpha/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ manifest: 'apiVersion: v1\nkind: ConfigMap\nmetadata:\n  name: example' })
    });
    assert.equal(applyRes.status, 409);
    const applyResult = await applyRes.json();
    assert.equal(applyResult.confirmationRequired, true);

    const threeRes = await fetch('http://127.0.0.1:3100/vendor/three/build/three.module.js');
    assert.equal(threeRes.status, 200);
    const text = await threeRes.text();
    assert.match(text, /THREE/);
  } finally {
    server.kill('SIGTERM');
  }
});
