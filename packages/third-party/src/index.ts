import { Server } from 'http';
import env from './env.js';
import logger from './logger.js';
import prisma from './prisma.js';
import server from './server.js';
import { handleExit } from './utils/exit.js';

server.listen(
  env.THIRD_PARTY_APP_PORT,
  // eslint-disable-next-line func-names
  function (this: Server) {
    logger.info(`third-party server listening on ${env.THIRD_PARTY_APP_PORT}`, {
      address: this.address(),
    });

    handleExit(async () => {
      this.close();
      await prisma.$disconnect();
    });
  },
);
