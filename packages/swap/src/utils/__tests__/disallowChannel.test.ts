import axios from 'axios';
import prisma from '../../client';
import env from '../../config/env';
import disallowChannel from '../disallowChannel';

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    create() {
      return this;
    },
    post: jest.fn(),
    interceptors: {
      request: {
        use: jest.fn(),
      },
    },
  },
}));

describe(disallowChannel, () => {
  const address = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';

  beforeEach(async () => {
    await prisma.blockedAddress.deleteMany();
  });

  it.each([
    [undefined, undefined],
    ['key', undefined],
    [undefined, 'secret'],
  ])("returns false if the env vars aren't set", async (key, secret) => {
    env.ELLIPTIC_API_KEY = key;
    env.ELLIPTIC_API_SECRET = secret;

    const result = await disallowChannel(address, undefined, undefined);

    expect(result).toBe(false);
  });

  describe('with the env vars', () => {
    beforeEach(() => {
      env.ELLIPTIC_API_KEY = 'key';
      env.ELLIPTIC_API_SECRET = 'secret';
    });

    it.each([8.9, null])('allows not too risky destination addresses', async (score) => {
      env.ELLIPTIC_RISK_SCORE_TOLERANCE = 9;
      jest.mocked(axios.post).mockResolvedValueOnce({ data: { risk_score: score } });
      const result = await disallowChannel(address, undefined, undefined);

      expect(result).toBe(false);
    });

    it('disallows too risky destination addresses', async () => {
      env.ELLIPTIC_RISK_SCORE_TOLERANCE = 9;
      jest.mocked(axios.post).mockResolvedValueOnce({ data: { risk_score: 9 } });
      const result = await disallowChannel(address, undefined, undefined);

      expect(result).toBe(true);
    });

    it('disallows too risky source addresses', async () => {
      env.ELLIPTIC_RISK_SCORE_TOLERANCE = 9;
      jest.mocked(axios.post).mockImplementation(
        (url, data: any) =>
          ({
            data: {
              risk_score: data.subject.hash === address ? 10 : null,
            },
          }) as any,
      );
      const result = await disallowChannel('0xokaddress', address, undefined);

      expect(result).toBe(true);
    });

    it('disallows too risky refund addresses', async () => {
      env.ELLIPTIC_RISK_SCORE_TOLERANCE = 9;
      jest.mocked(axios.post).mockImplementation(
        (url, data: any) =>
          ({
            data: {
              risk_score: data.subject.hash === address ? 10 : null,
            },
          }) as any,
      );
      const result = await disallowChannel('0xokaddress', '0xokaddress', address);

      expect(result).toBe(true);
    });

    it('returns false if the axios request rejects', async () => {
      jest.mocked(axios.post).mockRejectedValueOnce(Error('test'));
      const result = await disallowChannel(address, undefined, undefined);
      expect(result).toBe(false);
    });
  });

  it('disallows blocklist dest addresses', async () => {
    await prisma.blockedAddress.create({ data: { address } });

    expect(await disallowChannel(address, undefined, undefined)).toBe(true);
  });

  it('disallows blocklist src addresses', async () => {
    await prisma.blockedAddress.create({ data: { address } });

    expect(await disallowChannel('0xokaddress', address, undefined)).toBe(true);
  });

  it('disallows blocklist refund addresses', async () => {
    await prisma.blockedAddress.create({ data: { address } });

    expect(await disallowChannel('0xokaddress', '0xokaddress', address)).toBe(true);
  });
});
