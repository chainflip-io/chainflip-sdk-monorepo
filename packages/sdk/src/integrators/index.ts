// Entry point of the integrators service (third-party swap providers, starting with SwapKit).
// Runs as its own pod; it is NOT part of the published @chainflip/sdk package (see tsup.config.mjs
// entries and the `files` field in package.json).
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

// TODO: start the status poller here once a provider client exists
