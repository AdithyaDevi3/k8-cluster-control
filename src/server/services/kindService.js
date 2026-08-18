const { executeCommand } = require('../utils/exec');
const logger = require('../utils/logger');

/**
 * Checks if Kind (Kubernetes in Docker) is installed and available.
 * @returns {Promise<boolean>} True if Kind is available
 */
async function isKindAvailable() {
  try {
    const result = await executeCommand('kind', ['version']);
    return result.success;
  } catch (error) {
    return false;
  }
}

/**
 * Lists all Kind clusters currently running.
 * @returns {Promise<Array<string>>} Array of cluster names
 */
async function listKindClusters() {
  try {
    const result = await executeCommand('kind', ['get', 'clusters']);
    if (!result.success) {
      return [];
    }
    
    const clusters = result.stdout
      .trim()
      .split('\n')
      .filter(line => line.length > 0);
    
    return clusters;
  } catch (error) {
    logger.error('Failed to list Kind clusters:', error.message);
    return [];
  }
}

/**
 * Creates a new Kind cluster with the specified configuration.
 * @param {string} clusterName - Name of the cluster to create
 * @param {Object} options - Cluster creation options
 * @param {number} [options.nodes=1] - Number of worker nodes
 * @param {string} [options.image] - Kubernetes version image
 * @param {Object} [options.config] - Additional Kind configuration
 * @returns {Promise<Object>} Creation result with success status and details
 */
async function createKindCluster(clusterName, options = {}) {
  const {
    nodes = 1,
    image,
    config
  } = options;

  try {
    // Validate cluster name
    if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(clusterName)) {
      return {
        success: false,
        error: 'Invalid cluster name. Must be lowercase alphanumeric with hyphens.'
      };
    }

    // Check if cluster already exists
    const existingClusters = await listKindClusters();
    if (existingClusters.includes(clusterName)) {
      return {
        success: false,
        error: `Cluster '${clusterName}' already exists`
      };
    }

    const args = ['create', 'cluster', '--name', clusterName];

    // Add image if specified
    if (image) {
      args.push('--image', image);
    }

    // Generate config file for multi-node clusters
    if (nodes > 1 || config) {
      const configContent = generateKindConfig(nodes, config);
      const configPath = `/tmp/kind-config-${clusterName}-${Date.now()}.yaml`;
      
      const fs = require('fs').promises;
      await fs.writeFile(configPath, configContent);
      args.push('--config', configPath);

      logger.info(`Created Kind config at ${configPath}`);
    }

    logger.info(`Creating Kind cluster '${clusterName}' with ${nodes} node(s)...`);
    const result = await executeCommand('kind', args, { timeout: 180000 }); // 3 minute timeout

    if (result.success) {
      logger.info(`Kind cluster '${clusterName}' created successfully`);
      return {
        success: true,
        cluster: clusterName,
        message: `Cluster '${clusterName}' created with ${nodes} node(s)`,
        stdout: result.stdout
      };
    } else {
      return {
        success: false,
        error: result.stderr || 'Failed to create cluster',
        stdout: result.stdout
      };
    }
  } catch (error) {
    logger.error(`Failed to create Kind cluster '${clusterName}':`, error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Deletes a Kind cluster by name.
 * @param {string} clusterName - Name of the cluster to delete
 * @returns {Promise<Object>} Deletion result with success status
 */
async function deleteKindCluster(clusterName) {
  try {
    const existingClusters = await listKindClusters();
    if (!existingClusters.includes(clusterName)) {
      return {
        success: false,
        error: `Cluster '${clusterName}' not found`
      };
    }

    logger.info(`Deleting Kind cluster '${clusterName}'...`);
    const result = await executeCommand('kind', ['delete', 'cluster', '--name', clusterName]);

    if (result.success) {
      logger.info(`Kind cluster '${clusterName}' deleted successfully`);
      return {
        success: true,
        cluster: clusterName,
        message: `Cluster '${clusterName}' deleted`
      };
    } else {
      return {
        success: false,
        error: result.stderr || 'Failed to delete cluster'
      };
    }
  } catch (error) {
    logger.error(`Failed to delete Kind cluster '${clusterName}':`, error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Gets the kubeconfig for a specific Kind cluster.
 * @param {string} clusterName - Name of the cluster
 * @returns {Promise<Object>} Result with kubeconfig content
 */
async function getKindKubeconfig(clusterName) {
  try {
    const result = await executeCommand('kind', ['get', 'kubeconfig', '--name', clusterName]);
    
    if (result.success) {
      return {
        success: true,
        kubeconfig: result.stdout
      };
    } else {
      return {
        success: false,
        error: result.stderr || 'Failed to get kubeconfig'
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Generates a Kind configuration YAML for cluster creation.
 * @param {number} nodes - Number of worker nodes
 * @param {Object} customConfig - Custom configuration overrides
 * @returns {string} YAML configuration content
 */
function generateKindConfig(nodes = 1, customConfig = {}) {
  const config = {
    kind: 'Cluster',
    apiVersion: 'kind.x-k8s.io/v1alpha4',
    nodes: [
      {
        role: 'control-plane',
        ...(customConfig.controlPlane || {})
      }
    ]
  };

  // Add worker nodes
  for (let i = 0; i < nodes; i++) {
    config.nodes.push({
      role: 'worker',
      ...(customConfig.worker || {})
    });
  }

  // Add networking configuration if specified
  if (customConfig.networking) {
    config.networking = customConfig.networking;
  }

  return JSON.stringify(config, null, 2)
    .replace(/"([^"]+)":/g, '$1:') // Remove quotes from keys
    .replace(/^/gm, '  ') // Indent
    .replace(/^  /, '') // Remove first indent
    .trim();
}

module.exports = {
  isKindAvailable,
  listKindClusters,
  createKindCluster,
  deleteKindCluster,
  getKindKubeconfig
};
