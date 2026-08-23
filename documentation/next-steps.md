# Next Steps - k8-cluster-control

This document captures the remaining roadmap work and the changes needed before those items can be considered complete.

## Current State

- The codebase already includes the short-term and mid-term feature slices that were built in the current workstream.
- The remaining roadmap items in the task list are still marked as incomplete.
- Some documentation and status tracking may lag behind the actual implementation state, so roadmap metadata should be reconciled before the next release push.

## Remaining Roadmap Items

### 1. Filters and Search Functionality

**What still needs to be done**:

- Confirm the UI search experience is fully wired into the cluster list and object rendering flow.
- Verify search state survives cluster changes and refreshes.
- Decide whether filtering should also affect the 3D topology view, detail panels, or only the list view.

**Adjustments required**:

- If the branch uses manual DOM updates, keep filter state centralized in the main UI controller.
- If future work adds server-side search, define the API contract first so the frontend does not hardcode local-only filtering.
- Add tests for search behavior once the expected UX is finalized.

### 2. Cluster Operations

**What still needs to be done**:

- Confirm direct execution paths for scale, cordon, drain, and delete are exposed in the UI where intended.
- Add safety gates if destructive actions need extra confirmation or role-based access checks.
- Add any missing API hooks if operations should become asynchronous or emit progress events.

**Adjustments required**:

- If commands are generated from prompts, keep the command-building logic isolated from UI rendering.
- If the operations need RBAC or impersonation support, inject the required cluster identity/context before execution.
- Add regression tests for command construction and confirmation handling.

### 3. Service and Network Topology Visualizations

**What still needs to be done**:

- Validate the topology view against real service selectors and pod labels in a live cluster.
- Decide whether the graph should remain a lightweight summary or become an interactive diagram.
- Confirm how many nodes/edges should be displayed before the panel becomes too dense.

**Adjustments required**:

- If the graph is derived from fetched cluster objects, keep the object-fetch shape stable across frontend and backend.
- If topology needs live refresh or cluster-watch integration, wire the refresh source first so the visualization does not drift.
- Add visual and data-level tests for topology matching and edge creation.

## Cross-Cutting Follow-Ups

### Documentation Sync

- Update roadmap/status docs whenever a feature slice is merged.
- Reconcile any stale todo lists so they reflect the code that is already in the branch.

### Test Coverage

- Add unit tests for command builders and data transforms.
- Add integration or browser tests for the remaining UI workflows once the UX is stable.

### Configuration and Injection

- If future work requires secret injection, cluster credentials, or Vault-backed settings, define the injection point before implementation begins.
- Keep environment-specific values out of UI code; pass them through configuration or server-side context.

## Recommended Next Action

Before starting the next feature branch, confirm which of the remaining roadmap items is the highest priority and whether it needs any of the following:

- API changes
- Vault or secret injection
- RBAC/identity adjustments
- Automated test coverage
- Documentation updates

Once that is clear, branch from the latest clean tip and implement only that slice.