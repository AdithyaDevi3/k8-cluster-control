const clusterList = document.getElementById('clusterList');
const detailsContent = document.getElementById('detailsContent');
const selectionContent = document.getElementById('selectionContent');
const historyContent = document.getElementById('historyContent');

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
  renderSelectionDetails,
  fetchClusters,
  fetchClusterObjects,
  fetchToolStatus,
  fetchHistory,
  renderHistory,
  interpretCommand,
  executeCommand,
  applyManifest,
  fetchNodes,
  fetchPodDetails,
  renderNodeHealth,
  renderPodDetails
};
