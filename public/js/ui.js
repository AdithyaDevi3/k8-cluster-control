const clusterList = document.getElementById('clusterList');
const detailsContent = document.getElementById('detailsContent');
const selectionContent = document.getElementById('selectionContent');
const historyContent = document.getElementById('historyContent');
const helmReleaseList = document.getElementById('helmReleaseList');

function normalizeKubectlCommand(command) {
  const text = String(command || '').trim();
  if (!text) return '';
  return text.startsWith('kubectl ') ? text : `kubectl ${text}`;
}

function renderClusterList(clusters, selectedClusterId, onSelect) {
  clusterList.innerHTML = '';
  clusters.forEach((cluster) => {
    const card = document.createElement('div');
    card.className = 'cluster-card';
    card.dataset.clusterId = cluster.id;
    if (cluster.id === selectedClusterId) {
      card.classList.add('active');
    }
    card.innerHTML = `
      <h3>${cluster.name}</h3>
      <p>${cluster.description}</p>
      <p>Status: ${cluster.status}</p>
      <p>Region: ${cluster.region}</p>
    `;

    card.addEventListener('click', () => onSelect(cluster));
    clusterList.appendChild(card);
  });
}

function renderClusterDetails(cluster) {
  detailsContent.innerHTML = '';
  detailsContent.appendChild(createDetailCard('Cluster', cluster.name));
  detailsContent.appendChild(createDetailCard('Context', cluster.kubeContext));
  detailsContent.appendChild(createDetailCard('Status', cluster.status));
  detailsContent.appendChild(createDetailCard('Region', cluster.region));
  detailsContent.appendChild(createDetailCard('Pods', cluster.metadata?.pods ?? 'unknown'));
  detailsContent.appendChild(createDetailCard('Nodes', cluster.metadata?.nodes ?? 'unknown'));
}

function renderTopologySummary(cluster, objects) {
  const topologyCard = document.createElement('div');
  topologyCard.className = 'detail-card topology-card';
  topologyCard.innerHTML = '<strong>Service and network topology</strong>';

  if (!objects || !objects.length) {
    topologyCard.appendChild(createDetailCard('Topology', 'No workload objects found for this cluster.'));
    detailsContent.appendChild(topologyCard);
    return;
  }

  const deployments = objects.filter((object) => object.kind === 'Deployment');
  const services = objects.filter((object) => object.kind === 'Service');
  const pods = objects.filter((object) => object.kind === 'Pod');
  const graph = createTopologyGraph(services, deployments, pods);
  topologyCard.appendChild(graph);

  topologyCard.appendChild(createDetailCard('Workloads', `${deployments.length} deployments, ${services.length} services, ${pods.length} pods`));

  const serviceTopology = services.slice(0, 4).map((service) => {
    const selector = service.metadata?.selector || {};
    const selectorEntries = Object.entries(selector);
    const matches = selectorEntries.length
      ? pods.filter((pod) => selectorEntries.every(([key, value]) => pod.metadata?.labels?.[key] === value))
      : [];
    const ports = (service.metadata?.ports || [])
      .map((port) => `${port.port}${port.targetPort ? `→${port.targetPort}` : ''}/${port.protocol || 'TCP'}`)
      .join(', ') || 'No ports defined';
    const exposure = [service.metadata?.type, service.metadata?.clusterIP, ...(service.metadata?.externalIPs || [])]
      .filter(Boolean)
      .join(' | ');
    const targetNames = matches.length
      ? matches.map((pod) => `${pod.namespace}/${pod.label}`).join(', ')
      : 'No matching pods found';
    return createDetailCard(
      `${service.namespace}/${service.label}`,
      `Selector: ${selectorEntries.length ? selectorEntries.map(([key, value]) => `${key}=${value}`).join(', ') : 'none'}<br/>Ports: ${ports}<br/>Exposure: ${exposure || 'Internal only'}<br/>Targets: ${targetNames}`
    );
  });

  if (serviceTopology.length) {
    serviceTopology.forEach((card) => topologyCard.appendChild(card));
  } else {
    topologyCard.appendChild(createDetailCard('Services', 'No services available to map.'));
  }

  const deploymentTopology = deployments.slice(0, 4).map((deployment) => {
    const selector = deployment.metadata?.selector || {};
    const selectorEntries = Object.entries(selector);
    const targets = selectorEntries.length
      ? pods.filter((pod) => selectorEntries.every(([key, value]) => pod.metadata?.labels?.[key] === value))
      : [];
    return createDetailCard(
      `${deployment.namespace}/${deployment.label}`,
      `Selector: ${selectorEntries.length ? selectorEntries.map(([key, value]) => `${key}=${value}`).join(', ') : 'none'}<br/>Pods: ${targets.length ? targets.map((pod) => pod.label).join(', ') : 'No pod matches found'}`
    );
  });

  deploymentTopology.forEach((card) => topologyCard.appendChild(card));

  const networkSummary = createDetailCard(
    'Network map',
    services.length
      ? services.slice(0, 4).map((service) => {
          const selector = service.metadata?.selector || {};
          const selectorEntries = Object.entries(selector);
          const linkedPods = selectorEntries.length
            ? pods.filter((pod) => selectorEntries.every(([key, value]) => pod.metadata?.labels?.[key] === value))
            : [];
          return `${service.label}: ${linkedPods.length ? linkedPods.map((pod) => pod.label).join(', ') : 'no pod targets discovered'}`;
        }).join('<br/>')
      : 'No services found to map.'
  );
  topologyCard.appendChild(networkSummary);
  detailsContent.appendChild(topologyCard);
}

