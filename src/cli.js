const fs = require('node:fs/promises');
const path = require('node:path');
const { getClusters, getClusterById } = require('./server/services/clusterService');
const { getToolStatus } = require('./server/services/toolService');
const { interpretCommand } = require('./server/services/commandInterpreter');
const { runKubectlCommand } = require('./server/services/kubectlService');

async function runCli(argv) {
  const parsed = parseArgs(argv);

  if (parsed.help || !parsed.command) {
    printHelp();
    return;
  }

  if (parsed.command === 'clusters') {
    return handleClusters(parsed);
  }

  if (parsed.command === 'tools') {
    return handleTools(parsed);
  }

  if (parsed.command === 'interpret') {
    return handleInterpret(parsed);
  }

  if (parsed.command === 'kubectl' || parsed.command === 'command') {
    return handleKubectl(parsed);
  }

  if (parsed.command === 'apply') {
    return handleApply(parsed);
  }

  throw new Error(`Unknown command: ${parsed.command}`);
}

async function handleClusters(parsed) {
  const clusters = getClusters().map((cluster) => ({
    id: cluster.id,
    name: cluster.name,
    region: cluster.region,
    status: cluster.status,
    context: cluster.kubeContext,
    description: cluster.description
  }));

  printOutput(parsed.json, clusters, () => {
    const rows = clusters.map((cluster) => [cluster.id, cluster.name, cluster.region, cluster.status, cluster.context]);
    printTable(['ID', 'Name', 'Region', 'Status', 'Context'], rows);
  });
}

async function handleTools(parsed) {
  const status = await getToolStatus();
  printOutput(parsed.json, status, () => {
    console.log(`Tool check at ${status.timestamp}`);
    for (const tool of status.tools) {
      const state = tool.installed ? 'installed' : 'missing';
      console.log(`${tool.name}: ${state}${tool.version ? ` (${tool.version})` : ''}`);
      if (!tool.installed && tool.error) {
        console.log(`  ${tool.error}`);
      }
    }
  });
}

async function handleInterpret(parsed) {
  const request = parsed.args.join(' ').trim();
  const adjustments = {
    resource: parsed.options.resource,
    name: parsed.options.name,
    namespace: parsed.options.namespace,
    replicas: parsed.options.replicas !== undefined ? Number(parsed.options.replicas) : undefined,
    allNamespaces: parsed.options.allNamespaces
  };

  const result = interpretCommand(request, adjustments);
  printOutput(parsed.json, result, () => {
    console.log(result.explanation);
    if (result.command) {
      console.log(result.command);
    }
    if (result.status === 'needs_clarification' && result.questions.length) {
      console.log('Questions:');
      for (const question of result.questions) {
        const options = question.options.length ? ` [${question.options.join(', ')}]` : '';
        console.log(`- ${question.field}: ${question.prompt}${options}`);
      }
    }
  });
}

async function handleKubectl(parsed) {
  const cluster = resolveCluster(parsed.options.cluster);
  const command = parsed.args.join(' ').trim();
  if (!command) {
    throw new Error('A kubectl command is required. Example: kubectl get pods');
  }

  const result = await runKubectlCommand(cluster.kubeContext, command, {
    confirmed: Boolean(parsed.options.confirmed),
    dryRun: Boolean(parsed.options.dryRun)
  });

  printOutput(parsed.json, result, () => {
    console.log(`Cluster: ${cluster.name} (${cluster.kubeContext})`);
    console.log(`Command: ${result.command}`);
    console.log(`Risk: ${result.risk}`);
    if (result.confirmationRequired) {
      console.log('Confirmation required: rerun with --confirmed to execute changes.');
    }
    if (result.note) {
      console.log(result.note);
    }
    if (result.output) {
      console.log(result.output);
    }
  });
}

async function handleApply(parsed) {
  const cluster = resolveCluster(parsed.options.cluster);
  const filePath = parsed.args[0];
  if (!filePath) {
    throw new Error('A manifest file path is required. Example: apply ./manifests/app.yaml');
  }

  const manifestPath = path.resolve(process.cwd(), filePath);
  const manifest = await fs.readFile(manifestPath, 'utf8');

  const { spawnCommand } = require('./server/utils/exec');
  const args = ['--context', cluster.kubeContext, 'apply', '-f', '-'];
  if (!parsed.options.confirmed) {
    const preview = {
      command: `kubectl ${args.join(' ')}`,
      success: false,
      output: 'Applying a manifest changes cluster state and requires explicit confirmation.',
      confirmationRequired: true,
      risk: 'write',
      dryRun: Boolean(parsed.options.dryRun)
    };

    printOutput(parsed.json, preview, () => {
      console.log(`Cluster: ${cluster.name} (${cluster.kubeContext})`);
      console.log('Confirmation required: rerun with --confirmed to apply the manifest.');
      console.log(preview.output);
    });
    return;
  }

  if (parsed.options.dryRun) args.push('--dry-run=server');
  const applyResult = await spawnCommand('kubectl', args, { stdin: manifest });
  const output = {
    command: `kubectl ${args.join(' ')}`,
    success: applyResult.success,
    risk: 'write',
    dryRun: Boolean(parsed.options.dryRun),
    output: applyResult.output
  };

  printOutput(parsed.json, output, () => {
    console.log(`Cluster: ${cluster.name} (${cluster.kubeContext})`);
    console.log(output.command);
    console.log(output.output);
  });
}

