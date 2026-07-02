const { execCommand } = require('../utils/exec');

async function runKubectlCommand(context, command) {
  const kubectlCommand = `kubectl --context ${context} ${command}`;
  const result = await execCommand(kubectlCommand);
  if (!result.success) {
    return {
      command: kubectlCommand,
      success: false,
      output: result.output,
      note: 'kubectl is not available or context is not configured. Install kubectl and configure the named context to use live cluster operations.'
    };
  }
  return {
    command: kubectlCommand,
    success: true,
    output: result.output
  };
}

async function applyManifest(context, manifest) {
  const kubectlCommand = `kubectl --context ${context} apply -f -`;
  const result = await execCommand(kubectlCommand, { stdin: manifest });
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
    output: result.output
  };
}

module.exports = {
  runKubectlCommand,
  applyManifest
};
