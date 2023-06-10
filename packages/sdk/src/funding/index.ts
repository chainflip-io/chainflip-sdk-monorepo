import type { ContractReceipt, Signer } from 'ethers';
import { ChainflipNetwork } from '@/shared/enums';
import { assert } from '@/shared/guards';
import { fundStateChainAccount } from '@/shared/stateChainGateway';

type SDKOptions = {
  network?: ChainflipNetwork;
  signer?: Signer;
};

export class FundingSDK {
  private readonly network: ChainflipNetwork;

  private readonly signer?: Signer;

  constructor(options: SDKOptions) {
    this.network = options.network ?? 'sisyphos';
    this.signer = options.signer;
  }

  /**
   *
   * @param accountId the hex-encoded validator account id
   * @param amount the amount to fund in base units of FLIP
   * @param signer a signer to use for the transaction if different from the one
   *               provided in the constructor
   */
  fundStateChainAccount(
    accountId: `0x${string}`,
    amount: string,
    signer?: Signer,
  ): Promise<ContractReceipt> {
    const s = signer ?? this.signer;
    assert(s, 'No signer provided');
    return fundStateChainAccount(accountId, amount, {
      signer: s,
      network: this.network,
    });
  }
}
