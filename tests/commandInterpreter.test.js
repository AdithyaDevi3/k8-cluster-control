const test = require('node:test');
const assert = require('node:assert/strict');
const { interpretCommand } = require('../src/server/services/commandInterpreter');
const { parseKubectlCommand, assessKubectlArgs } = require('../src/server/services/kubectlService');

test('generates a scoped read command from English', () => {
  const result = interpretCommand('show pods in namespace production');

  assert.equal(result.status, 'ready');
  assert.equal(result.command, 'kubectl get pods --namespace production');
  assert.equal(result.risk, 'read');
  assert.equal(result.requiresConfirmation, false);
});

test('generates a scale command that requires confirmation', () => {
  const result = interpretCommand('scale deployment payments to 5 replicas in production');

  assert.equal(result.status, 'ready');
  assert.equal(result.command, 'kubectl scale deployment/payments --replicas=5 --namespace production');
  assert.equal(result.risk, 'write');
  assert.equal(result.requiresConfirmation, true);
});

test('asks a precise question when required details are missing', () => {
  const result = interpretCommand('restart the deployment');

  assert.equal(result.status, 'needs_clarification');
  assert.deepEqual(result.questions.map((item) => item.field), ['name']);
  assert.match(result.explanation, /need the name/);
});

test('applies structured clarification answers through the interpreter', () => {
  const result = interpretCommand('scale the deployment', { name: 'payments', replicas: 3, namespace: 'production' });

  assert.equal(result.status, 'ready');
  assert.equal(result.command, 'kubectl scale deployment/payments --replicas=3 --namespace production');
});

test('marks deletion as destructive', () => {
  const result = interpretCommand('delete pod api-123 in staging');

  assert.equal(result.status, 'ready');
  assert.equal(result.command, 'kubectl delete pods api-123 --namespace staging');
  assert.equal(result.risk, 'destructive');
});

test('does not invent a command for unsupported requests', () => {
  const result = interpretCommand('make the cluster happier');

  assert.equal(result.status, 'unsupported');
  assert.equal(result.command, null);
});

test('parses an editable kubectl preview without invoking a shell', () => {
  const args = parseKubectlCommand('kubectl get pods --namespace "team one"');

  assert.deepEqual(args, ['get', 'pods', '--namespace', 'team one']);
  assert.equal(assessKubectlArgs(args), 'read');
});

test('rejects shell operators and context overrides', () => {
  assert.throws(() => parseKubectlCommand('kubectl get pods; rm -rf /'), /Shell operators/);
  assert.throws(() => parseKubectlCommand('kubectl --context other get pods'), /Select the cluster context/);
});