function resolveCluster(clusterId) {
  const cluster = getClusterById(clusterId || 'alpha');
  if (!cluster) {
    const available = getClusters().map((item) => item.id).join(', ');
    throw new Error(`Unknown cluster: ${clusterId}. Available clusters: ${available}`);
  }
  return cluster;
}

function parseArgs(argv) {
  const result = {
    command: null,
    args: [],
    options: {
      cluster: 'alpha'
    },
    json: false,
    help: false
  };

  let index = 0;
  while (index < argv.length) {
    const token = argv[index];

    if (!result.command && !token.startsWith('-')) {
      result.command = token;
      index += 1;
      continue;
    }

    if (token === '-h' || token === '--help') {
      result.help = true;
      index += 1;
      continue;
    }

    if (token === '--json') {
      result.json = true;
      index += 1;
      continue;
    }

    if (token === '--confirmed') {
      result.options.confirmed = true;
      index += 1;
      continue;
    }

    if (token === '--dry-run') {
      result.options.dryRun = true;
      index += 1;
      continue;
    }

    if (token === '--all-namespaces') {
      result.options.allNamespaces = true;
      index += 1;
      continue;
    }

    const next = argv[index + 1];
    if (token === '--cluster' && next) {
      result.options.cluster = next;
      index += 2;
      continue;
    }
    if (token.startsWith('--cluster=')) {
      result.options.cluster = token.slice('--cluster='.length);
      index += 1;
      continue;
    }

    if (token === '--namespace' && next) {
      result.options.namespace = next;
      index += 2;
      continue;
    }
    if (token.startsWith('--namespace=')) {
      result.options.namespace = token.slice('--namespace='.length);
      index += 1;
      continue;
    }

    if (token === '--resource' && next) {
      result.options.resource = next;
      index += 2;
      continue;
    }
    if (token.startsWith('--resource=')) {
      result.options.resource = token.slice('--resource='.length);
      index += 1;
      continue;
    }

    if (token === '--name' && next) {
      result.options.name = next;
      index += 2;
      continue;
    }
    if (token.startsWith('--name=')) {
      result.options.name = token.slice('--name='.length);
      index += 1;
      continue;
    }

    if (token === '--replicas' && next) {
      result.options.replicas = next;
      index += 2;
      continue;
    }
    if (token.startsWith('--replicas=')) {
      result.options.replicas = token.slice('--replicas='.length);
      index += 1;
      continue;
    }

    result.args.push(token);
    index += 1;
  }

  return result;
}

function printOutput(asJson, value, printReadable) {
  if (asJson) {
    console.log(JSON.stringify(value, null, 2));
    return;
  }

  printReadable();
}

function printTable(headers, rows) {
  const widths = headers.map((header, index) => Math.max(header.length, ...rows.map((row) => String(row[index] ?? '').length)));
  const formatRow = (row) => row.map((cell, index) => String(cell ?? '').padEnd(widths[index])).join('  ');
  console.log(formatRow(headers));
  console.log(widths.map((width) => '-'.repeat(width)).join('  '));
  for (const row of rows) {
    console.log(formatRow(row));
  }
}

function printHelp() {
  console.log(`k8-cluster-control CLI\n\nUsage:\n  k8-cluster-control <command> [options]\n\nCommands:\n  clusters                List known clusters\n  tools                   Check kubectl, kind, and docker\n  interpret <request>     Turn English into a kubectl command\n  kubectl <args...>       Run a kubectl command against a cluster context\n  command <args...>       Alias for kubectl\n  apply <file>            Apply a manifest file to the selected cluster\n\nOptions:\n  --cluster <id>          Select cluster id (default: alpha)\n  --json                  Print machine-readable JSON\n  --confirmed             Confirm a state-changing kubectl command\n  --dry-run               Add server-side dry run when supported\n  --namespace <name>      Override namespace for interpret/kubectl flows\n  --resource <type>       Override resource type for interpret flows\n  --name <name>           Override resource name for interpret flows\n  --replicas <count>      Override replica count for interpret flows\n  --all-namespaces        Interpret a read command across namespaces\n  -h, --help              Show this help text`);
}

module.exports = {
  runCli,
  parseArgs,
  resolveCluster
};