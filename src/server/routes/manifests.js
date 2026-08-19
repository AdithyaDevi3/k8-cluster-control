const express = require('express');
const router = express.Router();
const manifestService = require('../services/manifestService');
const logger = require('../utils/logger');

/**
 * GET /api/manifests/:contextName/:kind/:namespace/:name
 * Get current resource manifest from cluster
 * 
 * Path params:
 *   - contextName: Kubernetes context name
 *   - kind: Resource kind (pod, deployment, service, etc.)
 *   - namespace: Resource namespace
 *   - name: Resource name
 */
router.get('/:contextName/:kind/:namespace/:name', async (req, res) => {
  try {
    const { contextName, kind, namespace, name } = req.params;
    
    logger.info('Fetching resource manifest', { 
      context: contextName, 
      kind, 
      namespace, 
      name 
    });
    
    const result = await manifestService.getResourceManifest(
      contextName,
      kind,
      namespace,
      name
    );
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(404).json(result);
    }
  } catch (error) {
    logger.error('Error in GET manifest endpoint', { error: error.message });
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * POST /api/manifests/validate
 * Validate YAML manifest syntax and structure
 * 
 * Request body:
 *   - manifest: YAML content as string
 */
router.post('/validate', async (req, res) => {
  try {
    const { manifest } = req.body;
    
    if (!manifest) {
      return res.status(400).json({ 
        valid: false,
        error: 'Missing manifest content' 
      });
    }
    
    logger.info('Validating manifest');
    
    const result = await manifestService.validateManifest(manifest);
    
    res.json(result);
  } catch (error) {
    logger.error('Error in validate manifest endpoint', { error: error.message });
    res.status(500).json({ 
      valid: false,
      error: error.message 
    });
  }
});

/**
 * POST /api/manifests/diff
 * Generate diff between current cluster state and manifest
 * 
 * Request body:
 *   - contextName: Kubernetes context name
 *   - manifest: YAML content as string
 */
router.post('/diff', async (req, res) => {
  try {
    const { contextName, manifest } = req.body;
    
    if (!contextName || !manifest) {
      return res.status(400).json({ 
        success: false,
        error: 'Missing contextName or manifest content' 
      });
    }
    
    logger.info('Generating manifest diff', { context: contextName });
    
    const result = await manifestService.diffManifest(contextName, manifest);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logger.error('Error in diff manifest endpoint', { error: error.message });
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

/**
 * POST /api/manifests/apply
 * Apply manifest to cluster
 * 
 * Request body:
 *   - contextName: Kubernetes context name
 *   - manifest: YAML content as string
 *   - dryRun: (optional) Perform dry-run apply
 */
router.post('/apply', async (req, res) => {
  try {
    const { contextName, manifest, dryRun = false } = req.body;
    
    if (!contextName || !manifest) {
      return res.status(400).json({ 
        success: false,
        error: 'Missing contextName or manifest content' 
      });
    }
    
    logger.info('Applying manifest', { 
      context: contextName, 
      dryRun 
    });
    
    const result = await manifestService.applyManifest(
      contextName, 
      manifest,
      { dryRun }
    );
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logger.error('Error in apply manifest endpoint', { error: error.message });
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

module.exports = router;
