const test = require('node:test');
const assert = require('node:assert/strict');
const { parseBranchStatus, parseRemotes } = require('../src/server/services/gitopsService');

test('parses clean branch status', () => {
  const status = parseBranchStatus('## feat/gitops-integration...origin/feat/gitops-integration [ahead 1]\n');

  assert.equal(status.branch, 'feat/gitops-integration');
  assert.equal(status.upstream, 'origin/feat/gitops-integration');
  assert.equal(status.ahead, 1);
  assert.equal(status.behind, 0);
  assert.equal(status.clean, true);
});

test('parses remotes once per name/url pair', () => {
  const remotes = parseRemotes('origin\tgit@github.com:example/repo.git (fetch)\norigin\tgit@github.com:example/repo.git (push)\n');

  assert.deepEqual(remotes, [{ name: 'origin', url: 'git@github.com:example/repo.git' }]);
});