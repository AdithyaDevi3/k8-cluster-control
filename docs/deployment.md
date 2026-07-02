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

- Ensure `kubectl` is available in the runtime environment.
- Mount kubeconfig if you want the server to access real clusters.
- Use an upstream reverse proxy or load balancer for TLS and routing.
