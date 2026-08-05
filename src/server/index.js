const { app } = require('./app');
const logger = require('./utils/logger');

const port = process.env.PORT || 3000;
const host = process.env.HOST || '127.0.0.1';

app.listen(port, host, () => {
  logger.info(`Server listening on http://${host}:${port}`);
});
