const clusters = [
  {
    id: 'alpha',
    name: 'alpha',
    region: 'us-east',
    status: 'ready',
    kubeContext: 'alpha-context',
    description: 'Demo cluster running in a development environment.',
    metadata: {
      createdAt: '2026-07-02T00:00:00Z',
      nodes: 3,
      pods: 24
    }
  },
  {
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
  }
];

const clusterObjects = {
  alpha: [
    { id: 'alpha-app', type: 'Deployment', label: 'frontend', x: 0.2, y: 0.3, command: 'get deployments', kind: 'Deployment', status: 'healthy' },
    { id: 'alpha-db', type: 'StatefulSet', label: 'database', x: -0.2, y: 0.6, command: 'get statefulsets', kind: 'StatefulSet', status: 'healthy' },
    { id: 'alpha-svc', type: 'Service', label: 'api-service', x: 0.7, y: -0.3, command: 'get svc', kind: 'Service', status: 'available' }
  ],
  beta: [
    { id: 'beta-app', type: 'Deployment', label: 'worker', x: -0.4, y: 0.4, command: 'get deployments', kind: 'Deployment', status: 'scaling' },
    { id: 'beta-cache', type: 'Pod', label: 'redis', x: 0.7, y: 0.7, command: 'get pods', kind: 'Pod', status: 'running' }
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
