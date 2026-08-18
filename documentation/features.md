# Features Documentation - k8-cluster-control

## Feature Overview

k8-cluster-control provides real-time 3D visualization and management of Kubernetes clusters with an intuitive galaxy-style interface.

## Feature Status Legend
- ✅ **Complete**: Implemented, tested, merged
- 🚧 **In Progress**: Partially implemented, active development
- 📋 **Planned**: Designed, scheduled for implementation
- 💡 **Proposed**: Under consideration, not committed

---

## Short-Term Features (✅ Complete)

### 1. Live Cluster Discovery ✅
**Status**: Complete (feat/short-term-roadmap-complete)  
**Commit**: 6b55afb

**Description**: Automatically discover and connect to multiple Kubernetes clusters from kubeconfig contexts.

**Capabilities**:
- Parse ~/.kube/config for all contexts
- Support multiple clusters simultaneously
- Switch between clusters via dropdown
- Display cluster metadata (name, server, namespace)
- Cache cluster data with 30-second TTL

**API Endpoints**:
```
GET /api/clusters
→ Returns array of available clusters from kubeconfig

GET /api/clusters/:context/resources
→ Returns pods, nodes, services for specific cluster context
```

**Usage**:
```javascript
// Frontend usage
const clusters = await fetch('/api/clusters').then(r => r.json());
console.log(clusters); // [{id: 'kind-dev', name: 'kind-dev', server: '...'}]
```

---

### 2. Kind Cluster Bootstrap ✅
**Status**: Complete (feat/short-term-roadmap-complete)  
**Commit**: 82f6974

**Description**: Create, delete, and manage local Kind (Kubernetes in Docker) clusters.

**Capabilities**:
- Create Kind cluster with custom name
- Delete existing Kind cluster
- List all Kind clusters
- Get cluster info (nodes, status)
- Automatic kubeconfig integration

**API Endpoints**:
```
POST /api/kind/create
→ Body: {name: 'dev-cluster', config: {...}}
→ Creates new Kind cluster

DELETE /api/kind/:name
→ Deletes specified Kind cluster

GET /api/kind/list
→ Returns array of Kind clusters
```

**CLI Integration**:
```javascript
// Uses child_process.spawn for kind CLI
spawn('kind', ['create', 'cluster', '--name', clusterName])
```

---

### 3. Node Health Monitoring ✅
**Status**: Complete (feat/short-term-roadmap-complete)  
**Commit**: 6ae2635

**Description**: Real-time node resource metrics and health status tracking.

**Capabilities**:
- CPU usage per node
- Memory usage per node
- Node conditions (Ready, DiskPressure, MemoryPressure)
- Pod metrics (CPU/memory per pod)
- Resource allocation tracking

**API Endpoints**:
```
GET /api/clusters/:context/nodes/:name
→ Returns detailed node metrics and status

GET /api/clusters/:context/pods/:namespace/:name
→ Returns detailed pod metrics and status
```

**Metrics Collected**:
```javascript
{
  cpu: { used: '250m', total: '4000m', percentage: 6.25 },
  memory: { used: '2Gi', total: '8Gi', percentage: 25 },
  conditions: [
    { type: 'Ready', status: 'True' },
    { type: 'DiskPressure', status: 'False' }
  ]
}
```

---

### 4. Pod Detail Panels ✅
**Status**: Complete (feat/short-term-roadmap-complete)  
**Commit**: 6f624e3

**Description**: Interactive detail panels for pods and nodes with comprehensive resource information.

**Capabilities**:
- Click pod/node in 3D view to open detail panel
- Display metadata (name, namespace, labels, annotations)
- Show status (phase, IP, QoS, restarts)
- List containers with images and resource limits
- Action buttons (View Logs, Edit Manifest)
- Smooth slide-up animation

**Panel Contents**:
- **Pod Panel**: Name, namespace, status, IP, QoS, node, containers, labels, actions
- **Node Panel**: Name, version, status, capacity, conditions, labels, actions

**UI Components**:
```javascript
renderPodDetails(cluster, pod) {
  // Creates detail panel with:
  // - Header (name, namespace)
  // - Status badges
  // - Container list
  // - Labels table
  // - Action buttons
}
```

---

### 5. GPU-Accelerated Instanced Rendering ✅
**Status**: Complete (feat/short-term-roadmap-complete)  
**Commit**: 6dae7b1

