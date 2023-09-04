import { StateChainGateway__factory } from '../abis';
import { getStateChainGatewayContractAddress } from '../contracts';
import type { FundingNetworkOptions } from './index';

export const getStateChainGateway = (options: FundingNetworkOptions) => {
  const stateChainGatewayContractAddress =
    options.network === 'localnet'
      ? options.stateChainGatewayContractAddress
      : getStateChainGatewayContractAddress(options.network);

  return StateChainGateway__factory.connect(
    stateChainGatewayContractAddress,
    options.signer,
  );
};
