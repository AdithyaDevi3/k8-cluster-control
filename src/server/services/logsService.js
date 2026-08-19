const k8s = require('@kubernetes/client-node');
const logger = require('../utils/logger');

/**
 * Stream pod logs with optional follow mode
 * @param {string} contextName - Kubernetes context name
 * @param {string} namespace - Pod namespace
 * @param {string} podName - Pod name
 * @param {Object} options - Streaming options
 * @returns {Promise<ReadableStream>} Log stream
 */
async function streamPodLogs(contextName, namespace, podName, options = {}) {
  const kc = new k8s.KubeConfig();
  kc.loadFromDefault();
  kc.setCurrentContext(contextName);

  const logApi = new k8s.Log(kc);
  
  const {
    container = null,
    follow = false,
    tailLines = 500,
    timestamps = true,
    previous = false
  } = options;

  try {
    const stream = await logApi.log(
      namespace,
      podName,
      container,
      process.stdout, // Initial output stream (will be replaced)
      {
        follow,
        tailLines,
        timestamps,
        previous
      }
    );

    return stream;
  } catch (error) {
    logger.error('Error streaming pod logs', { 
      contextName, 
      namespace, 
      podName, 
      container,
      error: error.message 
    });
    throw error;
  }
}

/**
 * Execute a command in a pod container
 * @param {string} contextName - Kubernetes context name
 * @param {string} namespace - Pod namespace
 * @param {string} podName - Pod name
 * @param {string} container - Container name
 * @param {Array<string>} command - Command to execute
 * @returns {Promise<Object>} Command result
 */
async function execInPod(contextName, namespace, podName, container, command) {
  const kc = new k8s.KubeConfig();
  kc.loadFromDefault();
  kc.setCurrentContext(contextName);

  const exec = new k8s.Exec(kc);
  
  let stdout = '';
  let stderr = '';

  try {
    await exec.exec(
      namespace,
      podName,
      container,
      command,
      process.stdout, // stdout stream
      process.stderr, // stderr stream
      process.stdin,  // stdin stream
      false,          // tty
      ({ status, reason, message }) => {
        logger.info('Exec status', { status, reason, message });
      }
    );

    return {
      success: true,
      stdout,
      stderr
    };
  } catch (error) {
    logger.error('Error executing command in pod', {
      contextName,
      namespace,
      podName,
      container,
      command,
      error: error.message
    });
    return {
      success: false,
      error: error.message,
      stdout,
      stderr
    };
  }
}

/**
 * Get available containers for a pod
 * @param {string} contextName - Kubernetes context name
 * @param {string} namespace - Pod namespace
 * @param {string} podName - Pod name
 * @returns {Promise<Array<string>>} Container names
 */
async function getPodContainers(contextName, namespace, podName) {
  const kc = new k8s.KubeConfig();
  kc.loadFromDefault();
  kc.setCurrentContext(contextName);

  const coreApi = kc.makeApiClient(k8s.CoreV1Api);

  try {
    const { body: pod } = await coreApi.readNamespacedPod(podName, namespace);
    
    const containers = [
      ...(pod.spec.containers || []).map(c => ({
        name: c.name,
        type: 'container'
      })),
      ...(pod.spec.initContainers || []).map(c => ({
        name: c.name,
        type: 'initContainer'
      }))
    ];

    return containers;
  } catch (error) {
    logger.error('Error getting pod containers', {
      contextName,
      namespace,
      podName,
      error: error.message
    });
    throw error;
  }
}

module.exports = {
  streamPodLogs,
  execInPod,
  getPodContainers
};
