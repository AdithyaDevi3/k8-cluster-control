# Technology Stack - k8-cluster-control

## Backend Stack

### Core Runtime

- **Node.js**: v18+ (LTS)
  - Reason: Mature ecosystem, excellent async I/O for real-time operations
  - Alternatives considered: Python (Flask/FastAPI), Go
  - Why chosen: Best K8s client library support, Three.js ecosystem alignment

### Web Framework

- **Express.js**: v4.18+
  - Reason: Minimal, flexible, widely adopted
  - Alternatives: Fastify (faster), Koa (modern), Hapi
  - Why chosen: Mature middleware ecosystem, simple SSE support

### Kubernetes Client

- **@kubernetes/client-node**: v0.20.0
  - Official JavaScript client for Kubernetes
  - Features: Full K8s API support, Watch API, Exec API, Log streaming
  - Alternatives: Kubectl subprocess calls (used for specific operations)
  - Why both: client-node for streaming/watch, kubectl for diff/apply

### Process Management

- **child_process.spawn**: Node.js built-in
  - Used for kubectl, kind CLI execution
  - Safer than exec() - no shell injection vulnerabilities
  - Streaming stdout/stderr support

### Middleware & Utilities

- **cors**: v2.8+ - Cross-origin resource sharing
- **Custom logger**: Centralized logging utility
- **path**, **fs**: Node.js built-ins for file operations

## Frontend Stack

### 3D Graphics Engine

- **Three.js**: r152+
  - Reason: Industry-standard WebGL abstraction
  - Features: InstancedMesh for GPU acceleration, cameras, lights, controls
  - Alternatives: Babylon.js, PixiJS, raw WebGL
  - Why chosen: Best documentation, largest community, proven performance

### Camera Controls

- **OrbitControls**: Three.js addon
  - Enables mouse-based camera rotation, zoom, pan
  - Touch support for mobile devices
  - Smooth damping for natural feel

### UI Framework

- **Vanilla JavaScript**: ES6+
  - No framework overhead (React, Vue, Angular)
  - Direct DOM manipulation for maximum control
  - Module imports via ES6 import/export
  - Why chosen: Lightweight, no build step required, fast iteration

### Real-time Communication

- **EventSource API**: Browser-native SSE client
  - Unidirectional server-to-client streaming
  - Automatic reconnection on connection loss
  - Simpler than WebSocket for log streaming use case

### HTTP Client

- **Fetch API**: Browser-native
  - Modern Promise-based API
  - No jQuery/Axios dependency
  - Built-in JSON parsing
  - Async/await support

### Styling

- **CSS3**: Modern CSS with variables
  - CSS Grid and Flexbox for layouts
  - CSS animations for transitions
  - Custom properties (--accent, --panel, etc.) for theming
  - No Sass/Less - vanilla CSS sufficient

## Development Tools

### Package Manager

- **npm**: v9+ (comes with Node.js)
  - Alternatives: yarn, pnpm
  - Why npm: Standard, zero-config, universal support

### Linting & Formatting

- **No formal linter yet** (planned: ESLint + Prettier)
  - Current: Manual code review, consistent style
  - Future: Pre-commit hooks with Husky

### Version Control

- **Git**: v2.30+
- **GitHub**: Repository hosting, PR workflow, issue tracking
- **Branch strategy**: Feature branches, main branch protected

### Testing Tools

- **Jest**: (planned) Unit testing framework
- **Supertest**: (planned) HTTP API testing
- **Playwright**: (planned) E2E testing for 3D UI
- **Current**: Manual testing, smoke tests

## DevOps & Infrastructure

### Container Runtime

- **Docker**: v20+ (for Kind clusters)
- **Kind**: v0.20+ Kubernetes in Docker for local testing
  - Alternative: Minikube, k3d, Docker Desktop K8s
  - Why Kind: Fast, lightweight, multi-cluster support

### Kubernetes Distribution

- **Any CNCF-compliant K8s**: 1.24+
  - Tested: Kind, GKE, EKS, AKS, Minikube
  - Compatible with standard kubectl and kubeconfig

### Deployment Targets

- **Local development**: `npm start` on port 3000
- **Docker container**: Dockerfile with Node.js Alpine base
- **Kubernetes**: Deployable as K8s service (manifest in k8s/)
- **Cloud platforms**: Azure Container Apps, AWS ECS, GCP Cloud Run

