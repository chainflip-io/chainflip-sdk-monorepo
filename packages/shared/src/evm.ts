import { ChainflipNetwork } from '@chainflip/bitcoin';
import { ChainflipChain } from '@chainflip/utils/chainflip';
import { Signer } from 'ethers';
import { getEvmChainId } from './consts';
import { assert } from './guards';

export const assertIsEvmChain = (chain: ChainflipChain) => {
  const evmChainId = getEvmChainId(chain, 'backspin');
  assert(evmChainId, `Chain ${chain} is not an evm chain`);
};

export const assertIsCCMDestination = (chain: ChainflipChain) => {
  if (chain === 'Solana') return;
  assertIsEvmChain(chain);
};

export const assertSignerIsConnectedToChain = async (
  opts: { network: ChainflipNetwork | 'localnet'; signer: Signer },
  chain: ChainflipChain,
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
