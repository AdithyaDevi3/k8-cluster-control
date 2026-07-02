const { getToolStatus } = require('../services/toolService');

async function main() {
  const status = await getToolStatus();
  status.tools.forEach((tool) => {
    if (tool.installed) {
      console.log(`✔ ${tool.name}: ${tool.version}`);
    } else {
      console.log(`✖ ${tool.name}: missing (${tool.error})`);
    }
  });
}

main().catch((error) => {
  console.error('Tool status check failed:', error);
  process.exit(1);
});