function createTopologyGraph(services, deployments, pods) {
  const width = 260;
  const height = 220;
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('class', 'topology-graph');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'Service and deployment topology graph');

  const nodes = [];
  const serviceSlots = services.slice(0, 3).map((service, index) => ({
    kind: 'service',
    label: service.label,
    x: 40,
    y: 40 + index * 70,
    payload: service
  }));
  const deploymentSlots = deployments.slice(0, 3).map((deployment, index) => ({
    kind: 'deployment',
    label: deployment.label,
    x: 130,
    y: 40 + index * 70,
    payload: deployment
  }));
  const podSlots = pods.slice(0, 5).map((pod, index) => ({
    kind: 'pod',
    label: pod.label,
    x: 220,
    y: 30 + index * 40,
    payload: pod
  }));

  nodes.push(...serviceSlots, ...deploymentSlots, ...podSlots);

  serviceSlots.forEach((serviceNode) => {
    const selectorEntries = Object.entries(serviceNode.payload.metadata?.selector || {});
    const matchingPods = selectorEntries.length
      ? podSlots.filter((podNode) => selectorEntries.every(([key, value]) => podNode.payload.metadata?.labels?.[key] === value))
      : [];
    if (matchingPods.length) {
      matchingPods.forEach((podNode) => svg.appendChild(createTopologyLine(serviceNode.x + 20, serviceNode.y + 10, podNode.x - 20, podNode.y + 10)));
    }
  });

  deploymentSlots.forEach((deploymentNode) => {
    const selectorEntries = Object.entries(deploymentNode.payload.metadata?.selector || {});
    const matchingPods = selectorEntries.length
      ? podSlots.filter((podNode) => selectorEntries.every(([key, value]) => podNode.payload.metadata?.labels?.[key] === value))
      : [];
    matchingPods.forEach((podNode) => svg.appendChild(createTopologyLine(deploymentNode.x + 20, deploymentNode.y + 10, podNode.x - 20, podNode.y + 10, 'rgba(124, 58, 237, 0.7)')));
  });

  nodes.forEach((node) => {
    const group = document.createElementNS(svgNS, 'g');
    group.setAttribute('transform', `translate(${node.x}, ${node.y})`);

    const rect = document.createElementNS(svgNS, 'rect');
    rect.setAttribute('x', '0');
    rect.setAttribute('y', '0');
    rect.setAttribute('rx', '10');
    rect.setAttribute('width', node.kind === 'pod' ? '70' : '80');
    rect.setAttribute('height', '24');
    rect.setAttribute('class', `topology-node ${node.kind}`);
    group.appendChild(rect);

    const text = document.createElementNS(svgNS, 'text');
    text.setAttribute('x', '8');
    text.setAttribute('y', '16');
    text.setAttribute('class', 'topology-node-label');
    text.textContent = node.label;
    group.appendChild(text);

    svg.appendChild(group);
  });

  return svg;
}

function createTopologyLine(x1, y1, x2, y2, color = 'rgba(56, 189, 248, 0.65)') {
  const svgNS = 'http://www.w3.org/2000/svg';
  const line = document.createElementNS(svgNS, 'line');
  line.setAttribute('x1', x1);
  line.setAttribute('y1', y1);
  line.setAttribute('x2', x2);
  line.setAttribute('y2', y2);
  line.setAttribute('class', 'topology-link');
  line.setAttribute('stroke', color);
  return line;
}

