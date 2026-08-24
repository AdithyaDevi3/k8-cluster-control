const test = require('node:test');
const assert = require('node:assert/strict');
const { buildHelmCommand } = require('../src/server/routes/helm');

test('builds helm list args for a cluster context', () => {
  assert.deepEqual(buildHelmCommand('kind-dev', 'list'), [
    'list',
    '--all-namespaces',
    '--output',
    'json',
    '--kube-context',
    'kind-dev'
  ]);
});

test('builds helm install args', () => {
  assert.deepEqual(buildHelmCommand('kind-dev', 'install', {
    releaseName: 'payments',
    chart: 'bitnami/nginx',
    namespace: 'production',
    valuesFile: './values.yaml'
  }), [
    'install',
    'payments',
    'bitnami/nginx',
    '--kube-context',
    'kind-dev',
    '--namespace',
    'production',
    '--values',
    './values.yaml'
  ]);
});

test('builds helm upgrade args', () => {
  assert.deepEqual(buildHelmCommand('kind-dev', 'upgrade', {
    releaseName: 'payments',
    chart: 'bitnami/nginx',
    namespace: 'production',
    resetValues: true
  }), [
    'upgrade',
    'payments',
    'bitnami/nginx',
    '--kube-context',
    'kind-dev',
    '--namespace',
    'production',
    '--reset-values'
  ]);
});

test('builds helm rollback args', () => {
  assert.deepEqual(buildHelmCommand('kind-dev', 'rollback', {
    releaseName: 'payments',
    revision: 4,
    namespace: 'production'
  }), [
    'rollback',
    'payments',
    '4',
    '--kube-context',
    'kind-dev',
    '--namespace',
    'production'
  ]);
});

test('builds helm uninstall args', () => {
  assert.deepEqual(buildHelmCommand('kind-dev', 'uninstall', {
    releaseName: 'payments',
    namespace: 'production'
  }), [
    'uninstall',
    'payments',
    '--kube-context',
    'kind-dev',
    '--namespace',
    'production'
  ]);
});
