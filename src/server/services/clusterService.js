const k8s = require('@kubernetes/client-node');
const logger = require('../utils/logger');

// Cache for discovered clusters
let clustersCache = null;
let cacheTimestamp = null;
const CACHE_TTL = 30000; // 30 seconds

/**
 * Discovers all Kubernetes clusters from the user's kubeconfig file.
 * Returns an array of cluster objects with context information.
 */
function discoverClustersFromKubeconfig() {
  try {
    const kc = new k8s.KubeConfig();
    kc.loadFromDefault();

    const contexts = kc.getContexts();
    const currentContext = kc.getCurrentContext();

    return contexts.map((context) => {
      const cluster = kc.getCluster(context.cluster);
      const user = kc.getUser(context.user);
      
      return {
        id: context.name.replace(/[^a-zA-Z0-9-]/g, '-'),
        name: context.name,
        region: extractRegionFromCluster(cluster, context),
        status: context.name === currentContext ? 'active' : 'available',
        kubeContext: context.name,
        description: `Kubernetes cluster: ${context.cluster}`,
        metadata: {
          cluster: cluster?.name || context.cluster,
          server: cluster?.server || 'unknown',
          user: user?.name || context.user,
          namespace: context.namespace || 'default',
          isCurrent: context.name === currentContext
        }
      };
    });
  } catch (error) {
    logger.error('Failed to discover clusters from kubeconfig:', error.message);
    return getFallbackClusters();
  }
}

/**
 * Extracts region information from cluster metadata.
 * Attempts to parse region from cluster name or server URL.
 */
function extractRegionFromCluster(cluster, context) {
  const clusterName = cluster?.name || context.cluster || '';
  const server = cluster?.server || '';

  // Try to extract region from common patterns
  const regionPatterns = [
    /us-east-\d/i,
    /us-west-\d/i,
    /eu-central-\d/i,
    /eu-west-\d/i,
    /ap-southeast-\d/i,
    /ap-northeast-\d/i
  ];

  const combined = `${clusterName} ${server}`;
  for (const pattern of regionPatterns) {
    const match = combined.match(pattern);
    if (match) {
      return match[0].toLowerCase();
    }
  }

  // Check for cloud provider patterns
  if (clusterName.includes('eks') || server.includes('eks.amazonaws.com')) {
    return 'aws';
  }
  if (clusterName.includes('gke') || server.includes('container.googleapis.com')) {
    return 'gcp';
  }
  if (clusterName.includes('aks') || server.includes('azmk8s.io')) {
    return 'azure';
  }
  if (server.includes('localhost') || server.includes('127.0.0.1')) {
    return 'local';
  }

  return 'unknown';
}

/**
 * Fallback clusters when kubeconfig is unavailable or invalid.
 * Used in development or when no Kubernetes configuration exists.
 */
function getFallbackClusters() {
  return [
    {
      id: 'no-clusters',
      name: 'No clusters found',
      region: 'none',
      status: 'unavailable',
      kubeContext: null,
      description: 'No Kubernetes clusters discovered. Check your kubeconfig file.',
      metadata: {
        error: true,
        message: 'Unable to load kubeconfig'
      }
    }
  ];
}

/**
 * Gets all discovered clusters with caching.
 * Refreshes the cache if it's older than the TTL.
 */
function getClusters() {
  const now = Date.now();
  if (!clustersCache || !cacheTimestamp || (now - cacheTimestamp) > CACHE_TTL) {
    clustersCache = discoverClustersFromKubeconfig();
    cacheTimestamp = now;
    logger.info(`Discovered ${clustersCache.length} cluster(s) from kubeconfig`);
  }
  return clustersCache;
}

/**
 * Gets a specific cluster by ID.
 */
function getClusterById(clusterId) {
  const clusters = getClusters();
  return clusters.find((cluster) => cluster.id === clusterId);
}

/**
 * Gets objects for a specific cluster.
 * This will eventually fetch live resources from the cluster.
 * For now, returns an empty array as placeholder.
 */
function getClusterObjects(clusterId) {
  // TODO: Implement live resource discovery from the actual cluster
  // This should query the cluster for pods, deployments, services, etc.
  return [];
}

/**
 * Forces a refresh of the clusters cache.
 * Useful when the kubeconfig has been modified.
 */
function refreshClusters() {
  clustersCache = null;
  cacheTimestamp = null;
  return getClusters();
}

module.exports = {
  getClusters,
  getClusterById,
  getClusterObjects,
  refreshClusters
};