function renderSelectionDetails(cluster, object, actions = {}) {
  selectionContent.innerHTML = '';
  selectionContent.appendChild(createDetailCard('Cluster', cluster.name));
  selectionContent.appendChild(createDetailCard('Object', object.label));
  selectionContent.appendChild(createDetailCard('Type', object.type));
  selectionContent.appendChild(createDetailCard('Status', object.status));

  const command = normalizeKubectlCommand(object.command);
  const commandCard = createDetailCard('Text command', command);
  if (actions.onUseCommand) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'secondary-button detail-action';
    button.textContent = 'Use text command';
    button.addEventListener('click', () => actions.onUseCommand(command, object, cluster));
    commandCard.appendChild(button);
  }
  selectionContent.appendChild(commandCard);

  // Add Edit Manifest button for supported resource types
  if (object.type === 'pod' || object.type === 'deployment' || object.type === 'service') {
    const manifestCard = createDetailCard('Manifest', 'Edit YAML configuration');
    const editButton = document.createElement('button');
    editButton.type = 'button';
    editButton.className = 'secondary-button detail-action';
    editButton.textContent = 'Edit Manifest';
    editButton.addEventListener('click', () => {
      if (window.initManifestEditor) {
        const namespace = object.namespace || 'default';
        const name = object.name || object.label;
        const kind = object.type === 'pod' ? 'pod' : 
                     object.type === 'deployment' ? 'deployment' : 'service';
        window.initManifestEditor(cluster.name, kind, namespace, name);
      }
    });
    manifestCard.appendChild(editButton);
    selectionContent.appendChild(manifestCard);
  }
}

function createDetailCard(title, body) {
  const card = document.createElement('div');
  card.className = 'detail-card';
  card.innerHTML = `<strong>${title}</strong><div>${body}</div>`;
  return card;
}

async function fetchClusters() {
  const res = await fetch('/api/clusters');
  return res.json();
}

async function fetchClusterObjects(clusterId) {
  const res = await fetch(`/api/clusters/${clusterId}/objects`);
  return res.json();
}

async function fetchToolStatus() {
  const res = await fetch('/api/tools/status');
  return res.json();
}

async function fetchHistory(clusterId) {
  const res = await fetch(`/api/clusters/${clusterId}/history?limit=8`);
  return res.json();
}

function renderHistory(events) {
  historyContent.innerHTML = '';
  if (!events.length) {
    historyContent.textContent = 'No command activity yet.';
    return;
  }

  events.forEach((event) => {
    const item = document.createElement('div');
    item.className = 'history-item';
    const title = event.type === 'interpretation' ? event.request : event.command || 'Manifest apply';
    item.innerHTML = `
      <div class="history-title">${escapeHtml(title)}</div>
      <div class="history-meta"><span>${escapeHtml(event.type)}</span><span>${escapeHtml(event.outcome || event.status || '')}</span></div>
    `;
    historyContent.appendChild(item);
  });
}

async function interpretCommand(clusterId, request, adjustments = {}) {
  const res = await fetch(`/api/clusters/${clusterId}/interpret`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ request, adjustments })
  });
  return res.json();
}

async function executeCommand(clusterId, command, options = {}) {
  const res = await fetch(`/api/clusters/${clusterId}/command`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ command, confirmed: options.confirmed, dryRun: options.dryRun })
  });
  const result = await res.json();
  return { ...result, httpStatus: res.status };
}

async function executeClusterOperation(clusterId, operation) {
  const res = await fetch(`/api/clusters/${clusterId}/operations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(operation)
  });
  const result = await res.json();
  return { ...result, httpStatus: res.status };
}

async function applyManifest(clusterId, manifest, options = {}) {
  const res = await fetch(`/api/clusters/${clusterId}/apply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ manifest, confirmed: options.confirmed, dryRun: options.dryRun })
  });
  const result = await res.json();
  selectionContent.innerHTML = '';
  selectionContent.appendChild(createDetailCard('Apply manifest', `<pre>${escapeHtml(manifest.substring(0, 300))}</pre>`));
  selectionContent.appendChild(createDetailCard('Result', `<pre>${escapeHtml(result.output || result.error || 'No output')}</pre>`));
  return { ...result, httpStatus: res.status };
}

