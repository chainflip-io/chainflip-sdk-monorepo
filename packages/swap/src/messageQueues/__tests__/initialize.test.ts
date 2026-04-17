import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('bullmq', () => ({
  Queue: vi.fn().mockImplementation((name: string) => ({
    name,
    close: vi.fn(),
  })),
}));

vi.mock('ioredis', () => ({
  Redis: vi.fn().mockImplementation(() => ({
    quit: vi.fn(),
  })),
}));

vi.mock('../../utils/function.js', () => ({
  handleExit: vi.fn(),
}));

describe('initialize', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates quoteEvents queue when ENABLE_QUOTE_MESSAGE_QUEUE is true and REDIS_URL is set', async () => {
    vi.doMock('../../config/env.js', () => ({
      default: {
        ENABLE_QUOTE_MESSAGE_QUEUE: true,
        REDIS_URL: 'redis://localhost:6379',
      },
    }));

    const { queues, initializeQueues } = await import('../initialize.js');
    initializeQueues();

    expect(queues.quoteEvents).toBeDefined();
    expect(queues.quoteEvents?.name).toBe('quote-events');
  });

  it('does not create quoteEvents queue when ENABLE_QUOTE_MESSAGE_QUEUE is false', async () => {
    vi.doMock('../../config/env.js', () => ({
      default: {
        ENABLE_QUOTE_MESSAGE_QUEUE: false,
        REDIS_URL: 'redis://localhost:6379',
      },
    }));

    const { queues, initializeQueues } = await import('../initialize.js');
    initializeQueues();

    expect(queues.quoteEvents).toBeUndefined();
  });

  it('does not create quoteEvents queue when initializeQueues is not called', async () => {
    vi.doMock('../../config/env.js', () => ({
      default: {
        ENABLE_QUOTE_MESSAGE_QUEUE: true,
        REDIS_URL: 'redis://localhost:6379',
      },
    }));

    const { queues } = await import('../initialize.js');

    expect(queues.quoteEvents).toBeUndefined();
  });

  it('throws when initializeQueues is called without REDIS_URL', async () => {
    vi.doMock('../../config/env.js', () => ({
      default: {
        ENABLE_QUOTE_MESSAGE_QUEUE: true,
        REDIS_URL: undefined,
      },
    }));

    const { initializeQueues } = await import('../initialize.js');

    expect(() => initializeQueues()).toThrow(
      'cannot create queue "quote-events" without REDIS_URL',
    );
  });
});
