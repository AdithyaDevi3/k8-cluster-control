const k8s = require('@kubernetes/client-node');
const logger = require('../utils/logger');

/**
 * Creates a Kubernetes API client for a specific context.
 * @param {string} contextName - The kubeconfig context name
 * @returns {Object} Kubernetes API clients
 */
function getK8sClient(contextName) {
  const kc = new k8s.KubeConfig();
  kc.loadFromDefault();
  kc.setCurrentContext(contextName);

  const coreV1Api = kc.makeApiClient(k8s.CoreV1Api);
  const appsV1Api = kc.makeApiClient(k8s.AppsV1Api);
  const batchV1Api = kc.makeApiClient(k8s.BatchV1Api);

  return { kc, coreV1Api, appsV1Api, batchV1Api };
}

/**
 * Gets all nodes in a cluster with health status.
 * @param {string} contextName - The kubeconfig context name
 * @returns {Promise<Array>} Array of node objects with health information
 */
async function getNodes(contextName) {
  try {
    const { coreV1Api } = getK8sClient(contextName);
    const response = await coreV1Api.listNode();
    
    return response.body.items.map(node => {
      const status = getNodeStatus(node);
      const metrics = getNodeMetrics(node);
      
      return {
        name: node.metadata.name,
        status: status.status,
        ready: status.ready,
        roles: getNodeRoles(node),
        version: node.status.nodeInfo.kubeletVersion,
        os: `${node.status.nodeInfo.osImage} (${node.status.nodeInfo.architecture})`,
        containerRuntime: node.status.nodeInfo.containerRuntimeVersion,
        capacity: {
          cpu: node.status.capacity?.cpu || '0',
          memory: node.status.capacity?.memory || '0',
          pods: node.status.capacity?.pods || '0'
        },
        allocatable: {
          cpu: node.status.allocatable?.cpu || '0',
          memory: node.status.allocatable?.memory || '0',
          pods: node.status.allocatable?.pods || '0'
        },
        conditions: node.status.conditions || [],
        addresses: node.status.addresses || [],
        createdAt: node.metadata.creationTimestamp,
        labels: node.metadata.labels || {},
        annotations: node.metadata.annotations || {}
      };
    });
  } catch (error) {
    logger.error(`Failed to get nodes for context '${contextName}':`, error.message);
    throw error;
  }
}

/**
 * Gets all pods across all namespaces with detailed status.
 * @param {string} contextName - The kubeconfig context name
 * @param {string} [namespace] - Optional namespace filter
 * @returns {Promise<Array>} Array of pod objects
 */
async function getPods(contextName, namespace = null) {
  try {
    const { coreV1Api } = getK8sClient(contextName);
    
    let response;
    if (namespace) {
      response = await coreV1Api.listNamespacedPod(namespace);
    } else {
      response = await coreV1Api.listPodForAllNamespaces();
    }
    
    return response.body.items.map(pod => {
      const status = getPodStatus(pod);
      
      return {
        name: pod.metadata.name,
        namespace: pod.metadata.namespace,
        status: status.phase,
        ready: status.ready,
        restarts: status.restarts,
        nodeName: pod.spec.nodeName,
        ip: pod.status.podIP,
        containers: pod.spec.containers.map(container => ({
          name: container.name,
          image: container.image,
          ports: container.ports || [],
          resources: container.resources || {}
        })),
        containerStatuses: pod.status.containerStatuses || [],
        conditions: pod.status.conditions || [],
        startTime: pod.status.startTime,
        createdAt: pod.metadata.creationTimestamp,
        labels: pod.metadata.labels || {},
        annotations: pod.metadata.annotations || {},
        ownerReferences: pod.metadata.ownerReferences || []
      };
    });
  } catch (error) {
    logger.error(`Failed to get pods for context '${contextName}':`, error.message);
    throw error;
  }
}

/**
 * Gets all deployments with replica status.
 * @param {string} contextName - The kubeconfig context name
 * @param {string} [namespace] - Optional namespace filter
 * @returns {Promise<Array>} Array of deployment objects
 */
async function getDeployments(contextName, namespace = null) {
  try {
    const { appsV1Api } = getK8sClient(contextName);
    
    let response;
    if (namespace) {
      response = await appsV1Api.listNamespacedDeployment(namespace);
    } else {
      response = await appsV1Api.listDeploymentForAllNamespaces();
    }
    
    return response.body.items.map(deployment => ({
      name: deployment.metadata.name,
      namespace: deployment.metadata.namespace,
      replicas: {
        desired: deployment.spec.replicas || 0,
        current: deployment.status.replicas || 0,
        ready: deployment.status.readyReplicas || 0,
        available: deployment.status.availableReplicas || 0,
        unavailable: deployment.status.unavailableReplicas || 0
      },
      conditions: deployment.status.conditions || [],
      strategy: deployment.spec.strategy?.type || 'RollingUpdate',
      containers: deployment.spec.template.spec.containers.map(c => ({
        name: c.name,
        image: c.image
      })),
      createdAt: deployment.metadata.creationTimestamp,
      labels: deployment.metadata.labels || {},
      selector: deployment.spec.selector?.matchLabels || {}
    }));
  } catch (error) {
    logger.error(`Failed to get deployments for context '${contextName}':`, error.message);
    throw error;
  }
}

/**
 * Gets all services with endpoint information.
 * @param {string} contextName - The kubeconfig context name
 * @param {string} [namespace] - Optional namespace filter
 * @returns {Promise<Array>} Array of service objects
 */
