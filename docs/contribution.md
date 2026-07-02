# Contribution Guide

## Branching

- Create a feature branch for new work: `git checkout -b feature/<description>`.
- Keep changes focused and logical.
- Commit after each meaningful change.

## Code style

- Keep backend modules small and reusable.
- Keep frontend modules limited to one responsibility.
- Use clear names and avoid deeply nested callbacks.

## Pull requests

- Open a PR when the feature is ready for review.
- Include a summary of what changed, any testing performed, and any known limitations.
- Reference issues or design documents when applicable.

## Review

- Confirm the UI is functional in the browser.
- Confirm the backend routes return expected JSON.
- Confirm no runtime errors in browser console or server logs.
