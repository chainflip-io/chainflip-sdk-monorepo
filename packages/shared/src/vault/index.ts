import { Signer } from 'ethers';
import { Asset, Chain, ChainflipNetwork } from '../enums';
import { AffiliateBroker, CcmParams, DcaParams, FillOrKillParamsX128 } from '../schemas';

export { default as executeSwap } from './executeSwap';
export * from './approval';

export interface ExecuteSwapParams {
  srcChain: Chain;
  srcAsset: Asset;
  destChain: Chain;
  destAsset: Asset;
  amount: string;
  destAddress: string;
  fillOrKillParams: FillOrKillParamsX128;
  brokerFees: AffiliateBroker;
  ccmParams?: CcmParams;
  maxBoostFeeBps?: number;
  dcaParams?: DcaParams;
  // TODO: Define a new typy and/or check AffiliateShortId type?
  affiliateFees?: {
    account: number;
    commissionBps: number;
  }[];
}

export type SwapNetworkOptions =
  | { network: ChainflipNetwork; signer: Signer }
  | {
      network: 'localnet';
      signer: Signer;
      vaultContractAddress: string;
      srcTokenContractAddress: string;
    };
