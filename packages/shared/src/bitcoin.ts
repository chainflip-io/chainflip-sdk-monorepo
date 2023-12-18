import { BitcoinAddress } from 'bech32-buffer';

export const isValidSegwitAddress = (address: string) => {
  const hrp = /^(bc|tb|bcrt)1/.exec(address)?.[1];
  if (!hrp) return false;

  return BitcoinAddress.decode(address).prefix === hrp;
};

export const encodeAddress = (address: `0x${string}`) => {
  let hrp: 'bc' | 'bcrt' | 'tb';

  switch (process.env.CHAINFLIP_NETWORK) {
    case 'sisyphos':
    case 'perseverance':
      hrp = 'tb';
      break;
    case 'backspin':
      hrp = 'bcrt';
      break;
    case 'berghain':
    case 'mainnet':
      hrp = 'bc';
      break;
    default:
      hrp = 'tb';
  }

  // encode script pubkey
  return new BitcoinAddress(
    hrp,
    1,
    Buffer.from(address.slice(2), 'hex'),
  ).encode();
};
