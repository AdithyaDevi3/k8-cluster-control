const express = require('express');
const { getClusterById } = require('../services/clusterService');
const { spawnCommand } = require('../utils/exec');

const router = express.Router();

function buildHelmCommand(clusterContext, action, options = {}) {
  if (action === 'list') {
    return ['list', '--all-namespaces', '--output', 'json', '--kube-context', clusterContext];
  }

  const releaseName = options.releaseName && String(options.releaseName).trim();
  if (!releaseName) {
    throw new Error(`${action} operations require releaseName.`);
  }

  const baseArgs = ['--kube-context', clusterContext];
  const namespace = options.namespace && String(options.namespace).trim();
  if (namespace) {
    baseArgs.push('--namespace', namespace);
  }

  if (action === 'install') {
    const chart = options.chart && String(options.chart).trim();
    if (!chart) {
      throw new Error('install operations require chart.');
    }
    if (options.valuesFile) {
      baseArgs.push('--values', String(options.valuesFile).trim());
    }
    return ['install', releaseName, chart, ...baseArgs];
  }

  if (action === 'upgrade') {
    const chart = options.chart && String(options.chart).trim();
    if (!chart) {
      throw new Error('upgrade operations require chart.');
    }
    const args = ['upgrade', releaseName, chart, ...baseArgs];
    if (options.valuesFile) {
      args.push('--values', String(options.valuesFile).trim());
    }
    if (options.resetValues) {
      args.push('--reset-values');
    }
    return args;
  }

  if (action === 'rollback') {
    const revision = options.revision ? String(options.revision).trim() : null;
    const args = ['rollback', releaseName];
    if (revision) {
      args.push(revision);
    }
    return args.concat(baseArgs);
  }

  if (action === 'uninstall') {
    return ['uninstall', releaseName, ...baseArgs];
  }

  throw new Error(`Unsupported Helm action: ${action}`);
}

router.get('/:clusterId/releases', async (req, res) => {
  const cluster = getClusterById(req.params.clusterId);
  if (!cluster) {
    return res.status(404).json({ error: 'Cluster not found' });
  }

  const result = await spawnCommand('helm', ['list', '--all-namespaces', '--output', 'json', '--kube-context', cluster.kubeContext]);
  if (!result.success) {
    return res.status(500).json({
      error: 'Failed to list Helm releases',
      message: result.output || 'helm list failed'
    });
  }

  let releases = [];
  try {
    releases = JSON.parse(result.output || '[]');
  } catch (error) {
    return res.status(500).json({
      error: 'Failed to parse Helm output',
      message: error.message
    });
  }

  res.json({
    cluster: { id: cluster.id, name: cluster.name, context: cluster.kubeContext },
    releases
  });
});

router.post('/:clusterId/releases/action', async (req, res) => {
  const cluster = getClusterById(req.params.clusterId);
  if (!cluster) {
    return res.status(404).json({ error: 'Cluster not found' });
  }

  try {
    const args = buildHelmCommand(cluster.kubeContext, req.body.action, req.body);
    const result = await spawnCommand('helm', args);

    if (!result.success) {
      return res.status(500).json({
        error: `Failed to run Helm ${req.body.action} action`,
        command: `helm ${args.join(' ')}`,
        message: result.output || 'helm command failed'
      });
    }

    res.json({
      cluster: { id: cluster.id, name: cluster.name, context: cluster.kubeContext },
      command: `helm ${args.join(' ')}`,
      output: result.output
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
module.exports.buildHelmCommand = buildHelmCommand;