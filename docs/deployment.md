# Deployment Guide

## Container deployment

Build the Docker image:

```bash
docker build -t k8-cluster-control:latest .
```

Run with Docker:

```bash
docker run -p 3000:3000 k8-cluster-control:latest
```

## Docker Compose

Start with:

```bash
docker compose up --build
```

## Production notes

- The image includes `kubectl` and runs as the non-root `node` user.
- Mount kubeconfig if you want the server to access real clusters.
- Use an upstream reverse proxy or load balancer for TLS and routing.

## Kubernetes deployment

Build the image and make it available to the target cluster:

```bash
docker build -t k8-cluster-control:latest .
```

Install the app with read-only cluster access:

```bash
kubectl apply -f k8s/base.yaml
kubectl apply -f k8s/rbac-readonly.yaml
```

The container generates an in-cluster kubeconfig from its service-account token. Update the image reference and ingress host in `k8s/base.yaml` for the target registry and environment.

State-changing commands require both user confirmation and Kubernetes authorization. Grant the optional operator permissions only where write operations are intended:

```bash
kubectl apply -f k8s/rbac-operator.yaml
```

The operator role permits updates and deletion for core workloads. Review and narrow its resources and namespaces before production use. The default viewer role supports discovery, inspection, and logs without mutation rights.

The in-memory activity list is operational history, not durable compliance storage. Send these events to an external audit store before relying on them for regulated environments.