### CI/CD

- **GitHub Actions**: (planned) Automated testing and deployment
- **Docker Hub**: (planned) Container image registry
- **Current**: Manual deployment, local testing

## Build & Bundle

### No Build Step Required

- Frontend uses native ES6 modules via import maps
- No Webpack, Vite, Rollup, Parcel needed
- Pros: Fast dev iteration, simple debugging, no transpilation
- Cons: No tree shaking, no minification (acceptable for MVP)

### Future Build Optimization

- **Vite**: (planned) For production bundling and minification
- **esbuild**: Fast bundling and transpilation
- **Rollup**: Library packaging if extracted as reusable components

## Monitoring & Observability

### Logging

- **Custom logger utility**: Colorized console logs
- **Future**: Winston, Pino, or structured JSON logging

### Metrics

- **None currently**
- **Future**: Prometheus client, custom metrics export

### Tracing

- **None currently**
- **Future**: OpenTelemetry instrumentation

### Error Tracking

- **None currently**
- **Future**: Sentry, Rollbar integration

## Database & Storage

### Current State

- **No database**: Stateless application
- **In-memory caching**: 30-second TTL Map in clusterService
- **Kubeconfig**: Persistent configuration on filesystem

### Future Storage Needs

- **Redis**: Distributed caching, session management
- **PostgreSQL**: User preferences, saved layouts, audit logs
- **S3/Blob storage**: Backup manifests, historical snapshots

## Security Stack

### Authentication

- **Kubeconfig-based**: Inherits K8s credentials
- **No app-level auth**: Local development tool focus

### Authorization

- **Kubernetes RBAC**: Enforced by K8s API server
- **No app-level RBAC**: Relies on kubeconfig permissions

### Transport Security

- **HTTP**: localhost:3000 (no TLS for local dev)
- **Future**: HTTPS with Let's Encrypt, reverse proxy (nginx, Traefik)

### Secrets Management

- **Environment variables**: For configuration
- **Kubeconfig**: Stores cluster credentials
- **Future**: HashiCorp Vault, Azure Key Vault, AWS Secrets Manager

## Browser Compatibility

### Supported Browsers

- **Chrome**: v90+ (primary target)
- **Firefox**: v88+ (tested)
- **Safari**: v14+ (WebGL support)
- **Edge**: v90+ (Chromium-based)

### Required Browser APIs

- WebGL 2.0 (for Three.js rendering)
- EventSource (for SSE log streaming)
- Fetch API (for HTTP requests)
- ES6 modules (import/export)
- CSS Grid and Flexbox

### Mobile Support

- Partial: 3D view works with touch controls
- Limited: Small screens challenging for detail panels
- Future: Responsive design improvements, mobile-optimized UI

## Performance Stack

### Frontend Optimization

- **GPU instancing**: THREE.InstancedMesh for rendering 1000+ pods
- **Lazy loading**: Detail panels loaded on-demand
- **CSS animations**: Hardware-accelerated transforms
- **Debouncing**: Rate-limited user interactions

### Backend Optimization

- **In-memory caching**: 30s TTL to reduce K8s API load
- **Streaming responses**: SSE for log delivery without buffering
- **Connection pooling**: Reuse K8s API connections

### Future Performance Enhancements

- **Web Workers**: Offload 3D calculations to background threads
- **Service Workers**: Cache static assets, offline support
- **HTTP/2**: Multiplexing for parallel requests
- **CDN**: Serve Three.js from CDN instead of bundling

## Dependency Management

### Production Dependencies (package.json)

```json
{
  "@kubernetes/client-node": "^0.20.0",
  "cors": "^2.8.5",
  "express": "^4.18.2"
}
```

### Development Dependencies

- **None currently**
- **Future**: Jest, ESLint, Prettier, Nodemon, Supertest

### Dependency Update Strategy

- **Manual review**: Check for breaking changes
- **Semantic versioning**: Follow semver for upgrades
- **Security patches**: Apply immediately (npm audit)
- **Major updates**: Test in feature branch before merging

### Lock File

- **package-lock.json**: Committed for reproducible builds
- **npm ci**: Preferred for CI/CD environments

## License Stack

- **Application**: MIT License (open source)
- **Three.js**: MIT License
- **@kubernetes/client-node**: Apache 2.0
- **Express.js**: MIT License
- **All dependencies**: Open source, permissive licenses
