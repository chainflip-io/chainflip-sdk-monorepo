import { VoidSigner, ethers } from 'ethers';
import {
  fundStateChainAccount,
  executeRedemption,
  getMinimumFunding,
  getRedemptionDelay,
} from '@/shared/stateChainGateway';
import { FundingSDK } from '../index';

jest.mock('@/shared/stateChainGateway');

describe(FundingSDK, () => {
  const sdk = new FundingSDK({
    network: 'sisyphos',
    signer: new VoidSigner('0x0').connect(
      ethers.providers.getDefaultProvider('goerli'),
    ),
  });

  it('uses sisyphos as the default network', () => {
    expect(
      // @ts-expect-error it's private
      new FundingSDK({ signer: null as any }).options.network,
    ).toEqual('perseverance');
  });

  describe(FundingSDK.prototype.fundStateChainAccount, () => {
    it('approves the gateway and funds the account', async () => {
      await sdk.fundStateChainAccount('0x1234', '1000');

      expect(fundStateChainAccount).toHaveBeenCalledWith(
        '0x1234',
        '1000',
        // @ts-expect-error it's private
        sdk.options,
      );
    });
  });

  describe(FundingSDK.prototype.executeRedemption, () => {
    it('approves the gateway and funds the account', async () => {
      await sdk.executeRedemption('0x1234');

      expect(executeRedemption).toHaveBeenCalledWith(
        '0x1234',
        // @ts-expect-error it's private
        sdk.options,
      );
    });
  });

  describe(FundingSDK.prototype.getMinimumFunding, () => {
    it('approves the gateway and funds the account', async () => {
      jest
        .mocked(getMinimumFunding)
        .mockResolvedValue(ethers.BigNumber.from(1000));
      const funding = await sdk.getMinimumFunding();

      expect(getMinimumFunding).toHaveBeenCalledWith(
        // @ts-expect-error it's private
        sdk.options,
      );

      expect(funding).toEqual('1000');
    });
  });

  describe(FundingSDK.prototype.getRedemptionDelay, () => {
    it('approves the gateway and funds the account', async () => {
      jest.mocked(getRedemptionDelay).mockResolvedValue(1000);
      const delay = await sdk.getRedemptionDelay();

      expect(getRedemptionDelay).toHaveBeenCalledWith(
        // @ts-expect-error it's private
        sdk.options,
      );

      expect(delay).toEqual(1000);
    });
  });
});
