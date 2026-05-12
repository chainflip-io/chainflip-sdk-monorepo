import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { inspectError } from '../logger.js';

describe(inspectError, () => {
  it('handles a generic Error', () => {
    const err = new Error('something went wrong');
    const result = inspectError(err);
    expect(result).toEqual({ name: 'Error', message: 'something went wrong', stack: err.stack });
  });

  it('handles an Error subclass', () => {
    class CustomError extends Error {
      constructor(msg: string) {
        super(msg);
        this.name = 'CustomError';
      }
    }
    const err = new CustomError('custom');
    const result = inspectError(err);
    expect(result).toEqual({ name: 'CustomError', message: 'custom', stack: err.stack });
  });

  it('handles a ZodError', () => {
    const result = z.object({ age: z.number() }).safeParse({ age: 'not-a-number' });
    expect(result.success).toBe(false);
    const err = (result as Extract<typeof result, { success: false }>).error;
    const inspected = inspectError(err);
    expect(inspected).toMatchObject({
      name: 'ZodError',
      issues: expect.arrayContaining([
        expect.objectContaining({ code: 'invalid_type', path: ['age'] }),
      ]),
    });
    expect(inspected).not.toHaveProperty('stack');
  });

  it('handles a Prisma error with code and meta', () => {
    const err = Object.assign(new Error('Unique constraint failed'), {
      clientVersion: '5.0.0',
      code: 'P2002',
      meta: { target: ['email'] },
    });
    const result = inspectError(err);
    expect(result).toEqual({
      name: 'Error',
      message: 'Unique constraint failed',
      stack: err.stack,
      code: 'P2002',
      meta: { target: ['email'] },
    });
  });

  it('handles a Prisma error without optional code and meta', () => {
    const err = Object.assign(new Error('Connection failed'), { clientVersion: '5.0.0' });
    const result = inspectError(err);
    expect(result).toEqual({
      name: 'Error',
      message: 'Connection failed',
      stack: err.stack,
    });
    expect(result).not.toHaveProperty('code');
    expect(result).not.toHaveProperty('meta');
  });

  it('handles a plain string', () => {
    expect(inspectError('oops')).toBe('oops');
  });

  it('handles a plain object', () => {
    expect(inspectError({ reason: 'timeout' })).toEqual({ reason: 'timeout' });
  });

  it('handles null', () => {
    expect(inspectError(null)).toBeNull();
  });

  it('handles undefined', () => {
    expect(inspectError(undefined)).toBeNull();
  });

  it('handles a number', () => {
    expect(inspectError(42)).toBe(42);
  });

  it('converts bigint values to numbers', () => {
    const result = inspectError({ amount: BigInt(999) });
    expect(result).toEqual({ amount: 999 });
  });
});
