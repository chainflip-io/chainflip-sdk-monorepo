import { findSolanaDepositSignature } from '@chainflip/solana';
import { getTokenContractAddress } from '@/shared/contracts';
import env from '@/swap/config/env';
import logger from '@/swap/utils/logger';

export const findSolanaTxHash = async (
  asset: 'Sol' | 'SolUsdc',
  blockHeight: number | bigint,
  depositAddress: string,
  amount: bigint,
) => {
  const tokenAddress =
    asset !== 'Sol' ? getTokenContractAddress(asset, env.CHAINFLIP_NETWORK) : null;

  // somehow the blockHeight on the event can be slightly lower than the slot of the actual deposit
  // https://linear.app/chainflip/issue/PRO-1893/look-into-solana-ingress-block-height
  const maxDepositSlot = Number(blockHeight) + 50;

  try {
    return await findSolanaDepositSignature(
      env.SOLANA_RPC_HTTP_URL,
      tokenAddress,
      depositAddress,
      amount,
      0,
      maxDepositSlot,
    );
  } catch (error) {
    logger.error('error while finding solana deposit signature', { error });
  }

  return undefined;
};
