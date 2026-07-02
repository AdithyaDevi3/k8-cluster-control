const { exec } = require('child_process');

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

module.exports = { execCommand };
