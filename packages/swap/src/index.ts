import 'dotenv/config';
import { Server, createServer } from 'http';
import start from './processor';
import server from './server';
import { handleExit } from './utils/function';
import logger from './utils/logger';

const isFlagSet = (name: string) => process.env[name]?.toUpperCase() === 'TRUE';

const PORT =
  Number.parseInt(process.env.SWAPPING_APP_PORT as string, 10) || 8080;

const START_PROCESSOR = isFlagSet('START_PROCESSOR');
const START_HTTP_SERVICE = isFlagSet('START_HTTP_SERVICE');

if (START_PROCESSOR) {
  start();

  if (!START_HTTP_SERVICE) {
    const healthServer = createServer((req, res) => {
      res.end('i am still alive\n');
    }).listen(PORT, () => {
      logger.info(`server listening on ${PORT}`, {
        address: healthServer.address(),
      });

      handleExit(() => healthServer.close());
    });
  }
}

if (START_HTTP_SERVICE) {
  server.listen(
    PORT,
    // eslint-disable-next-line func-names
    function (this: Server) {
      logger.info(`server listening on ${PORT}`, { address: this.address() });

      handleExit(() => this.close());
    },
  );
}

if (!START_HTTP_SERVICE || !START_PROCESSOR) {
  logger.error('no services started');
  process.exit(1);
}

process.on('exit', (code) => {
  logger.info(`process exiting with code "${code}"`);
});
