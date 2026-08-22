const express = require('express');
const { getClusters, getClusterById, getClusterObjects, refreshClusters } = require('../services/clusterService');
const { runKubectlCommand, applyManifest } = require('../services/kubectlService');
const { interpretCommand } = require('../services/commandInterpreter');
const { recordEvent, getEvents } = require('../services/auditService');
const { getNodes, getPodDetails, getNamespaces } = require('../services/resourceService');
const router = express.Router();

function buildOperationCommand(clusterContext, operation) {
  const namespace = operation.namespace || 'default';

  if (operation.action === 'scale') {
    if (!operation.resourceName || operation.replicas === undefined || operation.replicas === null) {
      throw new Error('Scale operations require resourceName and replicas.');
    }
    return `kubectl --context ${clusterContext} scale ${operation.resourceType}/${operation.resourceName} -n ${namespace} --replicas=${operation.replicas}`;
  }

  if (!operation.resourceName) {
    throw new Error(`${operation.action} operations require resourceName.`);
  }

  if (operation.action === 'cordon') {
    return `kubectl --context ${clusterContext} cordon ${operation.resourceName}`;
  }

  if (operation.action === 'drain') {
    return `kubectl --context ${clusterContext} drain ${operation.resourceName} --ignore-daemonsets --delete-emptydir-data`;
  }

  if (operation.action === 'delete') {
    const resourceType = operation.resourceType || 'deployment';
    return `kubectl --context ${clusterContext} delete ${resourceType} ${operation.resourceName} -n ${namespace}`;
  }

  throw new Error(`Unsupported operation: ${operation.action}`);
}

router.get('/', (req, res) => {
  const clusters = getClusters();
  res.json(clusters);
});

router.post('/refresh', (req, res) => {
  const clusters = refreshClusters();
  res.json({ message: 'Clusters refreshed', count: clusters.length, clusters });
});

router.post('/:clusterId/connect', (req, res) => {
  const cluster = getClusterById(req.params.clusterId);
  if (!cluster) {
    return res.status(404).json({ error: 'Cluster not found' });
  }

  res.json({ connected: true, cluster });
});

router.get('/:clusterId/objects', async (req, res) => {
  const cluster = getClusterById(req.params.clusterId);
  if (!cluster) {
    return res.status(404).json({ error: 'Cluster not found' });
  }

  try {
    const objects = await getClusterObjects(cluster.id, cluster.kubeContext);
    res.json(objects);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch cluster objects', message: error.message });
  }
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

router.post('/:clusterId/operations', async (req, res) => {
  const cluster = getClusterById(req.params.clusterId);
  if (!cluster) {
    return res.status(404).json({ error: 'Cluster not found' });
  }

  const operation = req.body || {};
  try {
    const command = buildOperationCommand(cluster.kubeContext, operation);
    const dryRun = operation.dryRun !== false;
    const confirmed = Boolean(operation.confirmed);
    const result = await runKubectlCommand(cluster.kubeContext, command, { confirmed, dryRun });

    recordEvent(cluster.id, 'operation', {
      command,
      action: operation.action,
      success: result.success,
      risk: result.risk,
      dryRun: Boolean(dryRun),
      outcome: result.confirmationRequired ? 'confirmation-required' : result.success ? 'completed' : 'failed'
    });

    const status = result.validationError ? 400 : result.confirmationRequired ? 409 : 200;
    res.status(status).json({ ...result, action: operation.action });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get all nodes for a cluster with health status
router.get('/:clusterId/nodes', async (req, res) => {
  const cluster = getClusterById(req.params.clusterId);
  if (!cluster) {
    return res.status(404).json({ error: 'Cluster not found' });
  }

  try {
    const nodes = await getNodes(cluster.kubeContext);
    res.json(nodes);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch nodes', message: error.message });
  }
});

// Get all namespaces for a cluster
router.get('/:clusterId/namespaces', async (req, res) => {
  const cluster = getClusterById(req.params.clusterId);
  if (!cluster) {
    return res.status(404).json({ error: 'Cluster not found' });
  }

  try {
    const namespaces = await getNamespaces(cluster.kubeContext);
    res.json(namespaces);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch namespaces', message: error.message });
  }
});

// Get detailed information for a specific pod
router.get('/:clusterId/namespaces/:namespace/pods/:podName', async (req, res) => {
  const cluster = getClusterById(req.params.clusterId);
  if (!cluster) {
    return res.status(404).json({ error: 'Cluster not found' });
  }

  const { namespace, podName } = req.params;
  
  try {
    const podDetails = await getPodDetails(cluster.kubeContext, namespace, podName);
    res.json(podDetails);
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to fetch pod details', 
      message: error.message 
    });
  }
});

module.exports = router;
module.exports.buildOperationCommand = buildOperationCommand;
