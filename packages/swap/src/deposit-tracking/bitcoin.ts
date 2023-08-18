import axios from 'axios';
import { ethers } from 'ethers';
import { z } from 'zod';
import { assetDecimals } from '@/shared/enums';
import logger from '../utils/logger';

let lastJsonRpcRequestId = 0;

const depositTrackerResponseSchema = z.object({
  id: z.number(),
  jsonrpc: z.string(),
  result: z.array(
    z
      .object({
        confirmations: z.number(),
        value: z.number(),
        tx_hash: z.string(),
      })
      .nullable(),
  ),
});

export const fetchPendingBitcoinDeposit = async (address: string) => {
  if (!process.env.BITCOIN_DEPOSIT_TRACKER_URL) {
    logger.error(
      'cannot fetch pending deposit because BITCOIN_DEPOSIT_TRACKER_URL is not set',
    );
    return undefined;
  }

  try {
    const response = await axios.post(
      process.env.BITCOIN_DEPOSIT_TRACKER_URL,
      {
        id: ++lastJsonRpcRequestId, // eslint-disable-line no-plusplus
        jsonrpc: '2.0',
        method: 'status',
        params: [address],
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 500,
      },
    );
    const data = depositTrackerResponseSchema.safeParse(response.data);

    if (data.success && data.data.result[0]) {
      return {
        amount: ethers.utils
          .parseUnits(String(data.data.result[0].value), assetDecimals.BTC)
          .toString(),
        transactionConfirmations: data.data.result[0].confirmations,
        transactionHash: `0x${data.data.result[0].tx_hash}`,
      };
    }

    if (!data.success) {
      logger.error(
        'unexpected response from bitcoin deposit tracker',
        response.data,
      );
    }
  } catch (error) {
    logger.error('failed to fetch status from bitcoin deposit tracker', {
      error,
    });
  }

  return undefined;
};
