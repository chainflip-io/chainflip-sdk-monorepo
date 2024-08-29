import { BitcoinAddress } from 'bech32-buffer';
import { ChainflipNetwork } from './enums';

type BitcoinNetwork = 'mainnet' | 'testnet' | 'regtest';

const bitcoinNetworkHrp = {
  mainnet: 'bc',
  testnet: 'tb',
  regtest: 'bcrt',
} as const satisfies Record<BitcoinNetwork, string>;

export const isValidSegwitAddressForNetwork = (address: string, bitcoinNetwork: BitcoinNetwork) => {
  if (!/^(bc|tb|bcrt)1/.test(address)) return false;

  return BitcoinAddress.decode(address).prefix === bitcoinNetworkHrp[bitcoinNetwork];
};

const prefixMap = {
  sisyphos: 'tb',
  perseverance: 'tb',
  backspin: 'bcrt',
  mainnet: 'bc',
} as const satisfies Record<ChainflipNetwork, string>;

export const encodeAddress = (address: `0x${string}`, network: ChainflipNetwork) =>
  new BitcoinAddress(prefixMap[network], 1, Buffer.from(address.slice(2), 'hex')).encode();
