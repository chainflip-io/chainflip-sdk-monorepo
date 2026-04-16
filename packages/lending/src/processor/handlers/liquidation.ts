import { logger } from '../../logger.js';
import type { EventHandlerContext } from './index.js';

export const handleLiquidationInitiated = async ({ prisma, event, block }: EventHandlerContext) => {
  const { lp_account, loan_id, type, swap_request_id } = event.args as {
    lp_account: string;
    loan_id?: number;
    type: string;
    swap_request_id?: number;
  };

  const executedBlockIndex = `${block.height}-${event.indexInBlock}`;
  const timestamp = new Date(block.timestamp);

  const liquidationType = mapLiquidationType(type);

  if (loan_id != null) {
    const statusMap: Record<string, 'SOFT_LIQUIDATION' | 'HARD_LIQUIDATION' | 'SOFT_VOLUNTARY_LIQUIDATION'> = {
      SOFT: 'SOFT_LIQUIDATION',
      HARD: 'HARD_LIQUIDATION',
      SOFT_VOLUNTARY: 'SOFT_VOLUNTARY_LIQUIDATION',
    };

    const newStatus = statusMap[liquidationType];
    if (newStatus) {
      await prisma.loan.update({
        where: { loanId: loan_id },
        data: { status: newStatus },
      });
    }
  }

  await prisma.liquidationEvent.create({
    data: {
      lpAccount: lp_account,
      loanId: loan_id ?? null,
      type: liquidationType,
      swapRequestId: swap_request_id ?? null,
      executedBlockIndex,
      timestamp,
    },
  });

  logger.debug('LiquidationInitiated processed', { lpAccount: lp_account, type: liquidationType });
};

export const handleLiquidationCompleted = async ({ prisma, event, block }: EventHandlerContext) => {
  const {
    lp_account,
    loan_id,
    type,
    collateral_liquidated,
    debt_repaid,
    excess_returned,
    swap_request_id,
  } = event.args as {
    lp_account: string;
    loan_id?: number;
    type: string;
    collateral_liquidated?: string;
    debt_repaid?: string;
    excess_returned?: string;
    swap_request_id?: number;
  };

  const executedBlockIndex = `${block.height}-${event.indexInBlock}`;
  const timestamp = new Date(block.timestamp);

  const liquidationType = mapLiquidationType(type);

  if (loan_id != null && debt_repaid) {
    await prisma.loan.update({
      where: { loanId: loan_id },
      data: {
        status: liquidationType === 'HARD' ? 'REPAID' : 'ACTIVE',
      },
    });
  }

  await prisma.liquidationEvent.create({
    data: {
      lpAccount: lp_account,
      loanId: loan_id ?? null,
      type: liquidationType,
      collateralLiquidated: collateral_liquidated ?? null,
      debtRepaid: debt_repaid ?? null,
      excessReturned: excess_returned ?? null,
      swapRequestId: swap_request_id ?? null,
      executedBlockIndex,
      timestamp,
    },
  });

  logger.debug('LiquidationCompleted processed', {
    lpAccount: lp_account,
    type: liquidationType,
    debtRepaid: debt_repaid,
  });
};

function mapLiquidationType(type: string): 'SOFT' | 'HARD' | 'SOFT_VOLUNTARY' | 'AUTO_TRIGGERED' {
  const map: Record<string, 'SOFT' | 'HARD' | 'SOFT_VOLUNTARY' | 'AUTO_TRIGGERED'> = {
    Soft: 'SOFT',
    Hard: 'HARD',
    SoftVoluntary: 'SOFT_VOLUNTARY',
    AutoTriggered: 'AUTO_TRIGGERED',
  };
  return map[type] ?? 'SOFT';
}