# API Reference - k8-cluster-control

## Base URL

```
http://localhost:3000
```

## Authentication

Currently uses kubeconfig-based authentication. No separate API authentication layer.

---

## Clusters API

### List Clusters

**Endpoint**: `GET /api/clusters`  
**Description**: Returns all available Kubernetes contexts from kubeconfig

**Response**:

```json
[
  {
    "id": "kind-dev",
    "name": "kind-dev",
    "server": "https://127.0.0.1:59345",
    "namespace": "default"
  },
  {
    "id": "production",
    "name": "production",
    "server": "https://prod-api.example.com",
    "namespace": "default"
  }
]
```

**Status Codes**:

- `200 OK`: Success
- `500 Internal Server Error`: Failed to load kubeconfig

---

### Get Cluster Resources

**Endpoint**: `GET /api/clusters/:context/resources`  
**Description**: Returns pods, nodes, services for specified cluster

**Parameters**:

- `context` (path): Kubernetes context name (e.g., "kind-dev")

**Query Parameters**:

- `namespace` (optional): Filter by namespace
- `labels` (optional): Label selector (e.g., "app=nginx")

**Response**:

```json
{
  "pods": [
    {
      "name": "nginx-abc123",
      "namespace": "default",
      "status": "Running",
      "ip": "10.244.0.5",
      "nodeName": "kind-worker",
      "containers": [
        {
          "name": "nginx",
          "image": "nginx:latest",
          "ready": true,
          "restartCount": 0
        }
      ],
      "labels": {
        "app": "nginx",
        "version": "v1"
      },
      "creationTimestamp": "2024-01-15T10:30:00Z"
    }
  ],
  "nodes": [
    {
      "name": "kind-control-plane",
      "status": "Ready",
      "version": "v1.27.0",
      "capacity": {
        "cpu": "4",
        "memory": "8Gi"
      },
      "allocatable": {
        "cpu": "4",
        "memory": "8Gi"
      },
      "conditions": [
        { "type": "Ready", "status": "True" },
        { "type": "DiskPressure", "status": "False" }
      ]
    }
  ],
  "services": [
    {
      "name": "kubernetes",
      "namespace": "default",
      "type": "ClusterIP",
      "clusterIP": "10.96.0.1",
      "ports": [{ "port": 443, "targetPort": 6443 }]
    }
  ]
}
```

**Status Codes**:

- `200 OK`: Success
- `404 Not Found`: Context not found
- `500 Internal Server Error`: K8s API error

**Caching**: 30-second TTL cache

---

## Logs API

### Stream Pod Logs (SSE)

**Endpoint**: `GET /api/logs/:context/:namespace/:pod/stream`  
**Description**: Server-Sent Events endpoint for real-time log streaming

**Parameters**:

- `context` (path): Kubernetes context name
- `namespace` (path): Pod namespace
- `pod` (path): Pod name

**Query Parameters**:

- `container` (optional): Container name (required for multi-container pods)
- `follow` (optional): Boolean, true for live streaming (default: true)
- `tailLines` (optional): Number of lines to tail (default: 100)
- `timestamps` (optional): Boolean, include timestamps (default: false)
- `previous` (optional): Boolean, get logs from previous container (default: false)

**Response**: `text/event-stream`

**SSE Events**:

```
event: connected
data: {"message": "Log stream connected"}

event: log
data: 2024-01-15T10:30:00Z INFO Starting server on port 8080

event: log
data: 2024-01-15T10:30:01Z INFO Server ready

event: end
data: {"message": "Stream ended"}
```

**Error Events**:

```
event: error
data: {"error": "Container not found"}
```

**Status Codes**:

- `200 OK`: Stream established
- `404 Not Found`: Pod or container not found
- `500 Internal Server Error`: K8s API error

**Example Client**:

```javascript
const eventSource = new EventSource(
  "/api/logs/kind-dev/default/nginx-pod/stream?container=nginx&follow=true&tailLines=50",
);

eventSource.addEventListener("connected", () => {
  console.log("Connected");
});

eventSource.addEventListener("log", (e) => {
  console.log("Log:", e.data);
});

eventSource.addEventListener("error", (e) => {
  console.error("Error:", e.data);
  eventSource.close();
});

eventSource.addEventListener("end", () => {
  console.log("Stream ended");
  eventSource.close();
});
```

---

### List Pod Containers

**Endpoint**: `GET /api/logs/:context/:namespace/:pod/containers`  
**Description**: Returns array of container names for dropdown

**Parameters**:

- `context` (path): Kubernetes context name
- `namespace` (path): Pod namespace
- `pod` (path): Pod name

**Response**:

```json
{
  "containers": [
    {
      "name": "nginx",
      "image": "nginx:latest",
      "ready": true
    },
    {
      "name": "sidecar",
      "image": "busybox:latest",
      "ready": true
    }
  ],
  "initContainers": [
    {
      "name": "init-db",
      "image": "postgres:14",
      "ready": false
    }
  ]
}
```

**Status Codes**:

- `200 OK`: Success
- `404 Not Found`: Pod not found

---

### Execute Command in Pod

**Endpoint**: `POST /api/logs/:context/:namespace/:pod/exec`  
**Description**: Execute command in pod container and return output

**Parameters**:

- `context` (path): Kubernetes context name
- `namespace` (path): Pod namespace
- `pod` (path): Pod name

**Request Body**:

```json
{
  "container": "nginx",
  "command": ["ls", "-la", "/var/log"],
  "stdin": null
}
```

**Response**:

```json
{
  "stdout": "total 16\ndrwxr-xr-x 2 root root 4096 Jan 15 10:30 .\n...",
  "stderr": "",
  "exitCode": 0
}
```

**Status Codes**:

- `200 OK`: Command executed (check exitCode)
- `404 Not Found`: Pod or container not found
- `500 Internal Server Error`: Execution failed

---

## Manifests API

### Get Resource Manifest

**Endpoint**: `GET /api/manifests/:context/:kind/:namespace/:name`  
**Description**: Returns current resource manifest as YAML

**Parameters**:

- `context` (path): Kubernetes context name
- `kind` (path): Resource kind (pod, service, deployment, etc.)
- `namespace` (path): Resource namespace
- `name` (path): Resource name

**Response**:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: nginx-abc123
  namespace: default
  labels:
    app: nginx
spec:
  containers:
    - name: nginx
      image: nginx:latest
      ports:
        - containerPort: 80
