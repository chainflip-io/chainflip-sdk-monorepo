import { Connection, PublicKey, VersionedTransactionResponse } from '@solana/web3.js';
import BigNumber from 'bignumber.js';
import { getTokenContractAddress } from '@/shared/contracts';
import { InternalAsset } from '@/shared/enums';
import { isNotNull } from '@/shared/guards';
import { memoize } from './function';
import env from '../config/env';

const getSolanaConnection = memoize(() => {
  const rpcUrl = new URL(env.SOLANA_RPC_HTTP_URL);

  let authorizationHeader: string | undefined;
  if (rpcUrl.username || rpcUrl.password) {
    authorizationHeader = `Basic ${Buffer.from(`${rpcUrl.username}:${rpcUrl.password}`).toString('base64')}`;
    rpcUrl.username = '';
    rpcUrl.password = '';
  }

  return new Connection(rpcUrl.toString(), {
    httpHeaders: authorizationHeader ? { Authorization: authorizationHeader } : {},
  });
});

const getDepositAmount = (
  tx: VersionedTransactionResponse,
  depositAddress: string,
  asset: InternalAsset,
) => {
  if (asset === 'Sol') {
    const depositPublicKey = new PublicKey(depositAddress);
    const accountIndex = tx.transaction.message.staticAccountKeys.findIndex((key) =>
      key.equals(depositPublicKey),
    );

    const preBalance = tx.meta?.preBalances.at(accountIndex) ?? 0;
    const postBalance = tx.meta?.postBalances.at(accountIndex) ?? 0;

    return BigInt(postBalance - preBalance);
  }

  if (asset === 'SolUsdc') {
    const mintAddress = getTokenContractAddress(asset, env.CHAINFLIP_NETWORK);
    const preBalance = BigInt(
      tx.meta?.preTokenBalances?.find((b) => b.mint === mintAddress && b.owner === depositAddress)
        ?.uiTokenAmount.amount ?? 0,
    );
    const postBalance = BigInt(
      tx.meta?.postTokenBalances?.find((b) => b.mint === mintAddress && b.owner === depositAddress)
        ?.uiTokenAmount.amount ?? 0,
    );

    return postBalance - preBalance;
  }

  throw new Error(`Unsupported asset: ${asset}`);
};

export const tryFindSolanaDepositTxRef = async (
  asset: InternalAsset,
  amount: bigint,
  depositAddress: string,
  blockHeight: bigint | number,
) => {
  const connection = getSolanaConnection();
  const allSignatures = await connection.getSignaturesForAddress(new PublicKey(depositAddress));
  const filteredSignatures = allSignatures.filter((sig) => sig.slot <= blockHeight);

  const txs = await connection.getTransactions(
    filteredSignatures.map((sig) => sig.signature),
    { maxSupportedTransactionVersion: 0 },
  );

  for (const tx of txs.filter(isNotNull)) {
    const txAmount = getDepositAmount(tx, depositAddress, asset);
    const txAmountRatio = BigNumber(txAmount.toString()).div(amount.toString()).toNumber();

    // witnessed amount can be slightly higher than transaction amount if deposit is witnessed together with spam transactions
    if (txAmountRatio > 0.95) {
      return tx.transaction.signatures[0];
    }
  }

  return undefined;
};
