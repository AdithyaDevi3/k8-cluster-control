const { execCommand } = require('../utils/exec');

const requiredTools = [
  { name: 'kubectl', command: 'kubectl version --client --short' },
  { name: 'kind', command: 'kind version' },
  { name: 'docker', command: 'docker version --format "{{.Server.Version}}"' }
];

async function getToolStatus() {
  const checks = await Promise.all(
    requiredTools.map(async (tool) => {
      const result = await execCommand(tool.command);
      return {
        name: tool.name,
        installed: result.success,
        version: result.success ? result.output : null,
        error: result.success ? null : result.output
      };
    })
  );

  return {
    timestamp: new Date().toISOString(),
    tools: checks
  };
}

module.exports = { getToolStatus };
