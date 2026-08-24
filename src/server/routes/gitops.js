const express = require('express');
const { getGitOpsStatus } = require('../services/gitopsService');

const router = express.Router();

router.get('/status', async (req, res) => {
  const status = await getGitOpsStatus();
  res.json(status);
});

module.exports = router;