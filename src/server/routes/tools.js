const express = require('express');
const { getToolStatus } = require('../services/toolService');
const router = express.Router();

router.get('/status', async (req, res) => {
  const status = await getToolStatus();
  res.json(status);
});

module.exports = router;
