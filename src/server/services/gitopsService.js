const { execCommand } = require('../utils/exec');

function parseBranchStatus(statusOutput) {
  const lines = String(statusOutput || '').split('\n').map((line) => line.trim()).filter(Boolean);
  const branchLine = lines.find((line) => line.startsWith('## ')) || '## unknown';
  const branchMatch = branchLine.match(/^##\s+([^\.]+)(?:\.\.\.(\S+))?(?:\s+\[(.*)\])?$/);

  const branch = branchMatch?.[1] || 'unknown';
  const upstream = branchMatch?.[2] || null;
  const marker = branchMatch?.[3] || '';
  const aheadMatch = marker.match(/ahead\s+(\d+)/);
  const behindMatch = marker.match(/behind\s+(\d+)/);

  const dirtyFiles = lines.filter((line) => !line.startsWith('## '));
  return {
    branch,
    upstream,
    ahead: aheadMatch ? Number(aheadMatch[1]) : 0,
    behind: behindMatch ? Number(behindMatch[1]) : 0,
    dirtyFiles,
    clean: dirtyFiles.length === 0
  };
}

function parseRemotes(remotesOutput) {
  const remotes = [];
  const seen = new Set();

  String(remotesOutput || '').split('\n').map((line) => line.trim()).filter(Boolean).forEach((line) => {
    const match = line.match(/^(\S+)\s+(\S+)\s+\((fetch|push)\)$/);
    if (!match) return;
    const key = `${match[1]}::${match[2]}`;
    if (seen.has(key)) return;
    seen.add(key);
    remotes.push({ name: match[1], url: match[2] });
  });

  return remotes;
}

async function getGitOpsStatus() {
  const [statusResult, remotesResult, rootResult] = await Promise.all([
    execCommand('git status --porcelain=v1 --branch'),
    execCommand('git remote -v'),
    execCommand('git rev-parse --show-toplevel')
  ]);

  if (!statusResult.success) {
    return { connected: false, error: statusResult.output || 'git status failed' };
  }

  const branchStatus = parseBranchStatus(statusResult.output);
  return {
    connected: true,
    repositoryRoot: rootResult.success ? rootResult.output : null,
    ...branchStatus,
    remotes: remotesResult.success ? parseRemotes(remotesResult.output) : []
  };
}

module.exports = {
  getGitOpsStatus,
  parseBranchStatus,
  parseRemotes
};