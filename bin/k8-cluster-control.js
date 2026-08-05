#!/usr/bin/env node
require('../src/cli').runCli(process.argv.slice(2)).catch((error) => {
  const message = error && error.stack ? error.stack : String(error);
  console.error(message);
  process.exitCode = 1;
});