async function fetchNodes(clusterId) {
  const res = await fetch(`/api/clusters/${clusterId}/nodes`);
  return res.json();
}

async function fetchPodDetails(clusterId, namespace, podName) {
  const res = await fetch(`/api/clusters/${clusterId}/namespaces/${namespace}/pods/${podName}`);
  return res.json();
}

async function fetchHelmReleases(clusterId) {
  const res = await fetch(`/api/helm/${clusterId}/releases`);
  return res.json();
}

async function executeHelmAction(clusterId, action, payload = {}) {
  const res = await fetch(`/api/helm/${clusterId}/releases/action`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...payload })
  });
  const result = await res.json();
  return { ...result, httpStatus: res.status };
}

function renderNodeHealth(cluster, nodes) {
  detailsContent.innerHTML = '<h3>Node Health Overview</h3>';
  
  if (!nodes || nodes.length === 0) {
    detailsContent.appendChild(createDetailCard('Status', 'No nodes found'));
    return;
  }

  nodes.forEach((node) => {
    const card = document.createElement('div');
    card.className = 'detail-card node-health-card';
    
    const statusClass = node.ready ? 'status-ready' : 'status-not-ready';
    const roleLabels = node.roles.join(', ');
    
    card.innerHTML = `
      <div class="node-header">
        <strong>${node.name}</strong>
        <span class="status-badge ${statusClass}">${node.status}</span>
      </div>
      <div class="node-info">
        <div><strong>Roles:</strong> ${roleLabels}</div>
        <div><strong>Version:</strong> ${node.version}</div>
        <div><strong>OS:</strong> ${node.os}</div>
        <div><strong>Runtime:</strong> ${node.containerRuntime}</div>
      </div>
      <div class="node-resources">
        <div><strong>CPU:</strong> ${node.allocatable.cpu} / ${node.capacity.cpu}</div>
        <div><strong>Memory:</strong> ${formatMemory(node.allocatable.memory)} / ${formatMemory(node.capacity.memory)}</div>
        <div><strong>Pods:</strong> ${node.allocatable.pods} / ${node.capacity.pods}</div>
      </div>
    `;
    
    detailsContent.appendChild(card);
  });
}

