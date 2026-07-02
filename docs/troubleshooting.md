# Troubleshooting Guide

## Common issues

### Web UI does not load

- Confirm the server is running: `npm start`.
- Confirm `http://localhost:3000` is reachable.
- Check browser console for errors.

### API requests fail

- Check server logs for error messages.
- Confirm backend routes are correct and responding.
- Confirm `src/server/index.js` is serving `public/` correctly.

### `kubectl` commands fail

- Verify `kubectl` is installed and on `PATH`.
- Verify the cluster context name exists.
- Run `kubectl config get-contexts` locally.

### Three.js rendering issues

- Confirm the browser supports WebGL.
- Confirm the `viewer` element is present in `public/index.html`.
- Check the browser console for module import or runtime errors.
