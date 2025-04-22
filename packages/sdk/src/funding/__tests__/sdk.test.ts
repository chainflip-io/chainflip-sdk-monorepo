/* eslint-disable max-classes-per-file */
import { VoidSigner } from 'ethers';
import { vi, describe, it, expect } from 'vitest';
import {
  fundStateChainAccount,
  executeRedemption,
  getMinimumFunding,
  getRedemptionDelay,
  getPendingRedemption,
  approveStateChainGateway,
} from '@/shared/stateChainGateway/index.js';
import { FundingSDK } from '../index.js';

vi.mock('@/shared/stateChainGateway/index.js');

class MockERC20 {
  async balanceOf(): Promise<bigint> {
    throw new Error('unmocked call');
  }
}

vi.mock('@/shared/abis/factories/ERC20__factory', () => ({
  ERC20__factory: class {
    static connect() {
      return new MockERC20();
    }
  },
}));

describe(FundingSDK, () => {
  const sdk = new FundingSDK({
    network: 'sisyphos',
    signer: new VoidSigner('0xcafebabe'),
  });

  it('uses perseverance as the default network', () => {
    // @ts-expect-error - private method
    expect(new FundingSDK({ signer: null as any }).options.network).toEqual('perseverance');
  });

  it('support mainnet', () => {
    // @ts-expect-error - private method
    expect(new FundingSDK({ signer: null as any, network: 'mainnet' }).options.network).toEqual(
      'mainnet',
    );
  });

  describe(FundingSDK.prototype.fundStateChainAccount, () => {
    it('approves the gateway and funds the account', async () => {
      vi.mocked(fundStateChainAccount).mockResolvedValueOnce({
        hash: '0xabcdef',
      } as any);

      await sdk.fundStateChainAccount('0x1234', 1000n);
      // @ts-expect-error - private method
      expect(fundStateChainAccount).toHaveBeenCalledWith('0x1234', 1000n, sdk.options, {});
    });
  });

  describe(FundingSDK.prototype.executeRedemption, () => {
    it('executes the redemption', async () => {
      vi.mocked(executeRedemption).mockResolvedValue({
        hash: '0xabcdef',
      } as any);

      const txHash = await sdk.executeRedemption('0x1234');
      expect(txHash).toEqual('0xabcdef');
      // @ts-expect-error - private method
      expect(executeRedemption).toHaveBeenCalledWith('0x1234', sdk.options, {});
    });
  });

  describe(FundingSDK.prototype.getMinimumFunding, () => {
    it('returns the minimum funding', async () => {
      vi.mocked(getMinimumFunding).mockResolvedValue(1000n);
      const funding = await sdk.getMinimumFunding();
      // @ts-expect-error - private method
      expect(getMinimumFunding).toHaveBeenCalledWith(sdk.options);
      expect(funding).toEqual(1000n);
    });
  });

  describe(FundingSDK.prototype.getRedemptionDelay, () => {
    it('returns the redemption delay', async () => {
      vi.mocked(getRedemptionDelay).mockResolvedValue(1000n);
      const delay = await sdk.getRedemptionDelay();
      // @ts-expect-error - private method
      expect(getRedemptionDelay).toHaveBeenCalledWith(sdk.options);
      expect(delay).toEqual(1000n);
    });
  });

  describe(FundingSDK.prototype.getFlipBalance, () => {
    it('gets the FLIP balance of an address', async () => {
      const spy = vi.spyOn(MockERC20.prototype, 'balanceOf').mockResolvedValueOnce(1000n);
      const balance = await sdk.getFlipBalance();
      expect(balance).toBe(1000n);
      expect(spy.mock.calls).toMatchInlineSnapshot(`
        [
          [
            "0xcafebabe",
          ],
        ]
      `);
    });
  });

  describe(FundingSDK.prototype.getPendingRedemption, () => {
    it('returns the pending redemption for an account', async () => {
      const redemption = {
        amount: 101n,
        redeemAddress: '0xcoffeebabe',
        startTime: 1695126000n,
        expiryTime: 1695129600n,
      };
      vi.mocked(getPendingRedemption).mockResolvedValue(redemption);
      const result = await sdk.getPendingRedemption('0xcoffeebabe');
      // @ts-expect-error - private method
      expect(getPendingRedemption).toHaveBeenCalledWith('0xcoffeebabe', sdk.options);
      expect(result).toEqual(redemption);
    });
  });

  describe(FundingSDK.prototype.approveStateChainGateway, () => {
    it('requests approval and returns the tx hash', async () => {
      vi.mocked(approveStateChainGateway).mockResolvedValueOnce({
        hash: '0xabcdef',
      } as any);
      const txHash = await sdk.approveStateChainGateway(1n, {});
      expect(txHash).toBe('0xabcdef');
    });
  });
});
