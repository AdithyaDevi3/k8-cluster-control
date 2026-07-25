const clusterList = document.getElementById('clusterList');
const detailsContent = document.getElementById('detailsContent');
const selectionContent = document.getElementById('selectionContent');
const historyContent = document.getElementById('historyContent');

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

function renderSelectionDetails(cluster, object) {
  selectionContent.innerHTML = '';
  selectionContent.appendChild(createDetailCard('Cluster', cluster.name));
  selectionContent.appendChild(createDetailCard('Object', object.label));
  selectionContent.appendChild(createDetailCard('Type', object.type));
  selectionContent.appendChild(createDetailCard('Status', object.status));
  selectionContent.appendChild(createDetailCard('Command', object.command));
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
  applyManifest
};
