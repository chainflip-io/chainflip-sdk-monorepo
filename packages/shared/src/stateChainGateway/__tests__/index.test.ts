/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/lines-between-class-members */
/* eslint-disable max-classes-per-file */
import { BytesLike, VoidSigner } from 'ethers';
import { describe, it, expect, vi } from 'vitest';
import { ERC20 } from '../../abis/index.js';
import { checkAllowance } from '../../contracts.js';
import {
  executeRedemption,
  fundStateChainAccount,
  getMinimumFunding,
  getPendingRedemption,
  getRedemptionDelay,
} from '../index.js';

class MockGateway {
  constructor(readonly address: string) {}
  async getAddress(): Promise<any> {
    return this.address;
  }
  async fundStateChainAccount(): Promise<any> {}
  async executeRedemption(): Promise<any> {}
  async getMinimumFunding(): Promise<any> {}
  async getPendingRedemption(_nodeID: BytesLike): Promise<any> {}
  async REDEMPTION_DELAY(): Promise<any> {}
}

vi.mock('../../abis/factories/StateChainGateway__factory', () => ({
  StateChainGateway__factory: class {
    static connect(address: string) {
      return new MockGateway(address);
    }
  },
}));

vi.mock('../../contracts', async (importOriginal) => {
  const original = (await importOriginal()) as object;
  return {
    ...original,
    checkAllowance: vi.fn(),
  };
});

const signerOptions = {
  network: 'sisyphos',
  signer: new VoidSigner('0x0'),
} as const;

describe(fundStateChainAccount, () => {
  it('approves the gateway and funds the account', async () => {
    const checkSpy = vi.mocked(checkAllowance).mockResolvedValue({
      allowance: 100000n,
      hasSufficientAllowance: true,
      erc20: {} as unknown as ERC20,
    });
    const waitMock = vi.fn().mockResolvedValue({ status: 1 });
    const fundSpy = vi.spyOn(MockGateway.prototype, 'fundStateChainAccount').mockResolvedValue({
      hash: '0x522acf618f67b097672cbcd5f1d0051cf352b7b4dfec4d51b647ce81b33461e4',
      wait: waitMock,
    });

    expect(await fundStateChainAccount('0x1234', 1000n, signerOptions, {})).toMatchObject({
      hash: '0x522acf618f67b097672cbcd5f1d0051cf352b7b4dfec4d51b647ce81b33461e4',
    });

    expect(checkSpy).toHaveBeenCalled();
    expect(waitMock).toHaveBeenCalledWith(undefined);
    expect(fundSpy).toHaveBeenCalledWith('0x1234', 1000n, {
      nonce: undefined,
    });
  });
});

describe(executeRedemption, () => {
  it('executes the redemption', async () => {
    const waitMock = vi.fn().mockResolvedValue({ status: 1 });
    const executeSpy = vi.spyOn(MockGateway.prototype, 'executeRedemption').mockResolvedValue({
      hash: '0x522acf618f67b097672cbcd5f1d0051cf352b7b4dfec4d51b647ce81b33461e4',
      wait: waitMock,
    });

    expect(await executeRedemption('0x1234', signerOptions, { nonce: 1 })).toMatchObject({
      hash: '0x522acf618f67b097672cbcd5f1d0051cf352b7b4dfec4d51b647ce81b33461e4',
    });

    expect(executeSpy.mock.lastCall).toMatchSnapshot();
  });
});

describe(getMinimumFunding, () => {
  it('retrieves minimum funding amount', async () => {
    vi.spyOn(MockGateway.prototype, 'getMinimumFunding').mockResolvedValue(1234n);
    expect(await getMinimumFunding(signerOptions)).toEqual(1234n);
  });
});

describe(getRedemptionDelay, () => {
  it('retrieves the redemption delay', async () => {
    vi.spyOn(MockGateway.prototype, 'REDEMPTION_DELAY').mockResolvedValue(1234);
    expect(await getRedemptionDelay(signerOptions)).toEqual(1234);
  });
});

describe(getPendingRedemption, () => {
  it('retrieves the pending redemption for the account', async () => {
    const redemption = {
      amount: 101n,
      redeemAddress: '0xcoffeebabe',
      startTime: 1695126000n,
      expiryTime: 1695129600n,
    };
    const spy = vi
      .spyOn(MockGateway.prototype, 'getPendingRedemption')
      .mockResolvedValue(redemption);

    expect(await getPendingRedemption('0x1234', signerOptions)).toEqual(redemption);
    expect(spy).toBeCalledWith('0x1234');
  });
  it('returns undefined if there is no pending redemption', async () => {
    const redemption = {
      amount: 0n,
      redeemAddress: '0x0000000000000000000000000000000000000000',
      startTime: 0n,
      expiryTime: 0n,
    };
    const spy = vi
      .spyOn(MockGateway.prototype, 'getPendingRedemption')
      .mockResolvedValue(redemption);

    expect(await getPendingRedemption('0x1234', signerOptions)).toBeUndefined();
    expect(spy).toBeCalledWith('0x1234');
  });
});
