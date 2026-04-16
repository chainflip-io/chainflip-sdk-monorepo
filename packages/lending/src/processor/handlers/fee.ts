import { logger } from '../../logger.js';
import type { EventHandlerContext } from './index.js';

export const handleOriginationFeeTaken = async ({ prisma, event, block }: EventHandlerContext) => {
  const { lp_account, loan_id, total_amount, network_share, lender_share, broker_share } =
    event.args as {
      lp_account: string;
      loan_id: number;
      total_amount: string;
      network_share?: string;
      lender_share?: string;
      broker_share?: string;
    };

  const executedBlockIndex = `${block.height}-${event.indexInBlock}`;
  const timestamp = new Date(block.timestamp);

  await prisma.feeEvent.create({
    data: {
      loanId: loan_id,
      lpAccount: lp_account,
      type: 'ORIGINATION',
      totalAmount: total_amount,
      networkShare: network_share ?? null,
      lenderShare: lender_share ?? null,
      brokerShare: broker_share ?? null,
      executedBlockIndex,
      timestamp,
    },
  });

  logger.debug('OriginationFeeTaken processed', { loanId: loan_id, totalAmount: total_amount });
};

export const handleInterestTaken = async ({ prisma, event, block }: EventHandlerContext) => {
  const { lp_account, loan_id, total_amount, network_share, lender_share } = event.args as {
    lp_account: string;
    loan_id: number;
    total_amount: string;
    network_share?: string;
    lender_share?: string;
  };

  const executedBlockIndex = `${block.height}-${event.indexInBlock}`;
  const timestamp = new Date(block.timestamp);

  await prisma.feeEvent.create({
    data: {
      loanId: loan_id,
      lpAccount: lp_account,
      type: 'INTEREST',
      totalAmount: total_amount,
      networkShare: network_share ?? null,
      lenderShare: lender_share ?? null,
      executedBlockIndex,
      timestamp,
    },
  });

  logger.debug('InterestTaken processed', { loanId: loan_id, totalAmount: total_amount });
};

export const handleLiquidationFeeTaken = async ({ prisma, event, block }: EventHandlerContext) => {
  const { lp_account, loan_id, total_amount, network_share, lender_share } = event.args as {
    lp_account: string;
    loan_id: number;
    total_amount: string;
    network_share?: string;
    lender_share?: string;
  };

  const executedBlockIndex = `${block.height}-${event.indexInBlock}`;
  const timestamp = new Date(block.timestamp);

  await prisma.feeEvent.create({
    data: {
      loanId: loan_id,
      lpAccount: lp_account,
      type: 'LIQUIDATION',
      totalAmount: total_amount,
      networkShare: network_share ?? null,
      lenderShare: lender_share ?? null,
      executedBlockIndex,
      timestamp,
    },
  });

  logger.debug('LiquidationFeeTaken processed', { loanId: loan_id, totalAmount: total_amount });
};