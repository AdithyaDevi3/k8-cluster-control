const { spawnCommand } = require('../utils/exec');

const READ_ACTIONS = new Set(['get', 'describe', 'logs', 'explain', 'api-resources', 'top']);
const WRITE_ACTIONS = new Set(['apply', 'create', 'edit', 'patch', 'replace', 'scale', 'set', 'rollout', 'annotate', 'label']);
const DESTRUCTIVE_ACTIONS = new Set(['delete', 'drain', 'cordon', 'uncordon', 'taint']);

async function runKubectlCommand(context, command, options = {}) {
  let args;
  try {
    args = parseKubectlCommand(command);
  } catch (error) {
    return { command, success: false, output: error.message, validationError: true };
  }

  const risk = assessKubectlArgs(args);
  if (risk === 'unsupported') {
    return { command, success: false, output: 'This kubectl operation is not supported by the command console.', validationError: true };
  }
  if (risk !== 'read' && !options.confirmed) {
    return { command, success: false, output: 'This command changes cluster state and requires explicit confirmation.', confirmationRequired: true, risk };
  }

  if (options.dryRun && ['write', 'destructive'].includes(risk) && !args.some((arg) => arg.startsWith('--dry-run'))) {
    args.push('--dry-run=server');
  }

  const displayArgs = ['--context', context, ...args];
  const kubectlCommand = `kubectl ${displayArgs.join(' ')}`;
  const result = await spawnCommand('kubectl', displayArgs);
  if (!result.success) {
    return {
      command: kubectlCommand,
      success: false,
      output: result.output,
      risk,
      note: 'kubectl is not available or context is not configured. Install kubectl and configure the named context to use live cluster operations.'
    };
  }
  return {
    command: kubectlCommand,
    success: true,
    output: result.output,
    risk,
    dryRun: Boolean(options.dryRun)
  };
}

async function applyManifest(context, manifest, options = {}) {
  if (!options.confirmed) {
    return {
      command: `kubectl --context ${context} apply -f -`,
      success: false,
      output: 'Applying a manifest changes cluster state and requires explicit confirmation.',
      confirmationRequired: true,
      risk: 'write'
    };
  }

  const args = ['--context', context, 'apply', '-f', '-'];
  if (options.dryRun) args.push('--dry-run=server');
  const kubectlCommand = `kubectl ${args.join(' ')}`;
  const result = await spawnCommand('kubectl', args, { stdin: manifest });
  if (!result.success) {
    return {
      command: kubectlCommand,
      success: false,
      output: result.output,
      note: 'kubectl apply failed or is unavailable. The UI can still use the response to show a simulated change.'
    };
  }

  return {
    command: kubectlCommand,
    success: true,
    output: result.output,
    risk: 'write',
    dryRun: Boolean(options.dryRun)
  };
}

function parseKubectlCommand(command) {
  const input = String(command || '').trim();
  if (!input) throw new Error('Command cannot be empty.');
  if (/[;&|`$<>\n\r]/.test(input)) throw new Error('Shell operators, substitutions, redirects, and multiline commands are not allowed.');

  const args = [];
  const matcher = /"([^"\\]*(?:\\.[^"\\]*)*)"|'([^']*)'|([^\s]+)/g;
  let match;
  while ((match = matcher.exec(input)) !== null) {
    args.push((match[1] ?? match[2] ?? match[3]).replace(/\\(["\\])/g, '$1'));
  }

  if (args[0] === 'kubectl') args.shift();
  if (!args.length) throw new Error('A kubectl action is required.');
  if (args.some((arg) => arg === '--context' || arg.startsWith('--context='))) {
    throw new Error('Select the cluster context in the UI instead of overriding it in the command.');
  }
  return args;
}

function assessKubectlArgs(args) {
  const action = args.find((arg) => !arg.startsWith('-'));
  if (READ_ACTIONS.has(action)) return 'read';
  if (WRITE_ACTIONS.has(action)) return 'write';
  if (DESTRUCTIVE_ACTIONS.has(action)) return 'destructive';
  return 'unsupported';
}

module.exports = {
  runKubectlCommand,
  applyManifest,
  parseKubectlCommand,
  assessKubectlArgs
};
