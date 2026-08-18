# Testing Strategy - k8-cluster-control

## Current Testing Approach

### Manual Testing Philosophy

Given the MVP nature and 3D visualization focus, initial testing prioritizes rapid iteration with manual verification over automated test coverage. This pragmatic approach enables:

- Fast feature development without test infrastructure overhead
- Interactive debugging of visual and real-time components
- Flexibility to refactor without brittle tests

### Testing Pyramid (Current State)

```
       ╱╲
      ╱  ╲      E2E: None (manual browser testing)
     ╱────╲
    ╱      ╲    Integration: None (manual API testing)
   ╱────────╲
  ╱          ╲  Unit: None (code review + manual verification)
 ╱────────────╲
└──────────────┘
```

### Testing Pyramid (Target State)

```
       ╱╲
      ╱  ╲      E2E: Playwright (critical user flows)
     ╱────╲
    ╱      ╲    Integration: Supertest (API contracts)
   ╱────────╲
  ╱          ╲  Unit: Jest (business logic, utilities)
 ╱────────────╲
└──────────────┘
```

## Manual Testing Procedures

### Pre-Commit Testing Checklist

**Before every commit**:

- [ ] Code syntax correct (no ESLint errors - if enabled)
- [ ] No console.log() statements left in code
- [ ] No commented-out code blocks
- [ ] File follows project conventions

**Before pushing feature branch**:

- [ ] Server starts without errors (`npm start`)
- [ ] No unhandled promise rejections in console
- [ ] Browser console shows no errors
- [ ] Feature works in Chrome (primary browser)
- [ ] Feature tested with real Kind cluster

### Server Startup Testing

**Procedure**:

```bash
# Clean start
npm start

# Expected output:
# > k8-cluster-control@1.0.0 start
# > node server.js
# Server listening on port 3000

# Check for errors:
# ❌ "EADDRINUSE: port 3000 already in use"
#    → Fix: kill -9 $(lsof -ti:3000)
# ❌ "Cannot find module '@kubernetes/client-node'"
#    → Fix: npm install
# ❌ Any stack trace or uncaught exception
#    → Fix: Debug and resolve before proceeding
```

**Health Check**:

```bash
curl http://localhost:3000/api/clusters
# Expected: JSON array of clusters
# Error handling: Empty array [] is valid (no clusters configured)

curl http://localhost:3000/api/tools/status
# Expected: {"kubectl": "installed", "kind": "installed"}
```

### Browser Testing Workflow

**Initial Load Test**:

1. Open http://localhost:3000 in Chrome
2. Open DevTools (F12) → Console tab
3. Verify no red errors in console
4. Verify page loads (black canvas visible)
5. Verify 3D scene renders (colored spheres for pods)

**3D Visualization Test**:

