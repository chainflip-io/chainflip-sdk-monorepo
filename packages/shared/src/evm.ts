import { Signer } from 'ethers';
import { getEvmChainId } from './consts';
import { Chain, ChainflipNetwork, ChainflipNetworks } from './enums';
import { assert } from './guards';

export const assertIsEvmChain = (chain: Chain) => {
  const evmChainId = getEvmChainId(chain, ChainflipNetworks.backspin);
  assert(evmChainId, `Chain ${chain} is not an evm chain`);
};

export const assertSignerIsConnectedToChain = async (
  opts: { network: ChainflipNetwork | 'localnet'; signer: Signer },
  chain: Chain,
) => {
  if (opts.network === 'localnet') return; // allow any evm chain id when running a localnet
  assert(opts.signer.provider, 'Signer has no provider');

  const sourceChainId = getEvmChainId(chain, opts.network);
  assert(sourceChainId, `Chain ${chain} has no evm chain id`);

  const { chainId: signerChainId } = await opts.signer.provider.getNetwork();
  assert(
    BigInt(signerChainId) === BigInt(sourceChainId),
    `Signer is connected to unexpected evm chain (expected: ${sourceChainId}, got: ${signerChainId})`,
  );
};
