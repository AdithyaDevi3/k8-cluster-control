function info(message) {
  console.log(`[server] ${message}`);
}

function error(message) {
  console.error(`[server] ${message}`);
}

module.exports = { info, error };