```

**Headers**:

- `Content-Type: text/yaml`

**Status Codes**:

- `200 OK`: Success
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: kubectl error

---

### Validate Manifest

**Endpoint**: `POST /api/manifests/validate`  
**Description**: Validates YAML syntax and Kubernetes schema

**Request Body**:

```json
{
  "yamlContent": "apiVersion: v1\nkind: Pod\n..."
}
```

**Response (Valid)**:

```json
{
  "valid": true,
  "message": "YAML is valid"
}
```

**Response (Invalid)**:

```json
{
  "valid": false,
  "error": "Invalid YAML: Unexpected token at line 5"
}
```

**Status Codes**:

- `200 OK`: Validation complete (check `valid` field)
- `400 Bad Request`: Missing yamlContent

---

### Preview Manifest Diff

**Endpoint**: `POST /api/manifests/diff`  
**Description**: Server-side dry-run diff using kubectl

**Request Body**:

```json
{
  "context": "kind-dev",
  "yamlContent": "apiVersion: v1\nkind: Pod\n..."
}
```

**Response**:

```json
{
  "diff": "--- a/default/pod/nginx-abc123\n+++ b/default/pod/nginx-abc123\n@@ -5,7 +5,7 @@\n   labels:\n-    version: v1\n+    version: v2\n"
}
```

**Status Codes**:

- `200 OK`: Diff generated
- `400 Bad Request`: Invalid YAML
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: kubectl error

---

### Apply Manifest

**Endpoint**: `POST /api/manifests/apply`  
**Description**: Apply manifest changes to cluster

**Request Body**:

```json
{
  "context": "kind-dev",
  "yamlContent": "apiVersion: v1\nkind: Pod\n..."
}
```

**Response (Success)**:

```json
{
  "success": true,
  "message": "pod/nginx-abc123 configured"
}
```

**Response (Error)**:

```json
{
  "success": false,
  "error": "The Pod \"nginx-abc123\" is invalid: spec.containers[0].image: Required value"
}
```

**Status Codes**:

- `200 OK`: Apply successful
- `400 Bad Request`: Invalid YAML
- `403 Forbidden`: RBAC permission denied
- `409 Conflict`: Resource version mismatch
- `500 Internal Server Error`: kubectl error

---

## Kind API

### List Kind Clusters

**Endpoint**: `GET /api/kind/list`  
**Description**: Returns all Kind clusters on local machine

**Response**:

```json
{
  "clusters": [
    {
      "name": "kind-dev",
      "created": "2024-01-15T10:00:00Z",
      "nodes": 3
    },
    {
      "name": "kind-test",
      "created": "2024-01-14T15:30:00Z",
      "nodes": 1
    }
  ]
}
```

**Status Codes**:

- `200 OK`: Success
- `500 Internal Server Error`: kind CLI error

---

### Create Kind Cluster

**Endpoint**: `POST /api/kind/create`  
**Description**: Create new Kind cluster

**Request Body**:

```json
{
  "name": "dev-cluster",
  "config": {
    "nodes": 3,
    "version": "v1.27.0"
  }
}
```

**Response**:

```json
{
  "success": true,
  "message": "Cluster 'dev-cluster' created successfully",
  "kubeconfig": "/home/user/.kube/config"
}
```

**Status Codes**:

- `201 Created`: Cluster created
- `400 Bad Request`: Invalid configuration
- `409 Conflict`: Cluster already exists
- `500 Internal Server Error`: kind CLI error

---

### Delete Kind Cluster

**Endpoint**: `DELETE /api/kind/:name`  
**Description**: Delete existing Kind cluster

**Parameters**:

- `name` (path): Cluster name

**Response**:

```json
{
  "success": true,
  "message": "Cluster 'dev-cluster' deleted successfully"
}
```

**Status Codes**:

- `200 OK`: Cluster deleted
- `404 Not Found`: Cluster not found
- `500 Internal Server Error`: kind CLI error

---

## Tools API

### Check Tool Status

**Endpoint**: `GET /api/tools/status`  
**Description**: Check availability of required CLI tools

**Response**:

```json
{
  "kubectl": {
    "installed": true,
    "version": "v1.27.0",
    "path": "/usr/local/bin/kubectl"
  },
  "kind": {
    "installed": true,
    "version": "v0.20.0",
    "path": "/usr/local/bin/kind"
  },
  "docker": {
    "installed": true,
    "version": "24.0.5",
    "path": "/usr/local/bin/docker"
  }
}
```

**Status Codes**:

- `200 OK`: Success

---

## Health Check API

### Readiness Probe

**Endpoint**: `GET /readyz`  
**Description**: Kubernetes readiness probe

**Response**:

```json
{
  "status": "ready",
  "checks": {
    "server": "ok",
    "kubeconfig": "ok"
  }
}
```

**Status Codes**:

- `200 OK`: Ready
- `503 Service Unavailable`: Not ready

---

### Liveness Probe

**Endpoint**: `GET /healthz`  
**Description**: Kubernetes liveness probe

**Response**:

```json
{
  "status": "healthy",
  "uptime": 3600
}
```

**Status Codes**:

- `200 OK`: Healthy
- `503 Service Unavailable`: Unhealthy

---

## Error Responses

### Standard Error Format

```json
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Pod 'nginx-abc123' not found in namespace 'default'",
    "details": {
      "context": "kind-dev",
      "namespace": "default",
      "pod": "nginx-abc123"
    }
  }
}
```

### Error Codes

- `CONTEXT_NOT_FOUND`: Kubernetes context not found in kubeconfig
- `RESOURCE_NOT_FOUND`: Resource (pod, node, service) not found
- `INVALID_YAML`: YAML syntax or schema validation failed
- `PERMISSION_DENIED`: RBAC permissions insufficient
- `KUBECTL_ERROR`: kubectl command execution failed
- `K8S_API_ERROR`: Kubernetes API returned error
- `STREAM_ERROR`: Log streaming connection failed

---

## Rate Limiting

**Current**: No rate limiting implemented

**Future**: 100 requests/minute per IP

---

## WebSocket API (Future)

### Real-time Updates

**Endpoint**: `ws://localhost:3000/ws`  
**Description**: WebSocket for bidirectional real-time communication