**Description**: High-performance 3D rendering using GPU instancing for thousands of Kubernetes resources.

**Capabilities**:
- Render 1000+ pods at 60fps
- Single draw call per resource type
- GPU-side matrix transformations
- Dynamic color updates
- Efficient selection/hover detection

**Technical Implementation**:
```javascript
// Uses THREE.InstancedMesh
const geometry = new THREE.SphereGeometry(0.5, 16, 16);
const material = new THREE.MeshPhongMaterial();
const instancedMesh = new THREE.InstancedMesh(geometry, material, count);

// Update instance transforms
instancedMesh.setMatrixAt(index, matrix);
instancedMesh.setColorAt(index, color);
instancedMesh.instanceMatrix.needsUpdate = true;
```

**Performance**:
- **Before**: 200 pods = 30fps (individual meshes)
- **After**: 1000+ pods = 60fps (instanced meshes)

---

### 6. Intelligent Layout Algorithms ✅
**Status**: Complete (feat/short-term-roadmap-complete)  
**Commit**: 57afad3

**Description**: Multiple layout algorithms for organizing cluster resources in 3D space.

**Algorithms**:

**1. Namespace Grouping (Default)**:
- Pods grouped by namespace
- Poisson disc sampling within each group
- Color-coded by namespace
- Prevents overlap

**2. Radial Layout**:
- Concentric rings
- Namespaces on inner rings
- Pods on outer rings
- 360° distribution

**3. Flat Poisson Disc**:
- Uniform distribution
- No namespace grouping
- Maximum space efficiency
- Blue darts algorithm

**API**:
```javascript
layoutService.namespaceGroupLayout(pods, nodes)
layoutService.radialLayout(pods, nodes)
layoutService.poissonDiscLayout(pods, nodes)
```

**Configuration**:
```javascript
// UI dropdown to switch layouts
<select id="layout-selector">
  <option value="namespace">Namespace Grouping</option>
  <option value="radial">Radial</option>
  <option value="flat">Flat Distribution</option>
</select>
```

---

## Mid-Term Features (🚧 In Progress)

### 7. Terminal Access & Live Logs 🚧
**Status**: Complete (feat/mid-term-roadmap, pushed to remote)  
**Commits**: 465049d, 1fd446a, d56c714, b03d86e

**Description**: Real-time pod log streaming with Server-Sent Events and container command execution.

**Capabilities**:
- Stream pod logs in real-time
- Select specific container (multi-container pods)
- Follow mode (auto-scroll)
- Tail last N lines
- Previous container logs (crashed containers)
- Execute commands in pods (via POST)
- Auto-reconnect on disconnect

**API Endpoints**:
```
GET /api/logs/:context/:namespace/:pod/stream
→ SSE endpoint, streams logs in real-time
→ Query params: container, follow, tailLines, timestamps, previous

GET /api/logs/:context/:namespace/:pod/containers
→ Returns array of containers for dropdown

POST /api/logs/:context/:namespace/:pod/exec
→ Body: {container: 'nginx', command: ['ls', '-la']}
→ Returns: {stdout: '...', stderr: '...'}
```

**SSE Events**:
```javascript
eventSource.addEventListener('connected', () => {...});
eventSource.addEventListener('log', (e) => {
  const logLine = e.data;
  // Append to UI
});
eventSource.addEventListener('error', (e) => {...});
eventSource.addEventListener('end', () => {...});
```

**UI Features**:
- Bottom panel (50vh height)
- Container selector dropdown
- Follow checkbox (auto-scroll)
- Tail lines input
- Refresh/Clear/Stop/Close buttons
- Color-coded status (connected=green, error=red, ended=orange)
- Monospace font (Monaco/Menlo/Courier)

---

### 8. Manifest Editor with Diff Preview 🚧
**Status**: Complete (feat/mid-term-roadmap, LOCAL ONLY - not pushed)  
**Commits**: 4d29256, 037af0a, 41436da, 0c8105c, f006ae6

**Description**: In-browser YAML manifest editor with validation, diff preview, and live apply capabilities.

**Capabilities**:
- Load current resource manifest via kubectl
- Edit YAML in textarea (Monaco editor future upgrade)
- Validate YAML syntax and Kubernetes schema
- Preview diff before applying (kubectl diff --server-side)
- Apply changes directly to cluster
- Error handling with user-friendly messages

