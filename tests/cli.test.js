const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');

function runCli(args) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [path.join(__dirname, '..', 'bin', 'k8-cluster-control.js'), ...args], {
      cwd: path.join(__dirname, '..'),
      env: { ...process.env },
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('close', (exitCode) => {
      resolve({ exitCode, stdout, stderr });
    });
  });
}

test('lists clusters from the terminal CLI', async () => {
  const result = await runCli(['clusters', '--json']);

  assert.equal(result.exitCode, 0);
  const clusters = JSON.parse(result.stdout);
  assert.ok(Array.isArray(clusters));
  assert.ok(clusters.length > 0);
  assert.ok(clusters.every((cluster) => typeof cluster.id === 'string'));
});

test('interprets a kubernetes request from the terminal CLI', async () => {
  const result = await runCli(['interpret', 'show pods in namespace production', '--json']);

  assert.equal(result.exitCode, 0);
  const interpretation = JSON.parse(result.stdout);
  assert.equal(interpretation.command, 'kubectl get pods --namespace production');
  assert.equal(interpretation.risk, 'read');
});