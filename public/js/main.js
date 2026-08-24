import { createGalaxyRenderer } from './renderer.js';
import { ui } from './ui.js';

async function bootstrap() {
  const viewer = document.getElementById('viewer');
  const toolStatus = document.getElementById('toolStatus');
  const refreshButton = document.getElementById('refreshButton');
  const clusterSearchInput = document.getElementById('clusterSearchInput');
  const objectSearchInput = document.getElementById('objectSearchInput');
  const interpretCommandButton = document.getElementById('interpretCommandButton');
  const runCommandButton = document.getElementById('runCommandButton');
  const applyClarificationsButton = document.getElementById('applyClarificationsButton');
  const applyManifestButton = document.getElementById('applyManifestButton');
  const refreshHelmButton = document.getElementById('refreshHelmButton');
  const helmInstallButton = document.getElementById('helmInstallButton');
  const helmUpgradeButton = document.getElementById('helmUpgradeButton');
  const helmRollbackButton = document.getElementById('helmRollbackButton');
  const helmUninstallButton = document.getElementById('helmUninstallButton');
  const naturalCommandInput = document.getElementById('naturalCommandInput');
  const commandInput = document.getElementById('commandInput');
  const manifestInput = document.getElementById('manifestInput');
  const commandState = document.getElementById('commandState');
  const interpretationPanel = document.getElementById('interpretationPanel');
  const commandPreviewPanel = document.getElementById('commandPreviewPanel');
  const clarificationFields = document.getElementById('clarificationFields');
  const commandExplanation = document.getElementById('commandExplanation');
  const riskBadge = document.getElementById('riskBadge');
  const targetContext = document.getElementById('targetContext');
  const dryRunToggle = document.getElementById('dryRunToggle');
  const terminalPanel = document.getElementById('terminalPanel');
  const terminalStatus = document.getElementById('terminalStatus');
  const terminalOutput = document.getElementById('terminalOutput');

  const galaxy = createGalaxyRenderer(viewer, onObjectSelected);
  let clusters = [];
  let selectedCluster = null;
  let interpretation = null;
  let clusterSearchTerm = '';
  let objectSearchTerm = '';

  clusterSearchInput.addEventListener('input', async () => {
    clusterSearchTerm = clusterSearchInput.value.trim().toLowerCase();
    await renderClustersView();
  });

  objectSearchInput.addEventListener('input', async () => {
    objectSearchTerm = objectSearchInput.value.trim().toLowerCase();
    if (selectedCluster) {
      await renderClusterInfo(selectedCluster);
    }
  });

  refreshButton.addEventListener('click', async () => {
    await refresh();
  });

  interpretCommandButton.addEventListener('click', async () => {
    await interpretNaturalLanguage();
  });

  naturalCommandInput.addEventListener('keydown', async (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      await interpretNaturalLanguage();
    }
  });

  applyClarificationsButton.addEventListener('click', async () => {
    const adjustments = {};
    clarificationFields.querySelectorAll('[data-field]').forEach((input) => {
      adjustments[input.dataset.field] = input.type === 'number' ? Number(input.value) : input.value;
    });
    await interpretNaturalLanguage(adjustments);
  });

  runCommandButton.addEventListener('click', async () => {
    if (!selectedCluster) return;
    setCommandState('running', 'Running');
    terminalPanel.hidden = false;
    terminalStatus.textContent = 'Running';
    terminalOutput.textContent = `$ ${commandInput.value}\n`;
    let result = await ui.executeCommand(selectedCluster.id, commandInput.value, {
      confirmed: false,
      dryRun: dryRunToggle.checked
    });

    if (result.confirmationRequired) {
      const action = result.risk === 'destructive' ? 'destructive operation' : 'cluster change';
      const confirmed = window.confirm(`Confirm this ${action} on ${selectedCluster.name}?\n\n${commandInput.value}`);
      if (!confirmed) {
        terminalStatus.textContent = 'Cancelled';
        terminalOutput.textContent += 'Execution cancelled by user.';
        setCommandState('ready', 'Ready');
        await refreshHistory();
        return;
      }
      result = await ui.executeCommand(selectedCluster.id, commandInput.value, {
        confirmed: true,
        dryRun: dryRunToggle.checked
      });
    }

    terminalStatus.textContent = result.success ? 'Completed' : 'Failed';
    terminalOutput.textContent += result.output || result.error || 'No output';
    setCommandState(result.success ? 'ready' : 'error', result.success ? 'Complete' : 'Failed');
    await refreshHistory();
  });

  applyManifestButton.addEventListener('click', async () => {
    if (!selectedCluster) return;
    let result = await ui.applyManifest(selectedCluster.id, manifestInput.value, { confirmed: false });
    if (!result.confirmationRequired) {
      await refreshHistory();
      return;
    }
    const confirmed = window.confirm(`Confirm manifest apply on ${selectedCluster.name}?`);
    if (!confirmed) {
      await refreshHistory();
      return;
    }
    result = await ui.applyManifest(selectedCluster.id, manifestInput.value, { confirmed: true });
    await refreshHistory();
  });

  refreshHelmButton.addEventListener('click', async () => {
    if (selectedCluster) {
      await refreshHelmReleases(selectedCluster);
    }
  });

  helmInstallButton.addEventListener('click', async () => {
    if (selectedCluster) {
      await runHelmAction(selectedCluster, 'install');
    }
  });

  helmUpgradeButton.addEventListener('click', async () => {
    if (selectedCluster) {
      await runHelmAction(selectedCluster, 'upgrade');
    }
  });

  helmRollbackButton.addEventListener('click', async () => {
    if (selectedCluster) {
      await runHelmAction(selectedCluster, 'rollback');
    }
  });

  helmUninstallButton.addEventListener('click', async () => {
    if (selectedCluster) {
      await runHelmAction(selectedCluster, 'uninstall');
    }
  });

  async function refresh() {
    const [toolResult, fetchedClusters] = await Promise.all([
      ui.fetchToolStatus(),
      ui.fetchClusters()
    ]);

    clusters = fetchedClusters;
    selectedCluster = clusters[0] || null;
    updateTargetContext();

    toolStatus.innerHTML = toolResult.tools
      .map((tool) => `<span class="status-pill">${tool.name}: ${tool.installed ? '✔️ ' + tool.version : '❌ missing'}</span>`)
      .join(' ');

    await renderClustersView();

    if (selectedCluster) {
      await renderClusterInfo(selectedCluster);
      await refreshHistory();
      await refreshHelmReleases(selectedCluster);
    }
  }

  async function renderClustersView() {
    const filteredClusters = filterClusters(clusters, clusterSearchTerm);
    if (selectedCluster && !filteredClusters.some((cluster) => cluster.id === selectedCluster.id)) {
      selectedCluster = filteredClusters[0] || null;
      updateTargetContext();
    }

    ui.renderClusterList(filteredClusters, selectedCluster?.id, async (newCluster) => {
      selectedCluster = newCluster;
      updateTargetContext();
      galaxy.selectCluster(newCluster.id);
      await renderClusterInfo(newCluster);
      await refreshHistory();
    });

    galaxy.renderClusters(filteredClusters);
    if (selectedCluster) {
      await renderClusterInfo(selectedCluster);
      await refreshHistory();
    }
  }

  async function renderClusterInfo(cluster) {
    try {
      const [objects, nodes] = await Promise.all([
        ui.fetchClusterObjects(cluster.id),
        ui.fetchNodes(cluster.id).catch(() => [])
      ]);
      galaxy.renderClusterObjects(cluster.id, filterObjects(objects, objectSearchTerm));
      ui.renderNodeHealth(cluster, nodes);
      ui.renderTopologySummary(cluster, objects);
      renderClusterOperations(cluster);
      await refreshHelmReleases(cluster);
    } catch (error) {
      console.error('Failed to render cluster info:', error);
      ui.renderClusterDetails(cluster);
      ui.renderTopologySummary(cluster, []);
      renderClusterOperations(cluster);
      ui.renderHelmReleases(cluster, { releases: [] });
    }
  }

  async function refreshHelmReleases(cluster) {
    try {
      const releases = await ui.fetchHelmReleases(cluster.id);
      ui.renderHelmReleases(cluster, releases);
    } catch (error) {
      console.error('Failed to fetch Helm releases:', error);
      ui.renderHelmReleases(cluster, { releases: [] });
    }
  }

  async function runHelmAction(cluster, action) {
    const payload = { releaseName: window.prompt(`${action}: enter release name`) };
    if (!payload.releaseName) return;

    if (action === 'install' || action === 'upgrade') {
      payload.chart = window.prompt(`${action}: enter chart reference`, 'bitnami/nginx');
      if (!payload.chart) return;
      payload.namespace = window.prompt(`${action}: enter namespace`, 'default') || 'default';
      const valuesFile = window.prompt(`${action}: optional values file path`, '');
      if (valuesFile) payload.valuesFile = valuesFile;
      if (action === 'upgrade') {
        payload.resetValues = window.confirm('Reset values for this upgrade?');
      }
    }

    if (action === 'rollback') {
      const revision = window.prompt('rollback: enter revision number (optional)', '');
      if (revision) payload.revision = revision;
      payload.namespace = window.prompt('rollback: enter namespace', 'default') || 'default';
    }

    if (action === 'uninstall') {
      payload.namespace = window.prompt('uninstall: enter namespace', 'default') || 'default';
    }

    setCommandState('running', 'Running');
    terminalPanel.hidden = false;
    terminalStatus.textContent = 'Running';
    terminalOutput.textContent = `Executing helm ${action}...\n`;

    const result = await ui.executeHelmAction(cluster.id, action, payload);
    terminalStatus.textContent = result.httpStatus >= 400 ? 'Failed' : 'Completed';
    terminalOutput.textContent += result.command ? `${result.command}\n` : '';
    terminalOutput.textContent += result.output || result.message || result.error || 'No output';
    setCommandState(result.httpStatus >= 400 ? 'error' : 'ready', result.httpStatus >= 400 ? 'Failed' : 'Complete');

    if (result.httpStatus < 400) {
      await refreshHelmReleases(cluster);
    }
  }

  galaxy.onClusterChange(async (cluster) => {
    selectedCluster = cluster;
    updateTargetContext();
    ui.renderClusterList(clusters, cluster.id, async (newCluster) => {
      selectedCluster = newCluster;
      galaxy.selectCluster(newCluster.id);
      await renderClusterInfo(newCluster);
    });
    await renderClusterInfo(cluster);
    await refreshHistory();
  });

  galaxy.onObjectAction(async (cluster, object) => {
    await renderObjectDetails(cluster, object);
  });

  function onObjectSelected(cluster, object) {
    renderObjectDetails(cluster, object);
  }

  async function renderObjectDetails(cluster, object) {
    // If it's a pod, fetch detailed information
    if (object.kind === 'Pod' && object.namespace) {
      try {
        const podDetails = await ui.fetchPodDetails(cluster.id, object.namespace, object.metadata.name);
        ui.renderPodDetails(cluster, podDetails);
      } catch (error) {
        console.error('Failed to fetch pod details:', error);
        ui.renderSelectionDetails(cluster, object, {
          onUseCommand: loadObjectCommand
        });
      }
    } else {
      ui.renderSelectionDetails(cluster, object, {
        onUseCommand: loadObjectCommand
      });
    }
  }

  function loadObjectCommand(command, object, cluster) {
    commandInput.value = command;
    commandPreviewPanel.hidden = false;
    interpretationPanel.hidden = false;
    terminalPanel.hidden = true;
    applyClarificationsButton.hidden = true;
    clarificationFields.innerHTML = '';
    commandExplanation.textContent = `${object.label} on ${cluster.name} is loaded as a kubectl text command.`;
    riskBadge.className = 'risk-badge read';
    riskBadge.textContent = 'Loaded command';
    dryRunToggle.checked = false;
    dryRunToggle.disabled = true;
    setCommandState('ready', 'Loaded');
  }

  async function interpretNaturalLanguage(adjustments = {}) {
    if (!selectedCluster) {
      setCommandState('error', 'Select cluster');
      return;
    }

    setCommandState('running', 'Interpreting');
    interpretationPanel.hidden = false;
    commandPreviewPanel.hidden = true;
    terminalPanel.hidden = true;
    clarificationFields.innerHTML = '';
    const result = await ui.interpretCommand(selectedCluster.id, naturalCommandInput.value, adjustments);
    interpretation = result;
    await refreshHistory();
    commandExplanation.textContent = result.explanation || result.error || 'Unable to interpret request.';
    renderRisk(result.risk);

    if (result.status === 'ready') {
      commandInput.value = result.command;
      commandPreviewPanel.hidden = false;
      applyClarificationsButton.hidden = true;
      dryRunToggle.checked = result.risk !== 'read' && result.dryRunSupported;
      dryRunToggle.disabled = !result.dryRunSupported;
      setCommandState('ready', 'Ready');
      return;
    }

    if (result.status === 'needs_clarification') {
      renderClarifications(result.questions);
      applyClarificationsButton.hidden = false;
      setCommandState('clarify', 'Needs details');
      return;
    }

    applyClarificationsButton.hidden = true;
    setCommandState('error', 'Unsupported');
  }

  function renderClarifications(questions) {
    questions.forEach((question) => {
      const wrapper = document.createElement('label');
      wrapper.className = 'clarification-field';
      wrapper.textContent = question.prompt;
      const input = question.type === 'select' ? document.createElement('select') : document.createElement('input');
      input.dataset.field = question.field;
      input.type = question.type === 'number' ? 'number' : 'text';
      if (question.type === 'number') input.min = '0';
      if (question.type === 'select') {
        question.options.forEach((option) => input.add(new Option(option, option)));
      }
      wrapper.appendChild(input);
      clarificationFields.appendChild(wrapper);
    });
  }

  function renderRisk(risk) {
    riskBadge.className = `risk-badge ${risk || 'unknown'}`;
    riskBadge.textContent = risk === 'read' ? 'Read only' : risk === 'write' ? 'Changes state' : risk === 'destructive' ? 'Destructive' : 'Needs review';
  }

  function renderClusterOperations(cluster) {
    const operationsCard = document.createElement('div');
    operationsCard.className = 'detail-card cluster-operations-card';
    operationsCard.innerHTML = '<strong>Cluster operations</strong>';

    const description = document.createElement('div');
    description.className = 'cluster-operations-note';
    description.textContent = 'Generate a kubectl command for the current cluster, then review and run it through the command console.';
    operationsCard.appendChild(description);

    const actions = [
      {
        label: 'Scale deployment',
        command: async () => promptAndRunOperation(cluster, 'scale')
      },
      {
        label: 'Cordon node',
        command: async () => promptAndRunOperation(cluster, 'cordon')
      },
      {
        label: 'Drain node',
        command: async () => promptAndRunOperation(cluster, 'drain')
      },
      {
        label: 'Delete resource',
        command: async () => promptAndRunOperation(cluster, 'delete')
      }
    ];

    const buttonRow = document.createElement('div');
    buttonRow.className = 'cluster-operations-grid';

    actions.forEach((action) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'secondary-button cluster-operation-button';
      button.textContent = action.label;
      button.addEventListener('click', action.command);
      buttonRow.appendChild(button);
    });

    operationsCard.appendChild(buttonRow);
    detailsContent.appendChild(operationsCard);
  }

  async function promptAndRunOperation(cluster, action) {
    const operation = { action, dryRun: true, confirmed: false };

    if (action === 'scale') {
      const resourceType = window.prompt('Scale deployment: enter resource type', 'deployment') || 'deployment';
      const resourceName = window.prompt('Scale deployment: enter resource name');
      if (!resourceName) return;
      const namespace = window.prompt('Scale deployment: enter namespace', 'default') || 'default';
      const replicas = window.prompt('Scale deployment: enter replica count', '3');
      if (replicas === null) return;
      operation.resourceType = resourceType.trim();
      operation.resourceName = resourceName.trim();
      operation.namespace = namespace.trim();
      operation.replicas = Number(replicas);
    } else if (action === 'cordon' || action === 'drain') {
      const resourceName = window.prompt(`${action === 'cordon' ? 'Cordon' : 'Drain'} node: enter node name`);
      if (!resourceName) return;
      operation.resourceName = resourceName.trim();
    } else if (action === 'delete') {
      const resourceType = window.prompt('Delete resource: enter kind', 'deployment') || 'deployment';
      const resourceName = window.prompt('Delete resource: enter resource name');
      if (!resourceName) return;
      const namespace = window.prompt('Delete resource: enter namespace', 'default') || 'default';
      operation.resourceType = resourceType.trim();
      operation.resourceName = resourceName.trim();
      operation.namespace = namespace.trim();
    }

    setCommandState('running', 'Running');
    terminalPanel.hidden = false;
    terminalStatus.textContent = 'Running';
    terminalOutput.textContent = `Executing ${action} operation...\n`;

    let result = await ui.executeClusterOperation(cluster.id, operation);
    if (result.confirmationRequired) {
      const confirmed = window.confirm(`Confirm ${action} on ${cluster.name}?\n\n${result.command || 'kubectl operation'}`);
      if (!confirmed) {
        terminalStatus.textContent = 'Cancelled';
        terminalOutput.textContent += 'Execution cancelled by user.';
        setCommandState('ready', 'Ready');
        await refreshHistory();
        return;
      }
      result = await ui.executeClusterOperation(cluster.id, { ...operation, confirmed: true });
    }

    terminalStatus.textContent = result.success ? 'Completed' : 'Failed';
    terminalOutput.textContent += result.command ? `${result.command}\n` : '';
    terminalOutput.textContent += result.output || result.error || 'No output';
    setCommandState(result.success ? 'ready' : 'error', result.success ? 'Complete' : 'Failed');
    await refreshHistory();
  }

  function loadCommandIntoConsole(command) {
    commandInput.value = command;
    commandPreviewPanel.hidden = false;
    interpretationPanel.hidden = false;
    terminalPanel.hidden = true;
    applyClarificationsButton.hidden = true;
    clarificationFields.innerHTML = '';
    commandExplanation.textContent = 'Generated from cluster operations. Review the command before executing it.';
    riskBadge.className = 'risk-badge write';
    riskBadge.textContent = 'Generated command';
    dryRunToggle.checked = true;
    dryRunToggle.disabled = false;
    setCommandState('ready', 'Ready');
  }

  function filterClusters(sourceClusters, term) {
    if (!term) return sourceClusters;
    return sourceClusters.filter((cluster) => {
      const haystack = [cluster.name, cluster.kubeContext, cluster.status, cluster.region, cluster.description]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(term);
    });
  }

  function filterObjects(objects, term) {
    if (!term) return objects;
    return objects.filter((object) => {
      const haystack = [
        object.name,
        object.label,
        object.type,
        object.kind,
        object.status,
        object.namespace,
        object.nodeName,
        JSON.stringify(object.labels || {})
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(term);
    });
  }

  function setCommandState(state, label) {
    commandState.className = `command-state ${state}`;
    commandState.textContent = label;
  }

  function updateTargetContext() {
    targetContext.textContent = selectedCluster ? `Target: ${selectedCluster.name} · ${selectedCluster.kubeContext}` : 'No cluster selected';
  }

  async function refreshHistory() {
    if (!selectedCluster) return;
    const events = await ui.fetchHistory(selectedCluster.id);
    ui.renderHistory(events);
  }

  await refresh();
}

window.addEventListener('load', bootstrap);
