/**
 * Layout service for positioning Kubernetes objects in 3D space.
 * Provides various layout strategies for optimal visualization.
 */

/**
 * Scatter layout - distributes objects evenly across the available space
 * Uses Poisson disc sampling for natural-looking distribution
 * @param {Array} objects - Array of objects to position
 * @param {Object} options - Layout options
 * @returns {Array} - Objects with x, y coordinates
 */
function applyScatterLayout(objects, options = {}) {
  const { minDistance = 0.15, maxTries = 30, bounds = 1.0 } = options;
  
  if (objects.length === 0) return objects;
  
  const positioned = [];
  const grid = new Map();
  const cellSize = minDistance / Math.sqrt(2);
  
  // Helper: Convert position to grid key
  function gridKey(x, y) {
    const gx = Math.floor(x / cellSize);
    const gy = Math.floor(y / cellSize);
    return `${gx},${gy}`;
  }
  
  // Helper: Check if position is valid (not too close to existing points)
  function isValidPosition(x, y) {
    if (Math.abs(x) > bounds || Math.abs(y) > bounds) return false;
    
    const gx = Math.floor(x / cellSize);
    const gy = Math.floor(y / cellSize);
    
    // Check neighboring cells
    for (let dx = -2; dx <= 2; dx++) {
      for (let dy = -2; dy <= 2; dy++) {
        const key = `${gx + dx},${gy + dy}`;
        const neighbor = grid.get(key);
        if (neighbor) {
          const dist = Math.sqrt((x - neighbor.x) ** 2 + (y - neighbor.y) ** 2);
          if (dist < minDistance) return false;
        }
      }
    }
    return true;
  }
  
  // Place first object at origin
  const first = { ...objects[0], x: 0, y: 0 };
  positioned.push(first);
  grid.set(gridKey(0, 0), { x: 0, y: 0 });
  
  // Place remaining objects
  for (let i = 1; i < objects.length; i++) {
    let placed = false;
    
    // Try to place near existing objects
    for (let tries = 0; tries < maxTries && !placed; tries++) {
      // Pick a random positioned object as anchor
      const anchor = positioned[Math.floor(Math.random() * positioned.length)];
      
      // Generate random position around anchor
      const angle = Math.random() * Math.PI * 2;
      const distance = minDistance + Math.random() * 0.3;
      const x = anchor.x + Math.cos(angle) * distance;
      const y = anchor.y + Math.sin(angle) * distance;
      
      if (isValidPosition(x, y)) {
        const obj = { ...objects[i], x, y };
        positioned.push(obj);
        grid.set(gridKey(x, y), { x, y });
        placed = true;
      }
    }
    
    // Fallback: place in spiral if max tries exceeded
    if (!placed) {
      const spiralAngle = i * 2.4;
      const spiralRadius = Math.sqrt(i) * 0.2;
      const x = Math.cos(spiralAngle) * spiralRadius;
      const y = Math.sin(spiralAngle) * spiralRadius;
      positioned.push({ ...objects[i], x, y });
    }
  }
  
  return positioned;
}

/**
 * Grouped layout - organizes objects by namespace and type
 * Creates visual clusters for related resources
 * @param {Array} objects - Array of objects to position
 * @param {Object} options - Layout options
 * @returns {Array} - Objects with x, y coordinates
 */
function applyGroupedLayout(objects, options = {}) {
  const { groupSpacing = 1.2, innerSpacing = 0.15 } = options;
  
  if (objects.length === 0) return objects;
  
  // Group objects by namespace
  const namespaceGroups = {};
  objects.forEach(obj => {
    const ns = obj.namespace || 'default';
    if (!namespaceGroups[ns]) {
      namespaceGroups[ns] = [];
    }
    namespaceGroups[ns].push(obj);
  });
  
  const namespaces = Object.keys(namespaceGroups);
  const positioned = [];
  
  // Position each namespace group in a circle
  namespaces.forEach((ns, nsIdx) => {
    const angle = (nsIdx / namespaces.length) * Math.PI * 2;
    const groupCenterX = Math.cos(angle) * groupSpacing;
    const groupCenterY = Math.sin(angle) * groupSpacing;
    
    const nsObjects = namespaceGroups[ns];
    
    // Within each namespace, further group by type
    const typeGroups = {};
    nsObjects.forEach(obj => {
      const type = obj.type || 'Unknown';
      if (!typeGroups[type]) {
        typeGroups[type] = [];
      }
      typeGroups[type].push(obj);
    });
    
    const types = Object.keys(typeGroups);
    
    // Position each type group in a sub-circle
    types.forEach((type, typeIdx) => {
      const typeAngle = (typeIdx / types.length) * Math.PI * 2;
      const typeCenterX = groupCenterX + Math.cos(typeAngle) * 0.4;
      const typeCenterY = groupCenterY + Math.sin(typeAngle) * 0.4;
      
      const typeObjects = typeGroups[type];
      
      // Arrange objects in the type group in a tight spiral
      typeObjects.forEach((obj, objIdx) => {
        const objAngle = objIdx * 2.4;
        const objRadius = Math.sqrt(objIdx) * innerSpacing;
        const x = typeCenterX + Math.cos(objAngle) * objRadius;
        const y = typeCenterY + Math.sin(objAngle) * objRadius;
        
        positioned.push({ ...obj, x, y });
      });
    });
  });
  
  return positioned;
}

/**
 * Radial layout - arranges objects in concentric circles
 * Useful for hierarchical visualization
 * @param {Array} objects - Array of objects to position
 * @param {Object} options - Layout options
 * @returns {Array} - Objects with x, y coordinates
 */
function applyRadialLayout(objects, options = {}) {
  const { startRadius = 0.3, radiusStep = 0.25 } = options;
  
  if (objects.length === 0) return objects;
  
  // Group by type for hierarchy
  const typeGroups = {
    Deployment: [],
    Service: [],
    Pod: [],
    Other: []
  };
  
  objects.forEach(obj => {
    const type = obj.type || 'Other';
    if (typeGroups[type]) {
      typeGroups[type].push(obj);
    } else {
      typeGroups.Other.push(obj);
    }
  });
  
  const positioned = [];
  let currentRadius = startRadius;
  
  // Order: Deployments (inner), Services, Pods, Others (outer)
  const orderedTypes = ['Deployment', 'Service', 'Pod', 'Other'];
  
  orderedTypes.forEach(type => {
    const group = typeGroups[type];
    if (group.length === 0) return;
    
    group.forEach((obj, idx) => {
      const angle = (idx / group.length) * Math.PI * 2;
      const x = Math.cos(angle) * currentRadius;
      const y = Math.sin(angle) * currentRadius;
      positioned.push({ ...obj, x, y });
    });
    
    currentRadius += radiusStep;
  });
  
  return positioned;
}

/**
 * Apply the specified layout strategy to objects
 * @param {Array} objects - Objects to layout
 * @param {string} strategy - Layout strategy: 'scatter', 'grouped', 'radial'
 * @param {Object} options - Strategy-specific options
 * @returns {Array} - Objects with x, y coordinates
 */
function applyLayout(objects, strategy = 'scatter', options = {}) {
  switch (strategy) {
    case 'grouped':
      return applyGroupedLayout(objects, options);
    case 'radial':
      return applyRadialLayout(objects, options);
    case 'scatter':
    default:
      return applyScatterLayout(objects, options);
  }
}

module.exports = {
  applyLayout,
  applyScatterLayout,
  applyGroupedLayout,
  applyRadialLayout
};
