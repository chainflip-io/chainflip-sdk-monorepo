// Entry point of the swap-aggregations service: the backend for third-party swap aggregators
// (starting with SwapKit) used by swap.chainflip.io. Runs as its own pod.
import { Server } from 'http';
import env from './env.js';
import logger from './logger.js';
import prisma from './prisma.js';
import server from './server.js';
import { handleExit } from './utils/exit.js';

server.listen(
  env.INTEGRATORS_APP_PORT,
  // eslint-disable-next-line func-names
  function (this: Server) {
    logger.info(`integrators server listening on ${env.INTEGRATORS_APP_PORT}`, {
      address: this.address(),
    });

    handleExit(async () => {
      this.close();
      await prisma.$disconnect();
    });
  },
);