- [ ] Left-click drag rotates camera (OrbitControls)
- [ ] Scroll wheel zooms in/out
- [ ] Right-click drag pans camera
- [ ] Frame rate stable at 60fps (check stats if enabled)
- [ ] No memory leaks (render loop doesn't freeze)

**Cluster Selection Test**:

- [ ] Cluster dropdown populates with contexts from kubeconfig
- [ ] Selecting cluster triggers API call (Network tab)
- [ ] 3D scene updates with cluster resources
- [ ] Different clusters show different pod counts

**Pod Interaction Test**:

- [ ] Clicking pod highlights it (color change or outline)
- [ ] Detail panel slides up from bottom
- [ ] Pod name, namespace, status, IP visible
- [ ] Container list populated
- [ ] Labels rendered as key-value pairs
- [ ] "View Logs" button visible
- [ ] "Edit Manifest" button visible
- [ ] Close button dismisses panel

**Node Interaction Test**:

- [ ] Clicking node highlights it
- [ ] Node detail panel shows name, status, version
- [ ] CPU/Memory metrics displayed (if available)
- [ ] Conditions list shows Ready state
- [ ] "Edit Manifest" button visible

### Feature-Specific Testing

#### Terminal Access & Live Logs

**Test Case 1: View Pod Logs**:

1. Click any pod in 3D view
2. Click "View Logs" button
3. Verify logs panel opens at bottom (50vh height)
4. Verify container dropdown populated (if multi-container pod)
5. Verify logs streaming in real-time
6. Verify timestamps visible (if enabled)
7. Verify auto-scroll when "Follow" checked
8. Verify scroll stops when manually scrolling up
9. Click "Clear" → verify logs cleared
10. Click "Stop" → verify stream stopped, status = "Ended"
11. Click "Close" → verify panel dismissed

**Test Case 2: Container Selection**:

1. Select pod with multiple containers (e.g., sidecar pattern)
2. Verify container dropdown shows all containers
3. Switch container → verify new logs load
4. Verify old logs cleared when switching

**Test Case 3: Error Handling**:

- Select pod without logs → verify "No logs available" message
- Stop pod while streaming → verify "Stream ended" status
- Network disconnect → verify error status and reconnect button

**Test Case 4: SSE Connection**:

```bash
# Monitor network tab
GET /api/logs/:context/:namespace/:pod/stream?container=main&follow=true
# Verify:
# - Status: 200 OK
# - Content-Type: text/event-stream
# - Connection: keep-alive
# - Events arrive continuously (event: log)
```

#### Manifest Editor

**Test Case 1: Load Manifest**:

1. Click pod/node detail panel
2. Click "Edit Manifest" button
3. Verify modal opens (full-screen overlay)
4. Verify left pane shows current YAML
5. Verify YAML syntax correct (indentation, structure)
6. Verify metadata matches selected resource

**Test Case 2: Edit and Validate**:

1. Make minor change (e.g., add label `test: value`)
2. Click "Validate" button
3. Verify validation status: "✓ Valid YAML"
4. Introduce syntax error (e.g., broken indentation)
5. Click "Validate"
6. Verify error message: "Invalid YAML: ..."

**Test Case 3: Diff Preview**:

1. Edit manifest (change label or annotation)
2. Click "Preview Diff"
3. Verify right pane populates with diff
4. Verify additions highlighted in green (+ prefix)
5. Verify deletions highlighted in red (- prefix)
6. Verify unchanged lines shown with context

**Test Case 4: Apply Manifest**:

1. Make valid change (add/modify label)
2. Preview diff (verify correct)
3. Click "Apply" button
4. Verify success message: "Manifest applied successfully"
5. Close modal
6. Refresh cluster view
7. Verify change persisted (re-open detail panel, check label)

**Test Case 5: Error Handling**:

- Invalid YAML → verify error message before apply disabled
- Network error → verify "Failed to apply" error message
- Permission denied → verify RBAC error surfaced to user
- Optimistic locking conflict → verify "Resource version mismatch" error

**Test Case 6: Cancel/Close**:

- Click "Close" without applying → verify modal dismissed
- Make changes, close, reopen → verify original YAML (no unsaved state)

### Regression Testing

**When to run**: Before every PR, after merging base branch

**Full Regression Suite** (~10 minutes):

1. **Server Health**:
   - [ ] `npm start` succeeds
   - [ ] No console errors during startup
   - [ ] Port 3000 responsive

2. **API Endpoints**:
   - [ ] GET /api/clusters returns 200
   - [ ] GET /api/clusters/:id/resources returns 200
   - [ ] GET /api/logs/:ctx/:ns/:pod/containers returns 200
   - [ ] GET /api/logs/.../stream establishes SSE connection
   - [ ] GET /api/manifests/:ctx/:kind/:ns/:name returns 200
   - [ ] POST /api/manifests/validate returns validation result
   - [ ] POST /api/manifests/diff returns diff output
   - [ ] POST /api/manifests/apply applies manifest

3. **UI Components**:
   - [ ] 3D scene renders
   - [ ] Camera controls work
   - [ ] Pod selection works
   - [ ] Detail panels open/close
   - [ ] Logs viewer streams logs
   - [ ] Manifest editor loads/edits/applies
   - [ ] No JavaScript errors in console

4. **Layout Algorithms**:
   - [ ] Namespace grouping layout displays clusters
   - [ ] Radial layout switch works
   - [ ] Poisson disc layout renders without overlap

5. **Multi-Cluster**:
   - [ ] Switch between clusters
   - [ ] Each cluster shows correct resources
   - [ ] Cache updates per cluster

### Performance Testing

**Objective**: Ensure smooth 60fps rendering with typical cluster sizes

**Test Scenarios**:

**Small Cluster (10-50 pods)**:

- [ ] Initial render <1 second
- [ ] Frame rate steady 60fps
- [ ] Camera controls responsive (<16ms frame time)

**Medium Cluster (100-500 pods)**:

- [ ] Initial render <3 seconds
- [ ] Frame rate 55-60fps during interaction
- [ ] GPU instancing used (verify in DevTools)

**Large Cluster (1000+ pods)**:

- [ ] Initial render <10 seconds
- [ ] Frame rate 30-60fps (acceptable degradation)
- [ ] No browser freeze or crash
- [ ] Memory stable (no continuous growth)

**Memory Leak Test**:

```javascript
// Run in console
let baseline = performance.memory.usedJSHeapSize;
// Interact with UI for 5 minutes
// (switch clusters, open panels, stream logs)
let final = performance.memory.usedJSHeapSize;
let growth = (final - baseline) / 1024 / 1024;
console.log(`Memory growth: ${growth.toFixed(2)} MB`);
// Acceptable: <50MB growth
// Concerning: >100MB growth (investigate leaks)
```

### Cross-Browser Testing

**Primary Browser**: Chrome v90+ (80% test coverage)

**Secondary Browsers** (smoke tests only):

- [ ] **Firefox v88+**: 3D scene renders, basic interactions work
- [ ] **Safari v14+**: WebGL support, SSE streams work
- [ ] **Edge v90+** (Chromium): Equivalent to Chrome

**Known Issues**:

- Safari: EventSource auto-reconnect behavior differs
- Firefox: Performance slightly lower for large clusters
- Mobile Safari: Touch controls limited, detail panels cramped

### Security Testing

**Manual Security Checklist**:

- [ ] **Input Validation**: YAML parsing rejects malformed input
- [ ] **Path Traversal**: Manifest operations don't allow ../.. paths
- [ ] **Shell Injection**: kubectl subprocess uses argument array (not shell string)
- [ ] **XSS**: User input (pod names, labels) escaped in HTML rendering
- [ ] **SSRF**: No user-controlled URLs in backend fetch operations
- [ ] **Credentials**: No kubeconfig secrets logged or exposed in API responses
- [ ] **CORS**: Only localhost origins allowed (or configured domains)

**kubectl Safety**:

```javascript
// Safe: Argument array prevents injection
spawn("kubectl", ["get", "pods", "-n", userNamespace]);

// Unsafe: Shell string allows injection
exec(`kubectl get pods -n ${userNamespace}`); // ❌ NEVER DO THIS
```

## Automated Testing (Future Roadmap)

### Phase 1: Unit Tests (Jest)

**Setup**:

```bash
npm install --save-dev jest @types/jest
```

**Target Coverage**: 70%+ of business logic

**Priority Files**:

- `src/server/services/*.js` (all services)
- `src/server/utils/*.js` (utilities)
- `public/js/renderer.js` (3D logic)
- `public/js/ui.js` (UI state management)

**Example Test**:

```javascript
// tests/services/logsService.test.js
const logsService = require("../../src/server/services/logsService");

describe("logsService", () => {
  describe("streamPodLogs", () => {
    it("should return readable stream", async () => {
      const stream = await logsService.streamPodLogs(
        "kind-dev",
        "default",
        "nginx-pod",
        { container: "nginx" },
      );
      expect(stream.readable).toBe(true);
    });

    it("should reject invalid context", async () => {
      await expect(
        logsService.streamPodLogs("invalid-ctx", "default", "pod"),
      ).rejects.toThrow("Context not found");
    });
  });
});
```

### Phase 2: Integration Tests (Supertest)

**Setup**:

```bash
npm install --save-dev supertest
```

**Target**: All API endpoints

**Example Test**:

```javascript
// tests/routes/clusters.test.js
const request = require("supertest");
const app = require("../../src/server/app");

describe("GET /api/clusters", () => {
  it("should return array of clusters", async () => {
    const response = await request(app)
      .get("/api/clusters")
      .expect(200)
      .expect("Content-Type", /json/);

    expect(Array.isArray(response.body)).toBe(true);
  });
});

describe("GET /api/clusters/:id/resources", () => {
  it("should return cluster resources", async () => {
    const response = await request(app)
      .get("/api/clusters/kind-dev/resources")
      .expect(200);

    expect(response.body).toHaveProperty("pods");
    expect(response.body).toHaveProperty("nodes");
  });
});
```

### Phase 3: E2E Tests (Playwright)

**Setup**:

```bash
npm install --save-dev @playwright/test
npx playwright install
```

**Target**: Critical user flows

**Example Test**:

```javascript
// tests/e2e/logs.spec.js
const { test, expect } = require("@playwright/test");

test.describe("Pod Logs Feature", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3000");
    await page.waitForSelector("canvas"); // 3D scene loaded
  });

  test("should stream pod logs", async ({ page }) => {
    // Click pod in 3D view (mock or use test cluster)
    await page.click("canvas", { position: { x: 400, y: 300 } });

    // Wait for detail panel
    await expect(page.locator(".detail-panel")).toBeVisible();

    // Click View Logs button
    await page.click("text=View Logs");

    // Wait for logs panel
    await expect(page.locator(".logs-panel")).toBeVisible();

    // Verify logs streaming
    await page.waitForSelector(".logs-content .log-line", { timeout: 5000 });
    const logLines = await page.locator(".logs-content .log-line").count();
    expect(logLines).toBeGreaterThan(0);
  });
});
```

### Phase 4: Visual Regression Tests

**Tool**: Playwright screenshots or Percy

**Target**: Prevent UI regressions

```javascript
test("should match 3D visualization snapshot", async ({ page }) => {
  await page.goto("http://localhost:3000");
  await page.waitForSelector("canvas");
  await page.waitForTimeout(2000); // Let scene render

  await expect(page).toHaveScreenshot("cluster-view.png", {
    maxDiffPixels: 100, // Allow minor rendering differences
  });
});
```

## Test Data Management

### Test Cluster Setup

**Kind Configuration** (`tests/fixtures/kind-config.yaml`):

```yaml
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
  - role: control-plane
  - role: worker
  - role: worker
```

**Setup Script** (`tests/setup-test-cluster.sh`):

```bash
#!/bin/bash
kind create cluster --name test-cluster --config tests/fixtures/kind-config.yaml
kubectl apply -f tests/fixtures/test-resources.yaml
```

**Test Resources** (`tests/fixtures/test-resources.yaml`):

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: test-namespace
---
apiVersion: v1
kind: Pod
metadata:
  name: test-pod
  namespace: test-namespace
spec:
  containers:
    - name: nginx
      image: nginx:alpine
---
# ... more test resources
```

### Mock Data

**Mock Kubernetes Responses**:

```javascript
// tests/mocks/k8sClient.js
const mockPodList = {
  body: {
    items: [
      {
        metadata: { name: "nginx-pod", namespace: "default" },
        status: { phase: "Running" },
      },
    ],
  },
};

module.exports = { mockPodList };
```

## Continuous Integration

### GitHub Actions Workflow

**`.github/workflows/test.yml`**:

```yaml
name: Test Suite
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm test

      - name: Run integration tests
        run: npm run test:integration

      - name: Setup Kind cluster
        uses: helm/kind-action@v1
        with:
          cluster_name: test-cluster

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

## Test Metrics

### Coverage Targets

| Component | Current | Target (6 months) |
| --------- | ------- | ----------------- |
| Services  | 0%      | 80%               |
| Routes    | 0%      | 70%               |
| Utilities | 0%      | 90%               |
| Frontend  | 0%      | 50%               |
| Overall   | 0%      | 70%               |

### Quality Gates

**Before Merging PR**:

- [ ] All automated tests pass (when implemented)
- [ ] Manual testing checklist completed
- [ ] No console errors in browser
- [ ] Performance acceptable (60fps for typical clusters)
- [ ] Security checklist reviewed

**Before Production Deploy**:

- [ ] Regression suite passes
- [ ] E2E tests pass against staging cluster
- [ ] Load testing completed (if applicable)
- [ ] Security scan clean (npm audit, Snyk)

## Future Testing Enhancements

1. **Contract Testing**: Pact for K8s API contract validation
2. **Chaos Engineering**: Test resilience (network failures, slow APIs)
3. **Load Testing**: k6 or Artillery for concurrent user simulation
4. **Accessibility Testing**: axe-core for WCAG compliance
5. **Mutation Testing**: Stryker for test quality validation
