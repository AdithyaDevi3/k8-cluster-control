const { exec, spawn } = require('child_process');

function execCommand(command, options = {}) {
  return new Promise((resolve) => {
    const child = exec(command, { timeout: 20000 }, (error, stdout, stderr) => {
      const output = stdout?.trim() || stderr?.trim() || (error && error.message) || '';
      resolve({ success: !error, output });
    });

    if (options.stdin && child.stdin) {
      child.stdin.write(options.stdin);
      child.stdin.end();
    }
  });
}

function spawnCommand(command, args = [], options = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      timeout: options.timeout || 20000,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', (error) => {
      resolve({ success: false, output: error.message, exitCode: null });
    });
    child.on('close', (exitCode) => {
      resolve({
        success: exitCode === 0,
        output: stdout.trim() || stderr.trim(),
        exitCode
      });
    });

    if (options.stdin && child.stdin) child.stdin.write(options.stdin);
    if (child.stdin) child.stdin.end();
  });
}

module.exports = { execCommand, spawnCommand };
