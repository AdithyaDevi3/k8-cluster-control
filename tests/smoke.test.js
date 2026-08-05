const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { getClusters } = require('../src/server/services/clusterService');
const { interpretCommand } = require('../src/server/services/commandInterpreter');
const { runKubectlCommand, applyManifest } = require('../src/server/services/kubectlService');

test('serves the frontend and three.js assets', async () => {
  const clusters = getClusters();
  assert.ok(Array.isArray(clusters));
  assert.ok(clusters.length > 0);

  const interpretation = interpretCommand('scale deployment payments to 4 replicas in production');
  assert.equal(interpretation.command, 'kubectl scale deployment/payments --replicas=4 --namespace production');

  const commandResult = await runKubectlCommand('alpha-context', interpretation.command, { confirmed: false });
  assert.equal(commandResult.command, interpretation.command);
  assert.equal(commandResult.confirmationRequired, true);

  const applyResult = await applyManifest('alpha-context', 'apiVersion: v1\nkind: ConfigMap\nmetadata:\n  name: example', { confirmed: false });
  assert.equal(applyResult.confirmationRequired, true);

  assert.equal(fs.existsSync(path.join(__dirname, '..', 'public', 'index.html')), true);
  assert.equal(fs.existsSync(path.join(__dirname, '..', 'node_modules', 'three', 'build', 'three.module.js')), true);
});
