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
- `POST /api/clusters/:clusterId/interpret` - translate English into structured intent and `kubectl` syntax
- `POST /api/clusters/:clusterId/command` - validate and execute an approved `kubectl` command
- `POST /api/clusters/:clusterId/apply` - apply a confirmed YAML manifest via `kubectl`
- `GET /api/clusters/:clusterId/history` - read recent interpretation and execution activity
- `GET /api/tools/status` - check local tool availability
- `GET /healthz` and `GET /readyz` - container health probes

`commandInterpreter.js` converts supported English requests into structured intent. Incomplete requests return typed clarification questions instead of guessed commands. `kubectlService.js` tokenizes editable previews, rejects shell operators and context overrides, classifies risk, and executes `kubectl` with argument arrays rather than a shell. `auditService.js` retains the latest 100 events in memory.

State-changing and destructive commands return `409 Conflict` until the caller resubmits with `confirmed: true`. Commands that support server-side dry-run accept `dryRun: true`.

## Frontend

The browser UI is driven from `public/index.html` and `public/js/main.js`.

- `public/js/renderer.js` builds a galaxy-style 3D view using Three.js.
- `public/js/ui.js` manages cluster rendering, command APIs, and activity history.
- The command workstation displays interpretation, risk, target context, clarification controls, editable syntax, dry-run state, and terminal output.

The UI is designed for easy extension with more advanced cluster visualizations and object interactions.
