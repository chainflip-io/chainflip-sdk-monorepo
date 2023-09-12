import { executeSwap } from '@/shared/vault';
import cli from '../cli';

jest.mock('ethers');
jest.mock('@/shared/vault', () => ({
  executeSwap: jest
    .fn()
    .mockResolvedValue({ status: 1, hash: 'example-tx-hash' }),
}));

const localnet = `swap
  --wallet-private-key 0x2
  --chainflip-network localnet
  --src-asset ETH
  --dest-asset USDC
  --amount 1000000000
  --dest-address 0x0
  --src-token-contract-address 0x0
  --vault-contract-address 0x0
  --eth-network test`;

const localnetWithCcm = `swap
  --wallet-private-key 0x2
  --chainflip-network localnet
  --src-asset ETH
  --dest-asset USDC
  --amount 1000000000
  --dest-address 0x0
  --src-token-contract-address 0x0
  --vault-contract-address 0x0
  --eth-network test
  --message=0xdeadc0de
  --gas-budget=500000`;

describe('cli', () => {
  it.each([localnet, localnet.replace('localnet', 'sisyphos')])(
    'calls the correct handler with the proper arguments (swap)',
    async (args) => {
      const logSpy = jest.spyOn(global.console, 'log').mockImplementation();
      await cli(args.split(/\s+/));

      expect(executeSwap).toHaveBeenCalledTimes(1);
      expect(jest.mocked(executeSwap).mock.calls[0][0]).toHaveProperty(
        'ccmMetadata',
        undefined,
      );
      expect(jest.mocked(executeSwap).mock.calls).toMatchSnapshot();
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Transaction hash: example-tx-hash'),
      );
    },
  );

  it.each([localnetWithCcm, localnetWithCcm.replace('localnet', 'sisyphos')])(
    'calls the correct handler with the proper arguments (call)',
    async (args) => {
      const logSpy = jest.spyOn(global.console, 'log').mockImplementation();
      await cli(args.split(/\s+/));

      expect(executeSwap).toHaveBeenCalledTimes(1);
      expect(jest.mocked(executeSwap).mock.calls[0][0]).toHaveProperty(
        'ccmMetadata.message',
        '0xdeadc0de',
      );
      expect(jest.mocked(executeSwap).mock.calls[0][0]).toHaveProperty(
        'ccmMetadata.gasBudget',
        '500000',
      );
      expect(jest.mocked(executeSwap).mock.calls).toMatchSnapshot();
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Transaction hash: example-tx-hash'),
      );
    },
  );
});
