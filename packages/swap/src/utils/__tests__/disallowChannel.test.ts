import { AxiosError } from 'axios';
import { AML } from 'elliptic-sdk';
import { describe, it, beforeEach, expect, vi } from 'vitest';
import prisma from '../../client';
import env from '../../config/env';
import disallowChannel from '../disallowChannel';
import logger from '../logger';

vi.mock('elliptic-sdk', () => {
  const _AML = vi.fn();
  _AML.prototype.client = {
    post: vi.fn(),
  };
  return { AML: _AML };
});

vi.mock('../logger');

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
      vi.mocked(AML.prototype.client.post).mockResolvedValueOnce({ data: { risk_score: score } });
      const result = await disallowChannel(address, undefined, undefined);

      expect(result).toBe(false);
    });

    it('disallows to risky destination addresses', async () => {
      env.ELLIPTIC_RISK_SCORE_TOLERANCE = 9;
      vi.mocked(AML.prototype.client.post).mockResolvedValueOnce({ data: { risk_score: 9 } });
      const result = await disallowChannel(address, undefined, undefined);
      expect(result).toBe(true);
    });

    it('disallows to risky source addresses', async () => {
      env.ELLIPTIC_RISK_SCORE_TOLERANCE = 9;
      vi.mocked(AML.prototype.client.post).mockImplementation((_, data: any) =>
        Promise.resolve({
          data: {
            risk_score: data.subject.hash === address ? 10 : null,
          },
        }),
      );

      const result = await disallowChannel('0xokaddress', address, undefined);

      expect(result).toBe(true);
    });

    it('disallows to risky refund addresses', async () => {
      env.ELLIPTIC_RISK_SCORE_TOLERANCE = 9;
      vi.mocked(AML.prototype.client.post).mockImplementation((_, data: any) =>
        Promise.resolve({
          data: {
            risk_score: data.subject.hash === address ? 10 : null,
          },
        }),
      );

      const result = await disallowChannel('0xokaddress', '0xokaddress', address);

      expect(result).toBe(true);
    });

    it('returns false if the axios request rejects', async () => {
      vi.mocked(AML.prototype.client.post).mockRejectedValueOnce(Error('test'));
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

  it("doesn't log 404s as errors", async () => {
    const error = new AxiosError('', '404');
    error.status = 404;
    vi.mocked(AML.prototype.client.post).mockRejectedValueOnce(error);
    await disallowChannel(address, undefined, undefined);

    expect(logger.warn).toHaveBeenCalled();
  });
});
