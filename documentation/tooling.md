# Tooling & Development Workflow - k8-cluster-control

## Development Environment Setup

### Prerequisites
```bash
# Required
node -v          # v18+ (LTS)
npm -v           # v9+
git -v           # v2.30+
docker -v        # v20+ (for Kind clusters)
kubectl version  # v1.24+
kind version     # v0.20+

# Optional
code --version   # VS Code (recommended IDE)
```

### Initial Setup
```bash
# Clone repository
git clone https://github.com/AdithyaDevi3/k8-cluster-control.git
cd k8-cluster-control

# Install dependencies
npm install

# Create Kind cluster for testing
kind create cluster --name dev-cluster

# Start development server
npm start

# Open browser
open http://localhost:3000
```

## Git Workflow

### Branch Strategy
```
main (protected)
  ↓
feat/short-term-roadmap-complete (PR #1 submitted)
  ↓
feat/mid-term-roadmap (current work)
  ↓
feat/long-term-roadmap (future)
```

### Branch Naming Convention
- **Feature branches**: `feat/<feature-name>`
  - Example: `feat/terminal-access-logs`
- **Bug fixes**: `fix/<issue-description>`
  - Example: `fix/pod-selection-crash`
- **Documentation**: `docs/<topic>`
  - Example: `docs/api-reference`
- **Refactoring**: `refactor/<component>`
  - Example: `refactor/layout-service`
- **Performance**: `perf/<optimization>`
  - Example: `perf/instanced-rendering`

### Commit Standards

**Golden Rule**: Maximum 2 files per commit (exception: documentation bundles)

**Format**:
```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Formatting, no code change
- `refactor`: Code restructure, no behavior change
- `perf`: Performance improvement
- `test`: Add/update tests
- `chore`: Maintenance tasks

**Examples**:
```bash
# Good commits (≤2 files)
git commit -m "feat(logs): add backend service for pod log streaming

- Implement logsService.js with streamPodLogs() and execInPod()
- Use @kubernetes/client-node k8s.Log API for streaming
- Support container selection, tail lines, follow mode
- Add error handling and stream cleanup"

git commit -m "feat(logs): add SSE endpoint for real-time log streaming

- Create /api/logs route with stream endpoint
- Implement Server-Sent Events for log delivery
- Add container listing endpoint for dropdown
- Include client disconnect cleanup logic"

# Bad commit (too many files)
git commit -m "feat: add entire logs feature"  # 4+ files - TOO BIG
```

### Pull Request Process

**Before Creating PR**:
1. Ensure all commits follow standards (≤2 files each)
2. Test feature manually in browser
3. Check git status is clean
4. Push branch to remote: `git push origin <branch-name>`

**Creating PR**:
```bash
# Via GitHub CLI
gh pr create --title "feat: Terminal access and live logs" \
  --body "Implements pod log streaming with SSE..." \
  --base feat/short-term-roadmap-complete \
  --head feat/mid-term-roadmap

# Or via GitHub web UI
```

**PR Template**:
```markdown
## Description
Brief description of changes

## Features Added
- Feature 1 (commits: abc123, def456)
- Feature 2 (commits: ghi789)

## Testing
- [ ] Manual testing completed
- [ ] Smoke tests pass
- [ ] No console errors
- [ ] Works with Kind cluster

## Screenshots (if UI changes)
[Attach screenshots]

## Checklist
- [ ] Commits follow ≤2 files standard
- [ ] Code follows project conventions
- [ ] Documentation updated (if needed)
- [ ] No merge conflicts with base branch
```

**PR Review Checklist**:
- ✅ Each commit atomic and focused
- ✅ Commit messages descriptive
- ✅ No commented-out code
- ✅ No console.log() left in code
- ✅ Error handling present
- ✅ No hardcoded credentials
- ✅ Code style consistent

### Rebasing Strategy

**Rebasing onto base branch**:
```bash
# Update local base branch
git checkout feat/short-term-roadmap-complete
git pull origin feat/short-term-roadmap-complete

# Rebase feature branch
git checkout feat/mid-term-roadmap
git rebase feat/short-term-roadmap-complete