async function getServices(contextName, namespace = null) {
  try {
    const { coreV1Api } = getK8sClient(contextName);
    
    let response;
    if (namespace) {
      response = await coreV1Api.listNamespacedService(namespace);
    } else {
      response = await coreV1Api.listServiceForAllNamespaces();
    }
    
    return response.body.items.map(service => ({
      name: service.metadata.name,
      namespace: service.metadata.namespace,
      type: service.spec.type,
      clusterIP: service.spec.clusterIP,
      externalIPs: service.spec.externalIPs || [],
      ports: service.spec.ports || [],
      selector: service.spec.selector || {},
      createdAt: service.metadata.creationTimestamp,
      labels: service.metadata.labels || {}
    }));
  } catch (error) {
    logger.error(`Failed to get services for context '${contextName}':`, error.message);
    throw error;
  }
}

/**
 * Gets all namespaces in the cluster.
 * @param {string} contextName - The kubeconfig context name
 * @returns {Promise<Array>} Array of namespace objects
 */
async function getNamespaces(contextName) {
  try {
    const { coreV1Api } = getK8sClient(contextName);
    const response = await coreV1Api.listNamespace();
    
    return response.body.items.map(ns => ({
      name: ns.metadata.name,
      status: ns.status.phase,
      createdAt: ns.metadata.creationTimestamp,
      labels: ns.metadata.labels || {}
    }));
  } catch (error) {
    logger.error(`Failed to get namespaces for context '${contextName}':`, error.message);
    throw error;
  }
}

/**
 * Gets detailed information for a specific pod.
 * @param {string} contextName - The kubeconfig context name
 * @param {string} namespace - Pod namespace
 * @param {string} podName - Pod name
 * @returns {Promise<Object>} Detailed pod information
 */
async function getPodDetails(contextName, namespace, podName) {
  try {
    const { coreV1Api } = getK8sClient(contextName);
    const response = await coreV1Api.readNamespacedPod(podName, namespace);
    const pod = response.body;
    
    const status = getPodStatus(pod);
    
    return {
      name: pod.metadata.name,
      namespace: pod.metadata.namespace,
      status: status.phase,
      ready: status.ready,
      restarts: status.restarts,
      nodeName: pod.spec.nodeName,
      hostIP: pod.status.hostIP,
      podIP: pod.status.podIP,
      qosClass: pod.status.qosClass,
      containers: pod.spec.containers,
      initContainers: pod.spec.initContainers || [],
      containerStatuses: pod.status.containerStatuses || [],
      initContainerStatuses: pod.status.initContainerStatuses || [],
      conditions: pod.status.conditions || [],
      volumes: pod.spec.volumes || [],
      startTime: pod.status.startTime,
      createdAt: pod.metadata.creationTimestamp,
      labels: pod.metadata.labels || {},
      annotations: pod.metadata.annotations || {},
      ownerReferences: pod.metadata.ownerReferences || [],
      events: await getPodEvents(contextName, namespace, podName)
    };
  } catch (error) {
    logger.error(`Failed to get pod details for '${namespace}/${podName}':`, error.message);
    throw error;
  }
}

/**
 * Gets events related to a specific pod.
 * @param {string} contextName - The kubeconfig context name
 * @param {string} namespace - Pod namespace
 * @param {string} podName - Pod name
 * @returns {Promise<Array>} Array of event objects
 */
async function getPodEvents(contextName, namespace, podName) {
  try {
    const { coreV1Api } = getK8sClient(contextName);
    const response = await coreV1Api.listNamespacedEvent(
      namespace,
      undefined,
      undefined,
      undefined,
      `involvedObject.name=${podName}`
    );
    
    return response.body.items.map(event => ({
      type: event.type,
      reason: event.reason,
      message: event.message,
      count: event.count,
      firstTimestamp: event.firstTimestamp,
      lastTimestamp: event.lastTimestamp,
      source: event.source
    }));
  } catch (error) {
    logger.warn(`Failed to get events for pod '${namespace}/${podName}':`, error.message);
    return [];
  }
}

/**
 * Determines the node status and ready state.
 * @param {Object} node - Node object from API
 * @returns {Object} Status information
 */
function getNodeStatus(node) {
  const readyCondition = node.status.conditions?.find(c => c.type === 'Ready');
  const ready = readyCondition?.status === 'True';
  
  return {
    status: ready ? 'Ready' : 'NotReady',
    ready
  };
}

/**
 * Gets node metrics (placeholder for metrics server integration).
 * @param {Object} node - Node object from API
 * @returns {Object} Metrics information
 */
function getNodeMetrics(node) {
  // TODO: Integrate with metrics server for actual CPU/memory usage
  return {
    cpu: null,
    memory: null
  };
}

/**
 * Extracts node roles from labels.
 * @param {Object} node - Node object from API
 * @returns {Array<string>} Array of role names
 */
function getNodeRoles(node) {
  const roles = [];
  const labels = node.metadata.labels || {};
  
  // Check for standard role labels
  Object.keys(labels).forEach(key => {
    if (key.startsWith('node-role.kubernetes.io/')) {
      const role = key.replace('node-role.kubernetes.io/', '');
      if (role) roles.push(role);
    }
  });
  
  return roles.length > 0 ? roles : ['<none>'];
}

/**
 * Determines the pod status and ready state.
 * @param {Object} pod - Pod object from API
 * @returns {Object} Status information
 */
function getPodStatus(pod) {
  const containerStatuses = pod.status.containerStatuses || [];
  const totalContainers = containerStatuses.length;
  const readyContainers = containerStatuses.filter(c => c.ready).length;
  const restarts = containerStatuses.reduce((sum, c) => sum + (c.restartCount || 0), 0);
  
  return {
    phase: pod.status.phase,
    ready: `${readyContainers}/${totalContainers}`,
    restarts
  };
}

module.exports = {
  getNodes,
  getPods,
  getDeployments,
  getServices,
  getNamespaces,
  getPodDetails
};