**API Endpoints**:
```
GET /api/manifests/:context/:kind/:namespace/:name
→ Returns current resource manifest as YAML

POST /api/manifests/validate
→ Body: {yamlContent: '...'}
→ Returns: {valid: true/false, error: '...'}

POST /api/manifests/diff
→ Body: {context: 'kind-dev', yamlContent: '...'}
→ Returns: {diff: '+label: value\n-oldlabel: oldvalue'}

POST /api/manifests/apply
→ Body: {context: 'kind-dev', yamlContent: '...'}
→ Returns: {success: true, message: '...'}
```

**UI Features**:
- Full-screen modal overlay
- Split-pane layout (editor left, diff right)
- Syntax highlighting (future: Monaco editor integration)
- Validate button (checks YAML before preview)
- Preview Diff button (server-side dry-run)
- Apply button (confirms and applies)
- Close/Cancel button
- Diff styling: green additions, red deletions, cyan headers

**Workflow**:
```
User clicks "Edit Manifest"
  ↓
Load current YAML → Display in editor
  ↓
User edits YAML
  ↓
[Optional] Click "Validate" → Check syntax
  ↓
Click "Preview Diff" → Show changes
  ↓
Review diff → Click "Apply"
  ↓
Manifest applied → Cluster updates
  ↓
Success message → Modal closes
```

---

### 9. Filters and Search 📋
**Status**: Planned (next feature in mid-term roadmap)

**Proposed Capabilities**:
- Filter by namespace
- Filter by label selector
- Filter by resource type (pod, service, deployment)
- Search by name (fuzzy matching)
- Filter by status (Running, Pending, Failed, CrashLoopBackOff)
- Multi-select filters (combine namespace + label + status)
- Real-time filter application (no page reload)
- Filter persistence (localStorage)

**UI Design**:
```
┌────────────────────────────────────────┐
│  Filters                           [X] │
├────────────────────────────────────────┤
│  Namespace: [All ▼]                   │
│  Status:    [All ▼]                   │
│  Labels:    [key=value___________]    │
│  Search:    [pod name___________]     │
│                                        │
│  [Apply]  [Clear]                      │
└────────────────────────────────────────┘
```

**API Endpoint**:
```
GET /api/clusters/:context/resources?filters={...}
→ Query params: namespace, labels, status, search
```

---

### 10. Cluster Operations 📋
**Status**: Planned

**Proposed Capabilities**:

**Node Operations**:
- Drain node (evict all pods)
- Cordon node (mark unschedulable)
- Uncordon node (mark schedulable)
- Delete node (from cluster)
- Label/unlabel nodes
- Taint/untaint nodes

**Pod Operations**:
- Delete pod
- Restart pod (delete + wait for recreate)
- Scale deployment (change replica count)
- Port-forward to pod
- Copy files to/from pod

**Service Operations**:
- Expose deployment as service
- Edit service (change type, ports)
- Delete service

**Namespace Operations**:
- Create namespace
- Delete namespace (with confirmation)
- Label namespace

**UI**: Right-click context menu on resources:
```
┌─────────────────────┐
│  Pod: nginx-abc123  │
├─────────────────────┤
│  View Logs          │
│  Edit Manifest      │
│  ───────────────    │
│  Delete Pod         │
│  Restart Pod        │
│  Port Forward       │
│  Copy Files         │
└─────────────────────┘
```

---

### 11. Network Topology Visualization 📋
**Status**: Planned

**Proposed Capabilities**:
- Visualize services and their endpoints
- Show ingress routes
- Display network policies
- Highlight pod-to-pod communication
- Service mesh visualization (Istio, Linkerd)
- Cross-namespace connections
- External traffic flows

**Visualization Modes**:
1. **Service Graph**: Services as nodes, pod endpoints as connections
2. **Traffic Flow**: Animated particles showing request paths
3. **Network Policy**: Color-coded allowed/denied connections

**UI**: Toggle button to switch between "Resource View" and "Network View"

---

## Long-Term Features (💡 Proposed)

### 12. Helm Release Management 💡
- List Helm releases
- Install new charts
- Upgrade existing releases
- Rollback releases
- View release history
- Chart repository browser

