import * as bitcoin from '@chainflip/bitcoin';
import { isValidSolanaAddress } from '@chainflip/solana/address';
import * as ss58 from '@chainflip/utils/ss58';
import * as ethers from 'ethers';
import { isValidSegwitAddressForNetwork } from '../bitcoin';
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

const validateBitcoinAddressForNetwork =
  (network: 'mainnet' | 'testnet' | 'regtest') => (address: string) => {
    try {
      return bitcoin.isValidAddressForNetwork(address, network);
    } catch {
      return isValidSegwitAddressForNetwork(address, network);
    }
  };

export const validateBitcoinMainnetAddress: AddressValidator =
  validateBitcoinAddressForNetwork('mainnet');

export const validateBitcoinTestnetAddress: AddressValidator =
  validateBitcoinAddressForNetwork('testnet');

export const validateBitcoinRegtestAddress: AddressValidator =
  validateBitcoinAddressForNetwork('regtest');

export const validateSolanaAddress = isValidSolanaAddress;

const validators: Record<ChainflipNetwork | 'localnet', Record<Chain, AddressValidator>> = {
  mainnet: {
    Bitcoin: validateBitcoinMainnetAddress,
    Ethereum: validateEvmAddress,
    Polkadot: validatePolkadotAddress,
    Arbitrum: validateEvmAddress,
    Solana: validateSolanaAddress,
  },
  perseverance: {
    Bitcoin: validateBitcoinTestnetAddress,
    Ethereum: validateEvmAddress,
    Polkadot: validatePolkadotAddress,
    Arbitrum: validateEvmAddress,
    Solana: validateSolanaAddress,
  },
  sisyphos: {
    Bitcoin: validateBitcoinTestnetAddress,
    Ethereum: validateEvmAddress,
    Polkadot: validatePolkadotAddress,
    Arbitrum: validateEvmAddress,
    Solana: validateSolanaAddress,
  },
  backspin: {
    Bitcoin: validateBitcoinRegtestAddress,
    Ethereum: validateEvmAddress,
    Polkadot: validatePolkadotAddress,
    Arbitrum: validateEvmAddress,
    Solana: validateSolanaAddress,
  },
  localnet: {
    Bitcoin: validateBitcoinRegtestAddress,
    Ethereum: validateEvmAddress,
    Polkadot: validatePolkadotAddress,
    Arbitrum: validateEvmAddress,
    Solana: validateSolanaAddress,
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
