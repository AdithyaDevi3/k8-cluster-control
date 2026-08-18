# Architectural Tradeoffs - k8-cluster-control

## Key Decisions and Rationale

### 1. Server-Sent Events (SSE) vs WebSockets

**Decision**: Use SSE for log streaming instead of WebSockets

**Pros**:
- ✅ Simpler implementation - native EventSource API in browsers
- ✅ No additional npm dependencies (ws package not needed)
- ✅ Automatic reconnection built into EventSource
- ✅ Works over HTTP/HTTPS without upgrade protocol
- ✅ Firewall/proxy friendly (standard HTTP)
- ✅ Sufficient for unidirectional server→client streaming

**Cons**:
- ❌ Unidirectional only (server to client)
- ❌ No binary data support (text-only)
- ❌ Limited browser connection pool (6 connections per domain)
- ❌ No native compression (vs WebSocket binary frames)

**Why SSE Won**:
- Log streaming is inherently unidirectional (server→client)
- User commands use standard REST POST endpoints
- Simpler to implement and debug
- No WebSocket library installation issues in sandboxed environments
- EventSource provides better reconnection semantics out-of-the-box

**When to reconsider**: If bidirectional communication needed (e.g., interactive shell sessions, real-time collaborative editing)

---

### 2. Vanilla JavaScript vs React/Vue/Angular

**Decision**: Use vanilla JavaScript with ES6 modules instead of a framework

**Pros**:
- ✅ Zero build step required - faster development iteration
- ✅ Smaller bundle size - no framework overhead
- ✅ Complete control over rendering and updates
- ✅ Easy debugging - direct DOM access, no virtual DOM
- ✅ No framework lock-in - easier to migrate or refactor
- ✅ Faster initial page load

**Cons**:
- ❌ Manual DOM manipulation more verbose
- ❌ No reactive state management out-of-the-box
- ❌ More boilerplate for complex UI components
- ❌ No component lifecycle hooks
- ❌ Harder to maintain at scale (100k+ LOC)

**Why Vanilla JS Won**:
- Application UI is primarily 3D (Three.js), not DOM-heavy
- Detail panels are simple forms and tables
- Fast prototyping without build tooling overhead
- MVP focused - can migrate to framework later if needed
- Educational value - demonstrates core concepts without abstraction

**When to reconsider**: If UI complexity grows beyond ~50 components, or team prefers framework experience

---

### 3. GPU Instancing vs Individual Mesh Objects

**Decision**: Use THREE.InstancedMesh for rendering thousands of pods

**Pros**:
- ✅ Massive performance improvement - 1000+ pods at 60fps
- ✅ Single draw call for all instances of same geometry
- ✅ GPU-side matrix transformations
- ✅ Lower memory footprint on GPU
- ✅ Scales to 10k+ objects without performance degradation

**Cons**:
- ❌ All instances share same geometry (sphere for pods)
- ❌ Cannot individually hide/show instances easily
- ❌ Color/position updates require buffer updates
- ❌ More complex selection/raycasting logic
- ❌ Harder to debug individual instance state

**Why Instancing Won**:
- Kubernetes clusters routinely have 100-1000+ pods
- Individual meshes caused frame drops at ~200 pods
- Uniform appearance acceptable for pod visualization
- Performance critical for user experience
- Industry standard approach for particle systems and crowds

**When to reconsider**: If each pod needs unique geometry (e.g., custom 3D models per workload type)

---

### 4. In-Memory Caching vs Redis/Database

**Decision**: Use in-memory JavaScript Map with 30s TTL instead of external cache

**Pros**:
- ✅ No external dependencies - simpler deployment
- ✅ Zero network latency - instant cache hits
- ✅ Easier to reason about - single process state
- ✅ No serialization/deserialization overhead
- ✅ Sufficient for single-instance development tool

**Cons**:
- ❌ Doesn't persist across server restarts
- ❌ Not shared across multiple server instances
- ❌ Limited by Node.js heap size (~1.4GB default)
- ❌ Cache invalidation requires process-local timers
- ❌ No eviction policies (LRU, LFU) - just TTL

**Why In-Memory Won**:
- Target use case: single developer on localhost
- Cluster data changes frequently anyway (30s TTL)
- Typical cluster data ~1-10MB, well within heap limits
- Eliminates Redis deployment complexity
- Faster iteration during development

**When to reconsider**: If deploying multi-instance production service, or caching data >100MB

---

### 5. kubectl Subprocess vs Native Client API

**Decision**: Mix of @kubernetes/client-node and kubectl subprocess calls

**client-node used for**:
- ✅ Listing resources (pods, nodes, services)
- ✅ Log streaming (k8s.Log API)
- ✅ Command execution (k8s.Exec API)
- ✅ Watch API for real-time updates (future)

**kubectl subprocess used for**:
- ✅ Manifest diff (kubectl diff --server-side)
- ✅ Manifest apply (kubectl apply -f -)
- ✅ Complex operations not well-supported by client-node
- ✅ Leverages kubectl's built-in validation and formatting

**Tradeoffs**:
- **Pro**: Best of both worlds - native streaming + kubectl power
- **Pro**: kubectl handles complex YAML edge cases
- **Pro**: Easier error messages from kubectl vs parsing API responses
- **Con**: Requires kubectl installation on host
- **Con**: Subprocess overhead (spawn, IPC, parsing)
- **Con**: No typed interfaces - parse stdout/stderr

**Why Mixed Approach Won**:
- client-node excels at streaming (logs, exec)
- kubectl superior for manifest operations (diff, apply, validation)
- Kubectl already required by users (K8s developers)
- Pragmatic - use best tool for each job

