const express = require('express');
const { getClusters, getClusterById, getClusterObjects } = require('../services/clusterService');
const { runKubectlCommand, applyManifest } = require('../services/kubectlService');
const { interpretCommand } = require('../services/commandInterpreter');
const { recordEvent, getEvents } = require('../services/auditService');
const router = express.Router();

router.get('/', (req, res) => {
  const clusters = getClusters();
  res.json(clusters);
});

router.post('/:clusterId/connect', (req, res) => {
  const cluster = getClusterById(req.params.clusterId);
  if (!cluster) {
    return res.status(404).json({ error: 'Cluster not found' });
  }

  res.json({ connected: true, cluster });
});

router.get('/:clusterId/objects', (req, res) => {
  const cluster = getClusterById(req.params.clusterId);
  if (!cluster) {
    return res.status(404).json({ error: 'Cluster not found' });
  }

  res.json(getClusterObjects(cluster.id));
});

router.get('/:clusterId/history', (req, res) => {
  const cluster = getClusterById(req.params.clusterId);
  if (!cluster) {
    return res.status(404).json({ error: 'Cluster not found' });
  }

  res.json(getEvents(cluster.id, req.query.limit));
});

router.post('/:clusterId/interpret', (req, res) => {
  const cluster = getClusterById(req.params.clusterId);
  if (!cluster) {
    return res.status(404).json({ error: 'Cluster not found' });
  }

  const result = interpretCommand(req.body.request, req.body.adjustments);
  recordEvent(cluster.id, 'interpretation', {
    request: result.request,
    status: result.status,
    command: result.command,
    risk: result.risk
  });
  res.status(result.status === 'unsupported' ? 422 : 200).json({
    ...result,
    cluster: { id: cluster.id, name: cluster.name, context: cluster.kubeContext }
  });
});

router.post('/:clusterId/command', async (req, res) => {
  const cluster = getClusterById(req.params.clusterId);
  if (!cluster) {
    return res.status(404).json({ error: 'Cluster not found' });
  }

  const { command, confirmed = false, dryRun = false } = req.body;
  if (!command) {
    return res.status(400).json({ error: 'Missing command' });
  }

  const result = await runKubectlCommand(cluster.kubeContext, command, { confirmed, dryRun });
  recordEvent(cluster.id, 'command', {
    command,
    success: result.success,
    risk: result.risk,
    dryRun: Boolean(dryRun),
    outcome: result.confirmationRequired ? 'confirmation-required' : result.success ? 'completed' : 'failed'
  });
  const status = result.validationError ? 400 : result.confirmationRequired ? 409 : 200;
  res.status(status).json(result);
});

router.post('/:clusterId/apply', async (req, res) => {
  const cluster = getClusterById(req.params.clusterId);
  if (!cluster) {
    return res.status(404).json({ error: 'Cluster not found' });
  }

  const { manifest, confirmed = false, dryRun = false } = req.body;
  if (!manifest) {
    return res.status(400).json({ error: 'Missing manifest payload' });
  }

  const result = await applyManifest(cluster.kubeContext, manifest, { confirmed, dryRun });
  recordEvent(cluster.id, 'manifest', {
    success: result.success,
    risk: 'write',
    dryRun: Boolean(dryRun),
    outcome: result.confirmationRequired ? 'confirmation-required' : result.success ? 'completed' : 'failed'
  });
  res.status(result.confirmationRequired ? 409 : 200).json(result);
});

module.exports = router;
