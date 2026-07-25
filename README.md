# K8 Cluster Control

A modular Kubernetes operating platform for immersive infrastructure visualization, interactive cluster controls, and live command execution.

## Overview

This repository combines a lightweight Node.js backend with a browser-based 3D visualization frontend that renders cluster topology, worker nodes, pods, and resource dependencies as a navigable galaxy.

The app is built to be extensible and production-ready:

- Structured server code with route and service modules
- Browser 3D renderer using Three.js for scalable cluster exploration
- Interactive English-to-`kubectl` command generation with guided clarification
- Editable command previews, risk classification, dry-run support, and explicit confirmation
- API endpoints for command interpretation, execution, activity history, and manifest apply
- Comprehensive documentation and workflow guidance in `docs/`

## Quick start

```bash
npm install
./install.sh
npm start
```

Then open `http://localhost:3000`.

## Development

Run the app in development mode:

```bash
npm run dev
```

That starts the backend server and serves the frontend app for fast editing.

## Repository structure

- `server.js` – application entrypoint
- `src/server/` – Express app, routers, services, and helpers
- `public/` – browser UI, static assets, and Three.js renderer
- `docs/` – architecture, deployment, troubleshooting, and roadmap

## What works today

- Visual 3D cluster galaxy with ring and pod/worker representations
- Cluster selection and interactive object picking
- Deterministic English interpretation for get, describe, logs, scale, restart, and delete operations
- Guided adjustments when resource names, types, or replica counts are missing
- Safe argument-based `kubectl` execution without a shell
- Read/write/destructive risk classification and server-enforced confirmation
- Bounded in-memory command activity history
- Live command execution through `kubectl` if installed
- Kubernetes deployment, health probes, in-cluster authentication, and opt-in operator RBAC
- Tool discovery for Docker, Kind, and `kubectl`

## Future direction

See `docs/roadmap.md` for a full list of planned features.
