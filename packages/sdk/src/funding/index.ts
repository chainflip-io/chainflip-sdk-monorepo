import type { BigNumberish, ContractReceipt, Signer } from 'ethers';
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
  executeRedemption(accountId: `0x${string}`): Promise<ContractReceipt> {
    return executeRedemption(accountId, this.options);
  }

  async getMinimumFunding(): Promise<string> {
    const amount = await getMinimumFunding(this.options);
    return amount.toString();
  }

  async getRedemptionDelay(): Promise<number> {
    return getRedemptionDelay(this.options);
  }

  async requestFlipApproval(
    amount: BigNumberish,
  ): Promise<ContractReceipt | null> {
    const flipAddress = getTokenContractAddress('FLIP', this.options.network);
    const vaultAddress = getVaultManagerContractAddress(this.options.network);

    return requestApproval(
      flipAddress,
      vaultAddress,
      amount,
      this.options.signer,
    );
  }
}
