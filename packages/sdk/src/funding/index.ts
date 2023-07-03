import type { ContractReceipt, Signer } from 'ethers';
import { ERC20__factory } from '@/shared/abis';
import {
  getTokenContractAddress,
  getVaultManagerContractAddress,
  requestApproval,
} from '@/shared/contracts';
import { ChainflipNetwork, ChainflipNetworks } from '@/shared/enums';
import {
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
   * @param signer a signer to use for the transaction if different from the one
   *               provided in the constructor
   */
  fundStateChainAccount(
    accountId: `0x${string}`,
    amount: string,
  ): Promise<ContractReceipt> {
    return fundStateChainAccount(accountId, amount, this.options);
  }

  /**
   * @param accountId the hex-encoded validator account id
   * @param signer a signer to use for the transaction if different from the one
   *               provided in the constructor
   */
  async executeRedemption(accountId: `0x${string}`): Promise<TransactionHash> {
    const tx = await executeRedemption(accountId, this.options);
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
    const flipAddress = getTokenContractAddress('FLIP', this.options.network);
    const flip = ERC20__factory.connect(flipAddress, this.options.signer);
    const balance = await flip.balanceOf(
      await this.options.signer.getAddress(),
    );
    return balance.toBigInt();
  }

  /**
   * @param amount the amount of FLIP to request approval for
   * @returns the transaction hash or null if no approval was required
   */
  async requestFlipApproval(
    amount: bigint | string | number,
  ): Promise<TransactionHash | null> {
    const flipAddress = getTokenContractAddress('FLIP', this.options.network);
    const vaultAddress = getVaultManagerContractAddress(this.options.network);

    const tx = await requestApproval(
      flipAddress,
      vaultAddress,
      amount,
      this.options.signer,
    );

    return tx?.transactionHash ?? null;
  }
}
