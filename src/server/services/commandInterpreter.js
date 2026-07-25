const RESOURCE_ALIASES = {
  pod: 'pods',
  pods: 'pods',
  deployment: 'deployments',
  deployments: 'deployments',
  service: 'services',
  services: 'services',
  svc: 'services',
  node: 'nodes',
  nodes: 'nodes',
  namespace: 'namespaces',
  namespaces: 'namespaces'
};

const NAMESPACED_RESOURCES = new Set(['pods', 'deployments', 'services']);

function interpretCommand(input, adjustments = {}) {
  const request = String(input || '').trim();
  const normalized = request.toLowerCase().replace(/[?.!]+$/, '');

  if (!normalized) {
    return clarification(request, 'I need a Kubernetes request before I can generate a command.', [
      question('request', 'What would you like Kubernetes to do?', 'text')
    ]);
  }

  const action = detectAction(normalized);
  if (!action) {
    return unsupported(request, 'I could not map this request to a supported Kubernetes operation. Try list, describe, logs, scale, restart, or delete.');
  }

  const resource = normalizeResource(adjustments.resource) || detectResource(normalized, action);
  const namespace = detectNamespace(normalized);
  const name = cleanValue(adjustments.name) || detectResourceName(normalized, action, resource);
  const intent = {
    action,
    resource,
    name,
    namespace: cleanValue(adjustments.namespace) || namespace.value,
    allNamespaces: adjustments.allNamespaces === true || namespace.all
  };
  const questions = [];

  if (!resource && action !== 'logs') {
    questions.push(question('resource', 'Which Kubernetes resource type should I target?', 'select', ['pods', 'deployments', 'services', 'nodes', 'namespaces']));
  }

  if (['describe', 'logs', 'scale', 'restart', 'delete'].includes(action) && !name) {
    questions.push(question('name', `Which ${singular(resource || 'resource')} should I target?`, 'text'));
  }

  if (action === 'scale') {
    intent.resource = resource || 'deployments';
    intent.replicas = parseReplicaCount(adjustments.replicas) ?? detectReplicaCount(normalized);
    if (intent.replicas === null) {
      questions.push(question('replicas', 'How many replicas should the deployment have?', 'number'));
    }
  }

  if (action === 'restart') {
    intent.resource = resource || 'deployments';
  }

  if (action === 'logs') {
    intent.resource = 'pods';
    intent.follow = /\b(follow|stream|live)\b/.test(normalized);
  }

  if (questions.length) {
    return clarification(request, buildMissingMessage(action, questions), questions, intent);
  }

  const args = buildArgs(intent);
  const risk = getRisk(action);
  return {
    status: 'ready',
    request,
    intent,
    command: `kubectl ${args.join(' ')}`,
    args,
    explanation: explain(intent),
    risk,
    requiresConfirmation: risk !== 'read',
    dryRunSupported: ['scale', 'delete'].includes(action),
    questions: []
  };
}

function normalizeResource(value) {
  return RESOURCE_ALIASES[String(value || '').toLowerCase()] || null;
}

function cleanValue(value) {
  const cleaned = String(value || '').trim().toLowerCase();
  return /^[a-z0-9][a-z0-9.-]*$/.test(cleaned) ? cleaned : null;
}

function parseReplicaCount(value) {
  if (value === undefined || value === null || value === '') return null;
  const count = Number(value);
  return Number.isInteger(count) && count >= 0 ? count : null;
}

function detectAction(text) {
  if (/\b(show|list|get|find|what|which)\b/.test(text)) return 'get';
  if (/\b(describe|inspect|details?)\b/.test(text)) return 'describe';
  if (/\b(logs?|output)\b/.test(text)) return 'logs';
  if (/\b(scale|replicas?)\b/.test(text)) return 'scale';
  if (/\b(restart|rollout restart)\b/.test(text)) return 'restart';
  if (/\b(delete|remove)\b/.test(text)) return 'delete';
  return null;
}

function detectResource(text, action) {
  if (action === 'logs') return 'pods';
  for (const [alias, resource] of Object.entries(RESOURCE_ALIASES)) {
    if (new RegExp(`\\b${alias}\\b`).test(text)) return resource;
  }
  return null;
}

