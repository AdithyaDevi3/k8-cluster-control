const express = require('express');
const path = require('path');
const cors = require('cors');
const clusterRoutes = require('./routes/clusters');
const toolRoutes = require('./routes/tools');
const kindRoutes = require('./routes/kind');
const logsRoutes = require('./routes/logs');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../../public')));
app.use('/vendor/three', express.static(path.join(__dirname, '../../node_modules/three')));

app.get('/healthz', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/readyz', (req, res) => {
  res.json({ status: 'ready' });
});

app.use('/api/clusters', clusterRoutes);
app.use('/api/tools', toolRoutes);
app.use('/api/kind', kindRoutes);
app.use('/api/logs', logsRoutes);

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/index.html'));
});

module.exports = { app };