import axios from 'axios';
import env from '@/swap/config/env';
import screenAddress, {
  addressBlacklist,
  checkChainalysis,
  checkInternalBlacklist,
} from '../screenAddress';

jest.mock('axios');

const sanctionedAddressMockResponse = {
  data: {
    identifications: [
      {
        category: 'sanctions',
        name: 'SANCTIONS: OFAC SDN Secondeye Solution 2021-04-15 72a5843cc08275c8171e582972aa4fda8c397b2a',
        description:
          'Pakistan-based Secondeye Solution (SES), also known as Forwarderz, is a synthetic identity document vendor that was added to the OFAC SDN list in April 2021.\n' +
          '\n' +
          'SES customers could buy fake identity documents to sign up for accounts with cryptocurrency exchanges, payment providers, banks, and more under false identities. According to the US Treasury Department, SES assisted the Internet Research Agency (IRA), the Russian troll farm that OFAC designated pursuant to E.O. 13848 in 2018 for interfering in the 2016 presidential election, in concealing its identity to evade sanctions.\n' +
          '\n' +
          'https://home.treasury.gov/news/press-releases/jy0126',
        url: 'https://home.treasury.gov/news/press-releases/jy0126',
      },
    ],
  },
};
const nonSanctionedAddressMockResponse = {
  data: { identifications: [] },
};
describe(checkChainalysis, () => {
  it('returns true if sanctions are found', async () => {
    env.CHAINALYSIS_API_KEY = 'test';
    jest.mocked(axios.get).mockResolvedValue(sanctionedAddressMockResponse);

    const result = await checkChainalysis('0x72a5843cc08275C8171E582972Aa4fDa8C397B2A');

    expect(result).toBe(true);
  });

  it('returns false if no API key is present', async () => {
    env.CHAINALYSIS_API_KEY = undefined;
    jest.mocked(axios.get).mockResolvedValue(nonSanctionedAddressMockResponse);

    const result = await checkChainalysis('0x72a5843cc08275C8171E582972Aa4fDa8C397B2A');

    expect(result).toBe(false);
  });

  it('returns false if parsing fails', async () => {
    env.CHAINALYSIS_API_KEY = 'test';
    jest.mocked(axios.get).mockResolvedValue({
      data: { ids: [] },
    });

    const result = await checkChainalysis('0x72a5843cc08275C8171E582972Aa4fDa8C397B2A');

    expect(result).toBe(false);
  });

  it('returns false if no sanctions are found', async () => {
    env.CHAINALYSIS_API_KEY = 'test';
    jest.mocked(axios.get).mockResolvedValue(nonSanctionedAddressMockResponse);

    const result = await checkChainalysis('0x72a5843cc08275C8171E582972Aa4fDa8C397B2A');

    expect(result).toBe(false);
  });

  it('returns false if the API call throws', async () => {
    env.CHAINALYSIS_API_KEY = 'test';
    jest.mocked(axios.get).mockRejectedValueOnce(new Error('test'));

    const result = await checkChainalysis('0x72a5843cc08275C8171E582972Aa4fDa8C397B2A');

    expect(result).toBe(false);
  });
});

describe(checkInternalBlacklist, () => {
  it('returns true if provided address is included in the blacklist', () => {
    if (addressBlacklist.length === 0) addressBlacklist[0] = '0x123'; // make tests pass in case the blacklist is empty

    const address = addressBlacklist[0];

    expect(checkInternalBlacklist(address)).toBe(true);
  });
  it('returns false if provided address is not included in the blacklist', () => {
    const address = 'not-included';

    expect(checkInternalBlacklist(address)).toBe(false);
  });
});

describe(screenAddress, () => {
  it('returns true if address is blacklisted internally', async () => {
    if (addressBlacklist.length === 0) addressBlacklist[0] = '0x123'; // make tests pass in case the blacklist is empty

    const address = addressBlacklist[0];
    jest.mocked(axios.get).mockResolvedValue(nonSanctionedAddressMockResponse);

    expect(await screenAddress(address)).toBe(true);
  });

  it('returns true if address is marked as sanctioned', async () => {
    const address = 'no-internal-blacklist-but-ofac-sanctioned';
    jest.mocked(axios.get).mockResolvedValue(sanctionedAddressMockResponse);

    expect(await screenAddress(address)).toBe(true);
  });

  it('returns false if address can not be found in the ofac list nor in the internal blacklist', async () => {
    const address = 'no-internal-blacklist-and-no-ofac-sanctioned';
    jest.mocked(axios.get).mockResolvedValue(nonSanctionedAddressMockResponse);

    expect(await screenAddress(address)).toBe(false);
  });
});