function detectNamespace(text) {
  if (/\b(all namespaces|every namespace|across namespaces)\b/.test(text)) {
    return { value: null, all: true };
  }

  const match = text.match(/\b(?:in|from|within)\s+(?:the\s+)?(?:namespace\s+)?([a-z0-9][a-z0-9-]*)\b/);
  if (!match || ['cluster', 'kubernetes'].includes(match[1])) return { value: null, all: false };
  return { value: match[1], all: false };
}

function detectResourceName(text, action, resource) {
  if (action === 'get') return null;
  const resourceTerms = Object.keys(RESOURCE_ALIASES).join('|');
  const afterResource = text.match(new RegExp(`\\b(?:${resourceTerms})\\s+(?:named\\s+)?([a-z0-9][a-z0-9.-]*)\\b`));
  if (afterResource && !['in', 'from', 'within', 'to'].includes(afterResource[1])) return afterResource[1];

  const beforeResource = text.match(new RegExp(`\\b([a-z0-9][a-z0-9.-]*)\\s+(?:${resourceTerms})\\b`));
  if (beforeResource && !['the', 'a', 'an'].includes(beforeResource[1])) return beforeResource[1];

  if (action === 'logs') {
    const logsMatch = text.match(/\blogs?\s+(?:for|of|from)\s+(?:pod\s+)?([a-z0-9][a-z0-9.-]*)\b/);
    if (logsMatch) return logsMatch[1];
  }
  return null;
}

function detectReplicaCount(text) {
  const match = text.match(/(?:to|at|=)\s*(\d+)\s*(?:replicas?)?\b|\b(\d+)\s+replicas?\b/);
  return match ? Number(match[1] || match[2]) : null;
}

function buildArgs(intent) {
  const args = [];
  if (intent.action === 'restart') {
    args.push('rollout', 'restart', `${singular(intent.resource)}/${intent.name}`);
  } else if (intent.action === 'scale') {
    args.push('scale', `${singular(intent.resource)}/${intent.name}`, `--replicas=${intent.replicas}`);
  } else if (intent.action === 'logs') {
    args.push('logs', intent.name);
    if (intent.follow) args.push('--follow');
  } else {
    args.push(intent.action, intent.resource);
    if (intent.name) args.push(intent.name);
  }

  if (intent.allNamespaces && intent.action === 'get' && NAMESPACED_RESOURCES.has(intent.resource)) {
    args.push('--all-namespaces');
  } else if (intent.namespace && NAMESPACED_RESOURCES.has(intent.resource)) {
    args.push('--namespace', intent.namespace);
  }
  return args;
}

function explain(intent) {
  const target = intent.name ? `${singular(intent.resource)} “${intent.name}”` : intent.resource;
  const scope = intent.allNamespaces ? ' across all namespaces' : intent.namespace ? ` in namespace “${intent.namespace}”` : '';
  if (intent.action === 'scale') return `Scale ${target} to ${intent.replicas} replicas${scope}.`;
  if (intent.action === 'restart') return `Trigger a rolling restart of ${target}${scope}.`;
  if (intent.action === 'logs') return `${intent.follow ? 'Stream' : 'Read'} logs from ${target}${scope}.`;
  return `${capitalize(intent.action)} ${target}${scope}.`;
}

function buildMissingMessage(action, questions) {
  const fields = questions.map((item) => item.field).join(' and ');
  return `I recognized a ${action} operation, but I need the ${fields} before I can generate a precise command.`;
}

function clarification(request, message, questions, intent = null) {
  return { status: 'needs_clarification', request, intent, command: null, args: [], explanation: message, risk: 'unknown', requiresConfirmation: false, dryRunSupported: false, questions };
}

function unsupported(request, message) {
  return { status: 'unsupported', request, intent: null, command: null, args: [], explanation: message, risk: 'unknown', requiresConfirmation: false, dryRunSupported: false, questions: [] };
}

function question(field, prompt, type, options = []) {
  return { field, prompt, type, options };
}

function getRisk(action) {
  if (['get', 'describe', 'logs'].includes(action)) return 'read';
  if (['scale', 'restart'].includes(action)) return 'write';
  return 'destructive';
}

function singular(resource) {
  if (!resource) return 'resource';
  return resource === 'services' ? 'service' : resource.replace(/s$/, '');
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

module.exports = { interpretCommand };