### 13. GitOps Integration 💡
- Connect to Git repository
- Sync resources from Git
- Show drift detection
- Auto-sync or manual approval
- Integration with ArgoCD, Flux

### 14. Custom Resource Definitions (CRDs) 💡
- Detect installed CRDs
- Visualize custom resources
- Edit CRD manifests
- Support popular operators (Prometheus, Cert-Manager, etc.)

### 15. Multi-Cluster Dashboard 💡
- Aggregate view across clusters
- Cross-cluster search
- Cluster comparison metrics
- Federated resource management

### 16. Alerts and Notifications 💡
- Real-time alert overlays in 3D
- OOMKilled pod highlights
- CrashLoopBackOff warnings
- Resource quota exceeded alerts
- Integration with Prometheus AlertManager

### 17. Resource Templates 💡
- Save common manifest templates
- Template library (nginx, redis, postgres)
- Variable substitution
- Quick deploy from template

### 18. Time Travel / History 💡
- Replay cluster state changes
- Scrub timeline to view past states
- Audit log visualization
- Diff between time points

### 19. Collaborative Features 💡
- Multi-user support
- Shared sessions (view same cluster together)
- In-app chat or annotations
- Permissions and RBAC roles

### 20. Performance Profiling 💡
- CPU flamegraphs for containers
- Memory heap dumps
- Network latency heatmaps
- Slow request tracing

---

## Feature Comparison Matrix

| Feature | CLI (kubectl) | Dashboard (k8s) | k8-cluster-control |
|---------|---------------|-----------------|---------------------|
| List resources | ✅ | ✅ | ✅ |
| 3D Visualization | ❌ | ❌ | ✅ |
| Live log streaming | ✅ | ✅ | ✅ |
| Manifest editing | ✅ | ✅ | ✅ |
| Diff preview | ✅ | ❌ | ✅ |
| GPU acceleration | ❌ | ❌ | ✅ |
| Multi-cluster | ✅ | ⚠️ | ✅ |
| Namespace grouping | ❌ | ⚠️ | ✅ |
| Kind integration | ✅ | ❌ | ✅ |
| Node operations | ✅ | ✅ | 📋 |
| Network topology | ❌ | ⚠️ | 📋 |
| Helm support | ✅ (helm CLI) | ❌ | 💡 |
| GitOps | ❌ | ❌ | 💡 |

---

## Feature Flags (Future)

For gradual rollout and A/B testing:

```javascript
// Feature flag configuration
const features = {
  manifestEditor: true,  // Enabled
  networkTopology: false, // Disabled (in development)
  helmIntegration: false, // Disabled (not started)
};

// Check feature flag
if (features.manifestEditor) {
  renderManifestEditor();
}
```

**Implementation**: Environment variables or config file
```
FEATURE_MANIFEST_EDITOR=true
FEATURE_NETWORK_TOPOLOGY=false
```

---

## Accessibility Features

### Current
- Keyboard navigation (Tab, Enter, Esc)
- ARIA labels on buttons
- Focus indicators
- High contrast text

### Planned
- Screen reader support
- Keyboard shortcuts (Ctrl+L for logs, Ctrl+E for edit)
- Voice navigation
- Colorblind-friendly palettes

---

## Internationalization (i18n)

### Current
- English only

### Planned
- Spanish, French, German, Chinese, Japanese
- Date/time localization
- Number formatting (metric vs imperial)

---

## Mobile Support

### Current
- Touch controls for 3D camera
- Responsive design (partial)
- Small screen detail panels

### Planned
- Mobile-optimized UI
- Swipe gestures
- Offline mode
- Progressive Web App (PWA)

---

## Performance Targets

| Metric | Current | Target |
|--------|---------|--------|
| Initial Load | <2s | <1s |
| 3D Render (1000 pods) | 60fps | 60fps |
| Log Streaming Latency | <100ms | <50ms |
| API Response Time | <200ms | <100ms |
| Memory Usage | <150MB | <100MB |
| Bundle Size | ~500KB | <300KB |

---

## Feature Request Process

1. **Submit Issue**: GitHub Issues with `feature-request` label
2. **Community Vote**: 👍 reactions indicate demand
3. **Triage**: Assigned to short/mid/long-term roadmap
4. **Design**: Technical design document (if complex)
5. **Implementation**: Feature branch → PR → Review → Merge
6. **Documentation**: Update this file + API docs + user guide