# Resolve conflicts if any
git status
# ... edit files, resolve conflicts ...
git add <resolved-files>
git rebase --continue

# Force push (if already pushed)
git push --force-with-lease origin feat/mid-term-roadmap
```

**Squashing commits** (if needed):
```bash
# Interactive rebase last 5 commits
git rebase -i HEAD~5

# In editor, mark commits to squash:
pick abc123 feat(logs): backend service
squash def456 feat(logs): fix typo
squash ghi789 feat(logs): add comments
pick jkl012 feat(logs): SSE endpoint

# Edit commit message, save, exit
```

## IDE Configuration

### VS Code Settings

**Recommended Extensions**:
- ESLint (future when linting added)
- Prettier (future for formatting)
- GitLens (git history visualization)
- Docker (container management)
- Kubernetes (YAML editing, kubectl integration)

**Workspace Settings** (`.vscode/settings.json`):
```json
{
  "editor.tabSize": 2,
  "editor.insertSpaces": true,
  "editor.formatOnSave": false,
  "files.trimTrailingWhitespace": true,
  "files.insertFinalNewline": true,
  "files.exclude": {
    "**/node_modules": true,
    "**/.git": true
  }
}
```

### Code Style Guide

**JavaScript**:
- Use `const` by default, `let` when reassignment needed
- Avoid `var`
- Use async/await over raw promises
- Use arrow functions for callbacks
- Use template literals over string concatenation
- Use destructuring for object/array access

**Example**:
```javascript
// Good
const { namespace, podName } = req.params;
const logs = await logsService.streamPodLogs(context, namespace, podName);

// Bad
var namespace = req.params.namespace;
logsService.streamPodLogs(context, namespace, podName).then(function(logs) {
  // ...
});
```

**File Naming**:
- Services: camelCase - `logsService.js`
- Routes: plural - `logs.js`, `manifests.js`
- Components: camelCase - `renderer.js`, `ui.js`
- Configs: kebab-case - `docker-compose.yml`

## Testing Strategy

### Current Approach (Manual Testing)

**Server Startup Testing**:
```bash
# Terminal 1: Start server
npm start
# Verify: "Server listening on port 3000"
# Check for errors in console

# Terminal 2: Test endpoints
curl http://localhost:3000/api/clusters
curl http://localhost:3000/api/tools/status
```

**Browser Testing Workflow**:
1. Open http://localhost:3000 in Chrome
2. Open DevTools (F12) → Console tab
3. Check for JavaScript errors
4. Test each feature:
   - Load cluster visualization
   - Click pod → verify detail panel
   - Click "View Logs" → verify SSE stream
   - Click "Edit Manifest" → verify editor opens
   - Edit YAML → click "Preview Diff" → verify diff
   - Click "Apply" → verify success message

**Regression Testing Checklist**:
- [ ] Cluster list loads without errors
- [ ] 3D visualization renders (see colorful spheres)
- [ ] Camera controls work (drag to rotate, scroll to zoom)
- [ ] Pod selection highlights object
- [ ] Detail panel shows correct data
- [ ] Logs stream in real-time
- [ ] Manifest editor loads current YAML
- [ ] Diff preview shows changes
- [ ] Apply manifest updates cluster
- [ ] No console errors

### Future Automated Testing

**Unit Tests** (Jest):
```bash
# Setup
npm install --save-dev jest supertest

# Run tests
npm test

# Watch mode
npm test -- --watch
```

**Example Test**:
```javascript
// tests/logsService.test.js
describe('logsService', () => {
  it('should stream pod logs', async () => {
    const stream = await logsService.streamPodLogs('kind-dev', 'default', 'nginx-pod');
    expect(stream).toBeInstanceOf(Stream);
  });
});
```

**E2E Tests** (Playwright):
```javascript
// tests/e2e/logs.spec.js
test('should view pod logs', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await page.click('text=Select Cluster');
  await page.click('canvas'); // Click 3D canvas
  await page.click('text=View Logs');
  await expect(page.locator('.logs-panel')).toBeVisible();
});
```

**API Tests** (Supertest):
```javascript
const request = require('supertest');
const app = require('../src/server/app');

