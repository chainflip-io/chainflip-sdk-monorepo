import * as bitcoin from '@chainflip/bitcoin';
import { isValidSolanaAddress } from '@chainflip/solana/address';
import * as ss58 from '@chainflip/utils/ss58';
import * as ethers from 'ethers';
import { Chain, ChainflipNetwork } from '../enums';
import { assert } from '../guards';

export type AddressValidator = (address: string) => boolean;

export const validatePolkadotAddress: AddressValidator = (address) => {
  try {
    const encodedAddress = address.startsWith('0x')
      ? ss58.encode({ data: address as `0x${string}`, ss58Format: 1 })
      : address;

    ss58.decode(encodedAddress);
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
