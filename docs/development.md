# Development Guide

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Install local tools on macOS:
   ```bash
   ./install.sh
   ```

## Run

Start the development server:

```bash
npm run dev
```

Then open `http://localhost:3000`.

## Editing

- Backend files live under `src/server/`.
- Frontend files live under `public/js/` and `public/css/`.
- The primary frontend entrypoint is `public/index.html`.

## Updating code

- Add new API routes in `src/server/routes/`.
- Add business logic in `src/server/services/`.
- Add shared helpers in `src/server/utils/`.
- Add new frontend modules in `public/js/`.

## Validation

- Test the app by running `npm run dev` and verifying the browser UI.
- Use the browser console for frontend errors.
- Use terminal logs for backend diagnostics.
