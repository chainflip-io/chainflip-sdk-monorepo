import { StateChainGateway__factory } from '../abis/index.js';
import { getStateChainGatewayContractAddress } from '../contracts.js';
import type { FundingNetworkOptions } from './index.js';

export const getStateChainGateway = (networkOpts: FundingNetworkOptions) => {
  const stateChainGatewayContractAddress =
    networkOpts.network === 'localnet'
      ? networkOpts.stateChainGatewayContractAddress
      : getStateChainGatewayContractAddress(networkOpts.network);

  return StateChainGateway__factory.connect(stateChainGatewayContractAddress, networkOpts.signer);
};
