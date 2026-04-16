import express from 'express';
import { logger } from './logger.js';
import { configRoutes } from './processor/routes/config.js';
import { liquidationRoutes } from './processor/routes/liquidations.js';
import { loanRoutes } from './processor/routes/loans.js';
import { lpRoutes } from './processor/routes/lps.js';
import { poolRoutes } from './processor/routes/pools.js';

const app = express();

app.use(express.json());

app.use((req, _res, next) => {
  logger.debug(`${req.method} ${req.url}`);
  next();
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/pools', poolRoutes);
app.use('/loans', loanRoutes);
app.use('/lps', lpRoutes);
app.use('/liquidations', liquidationRoutes);
app.use('/config', configRoutes);

app.use( // handle error 
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    logger.error('unhandled route error', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Internal server error' });
  },
);

export const server = app;