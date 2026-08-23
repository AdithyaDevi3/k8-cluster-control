const express = require('express');
const { getClusterById } = require('../services/clusterService');
const { spawnCommand } = require('../utils/exec');

const router = express.Router();

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

module.exports = router;