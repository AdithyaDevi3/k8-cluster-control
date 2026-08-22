const test = require('node:test');
const assert = require('node:assert/strict');
const { buildOperationCommand } = require('../src/server/routes/clusters');

test('builds a scale command for a deployment', () => {
  const command = buildOperationCommand('kind-dev', {
    action: 'scale',
    resourceType: 'deployment',
    resourceName: 'payments',
    namespace: 'production',
    replicas: 5
  });

  assert.equal(command, 'kubectl --context kind-dev scale deployment/payments -n production --replicas=5');
});

test('builds a cordon command for a node', () => {
  const command = buildOperationCommand('kind-dev', {
    action: 'cordon',
    resourceName: 'worker-01'
  });

  assert.equal(command, 'kubectl --context kind-dev cordon worker-01');
});

test('builds a drain command for a node', () => {
  const command = buildOperationCommand('kind-dev', {
    action: 'drain',
    resourceName: 'worker-01'
  });

  assert.equal(command, 'kubectl --context kind-dev drain worker-01 --ignore-daemonsets --delete-emptydir-data');
});

test('builds a delete command for a namespaced resource', () => {
  const command = buildOperationCommand('kind-dev', {
    action: 'delete',
    resourceType: 'service',
    resourceName: 'api',
    namespace: 'staging'
  });

  assert.equal(command, 'kubectl --context kind-dev delete service api -n staging');
});

test('requires replicas for scale commands', () => {
  assert.throws(() => {
    buildOperationCommand('kind-dev', {
      action: 'scale',
      resourceType: 'deployment',
      resourceName: 'payments'
    });
  }, /Scale operations require resourceName and replicas/);
});
