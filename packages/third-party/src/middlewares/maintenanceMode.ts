import { RequestHandler } from 'express';
import env from '../env.js';
import ServiceError from '../utils/ServiceError.js';

export const maintenanceMode: RequestHandler = (_req, _res, next) => {
  if (env.THIRD_PARTY_MAINTENANCE_MODE) {
    next(
      ServiceError.unavailable('Third-party swaps are currently unavailable due to maintenance'),
    );
    return;
  }

  next();
};