describe('GET /api/clusters', () => {
  it('should return cluster list', async () => {
    const response = await request(app).get('/api/clusters');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });
});
```

## Debugging Tools

### Server-Side Debugging

**Node.js Inspector**:
```bash
# Start with debugger
node --inspect src/server/index.js

# Attach VS Code debugger
# F5 → "Node: Attach" configuration
```

**VS Code Launch Config** (`.vscode/launch.json`):
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Server",
      "program": "${workspaceFolder}/src/server/index.js",
      "restart": true,
      "console": "integratedTerminal"
    }
  ]
}
```

**Logging Best Practices**:
```javascript
const logger = require('./utils/logger');

// Use logger utility
logger.info('Streaming logs', { context, namespace, pod });
logger.error('Stream error', error);

// Avoid console.log in production code
// console.log('debug message'); // ❌ Remove before commit
```

### Client-Side Debugging

**Chrome DevTools**:
- **Console**: Check for JS errors, network errors
- **Network**: Monitor API requests, SSE streams
- **Sources**: Set breakpoints in JS files
- **Performance**: Profile 3D rendering FPS
- **Memory**: Check for memory leaks during rendering

**Three.js Debugging**:
```javascript
// Enable stats panel
import Stats from 'three/addons/libs/stats.module.js';
const stats = new Stats();
document.body.appendChild(stats.dom);

// Log scene graph
console.log(scene);
console.log('Children:', scene.children.length);

// Check instance count
console.log('Instance count:', instancedMesh.count);
```

**SSE Debugging**:
```javascript
// Monitor SSE connection
eventSource.addEventListener('open', () => {
  console.log('SSE connected');
});

eventSource.addEventListener('error', (e) => {
  console.error('SSE error', e);
});

// Check EventSource state
console.log('ReadyState:', eventSource.readyState);
// 0 = CONNECTING, 1 = OPEN, 2 = CLOSED
```

## Performance Profiling

### Backend Profiling

**Node.js built-in profiler**:
```bash
node --prof src/server/index.js
# ... use app ...
# Stop server (Ctrl+C)
node --prof-process isolate-*.log > profile.txt
# Analyze profile.txt for hotspots
```

**Memory profiling**:
```bash
node --inspect --expose-gc src/server/index.js
# Chrome DevTools → Memory tab → Take Heap Snapshot
```

### Frontend Profiling

**Chrome Performance Tab**:
1. Open DevTools → Performance
2. Click Record
3. Interact with 3D visualization
4. Stop recording
5. Analyze frame rate, layout thrashing, JavaScript execution time

**Three.js Stats**:
```javascript
// Show FPS counter
stats.begin(); // Start frame
renderer.render(scene, camera);
stats.end();   // End frame
```

## Deployment Tools

### Docker

**Build image**:
```bash
docker build -t k8-cluster-control:latest .
```

**Run container**:
```bash
docker run -p 3000:3000 \
  -v ~/.kube/config:/root/.kube/config:ro \
  k8-cluster-control:latest
```

**Docker Compose** (development):
```bash
docker-compose up --build
```

### Kubernetes Deployment

**Apply manifests**:
```bash
kubectl apply -f k8s/base.yaml
kubectl apply -f k8s/rbac-readonly.yaml  # Or rbac-operator.yaml
```

**Port forward**:
```bash
kubectl port-forward svc/k8-cluster-control 3000:3000
```

**Check logs**:
```bash
kubectl logs -f deployment/k8-cluster-control
```

## CI/CD (Planned)

### GitHub Actions Workflow
```yaml
# .github/workflows/test.yml
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npm test
      - run: npm run lint # Future
```

## Monitoring Tools (Future)

### Logging
- **Winston**: Structured JSON logs
- **Pino**: High-performance logger

### Metrics
- **Prometheus client**: Export metrics
- **Grafana**: Visualize metrics dashboard

### Tracing
- **OpenTelemetry**: Distributed tracing
- **Jaeger**: Trace visualization

### Error Tracking
- **Sentry**: Production error monitoring
- **Rollbar**: Real-time error alerts
