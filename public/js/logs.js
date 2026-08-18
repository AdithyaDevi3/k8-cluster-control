/**
 * Logs Viewer Component
 * Displays live streaming logs from pods with SSE connection
 */

let currentLogStream = null;
let currentEventSource = null;

/**
 * Display logs viewer panel for a pod
 * @param {string} clusterId - Cluster context name
 * @param {string} namespace - Pod namespace
 * @param {string} podName - Pod name
 */
async function showLogsViewer(clusterId, namespace, podName) {
  // Fetch available containers
  const containers = await fetchPodContainers(clusterId, namespace, podName);
  
  if (!containers || containers.length === 0) {
    alert('No containers found for this pod');
    return;
  }

  // Create logs panel
  const logsPanel = createLogsPanel(clusterId, namespace, podName, containers);
  
  // Show panel
  document.body.appendChild(logsPanel);
  
  // Start streaming logs for first container by default
  startLogStream(clusterId, namespace, podName, containers[0].name);
}

/**
 * Fetch available containers for a pod
 */
async function fetchPodContainers(clusterId, namespace, podName) {
  try {
    const response = await fetch(`/api/logs/${clusterId}/${namespace}/${podName}/containers`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data.containers || [];
  } catch (error) {
    console.error('Error fetching pod containers:', error);
    return [];
  }
}

/**
 * Create logs panel UI
 */
function createLogsPanel(clusterId, namespace, podName, containers) {
  const panel = document.createElement('div');
  panel.className = 'logs-panel';
  panel.innerHTML = `
    <div class="logs-header">
      <div class="logs-title">
        <h3>Pod Logs: ${podName}</h3>
        <span class="logs-namespace">${namespace}</span>
      </div>
      <div class="logs-controls">
        <select id="containerSelect" class="container-select">
          ${containers.map(c => `
            <option value="${c.name}" data-type="${c.type}">
              ${c.name} ${c.type === 'initContainer' ? '(init)' : ''}
            </option>
          `).join('')}
        </select>
        <label class="follow-checkbox">
          <input type="checkbox" id="followLogs" />
          Follow
        </label>
        <input type="number" id="tailLines" value="500" min="10" max="10000" placeholder="Lines" class="tail-input" />
        <button id="refreshLogs" class="btn-refresh">Refresh</button>
        <button id="clearLogs" class="btn-clear">Clear</button>
        <button id="closeLogs" class="btn-close">×</button>
      </div>
    </div>
    <div class="logs-content" id="logsContent">
      <div class="logs-status">Connecting...</div>
    </div>
    <div class="logs-footer">
      <span id="logsStatus" class="logs-status-text">Disconnected</span>
      <span id="logsCount" class="logs-count">0 lines</span>
    </div>
  `;

  // Add event listeners
  const containerSelect = panel.querySelector('#containerSelect');
  const followCheckbox = panel.querySelector('#followLogs');
  const tailInput = panel.querySelector('#tailLines');
  const refreshBtn = panel.querySelector('#refreshLogs');
  const clearBtn = panel.querySelector('#clearLogs');
  const closeBtn = panel.querySelector('#closeLogs');

  containerSelect.addEventListener('change', () => {
    const selectedContainer = containerSelect.value;
    stopLogStream();
    clearLogsContent();
    startLogStream(clusterId, namespace, podName, selectedContainer);
  });

  followCheckbox.addEventListener('change', () => {
    stopLogStream();
    clearLogsContent();
    const selectedContainer = containerSelect.value;
    startLogStream(clusterId, namespace, podName, selectedContainer);
  });

  refreshBtn.addEventListener('click', () => {
    stopLogStream();
    clearLogsContent();
    const selectedContainer = containerSelect.value;
    startLogStream(clusterId, namespace, podName, selectedContainer);
  });

  clearBtn.addEventListener('click', () => {
    clearLogsContent();
  });

  closeBtn.addEventListener('click', () => {
    stopLogStream();
    panel.remove();
  });

  return panel;
}

/**
 * Start log streaming using Server-Sent Events
 */
function startLogStream(clusterId, namespace, podName, container) {
  const followCheckbox = document.getElementById('followLogs');
  const tailInput = document.getElementById('tailLines');
  const logsStatus = document.getElementById('logsStatus');
  const logsCount = document.getElementById('logsCount');
  const logsContent = document.getElementById('logsContent');

  const follow = followCheckbox?.checked || false;
  const tailLines = tailInput?.value || 500;

  // Build SSE URL
  const params = new URLSearchParams({
    container,
    follow: follow.toString(),
    tailLines: tailLines.toString(),
    timestamps: 'true'
  });

  const url = `/api/logs/${clusterId}/${namespace}/${podName}/stream?${params}`;
  
  // Create EventSource for SSE
  currentEventSource = new EventSource(url);
  let lineCount = 0;

  currentEventSource.addEventListener('connected', (event) => {
    logsStatus.textContent = 'Connected';
    logsStatus.className = 'logs-status-text status-connected';
  });

  currentEventSource.addEventListener('log', (event) => {
    const data = JSON.parse(event.data);
    appendLogLine(data.line);
    lineCount++;
    logsCount.textContent = `${lineCount} lines`;
  });

  currentEventSource.addEventListener('error', (event) => {
    if (event.data) {
      const data = JSON.parse(event.data);
      appendLogLine(`ERROR: ${data.error}`, true);
    }
    logsStatus.textContent = 'Error';
    logsStatus.className = 'logs-status-text status-error';
  });

  currentEventSource.addEventListener('end', (event) => {
    logsStatus.textContent = 'Stream Ended';
    logsStatus.className = 'logs-status-text status-ended';
  });

  currentEventSource.onerror = (error) => {
    console.error('EventSource error:', error);
    logsStatus.textContent = 'Disconnected';
    logsStatus.className = 'logs-status-text status-disconnected';
  };
}

/**
 * Stop current log stream
 */
function stopLogStream() {
  if (currentEventSource) {
    currentEventSource.close();
    currentEventSource = null;
  }
  
  const logsStatus = document.getElementById('logsStatus');
  if (logsStatus) {
    logsStatus.textContent = 'Disconnected';
    logsStatus.className = 'logs-status-text status-disconnected';
  }
}

/**
 * Append a log line to the viewer
 */
function appendLogLine(line, isError = false) {
  const logsContent = document.getElementById('logsContent');
  if (!logsContent) return;

  // Remove "Connecting..." message on first log
  const statusDiv = logsContent.querySelector('.logs-status');
  if (statusDiv) {
    statusDiv.remove();
  }

  const logLine = document.createElement('div');
  logLine.className = isError ? 'log-line log-error' : 'log-line';
  logLine.textContent = line;
  
  logsContent.appendChild(logLine);
  
  // Auto-scroll to bottom if follow is enabled
  const followCheckbox = document.getElementById('followLogs');
  if (followCheckbox?.checked) {
    logsContent.scrollTop = logsContent.scrollHeight;
  }
}

/**
 * Clear logs content
 */
function clearLogsContent() {
  const logsContent = document.getElementById('logsContent');
  const logsCount = document.getElementById('logsCount');
  
  if (logsContent) {
    logsContent.innerHTML = '';
  }
  
  if (logsCount) {
    logsCount.textContent = '0 lines';
  }
}

// Export functions for global use
window.logsViewer = {
  show: showLogsViewer,
  stop: stopLogStream,
  clear: clearLogsContent
};
