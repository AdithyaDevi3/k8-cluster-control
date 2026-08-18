# System Design - k8-cluster-control

## Overview

k8-cluster-control is a real-time 3D Kubernetes cluster visualization and management tool built with a Node.js backend and vanilla JavaScript + Three.js frontend. The system provides live cluster monitoring, resource management, log streaming, and manifest editing capabilities.

## Architecture Layers

### 1. Frontend Layer (Browser)

- **3D Rendering Engine**: Three.js r152+ with WebGL
- **Event-Driven UI**: Vanilla JavaScript with DOM manipulation
- **Real-time Communication**:
  - REST API for cluster operations
  - Server-Sent Events (SSE) for log streaming
  - Fetch API for async data retrieval

### 2. Backend Layer (Node.js/Express)

- **HTTP Server**: Express.js on port 3000
- **Service Layer**: Business logic encapsulation
- **Kubernetes Integration**: @kubernetes/client-node v0.20.0
- **Process Management**: child_process for CLI tool execution

### 3. Data Layer

- **In-Memory Caching**: 30-second TTL for cluster data
- **Kubernetes API**: Live cluster state from API server
- **Kubeconfig**: Multi-cluster context management

## Component Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Browser (Frontend)                    │
├─────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ 3D Renderer  │  │  UI Controls │  │ SSE Client   │  │
│  │ (Three.js)   │  │  (Vanilla JS)│  │ (EventSource)│  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│         │                  │                  │          │
│         └──────────────────┴──────────────────┘          │
│                           │                              │
│                     REST API / SSE                       │
└───────────────────────────┬─────────────────────────────┘
                            │
┌───────────────────────────┼─────────────────────────────┐
│                    Express.js Server                     │
├─────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────┐   │
│  │                  Route Layer                       │   │
│  │  /api/clusters  /api/logs  /api/manifests  /api/kind │
│  └────────────────────┬─────────────────────────────┘   │
│                       │                                  │
│  ┌────────────────────┴─────────────────────────────┐   │
│  │                Service Layer                       │   │
│  │  clusterService  logsService  manifestService     │   │
│  │  resourceService  layoutService  kindService      │   │
│  └────────────────────┬─────────────────────────────┘   │
│                       │                                  │
│  ┌────────────────────┴─────────────────────────────┐   │
│  │            Kubernetes Integration                  │   │
│  │  @kubernetes/client-node  (CoreV1Api, k8s.Log,    │   │
│  │                           k8s.Exec, KubeConfig)    │   │
│  └────────────────────┬─────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                        │
        ┌───────────────┴───────────────┐
        │    Kubernetes API Server      │
        │   (Multiple Clusters via      │
        │      kubeconfig contexts)     │
        └───────────────────────────────┘
```

## Design Patterns

### 1. Service Layer Pattern

- Each service encapsulates specific domain logic
- Services are stateless and reusable
- Error handling centralized in service layer

### 2. Repository Pattern

- Services act as repositories for Kubernetes resources
- Abstracts K8s API details from route handlers
- Enables easy mocking and testing

### 3. MVC-Inspired Architecture

- **Model**: Kubernetes resources via client-node
- **View**: Three.js 3D visualization + DOM UI
- **Controller**: Express route handlers + service layer

### 4. Real-time Streaming Pattern

- SSE for server-to-client unidirectional streaming
- EventSource client for log consumption
- Graceful connection handling and cleanup

### 5. Caching Strategy

- Time-based cache invalidation (30s TTL)
- Manual refresh endpoints for user-triggered updates
- Reduces K8s API server load

## Data Flow Examples

### Example 1: Loading Cluster View

```
User → Browser
  ↓
GET /api/clusters/:id/resources
  ↓
clusterService.getClusterResources()
  ↓
K8s API: listPodForAllNamespaces(), listNode()
  ↓
Cache (30s TTL)
  ↓
JSON Response → Browser
  ↓
3D Renderer creates InstancedMesh
  ↓
Galaxy visualization displayed
```

### Example 2: Streaming Pod Logs

```
User clicks "View Logs" → Browser
  ↓
GET /api/logs/:context/:namespace/:pod/stream
  ↓
logsService.streamPodLogs()
  ↓
k8s.Log.log() creates readable stream
  ↓
SSE connection established (text/event-stream)
  ↓
Stream chunks → SSE events → EventSource listener
  ↓
DOM updates with log lines + auto-scroll
```

### Example 3: Editing Manifest

```
User clicks "Edit Manifest" → Browser
  ↓
GET /api/manifests/:context/:kind/:namespace/:name
  ↓
manifestService.getResourceManifest()
  ↓
kubectl get -o yaml via child_process
  ↓
YAML → Monaco Editor in modal
  ↓
User edits → Click "Preview Diff"
  ↓
POST /api/manifests/diff
  ↓
kubectl diff --server-side
  ↓
Diff output displayed in split pane
  ↓
User clicks "Apply"
  ↓
POST /api/manifests/apply
  ↓
kubectl apply -f -
  ↓
Success feedback → Cluster refreshes
```

## Scalability Considerations

### Frontend

- **GPU Instancing**: THREE.InstancedMesh for rendering thousands of pods efficiently
- **Lazy Loading**: Load detailed panels only when user clicks resources
- **Debouncing**: Prevent excessive API calls during rapid user interactions

### Backend

- **Connection Pooling**: Reuse K8s API connections via @kubernetes/client-node
- **Caching**: Reduce API server load with TTL-based caching
- **Streaming**: SSE for efficient log delivery without polling

### Future Scalability

- Add Redis for distributed caching across multiple server instances
- WebSocket fallback for bidirectional communication needs
- GraphQL layer for efficient data fetching and aggregation
- Horizontal scaling with session affinity for SSE connections

## Security Design

### Authentication

- Relies on kubeconfig credentials (~/.kube/config)
- No separate user authentication layer (local development focus)
- RBAC enforced by Kubernetes API server based on kubeconfig context

### Authorization

- Permissions inherited from kubeconfig user/service account
- Read-only operations require get/list permissions
- Write operations (apply, delete) require cluster-admin or specific RBAC roles

### Input Validation

- YAML validation before manifest application
- Path sanitization for file operations
- No shell injection via child_process.spawn with argument arrays

### Future Security Enhancements

- Multi-user support with OAuth2/OIDC
- Audit logging for all cluster operations
- Rate limiting on API endpoints
- HTTPS with TLS certificate management

## Monitoring and Observability

### Current State

- Console logging via custom logger utility
- HTTP request/response logging in Express middleware
- Error tracking with try-catch blocks in services

### Future Enhancements

- Structured logging with Winston or Pino
- Metrics export (Prometheus format)
- Distributed tracing with OpenTelemetry
- Health check endpoints expansion (/healthz, /readyz, /metrics)

## Disaster Recovery

### Current State

- Read-only operations safe by default
- Destructive operations require kubectl access
- Local kubeconfig as single source of truth

### Future Enhancements

- Operation history with rollback capability
- Backup before apply with automatic restore option
- Multi-cluster failover support
- Disaster recovery runbook automation
