const express = require('express');
const {
  isKindAvailable,
  listKindClusters,
  createKindCluster,
  deleteKindCluster,
  getKindKubeconfig
} = require('../services/kindService');
const { refreshClusters } = require('../services/clusterService');
const router = express.Router();

/**
 * Check if Kind is available on the system
 */
router.get('/available', async (req, res) => {
  const available = await isKindAvailable();
  res.json({
    available,
    message: available
      ? 'Kind is installed and ready'
      : 'Kind is not installed. Install from https://kind.sigs.k8s.io/'
  });
});

/**
 * List all Kind clusters
 */
router.get('/', async (req, res) => {
  const clusters = await listKindClusters();
  res.json({
    count: clusters.length,
    clusters
  });
});

/**
 * Create a new Kind cluster
 */
router.post('/', async (req, res) => {
  const { name, nodes, image, config } = req.body;

  if (!name) {
    return res.status(400).json({
      success: false,
      error: 'Cluster name is required'
    });
  }

  const available = await isKindAvailable();
  if (!available) {
    return res.status(503).json({
      success: false,
      error: 'Kind is not installed or not available in PATH'
    });
  }

  const result = await createKindCluster(name, { nodes, image, config });

  if (result.success) {
    // Refresh the global clusters cache to include the new Kind cluster
    refreshClusters();
    res.status(201).json(result);
  } else {
    res.status(400).json(result);
  }
});

/**
 * Delete a Kind cluster
 */
router.delete('/:clusterName', async (req, res) => {
  const { clusterName } = req.params;

  const result = await deleteKindCluster(clusterName);

  if (result.success) {
    // Refresh the global clusters cache
    refreshClusters();
    res.json(result);
  } else {
    res.status(404).json(result);
  }
});

/**
 * Get kubeconfig for a specific Kind cluster
 */
router.get('/:clusterName/kubeconfig', async (req, res) => {
  const { clusterName } = req.params;

  const result = await getKindKubeconfig(clusterName);

  if (result.success) {
    res.type('text/yaml').send(result.kubeconfig);
  } else {
    res.status(404).json(result);
  }
});

module.exports = router;
