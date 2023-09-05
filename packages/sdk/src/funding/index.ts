import type { Signer } from 'ethers';
import { getFlipBalance, TransactionOptions } from '@/shared/contracts';
import { ChainflipNetwork, ChainflipNetworks } from '@/shared/enums';
import {
  approveStateChainGateway,
  executeRedemption,
  fundStateChainAccount,
  getMinimumFunding,
  getRedemptionDelay,
} from '@/shared/stateChainGateway';

type SDKOptions = {
  network?: Exclude<ChainflipNetwork, 'mainnet'>;
  signer: Signer;
};

type TransactionHash = string;

export class FundingSDK {
  private readonly options: Required<SDKOptions>;

  constructor(options: SDKOptions) {
    this.options = {
      signer: options.signer,
      network: options.network ?? ChainflipNetworks.perseverance,
    };
  }

  /**
   * @param accountId the hex-encoded validator account id
   * @param amount the amount to fund in base units of FLIP
   */
  async fundStateChainAccount(
    accountId: `0x${string}`,
    amount: string,
    txOpts: TransactionOptions = {},
  ): Promise<TransactionHash> {
    const tx = await fundStateChainAccount(
      accountId,
      amount,
      this.options,
      txOpts,
    );
    return tx.transactionHash;
  }

  /**
   * @param accountId the hex-encoded validator account id
   */
  async executeRedemption(
    accountId: `0x${string}`,
    txOpts: TransactionOptions = {},
  ): Promise<TransactionHash> {
    const tx = await executeRedemption(accountId, this.options, txOpts);
    return tx.transactionHash;
  }

  async getMinimumFunding(): Promise<bigint> {
    const amount = await getMinimumFunding(this.options);
    return amount.toBigInt();
  }

  async getRedemptionDelay(): Promise<number> {
    return getRedemptionDelay(this.options);
  }

  async getFlipBalance(): Promise<bigint> {
    return getFlipBalance(this.options.network, this.options.signer);
  }

  /**
   * @param amount the amount of FLIP to request approval for
   * @returns the transaction hash or null if no approval was required
   */
  async approveStateChainGateway(
    amount: bigint | string | number,
    txOpts: TransactionOptions = {},
  ): Promise<TransactionHash | null> {
    const receipt = await approveStateChainGateway(
      amount,
      this.options,
      txOpts,
    );

    return receipt && receipt.transactionHash;
  }
}
