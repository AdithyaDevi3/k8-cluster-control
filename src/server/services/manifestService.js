const k8s = require('@kubernetes/client-node');
const logger = require('../utils/logger');
const { spawnCommand } = require('../utils/exec');

/**
 * Get resource manifest from cluster using kubectl
 */
async function getResourceManifest(contextName, kind, namespace, name) {
  try {
    // Use kubectl to get clean YAML output
    const args = ['--context', contextName, 'get', kind, name, '-n', namespace, '-o', 'yaml'];
    const result = await spawnCommand('kubectl', args);
    
    if (!result.success) {
      throw new Error(result.output || 'Failed to get resource YAML');
    }
    
    return {
      success: true,
      manifest: result.output,
      resource: {
        kind,
        namespace,
        name
      }
    };
  } catch (error) {
    logger.error('Error fetching resource manifest', { 
      context: contextName, 
      kind, 
      namespace, 
      name, 
      error: error.message 
    });
    
    return {
      success: false,
      error: error.message,
      details: 'Failed to fetch resource manifest'
    };
  }
}

/**
 * Validate YAML manifest using kubectl
 */
async function validateManifest(yamlContent) {
  try {
    // Use kubectl dry-run to validate the manifest
    const args = ['apply', '--dry-run=client', '-f', '-'];
    const result = await spawnCommand('kubectl', args, { stdin: yamlContent });
    
    if (!result.success) {
      return {
        valid: false,
        error: 'Manifest validation failed',
        details: result.output
      };
    }

    // Extract basic info from the manifest using simple parsing
    const lines = yamlContent.split('\n');
    let kind = 'unknown';
    let name = 'unknown';
    let namespace = 'default';
    
    for (const line of lines) {
      if (line.startsWith('kind:')) {
        kind = line.split('kind:')[1].trim();
      }
      if (line.includes('name:') && !line.includes('namespace:')) {
        const match = line.match(/name:\s*(.+)/);
        if (match && !name.startsWith('unknown')) {
          name = match[1].trim();
        }
      }
      if (line.includes('namespace:')) {
        const match = line.match(/namespace:\s*(.+)/);
        if (match) {
          namespace = match[1].trim();
        }
      }
    }

    return {
      valid: true,
      kind,
      name,
      namespace
    };
  } catch (error) {
    logger.error('YAML validation error', { error: error.message });
    
    return {
      valid: false,
      error: error.message
    };
  }
}

/**
 * Get diff between current cluster state and manifest
 * Uses kubectl diff for accurate comparison
 */
async function diffManifest(contextName, yamlContent) {
  try {
    // First validate the manifest
    const validation = await validateManifest(yamlContent);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error
      };
    }

    // Use kubectl diff for accurate comparison
    const args = ['--context', contextName, 'diff', '-f', '-'];
    const result = await spawnCommand('kubectl', args, { stdin: yamlContent });

    // kubectl diff returns exit code 1 when there are differences
    // Exit code 0 means no differences
    // Other exit codes indicate errors
    const hasDifferences = result.exitCode === 1;
    const isError = result.exitCode > 1;

    if (isError) {
      return {
        success: false,
        error: 'kubectl diff failed',
        output: result.output
      };
    }

    return {
      success: true,
      hasDifferences,
      diff: result.output || 'No differences found',
      resource: {
        kind: validation.kind,
        name: validation.name,
        namespace: validation.namespace
      }
    };
  } catch (error) {
    logger.error('Error generating manifest diff', { 
      context: contextName, 
      error: error.message 
    });
    
    return {
      success: false,
      error: error.message,
      note: 'kubectl must be available and context configured to generate diffs'
    };
  }
}

/**
 * Apply manifest to cluster
 */
async function applyManifest(contextName, yamlContent, options = {}) {
  try {
    // First validate the manifest
    const validation = await validateManifest(yamlContent);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error
      };
    }

    // Use kubectl apply
    const args = ['--context', contextName, 'apply', '-f', '-'];
    
    // Add dry-run if requested
    if (options.dryRun) {
      args.push('--dry-run=server');
    }

    const result = await spawnCommand('kubectl', args, { stdin: yamlContent });

    if (!result.success) {
      return {
        success: false,
        error: 'kubectl apply failed',
        output: result.output,
        note: 'kubectl must be available and context configured to apply manifests'
      };
    }

    logger.info('Manifest applied successfully', {
      context: contextName,
      kind: validation.kind,
      name: validation.name,
      namespace: validation.namespace,
      dryRun: options.dryRun
    });

    return {
      success: true,
      output: result.output,
      resource: {
        kind: validation.kind,
        name: validation.name,
        namespace: validation.namespace
      },
      dryRun: Boolean(options.dryRun)
    };
  } catch (error) {
    logger.error('Error applying manifest', { 
      context: contextName, 
      error: error.message 
    });
    
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  getResourceManifest,
  validateManifest,
  diffManifest,
  applyManifest
};

  }
}

module.exports = {
  getResourceManifest,
  validateManifest,
  diffManifest,
  applyManifest
};
