const express = require('express');
const path = require('path');
const cors = require('cors');
const clusterRoutes = require('./routes/clusters');
const toolRoutes = require('./routes/tools');
const logger = require('./utils/logger');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../../public')));

app.use('/api/clusters', clusterRoutes);
app.use('/api/tools', toolRoutes);

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/index.html'));
});

app.listen(port, () => {
  logger.info(`Server listening on http://localhost:${port}`);
});
