import 'dotenv/config';
import { Server } from 'http';
import start from './processor';
import server from './server';
import { handleExit } from './utils/function';
import logger from './utils/logger';

const isFlagSet = (name: string) => process.env[name]?.toUpperCase() === 'TRUE';

let aFlagSet = false;

if (isFlagSet('START_PROCESSOR')) {
  aFlagSet = true;
  start();
}

if (isFlagSet('START_HTTP_SERVICE')) {
  aFlagSet = true;

  const PORT =
    Number.parseInt(process.env.SWAPPING_APP_PORT as string, 10) || 8080;

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
