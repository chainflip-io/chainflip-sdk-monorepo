import { Signer } from 'ethers';
import { Asset, Chain, ChainflipNetwork } from '../enums';
import { CcmParams } from '../schemas';

export { default as executeSwap } from './executeSwap';
export * from './approval';

export interface ExecuteSwapParams {
  srcChain: Chain;
  srcAsset: Asset;
  destChain: Chain;
  destAsset: Asset;
  amount: string;
  destAddress: string;
  ccmParams?: CcmParams;
}

export type SwapNetworkOptions =
  | { network: ChainflipNetwork; signer: Signer }
  | {
      network: 'localnet';
      signer: Signer;
      vaultContractAddress: string;
      srcTokenContractAddress: string;
    };
