function info(message) {
  console.error(`[server] ${message}`);
}

function error(message) {
  console.error(`[server] ${message}`);
}

module.exports = { info, error };