**When to reconsider**: If targeting kubectl-free environments (browser extension, mobile app)

---

### 6. No Database vs PostgreSQL/MongoDB

**Decision**: Stateless application with no database

**Pros**:
- ✅ Simpler deployment - no DB setup required
- ✅ Kubernetes API is source of truth
- ✅ Easier to horizontally scale (no shared state)
- ✅ No schema migrations or versioning
- ✅ Faster iteration without ORM layer

**Cons**:
- ❌ Cannot store user preferences persistently
- ❌ No audit log of historical operations
- ❌ Cannot save custom layouts or bookmarks
- ❌ No offline mode support
- ❌ No analytics or usage tracking

**Why Stateless Won**:
- MVP focused on real-time cluster visualization
- Kubernetes already stores all resource state
- User preferences can be added later (localStorage → DB migration)
- Eliminates entire class of bugs (data inconsistency, migrations)
- Faster to prototype and iterate

**When to reconsider**: When adding multi-user support, audit logs, or custom dashboard persistence

---

### 7. Monaco Editor vs Simple Textarea

**Decision**: Use simple textarea for manifest editing (Monaco optional future upgrade)

**Pros**:
- ✅ Zero bundle size - no editor library
- ✅ Native browser editing experience
- ✅ Works on mobile devices
- ✅ No build step or webpack config
- ✅ Sufficient for small YAML manifests

**Cons**:
- ❌ No syntax highlighting
- ❌ No auto-completion
- ❌ No error squiggles for invalid YAML
- ❌ No line numbers or minimap
- ❌ Harder to edit large manifests (1000+ lines)

**Why Textarea Won** (for MVP):
- Most K8s manifests <200 lines
- Developers already familiar with YAML syntax
- Can validate on server-side (kubectl dry-run)
- Easy to upgrade to Monaco later without breaking changes
- Keeps frontend bundle size minimal

**When to reconsider**: If users request syntax highlighting or edit manifests >500 lines frequently

---

### 8. Namespace Grouping vs Flat Layout

**Decision**: Default to namespace-aware grouping layout

**Pros**:
- ✅ Logical organization - pods grouped by namespace
- ✅ Easier to understand cluster structure
- ✅ Aligns with Kubernetes multi-tenancy model
- ✅ Reduces visual clutter in dense clusters

**Cons**:
- ❌ More complex layout algorithm (Poisson disc per namespace)
- ❌ Harder to see cross-namespace relationships
- ❌ Empty space between namespace groups
- ❌ Not suitable for single-namespace clusters

**Why Namespace Grouping Won**:
- Production clusters typically multi-tenant (10-50 namespaces)
- Matches mental model of Kubernetes operators
- Provides multiple layout options (radial, flat, grouped)
- User can switch layouts via UI control

**When to reconsider**: If supporting edge/IoT single-namespace clusters primarily

---

### 9. Port 3000 vs Configurable Port

**Decision**: Hardcode port 3000 with environment variable override

**Pros**:
- ✅ Predictable default - easy to remember
- ✅ Standard convention (React, Next.js, many Node servers)
- ✅ Simpler documentation - "visit localhost:3000"
- ✅ Can override with PORT env var if needed

**Cons**:
- ❌ Conflicts if port 3000 already in use
- ❌ Not flexible for multi-instance testing
- ❌ Hardcoded in client-side fetch URLs

**Why Port 3000 Won**:
- Developer tool - conflicts rare in typical environments
- Easy to kill existing process: `lsof -ti:3000 | xargs kill`
- Can use PORT=3001 for secondary instance
- Standard practice in Node.js ecosystem

**When to reconsider**: If deploying in managed environments with assigned ports (Cloud Run, Lambda)

---

### 10. Dark Theme Only vs Theme Switcher

**Decision**: Dark theme only with CSS variables for future theming

**Pros**:
- ✅ Simpler CSS - single color scheme
- ✅ Better for 3D visualization (less eye strain)
- ✅ Terminal aesthetic matches kubectl/developer tools
- ✅ Easier to ensure readability - test one theme

**Cons**:
- ❌ Not accessible for users preferring light themes
- ❌ Harder to use in bright environments
- ❌ No system preference matching (prefers-color-scheme)

**Why Dark Theme Won**:
- Target audience: developers comfortable with dark terminals
- 3D visualization benefits from dark background
- CSS variables prepared for future theme switching
- Can add light theme later without breaking changes

**When to reconsider**: If accessibility requirements mandate multiple themes

---

## Summary of Tradeoffs

| Decision | Optimized For | Sacrificed |
|----------|---------------|------------|
| SSE over WebSockets | Simplicity, HTTP compatibility | Bidirectional comm |
| Vanilla JS | Fast iteration, small bundle | Framework features |
| GPU Instancing | Performance (10k+ pods) | Per-instance control |
| In-memory cache | Zero dependencies | Multi-instance support |
| Mixed kubectl/client-node | Best tool per job | Consistency |
| No database | Stateless simplicity | Persistence |
| Textarea editor | Small bundle size | Syntax highlighting |
| Namespace grouping | Logical organization | Flat simplicity |
| Port 3000 | Convention, docs | Flexibility |
| Dark theme only | 3D clarity, simplicity | Theme choice |

## Decision Framework

When making future tradeoff decisions:
1. **Favor simplicity** over features (MVP mindset)
2. **Defer complexity** until evidence of need
3. **Optimize for iteration speed** during development
4. **Choose boring technology** (proven, stable, documented)
5. **Maintain upgrade paths** (don't paint into corners)
6. **Document decisions** (this file) with rationale
