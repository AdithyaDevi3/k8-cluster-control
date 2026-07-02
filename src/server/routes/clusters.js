const express = require('express');
const { getClusters, getClusterById, getClusterObjects } = require('../services/clusterService');
const { runKubectlCommand, applyManifest } = require('../services/kubectlService');
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

router.post('/:clusterId/command', async (req, res) => {
  const cluster = getClusterById(req.params.clusterId);
  if (!cluster) {
    return res.status(404).json({ error: 'Cluster not found' });
  }

  const { command } = req.body;
  if (!command) {
    return res.status(400).json({ error: 'Missing command' });
  }

  const result = await runKubectlCommand(cluster.kubeContext, command);
  res.json(result);
});

router.post('/:clusterId/apply', async (req, res) => {
  const cluster = getClusterById(req.params.clusterId);
  if (!cluster) {
    return res.status(404).json({ error: 'Cluster not found' });
  }

  const { manifest } = req.body;
  if (!manifest) {
    return res.status(400).json({ error: 'Missing manifest payload' });
  }

  const result = await applyManifest(cluster.kubeContext, manifest);
  res.json(result);
});

module.exports = router;
