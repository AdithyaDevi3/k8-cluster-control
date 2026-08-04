const clusters = [
  {
    id: 'alpha',
    name: process.env.CLUSTER_NAME || 'alpha',
    region: process.env.CLUSTER_REGION || 'us-east',
    status: 'ready',
    kubeContext: process.env.KUBE_CONTEXT || 'alpha-context',
    description: process.env.CLUSTER_DESCRIPTION || 'Primary Kubernetes cluster.',
    metadata: {
      createdAt: '2026-07-02T00:00:00Z',
      nodes: 3,
      pods: 24
    }
  },
  ...(process.env.NODE_ENV === 'production' ? [] : [{
    id: 'beta',
    name: 'beta',
    region: 'us-west',
    status: 'pending',
    kubeContext: 'beta-context',
    description: 'Secondary cluster for staging and sandbox testing.',
    metadata: {
      createdAt: '2026-07-01T00:00:00Z',
      nodes: 5,
      pods: 62
    }
  }])
];

const clusterObjects = {
  alpha: [
    { id: 'alpha-app', type: 'Deployment', label: 'frontend', x: 0.2, y: 0.3, command: 'kubectl get deployments frontend', kind: 'Deployment', status: 'healthy' },
    { id: 'alpha-db', type: 'StatefulSet', label: 'database', x: -0.2, y: 0.6, command: 'kubectl get statefulsets database', kind: 'StatefulSet', status: 'healthy' },
    { id: 'alpha-svc', type: 'Service', label: 'api-service', x: 0.7, y: -0.3, command: 'kubectl get svc api-service', kind: 'Service', status: 'available' }
  ],
  beta: [
    { id: 'beta-app', type: 'Deployment', label: 'worker', x: -0.4, y: 0.4, command: 'kubectl get deployments worker', kind: 'Deployment', status: 'scaling' },
    { id: 'beta-cache', type: 'Pod', label: 'redis', x: 0.7, y: 0.7, command: 'kubectl get pods redis', kind: 'Pod', status: 'running' }
  ]
};

function getClusters() {
  return clusters;
}

function getClusterById(clusterId) {
  return clusters.find((cluster) => cluster.id === clusterId);
}

function getClusterObjects(clusterId) {
  return clusterObjects[clusterId] || [];
}

module.exports = {
  getClusters,
  getClusterById,
  getClusterObjects
};
