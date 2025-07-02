import { z } from 'zod';
import { cfParameterEncodingRequestSchema } from '../broker.js';
import { chainflipAddress } from '../parsers.js';

export const CfParameterEncodingRequestWithBroker = cfParameterEncodingRequestSchema.and(
  z.object({
    brokerAccount: chainflipAddress.optional(),
  }),
);
