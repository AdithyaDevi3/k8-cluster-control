const clusterList = document.getElementById('clusterList');
const detailsContent = document.getElementById('detailsContent');
const selectionContent = document.getElementById('selectionContent');

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

async function executeCommand(clusterId, command) {
  const res = await fetch(`/api/clusters/${clusterId}/command`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ command })
  });
  const result = await res.json();
  selectionContent.innerHTML = '';
  selectionContent.appendChild(createDetailCard('Command', escapeHtml(command)));
  selectionContent.appendChild(createDetailCard('Output', `<pre>${escapeHtml(result.output || result.error || 'No output')}</pre>`));
  return result;
}

async function applyManifest(clusterId, manifest) {
  const res = await fetch(`/api/clusters/${clusterId}/apply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ manifest })
  });
  const result = await res.json();
  selectionContent.innerHTML = '';
  selectionContent.appendChild(createDetailCard('Apply manifest', `<pre>${escapeHtml(manifest.substring(0, 300))}</pre>`));
  selectionContent.appendChild(createDetailCard('Result', `<pre>${escapeHtml(result.output || result.error || 'No output')}</pre>`));
  return result;
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
  executeCommand,
  applyManifest
};
