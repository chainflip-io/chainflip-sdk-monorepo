import 'dotenv/config';
import { Server, createServer } from 'http';
import start from './processor';
import server from './server';
import { handleExit } from './utils/function';
import logger from './utils/logger';

const isFlagSet = (name: string) => process.env[name]?.toUpperCase() === 'TRUE';

let aFlagSet = false;

const PORT =
  Number.parseInt(process.env.SWAPPING_APP_PORT as string, 10) || 8080;

if (isFlagSet('START_PROCESSOR')) {
  aFlagSet = true;
  // start();

  const healthServer = createServer((req, res) => {
    res.end('i am still alive\n');
  }).listen(PORT, () => {
    logger.info(`server listening on ${PORT}`, {
      address: healthServer.address(),
    });

    handleExit(() => healthServer.close());
  });
}

if (isFlagSet('START_HTTP_SERVICE')) {
  aFlagSet = true;

  server.listen(
    PORT,
    // eslint-disable-next-line func-names
    function (this: Server) {
      logger.info(`server listening on ${PORT}`, { address: this.address() });

      handleExit(() => this.close());
    },
  );
}

if (!aFlagSet) {
  logger.error('no services started');
  process.exit(1);
}

process.on('exit', (code) => {
  logger.info(`process exiting with code "${code}"`);
});
