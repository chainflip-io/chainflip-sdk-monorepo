import { VoidSigner } from 'ethers';
import { describe, it, expect } from 'vitest';
import { ADDRESSES } from '../../consts.js';
import { getStateChainGateway } from '../utils.js';

describe(getStateChainGateway, () => {
  it.each(['sisyphos'] as const)('returns the correct gateway for %s', (network) => {
    expect(
      getStateChainGateway({
        network,
        signer: new VoidSigner('0x0'),
      }),
    ).toMatchObject({
      target: ADDRESSES[network].STATE_CHAIN_GATEWAY_ADDRESS,
    });
  });

  it('uses the address for localnets', () => {
    const address = '0x1234';
    expect(
      getStateChainGateway({
        network: 'localnet',
        signer: new VoidSigner('0x0'),
        stateChainGatewayContractAddress: address,
        flipContractAddress: '0x0000',
      }),
    ).toMatchObject({
      target: address,
    });
  });
});
