# Architecture Guide

## Overview

`k8-cluster-control` is built as a modular Node.js application with a browser-based 3D frontend.

- `server.js` boots the backend via `src/server/index.js`.
- `src/server/routes/` contains API route definitions.
- `src/server/services/` encapsulates business logic for clusters, Kubernetes commands, and tool discovery.
- `src/server/utils/` provides small shared helpers.
- `public/` hosts the frontend UI.
- `public/js/` contains the 3D galaxy renderer and UI glue.
- `public/css/` contains shared styles.

## Backend

The backend exposes these endpoints:

- `GET /api/clusters` - list available clusters
- `POST /api/clusters/:clusterId/connect` - connect to a cluster (demo only)
- `GET /api/clusters/:clusterId/objects` - get cluster objects like pods and services
- `POST /api/clusters/:clusterId/command` - execute a `kubectl` command against the cluster
- `POST /api/clusters/:clusterId/apply` - apply a YAML manifest via `kubectl`
- `GET /api/tools/status` - check local tool availability

Tool discovery is handled by `src/server/services/toolService.js`. Kubernetes command execution uses `src/server/services/kubectlService.js` with a shared `execCommand` wrapper.

## Frontend

The browser UI is driven from `public/index.html` and `public/js/main.js`.

- `public/js/renderer.js` builds a galaxy-style 3D view using Three.js.
- `public/js/ui.js` manages cluster list rendering, details panels, and command flows.

The UI is designed for easy extension with more advanced cluster visualizations and object interactions.