function renderPodDetails(cluster, pod) {
  selectionContent.innerHTML = '<h3>Pod Details</h3>';
  
  selectionContent.appendChild(createDetailCard('Name', pod.name));
  selectionContent.appendChild(createDetailCard('Namespace', pod.namespace));
  selectionContent.appendChild(createDetailCard('Status', pod.status));
  selectionContent.appendChild(createDetailCard('Node', pod.nodeName || 'Not scheduled'));
  selectionContent.appendChild(createDetailCard('Pod IP', pod.podIP || 'None'));
  selectionContent.appendChild(createDetailCard('Host IP', pod.hostIP || 'None'));
  selectionContent.appendChild(createDetailCard('QoS Class', pod.qosClass || 'Unknown'));
  selectionContent.appendChild(createDetailCard('Ready', pod.ready));
  selectionContent.appendChild(createDetailCard('Restarts', pod.restarts.toString()));
  
  // Container statuses
  if (pod.containerStatuses && pod.containerStatuses.length > 0) {
    const containerCard = document.createElement('div');
    containerCard.className = 'detail-card';
    containerCard.innerHTML = '<strong>Containers</strong>';
    
    pod.containerStatuses.forEach((container) => {
      const statusText = container.ready ? '✓ Ready' : '✗ Not Ready';
      const stateKey = Object.keys(container.state || {})[0] || 'unknown';
      const div = document.createElement('div');
      div.className = 'container-status';
      div.innerHTML = `
        <div><strong>${container.name}</strong> ${statusText}</div>
        <div>State: ${stateKey}</div>
        <div>Restarts: ${container.restartCount || 0}</div>
        <div>Image: ${container.image}</div>
      `;
      containerCard.appendChild(div);
    });
    
    selectionContent.appendChild(containerCard);
  }
  
  // Conditions
  if (pod.conditions && pod.conditions.length > 0) {
    const conditionCard = document.createElement('div');
    conditionCard.className = 'detail-card';
    conditionCard.innerHTML = '<strong>Conditions</strong>';
    
    pod.conditions.forEach((condition) => {
      const statusIcon = condition.status === 'True' ? '✓' : '✗';
      const div = document.createElement('div');
      div.innerHTML = `${statusIcon} ${condition.type}: ${condition.status}`;
      conditionCard.appendChild(div);
    });
    
    selectionContent.appendChild(conditionCard);
  }
  
  // Events
  if (pod.events && pod.events.length > 0) {
    const eventCard = document.createElement('div');
    eventCard.className = 'detail-card';
    eventCard.innerHTML = '<strong>Recent Events</strong>';
    
    pod.events.slice(0, 5).forEach((event) => {
      const div = document.createElement('div');
      div.className = 'event-item';
      div.innerHTML = `
        <div><strong>${event.type}:</strong> ${event.reason}</div>
        <div>${event.message}</div>
        <div class="event-meta">Count: ${event.count || 1}</div>
      `;
      eventCard.appendChild(div);
    });
    
    selectionContent.appendChild(eventCard);
  }
  
  // View Logs button
  const logsButtonCard = document.createElement('div');
  logsButtonCard.className = 'detail-card';
  logsButtonCard.innerHTML = '<strong>Actions</strong>';
  
  const viewLogsBtn = document.createElement('button');
  viewLogsBtn.textContent = 'View Logs';
  viewLogsBtn.className = 'btn-view-logs';
  viewLogsBtn.style.cssText = 'padding: 8px 16px; background: var(--accent); color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.9rem; margin-top: 8px;';
  viewLogsBtn.onclick = () => {
    if (window.logsViewer) {
      window.logsViewer.show(cluster.id, pod.namespace, pod.name);
    }
  };
  
  logsButtonCard.appendChild(viewLogsBtn);
  selectionContent.appendChild(logsButtonCard);
  
  // Labels
  if (pod.labels && Object.keys(pod.labels).length > 0) {
    const labelsCard = document.createElement('div');
    labelsCard.className = 'detail-card';
    labelsCard.innerHTML = '<strong>Labels</strong>';
    
    const labelsList = Object.entries(pod.labels)
      .map(([key, value]) => `<div><code>${escapeHtml(key)}: ${escapeHtml(value)}</code></div>`)
      .join('');
    labelsCard.innerHTML += labelsList;
    
    selectionContent.appendChild(labelsCard);
  }
}

function renderHelmReleases(cluster, payload) {
  helmReleaseList.innerHTML = '';

  if (!cluster) {
    helmReleaseList.textContent = 'Select a cluster to view releases.';
    return;
  }

  const releases = payload?.releases || [];
  if (!releases.length) {
    helmReleaseList.textContent = 'No Helm releases found for the selected cluster.';
    return;
  }

  releases.forEach((release) => {
    const card = document.createElement('div');
    card.className = 'history-item';
    card.dataset.releaseName = release.name;
    card.innerHTML = `
      <div class="history-title">${escapeHtml(release.name)}</div>
      <div class="history-meta"><span>${escapeHtml(release.namespace || 'default')}</span><span>${escapeHtml(release.chart || 'unknown chart')}</span></div>
      <div class="history-meta"><span>Revision ${escapeHtml(String(release.revision || ''))}</span><span>${escapeHtml(release.status || '')}</span></div>
    `;
    helmReleaseList.appendChild(card);
  });
}

function formatMemory(memoryString) {
  if (!memoryString) return '0';
  
  // Parse Kubernetes memory format (e.g., "1234567Ki")
  const match = memoryString.match(/^(\d+)(.*)$/);
  if (!match) return memoryString;
  
  const value = parseInt(match[1]);
  const unit = match[2] || '';
  
  if (unit === 'Ki') {
    const mb = (value / 1024).toFixed(1);
    return `${mb} Mi`;
  }
  if (unit === 'Mi') {
    return `${value} Mi`;
  }
  if (unit === 'Gi') {
    return `${value} Gi`;
  }
  
  return memoryString;
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export const ui = {
  renderClusterList,
  renderClusterDetails,
  renderTopologySummary,
  renderSelectionDetails,
  fetchClusters,
  fetchClusterObjects,
  fetchToolStatus,
  fetchHistory,
  renderHistory,
  interpretCommand,
  executeCommand,
  executeClusterOperation,
  applyManifest,
  fetchNodes,
  fetchPodDetails,
  fetchHelmReleases,
  executeHelmAction,
  renderNodeHealth,
  renderPodDetails,
  renderHelmReleases
};
