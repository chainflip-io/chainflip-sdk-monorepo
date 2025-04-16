import * as bitcoin from '@chainflip/bitcoin';
import { isValidSolanaAddress } from '@chainflip/solana';
import * as ss58 from '@chainflip/utils/ss58';
import { isHex } from '@chainflip/utils/string';
import * as ethers from 'ethers';
import { Chain, ChainflipNetwork } from '../enums';
import { assert } from '../guards';

export type AddressValidator = (address: string) => boolean;

export const validatePolkadotAddress: AddressValidator = (address) => {
  if (isHex(address)) return address.length === 66;

  try {
    ss58.decode(address);
    return true;
  } catch {
    return false;
  }
};

export const validateEvmAddress: AddressValidator = (address) => ethers.isAddress(address);

export const validateBitcoinMainnetAddress: AddressValidator = (address: string) =>
  bitcoin.isValidAddressForNetwork(address, 'mainnet');

export const validateBitcoinTestnetAddress: AddressValidator = (address: string) =>
  bitcoin.isValidAddressForNetwork(address, 'testnet');

export const validateBitcoinRegtestAddress: AddressValidator = (address: string) =>
  bitcoin.isValidAddressForNetwork(address, 'regtest');

export const validateSolanaAddress = isValidSolanaAddress;

const validators: Record<ChainflipNetwork | 'localnet', Record<Chain, AddressValidator>> = {
  mainnet: {
    Bitcoin: validateBitcoinMainnetAddress,
    Ethereum: validateEvmAddress,
    Polkadot: validatePolkadotAddress,
    Arbitrum: validateEvmAddress,
    Solana: validateSolanaAddress,
    Assethub: validatePolkadotAddress,
  },
  perseverance: {
    Bitcoin: validateBitcoinTestnetAddress,
    Ethereum: validateEvmAddress,
    Polkadot: validatePolkadotAddress,
    Arbitrum: validateEvmAddress,
    Solana: validateSolanaAddress,
    Assethub: validatePolkadotAddress,
  },
  sisyphos: {
    Bitcoin: validateBitcoinTestnetAddress,
    Ethereum: validateEvmAddress,
    Polkadot: validatePolkadotAddress,
    Arbitrum: validateEvmAddress,
    Solana: validateSolanaAddress,
    Assethub: validatePolkadotAddress,
  },
  backspin: {
    Bitcoin: validateBitcoinRegtestAddress,
    Ethereum: validateEvmAddress,
    Polkadot: validatePolkadotAddress,
    Arbitrum: validateEvmAddress,
    Solana: validateSolanaAddress,
    Assethub: validatePolkadotAddress,
  },
  localnet: {
    Bitcoin: validateBitcoinRegtestAddress,
    Ethereum: validateEvmAddress,
    Polkadot: validatePolkadotAddress,
    Arbitrum: validateEvmAddress,
    Solana: validateSolanaAddress,
    Assethub: validatePolkadotAddress,
  },
};

export const validateAddress = (
  chain: Chain,
  address: string,
  network: ChainflipNetwork | 'localnet',
): boolean => validators[network][chain](address);

export const assertValidAddress = (
  chain: Chain,
  address: string,
  network: ChainflipNetwork | 'localnet',
) =>
  assert(
    validators[network][chain](address),
    `Address "${address}" is not a valid "${chain}" address for "${network}"`,
  );
