/**
 * Manifest Editor Component
 * Provides YAML editing interface with live diff preview and validation
 */

let currentContext = null;
let currentResource = null;
let originalManifest = '';
let editorContent = '';

/**
 * Initialize manifest editor for a resource
 */
async function initManifestEditor(contextName, kind, namespace, name) {
  currentContext = contextName;
  currentResource = { kind, namespace, name };
  
  // Fetch current manifest from cluster
  const response = await fetch(
    `/api/manifests/${contextName}/${kind}/${namespace}/${name}`
  );
  
  const result = await response.json();
  
  if (!result.success) {
    showError('Failed to load manifest: ' + result.error);
    return;
  }
  
  originalManifest = result.manifest;
  editorContent = originalManifest;
  
  // Show editor modal
  showManifestEditor();
  
  // Populate editor with manifest
  const editor = document.getElementById('manifest-editor');
  if (editor) {
    editor.value = editorContent;
    editor.addEventListener('input', handleEditorChange);
  }
}

/**
 * Show manifest editor modal
 */
function showManifestEditor() {
  const modal = document.getElementById('manifest-modal');
  if (!modal) {
    createManifestEditorModal();
  }
  
  document.getElementById('manifest-modal').style.display = 'flex';
  document.getElementById('manifest-diff').innerHTML = '<div class="diff-empty">Make changes to see diff preview</div>';
}

/**
 * Create manifest editor modal HTML
 */
function createManifestEditorModal() {
  const modal = document.createElement('div');
  modal.id = 'manifest-modal';
  modal.className = 'manifest-modal';
  modal.innerHTML = `
    <div class="manifest-modal-content">
      <div class="manifest-header">
        <h2>Edit Manifest</h2>
        <div class="manifest-resource-info">
          <span id="manifest-resource-name"></span>
        </div>
      </div>
      
      <div class="manifest-body">
        <div class="manifest-editor-pane">
          <div class="manifest-pane-header">
            <h3>YAML Editor</h3>
            <button id="validate-btn" class="btn-secondary">Validate</button>
          </div>
          <textarea 
            id="manifest-editor" 
            class="manifest-editor"
            spellcheck="false"
          ></textarea>
          <div id="validation-errors" class="validation-errors"></div>
        </div>
        
        <div class="manifest-diff-pane">
          <div class="manifest-pane-header">
            <h3>Diff Preview</h3>
            <button id="preview-diff-btn" class="btn-secondary">Generate Diff</button>
          </div>
          <pre id="manifest-diff" class="manifest-diff"></pre>
        </div>
      </div>
      
      <div class="manifest-footer">
        <button id="apply-manifest-btn" class="btn-primary">Apply Changes</button>
        <button id="close-manifest-btn" class="btn-secondary">Cancel</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Attach event listeners
  document.getElementById('validate-btn').addEventListener('click', validateManifest);
  document.getElementById('preview-diff-btn').addEventListener('click', previewDiff);
  document.getElementById('apply-manifest-btn').addEventListener('click', applyManifest);
  document.getElementById('close-manifest-btn').addEventListener('click', closeManifestEditor);
}

/**
 * Handle editor content changes
 */
function handleEditorChange(event) {
  editorContent = event.target.value;
  
  // Clear diff when content changes
  const diffPane = document.getElementById('manifest-diff');
  if (diffPane) {
    diffPane.innerHTML = '<div class="diff-empty">Click "Generate Diff" to preview changes</div>';
  }
}

/**
 * Validate current manifest
 */
async function validateManifest() {
  const validationErrors = document.getElementById('validation-errors');
  validationErrors.innerHTML = '<div class="validation-loading">Validating...</div>';
  
  try {
    const response = await fetch('/api/manifests/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ manifest: editorContent })
    });
    
    const result = await response.json();
    
    if (result.valid) {
      validationErrors.innerHTML = '<div class="validation-success">✓ Valid YAML - Resource: ' + 
        result.kind + '/' + result.name + ' (namespace: ' + result.namespace + ')</div>';
    } else {
      validationErrors.innerHTML = '<div class="validation-error">✗ Validation failed: ' + 
        escapeHtml(result.error) + '</div>';
    }
  } catch (error) {
    validationErrors.innerHTML = '<div class="validation-error">✗ Error: ' + escapeHtml(error.message) + '</div>';
  }
}

/**
 * Preview diff before applying
 */
async function previewDiff() {
  const diffPane = document.getElementById('manifest-diff');
  diffPane.innerHTML = '<div class="diff-loading">Generating diff...</div>';
  
  try {
    const response = await fetch('/api/manifests/diff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        contextName: currentContext,
        manifest: editorContent 
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      if (result.hasDifferences) {
        diffPane.innerHTML = '<div class="diff-content">' + 
          formatDiff(result.diff) + '</div>';
      } else {
        diffPane.innerHTML = '<div class="diff-empty">No changes detected</div>';
      }
    } else {
      diffPane.innerHTML = '<div class="diff-error">Error: ' + escapeHtml(result.error) + '</div>';
    }
  } catch (error) {
    diffPane.innerHTML = '<div class="diff-error">Error: ' + escapeHtml(error.message) + '</div>';
  }
}

/**
 * Apply manifest to cluster
 */
async function applyManifest() {
  if (!confirm('Apply these changes to the cluster?')) {
    return;
  }
  
  const applyBtn = document.getElementById('apply-manifest-btn');
  applyBtn.disabled = true;
  applyBtn.textContent = 'Applying...';
  
  try {
    const response = await fetch('/api/manifests/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        contextName: currentContext,
        manifest: editorContent,
        dryRun: false
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      showSuccess('Manifest applied successfully!');
      closeManifestEditor();
      
      // Refresh the view
      if (window.refreshCurrentView) {
        window.refreshCurrentView();
      }
    } else {
      showError('Failed to apply manifest: ' + result.error);
    }
  } catch (error) {
    showError('Error applying manifest: ' + error.message);
  } finally {
    applyBtn.disabled = false;
    applyBtn.textContent = 'Apply Changes';
  }
}

/**
 * Close manifest editor
 */
function closeManifestEditor() {
  const modal = document.getElementById('manifest-modal');
  if (modal) {
    modal.style.display = 'none';
  }
  
  // Clean up
  currentContext = null;
  currentResource = null;
  originalManifest = '';
  editorContent = '';
}

/**
 * Format diff output with syntax highlighting
 */
function formatDiff(diff) {
  return escapeHtml(diff)
    .split('\n')
    .map(line => {
      if (line.startsWith('+')) {
        return '<span class="diff-add">' + line + '</span>';
      } else if (line.startsWith('-')) {
        return '<span class="diff-remove">' + line + '</span>';
      } else if (line.startsWith('@@')) {
        return '<span class="diff-hunk">' + line + '</span>';
      }
      return line;
    })
    .join('\n');
}

/**
 * Escape HTML entities
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Show success message
 */
function showSuccess(message) {
  // Reuse existing notification system if available
  if (window.showNotification) {
    window.showNotification(message, 'success');
  } else {
    alert(message);
  }
}

/**
 * Show error message
 */
function showError(message) {
  // Reuse existing notification system if available
  if (window.showNotification) {
    window.showNotification(message, 'error');
  } else {
    alert(message);
  }
}

// Export for use in other modules
window.initManifestEditor = initManifestEditor;
