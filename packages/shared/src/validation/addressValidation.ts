import * as bitcoin from '@chainflip/bitcoin';
import { isValidSolanaAddress } from '@chainflip/solana';
import { ChainflipChain, ChainflipNetwork } from '@chainflip/utils/chainflip';
import * as ss58 from '@chainflip/utils/ss58';
import { isHex } from '@chainflip/utils/string';
import { isValidTronAddress } from '@chainflip/utils/tron';
import * as ethers from 'ethers';
import { assert } from '../guards.js';

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

export const validateTronAddress: AddressValidator = isValidTronAddress;

const validators: Record<
  ChainflipNetwork | 'localnet',
  Record<ChainflipChain, AddressValidator>
> = {
  mainnet: {
    Bitcoin: validateBitcoinMainnetAddress,
    Ethereum: validateEvmAddress,
    Arbitrum: validateEvmAddress,
    Solana: validateSolanaAddress,
    Assethub: validatePolkadotAddress,
    Tron: validateTronAddress,
  },
  perseverance: {
    Bitcoin: validateBitcoinTestnetAddress,
    Ethereum: validateEvmAddress,
    Arbitrum: validateEvmAddress,
    Solana: validateSolanaAddress,
    Assethub: validatePolkadotAddress,
    Tron: validateTronAddress,
  },
  sisyphos: {
    Bitcoin: validateBitcoinTestnetAddress,
    Ethereum: validateEvmAddress,
    Arbitrum: validateEvmAddress,
    Solana: validateSolanaAddress,
    Assethub: validatePolkadotAddress,
    Tron: validateTronAddress,
  },
  backspin: {
    Bitcoin: validateBitcoinRegtestAddress,
    Ethereum: validateEvmAddress,
    Arbitrum: validateEvmAddress,
    Solana: validateSolanaAddress,
    Assethub: validatePolkadotAddress,
    Tron: validateTronAddress,
  },
  localnet: {
    Bitcoin: validateBitcoinRegtestAddress,
    Ethereum: validateEvmAddress,
    Arbitrum: validateEvmAddress,
    Solana: validateSolanaAddress,
    Assethub: validatePolkadotAddress,
    Tron: validateTronAddress,
  },
};

export const validateAddress = (
  chain: ChainflipChain,
  address: string,
  network: ChainflipNetwork | 'localnet',
): boolean => validators[network][chain](address);

export const assertValidAddress = (
  chain: ChainflipChain,
  address: string,
  network: ChainflipNetwork | 'localnet',
) =>
  assert(
    validators[network][chain](address),
    `Address "${address}" is not a valid "${chain}" address for "${network}"`,
  );
