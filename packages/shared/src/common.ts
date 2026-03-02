import { type bitcoinBroadcasterBroadcastSuccess } from '@chainflip/processor/131/bitcoinBroadcaster/broadcastSuccess';
import { type ethereumBroadcasterBroadcastSuccess } from '@chainflip/processor/131/ethereumBroadcaster/broadcastSuccess';
import { type arbitrumBroadcasterBroadcastSuccess } from '@chainflip/processor/141/arbitrumBroadcaster/broadcastSuccess';
import { type solanaBroadcasterBroadcastSuccess } from '@chainflip/processor/160/solanaBroadcaster/broadcastSuccess';
import { type assethubBroadcasterBroadcastSuccess } from '@chainflip/processor/190/assethubBroadcaster/broadcastSuccess';
import { unreachable } from '@chainflip/utils/assertion';
import * as base58 from '@chainflip/utils/base58';
import { hexToBytes, reverseBytes } from '@chainflip/utils/bytes';
import { ChainflipChain } from '@chainflip/utils/chainflip';
import z from 'zod';

type TxRefData = {
  [C in ChainflipChain]: {
    chain: C;
    data: z.output<
      {
        Bitcoin: typeof bitcoinBroadcasterBroadcastSuccess;
        Ethereum: typeof ethereumBroadcasterBroadcastSuccess;
        Arbitrum: typeof arbitrumBroadcasterBroadcastSuccess;
        Solana: typeof solanaBroadcasterBroadcastSuccess;
        Assethub: typeof assethubBroadcasterBroadcastSuccess;
      }[C]
    >['transactionRef'];
  };
}[ChainflipChain];

export const formatTxRef = (txRef: TxRefData): string => {
  switch (txRef.chain) {
    case 'Arbitrum':
    case 'Ethereum':
      return txRef.data;
    case 'Bitcoin':
      return reverseBytes(txRef.data.slice(2));
    case 'Assethub':
      return `${txRef.data.blockNumber}-${txRef.data.extrinsicIndex}`;
    case 'Solana':
      return base58.encode(hexToBytes(txRef.data));
    default:
      return unreachable(txRef, `unexpected chain: ${JSON.stringify(txRef)}`);
  }
};