**Events**:

- `resource:created`
- `resource:updated`
- `resource:deleted`
- `metrics:update`

**Example**:

```javascript
const ws = new WebSocket("ws://localhost:3000/ws");

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === "resource:created") {
    console.log("New resource:", data.resource);
  }
};
```

---

## API Versioning

**Current**: No versioning (v1 implied)

**Future**: `/api/v1/clusters`, `/api/v2/clusters`

---

## CORS Configuration

**Current**: Allows all origins (development)

**Production**: Restrict to specific domains

```javascript
const corsOptions = {
  origin: ["https://k8s-control.example.com"],
  credentials: true,
};
app.use(cors(corsOptions));
```

---

## Request/Response Examples

### cURL Examples

**List clusters**:

```bash
curl http://localhost:3000/api/clusters
```

**Get cluster resources**:

```bash
curl http://localhost:3000/api/clusters/kind-dev/resources
```

**Stream logs (SSE)**:

```bash
curl -N http://localhost:3000/api/logs/kind-dev/default/nginx-pod/stream?container=nginx
```

**Execute command**:

```bash
curl -X POST http://localhost:3000/api/logs/kind-dev/default/nginx-pod/exec \
  -H "Content-Type: application/json" \
  -d '{"container":"nginx","command":["ls","-la"]}'
```

**Get manifest**:

```bash
curl http://localhost:3000/api/manifests/kind-dev/pod/default/nginx-abc123
```

**Apply manifest**:

```bash
curl -X POST http://localhost:3000/api/manifests/apply \
  -H "Content-Type: application/json" \
  -d '{"context":"kind-dev","yamlContent":"apiVersion: v1\nkind: Pod\n..."}'
```

### JavaScript Fetch Examples

**List clusters**:

```javascript
const clusters = await fetch("/api/clusters").then((r) => r.json());
```

**Stream logs (SSE)**:

```javascript
const eventSource = new EventSource(
  "/api/logs/kind-dev/default/nginx-pod/stream?container=nginx&follow=true",
);
eventSource.addEventListener("log", (e) => {
  console.log(e.data);
});
```

**Apply manifest**:

```javascript
const result = await fetch("/api/manifests/apply", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    context: "kind-dev",
    yamlContent: "...",
  }),
}).then((r) => r.json());
```

---

## SDK (Future)

JavaScript/TypeScript SDK for easier integration:

```javascript
import { K8sClusterControl } from "k8s-cluster-control-sdk";

const client = new K8sClusterControl("http://localhost:3000");

// List clusters
const clusters = await client.clusters.list();

// Stream logs
client.logs.stream("kind-dev", "default", "nginx-pod", {
  container: "nginx",
  onLog: (line) => console.log(line),
  onError: (err) => console.error(err),
});

// Apply manifest
await client.manifests.apply("kind-dev", yamlContent);
```
