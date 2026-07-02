import { createGalaxyRenderer } from './renderer.js';
import { ui } from './ui.js';

async function bootstrap() {
  const viewer = document.getElementById('viewer');
  const toolStatus = document.getElementById('toolStatus');
  const refreshButton = document.getElementById('refreshButton');
  const runCommandButton = document.getElementById('runCommandButton');
  const applyManifestButton = document.getElementById('applyManifestButton');
  const commandInput = document.getElementById('commandInput');
  const manifestInput = document.getElementById('manifestInput');

  const galaxy = createGalaxyRenderer(viewer, onObjectSelected);
  let clusters = [];
  let selectedCluster = null;

  refreshButton.addEventListener('click', async () => {
    await refresh();
  });

  runCommandButton.addEventListener('click', async () => {
    if (!selectedCluster) return;
    await ui.executeCommand(selectedCluster.id, commandInput.value);
  });

  applyManifestButton.addEventListener('click', async () => {
    if (!selectedCluster) return;
    await ui.applyManifest(selectedCluster.id, manifestInput.value);
  });

  async function refresh() {
    const [toolResult, fetchedClusters] = await Promise.all([
      ui.fetchToolStatus(),
      ui.fetchClusters()
    ]);

    clusters = fetchedClusters;
    selectedCluster = clusters[0] || null;

    toolStatus.innerHTML = toolResult.tools
      .map((tool) => `<span class="status-pill">${tool.name}: ${tool.installed ? '✔️ ' + tool.version : '❌ missing'}</span>`)
      .join(' ');

    ui.renderClusterList(clusters, selectedCluster?.id, async (newCluster) => {
      selectedCluster = newCluster;
      galaxy.selectCluster(newCluster.id);
      ui.renderClusterDetails(newCluster);
      const objects = await ui.fetchClusterObjects(newCluster.id);
      galaxy.renderClusterObjects(newCluster.id, objects);
    });

    galaxy.renderClusters(clusters);
    if (selectedCluster) {
      ui.renderClusterDetails(selectedCluster);
      const objects = await ui.fetchClusterObjects(selectedCluster.id);
      galaxy.renderClusterObjects(selectedCluster.id, objects);
    }
  }

  galaxy.onClusterChange(async (cluster) => {
    selectedCluster = cluster;
    ui.renderClusterList(clusters, cluster.id, async (newCluster) => {
      selectedCluster = newCluster;
      galaxy.selectCluster(newCluster.id);
      ui.renderClusterDetails(newCluster);
      const objects = await ui.fetchClusterObjects(newCluster.id);
      galaxy.renderClusterObjects(newCluster.id, objects);
    });
    const objects = await ui.fetchClusterObjects(cluster.id);
    galaxy.renderClusterObjects(cluster.id, objects);
    ui.renderClusterDetails(cluster);
  });

  galaxy.onObjectAction(async (cluster, object) => {
    ui.renderSelectionDetails(cluster, object);
  });

  function onObjectSelected(cluster, object) {
    ui.renderSelectionDetails(cluster, object);
  }

  await refresh();
}

window.addEventListener('load', bootstrap);
