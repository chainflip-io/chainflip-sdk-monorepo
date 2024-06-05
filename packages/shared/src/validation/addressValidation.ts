import * as bitcoin from '@chainflip/bitcoin';
import * as ss58 from '@chainflip/utils/ss58';
import * as ethers from 'ethers';
import { Chain, ChainflipNetwork } from '../enums';
import { assert } from '../guards';

export type AddressValidator = (address: string) => boolean;

export const validatePolkadotAddress: AddressValidator = (address) => {
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

const validators: Record<ChainflipNetwork | 'localnet', Record<Chain, AddressValidator>> = {
  mainnet: {
    Bitcoin: validateBitcoinMainnetAddress,
    Ethereum: validateEvmAddress,
    Polkadot: validatePolkadotAddress,
    Arbitrum: validateEvmAddress,
  },
  perseverance: {
    Bitcoin: validateBitcoinTestnetAddress,
    Ethereum: validateEvmAddress,
    Polkadot: validatePolkadotAddress,
    Arbitrum: validateEvmAddress,
  },
  sisyphos: {
    Bitcoin: validateBitcoinTestnetAddress,
    Ethereum: validateEvmAddress,
    Polkadot: validatePolkadotAddress,
    Arbitrum: validateEvmAddress,
  },
  backspin: {
    Bitcoin: validateBitcoinRegtestAddress,
    Ethereum: validateEvmAddress,
    Polkadot: validatePolkadotAddress,
    Arbitrum: validateEvmAddress,
  },
  localnet: {
    Bitcoin: validateBitcoinRegtestAddress,
    Ethereum: validateEvmAddress,
    Polkadot: validatePolkadotAddress,
    Arbitrum: validateEvmAddress,
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
