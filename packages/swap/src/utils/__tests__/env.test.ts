import { beforeEach, describe, expect, it } from 'vitest';
import env from '../../config/env.js';
import { assertRouteEnabled } from '../env.js';

describe(assertRouteEnabled, () => {
  beforeEach(() => {
    env.FULLY_DISABLED_INTERNAL_ASSETS = new Set([]);
    env.DISABLED_DEPOSIT_INTERNAL_ASSETS = new Set([]);
    env.DISABLED_DESTINATION_INTERNAL_ASSETS = new Set([]);
  });

  it('throws if srcAsset is fully disabled', () => {
    env.FULLY_DISABLED_INTERNAL_ASSETS = new Set(['Flip']);

    expect(() => assertRouteEnabled({ srcAsset: 'Flip', destAsset: 'Sol' })).toThrowError(
      'Asset Flip is disabled',
    );
  });

  it('throws if destAsset is fully disabled', () => {
    env.FULLY_DISABLED_INTERNAL_ASSETS = new Set(['Flip']);

    expect(() => assertRouteEnabled({ srcAsset: 'Sol', destAsset: 'Flip' })).toThrowError(
      'Asset Flip is disabled',
    );
  });

  it('throws only if srcAsset is disabled', () => {
    env.DISABLED_DEPOSIT_INTERNAL_ASSETS = new Set(['Flip']);

    expect(() => assertRouteEnabled({ srcAsset: 'Flip', destAsset: 'Sol' })).toThrowError(
      'Asset Flip is disabled',
    );

    expect(() => assertRouteEnabled({ srcAsset: 'Sol', destAsset: 'Flip' })).not.toThrowError();
  });

  it('throws only if destAsset is disabled', () => {
    env.DISABLED_DESTINATION_INTERNAL_ASSETS = new Set(['Flip']);

    expect(() => assertRouteEnabled({ srcAsset: 'Flip', destAsset: 'Sol' })).not.toThrowError();
    expect(() => assertRouteEnabled({ destAsset: 'Flip', srcAsset: 'Sol' })).toThrowError(
      'Asset Flip is disabled',
    );
  });
});
