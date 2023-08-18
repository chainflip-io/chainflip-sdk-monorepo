import { Chain, Chains } from '@/shared/enums';
import { fetchPendingBitcoinDeposit } from './bitcoin';

export type PendingDeposit = {
  amount: string;
  transactionHash: string;
  transactionConfirmations: number;
};

export const getPendingDeposit = async (
  chain: Chain,
  address: string,
): Promise<PendingDeposit | undefined> => {
  if (chain === Chains.Bitcoin) {
    return fetchPendingBitcoinDeposit(address);
  }

  return undefined;
};
