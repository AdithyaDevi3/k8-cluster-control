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

    const threeRes = await fetch('http://127.0.0.1:3100/vendor/three/build/three.module.js');
    assert.equal(threeRes.status, 200);
    const text = await threeRes.text();
    assert.match(text, /THREE/);
  } finally {
    server.kill('SIGTERM');
  }
});
