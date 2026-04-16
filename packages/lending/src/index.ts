// eslint-disable-next-line import/no-extraneous-dependencies
import 'dotenv/config';
import { createServer } from 'http';
import { env } from './env.js';
import { handleExit } from './handleExit.js';
import { logger } from './logger.js';
import processBlocks from './processor/index.js';
import { server } from './server.js';

if (env.START_PROCESSOR) {
  processBlocks().catch((error) => {
    logger.error('error processing blocks', { error });
    process.exit(1);
  });

  if (!env.START_HTTP_SERVICE) {
    const healthServer = createServer((req, res) => {
      res.end('i am still alive\n');
    }).listen(env.LENDING_APP_PORT, () => {
      logger.info(`health server listening on ${env.LENDING_APP_PORT}`, {
        address: healthServer.address(),
      });

      handleExit(() => { healthServer.close(); });
    });
  }
}

if (env.START_HTTP_SERVICE) {
  server.listen(env.LENDING_APP_PORT, 
    // eslint-disable-next-line func-names
    function (this: import('net').Server) {
    logger.info(`server listening on ${env.LENDING_APP_PORT}`, {
      address: this.address(),
    });

    handleExit(() => { this.close(); });
  });
}

if (!env.START_HTTP_SERVICE && !env.START_PROCESSOR) {
  logger.error('no services started');
  process.exit(1);
}

process.on('exit', (code) => {
  logger.info(`process exiting with code "${code}"`);
});