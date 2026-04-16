import { logger } from '../../logger.js';
import type { EventHandlerContext } from './index.js';

export const handleLoanCreated = async ({ prisma, event, block }: EventHandlerContext) => {
  const { loan_id, lp_account, asset, principal_amount } = event.args as {
    loan_id: number;
    lp_account: string;
    asset: string;
    principal_amount: string;
  };

  const executedBlockIndex = `${block.height}-${event.indexInBlock}`;
  const timestamp = new Date(block.timestamp);

  const pool = await prisma.lendingPool.findUnique({ where: { asset } });
  if (!pool) {
    logger.warn(`LendingPool not found for asset "${asset}", skipping LoanCreated`);
    return;
  }

  await prisma.loan.create({
    data: {
      loanId: loan_id,
      lpAccount: lp_account,
      asset,
      principalAmount: principal_amount,
      status: 'ACTIVE',
      poolId: pool.id,
      executedBlockIndex,
    },
  });

  await prisma.loanEvent.create({
    data: {
      loanId: loan_id,
      lpAccount: lp_account,
      type: 'CREATED',
      amount: principal_amount,
      executedBlockIndex,
      timestamp,
    },
  });

  logger.debug('LoanCreated processed', { loanId: loan_id, lpAccount: lp_account, asset });
};

export const handleLoanUpdated = async ({ prisma, event, block }: EventHandlerContext) => {
  const { loan_id, lp_account, new_principal_amount, accrued_interest } = event.args as {
    loan_id: number;
    lp_account: string;
    new_principal_amount: string;
    accrued_interest: string;
  };

  const executedBlockIndex = `${block.height}-${event.indexInBlock}`;
  const timestamp = new Date(block.timestamp);

  await prisma.loan.update({
    where: { loanId: loan_id },
    data: {
      principalAmount: new_principal_amount,
      accruedInterest: accrued_interest,
    },
  });

  await prisma.loanEvent.create({
    data: {
      loanId: loan_id,
      lpAccount: lp_account,
      type: 'INCREASED',
      amount: new_principal_amount,
      executedBlockIndex,
      timestamp,
    },
  });

  logger.debug('LoanUpdated processed', { loanId: loan_id });
};

export const handleLoanRepaid = async ({ prisma, event, block }: EventHandlerContext) => {
  const { loan_id, lp_account, repaid_amount, remaining_principal } = event.args as {
    loan_id: number;
    lp_account: string;
    repaid_amount: string;
    remaining_principal: string;
  };

  const executedBlockIndex = `${block.height}-${event.indexInBlock}`;
  const timestamp = new Date(block.timestamp);
  const isFull = remaining_principal === '0' || remaining_principal === '0x0';

  await prisma.loan.update({
    where: { loanId: loan_id },
    data: {
      principalAmount: remaining_principal,
      ...(isFull && { status: 'REPAID' }),
    },
  });

  await prisma.loanEvent.create({
    data: {
      loanId: loan_id,
      lpAccount: lp_account,
      type: isFull ? 'REPAID_FULL' : 'REPAID_PARTIAL',
      amount: repaid_amount,
      executedBlockIndex,
      timestamp,
    },
  });

  logger.debug('LoanRepaid processed', { loanId: loan_id, isFull });
};

export const handleLoanSettled = async ({ prisma, event, block }: EventHandlerContext) => {
  const { loan_id, lp_account } = event.args as {
    loan_id: number;
    lp_account: string;
  };

  const executedBlockIndex = `${block.height}-${event.indexInBlock}`;
  const timestamp = new Date(block.timestamp);

  await prisma.loan.update({
    where: { loanId: loan_id },
    data: {
      principalAmount: '0',
      accruedInterest: '0',
      status: 'REPAID',
    },
  });

  await prisma.loanEvent.create({
    data: {
      loanId: loan_id,
      lpAccount: lp_account,
      type: 'SETTLED',
      executedBlockIndex,
      timestamp,
    },
  });

  logger.debug('LoanSettled processed', { loanId: loan_id });
};