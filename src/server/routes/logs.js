const express = require('express');
const router = express.Router();
const logsService = require('../services/logsService');
const logger = require('../utils/logger');

/**
 * GET /api/logs/:contextName/:namespace/:podName/containers
 * Get available containers for a pod
 */
router.get('/:contextName/:namespace/:podName/containers', async (req, res) => {
  try {
    const { contextName, namespace, podName } = req.params;
    const containers = await logsService.getPodContainers(contextName, namespace, podName);
    res.json({ containers });
  } catch (error) {
    logger.error('Error fetching pod containers', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/logs/:contextName/:namespace/:podName/stream
 * Stream pod logs using Server-Sent Events
 * Query params:
 *   - container: Container name (optional, first container if not specified)
 *   - follow: Follow logs (default: false)
 *   - tailLines: Number of lines to tail (default: 500)
 *   - timestamps: Include timestamps (default: true)
 *   - previous: Show previous terminated container logs (default: false)
 */
router.get('/:contextName/:namespace/:podName/stream', async (req, res) => {
  const { contextName, namespace, podName } = req.params;
  const {
    container = null,
    follow = 'false',
    tailLines = '500',
    timestamps = 'true',
    previous = 'false'
  } = req.query;

  // Set headers for Server-Sent Events
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
  
  // Send initial connection event
  res.write('event: connected\n');
  res.write('data: {"status":"connected"}\n\n');

  const options = {
    container,
    follow: follow === 'true',
    tailLines: parseInt(tailLines, 10),
    timestamps: timestamps === 'true',
    previous: previous === 'true'
  };

  try {
    const stream = await logsService.streamPodLogs(
      contextName,
      namespace,
      podName,
      options
    );

    // Forward log data to client
    stream.on('data', (chunk) => {
      const lines = chunk.toString().split('\n').filter(line => line.trim());
      lines.forEach(line => {
        res.write('event: log\n');
        res.write(`data: ${JSON.stringify({ line })}\n\n`);
      });
    });

    stream.on('error', (error) => {
      logger.error('Stream error', { error: error.message });
      res.write('event: error\n');
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    });

    stream.on('end', () => {
      res.write('event: end\n');
      res.write('data: {"status":"stream ended"}\n\n');
      res.end();
    });

    // Handle client disconnect
    req.on('close', () => {
      logger.info('Client disconnected from log stream', { podName });
      stream.destroy();
    });

  } catch (error) {
    logger.error('Error initializing log stream', { error: error.message });
    res.write('event: error\n');
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
});

/**
 * POST /api/logs/:contextName/:namespace/:podName/exec
 * Execute a command in a pod container
 * Body:
 *   - container: Container name
 *   - command: Array of command parts (e.g., ["sh", "-c", "ls -la"])
 */
router.post('/:contextName/:namespace/:podName/exec', async (req, res) => {
  try {
    const { contextName, namespace, podName } = req.params;
    const { container, command } = req.body;

    if (!container || !command || !Array.isArray(command)) {
      return res.status(400).json({
        error: 'Missing or invalid required fields: container and command (array)'
      });
    }

    const result = await logsService.execInPod(
      contextName,
      namespace,
      podName,
      container,
      command
    );

    res.json(result);
  } catch (error) {
    logger.error('Error executing command in pod', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
