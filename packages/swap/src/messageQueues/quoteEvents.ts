import { queues } from './initialize.js';
import env from '../config/env.js';
import baseLogger, { logStorage } from '../utils/logger.js';

const logger = baseLogger.child({ module: 'quote-events' });
const ONE_DAY_IN_SECONDS = 3600 * 24;

function serializeBigInts(obj: Record<string, unknown>): Record<string, unknown> {
  const serialize = (v: unknown): unknown => {
    if (typeof v === 'bigint') return v.toString();
    if (v === null || v === undefined) return v;
    if (Array.isArray(v)) return v.map(serialize);
    if (typeof v === 'object') {
      return Object.fromEntries(
        Object.entries(v as Record<string, unknown>).map(([k, val]) => [k, serialize(val)]),
      );
    }
    return v;
  };
  return serialize(obj) as Record<string, unknown>;
}

export function publishQuoteRequestReceived(data: Record<string, unknown>): void {
  const queue = queues.quoteEvents;
  if (!queue) return;

  const quoteRequestId = logStorage.getStore();

  queue
    .add(
      'quote.request.received',
      {
        ...serializeBigInts(data),
        quoteRequestId,
        timestamp: new Date().toISOString(),
        event: 'quote.request.received',
      },
      { delay: env.MESSAGE_QUEUE_DELAY_MS, removeOnComplete: { age: ONE_DAY_IN_SECONDS } },
    )
    .catch((err) =>
      logger.error('failed to publish quote request received', {
        error: err instanceof Error ? err.message : (JSON.stringify(err) ?? String(err)),
      }),
    );
}

export function publishQuoteRequestFailed(data: Record<string, unknown>, error: unknown): void {
  const queue = queues.quoteEvents;
  if (!queue) return;

  const quoteRequestId = logStorage.getStore();

  queue
    .add(
      'quote.request.failed',
      {
        ...serializeBigInts(data),
        quoteRequestId,
        timestamp: new Date().toISOString(),
        event: 'quote.request.failed',
        error: error instanceof Error ? error.message : String(error),
      },
      { delay: env.MESSAGE_QUEUE_DELAY_MS, removeOnComplete: { age: ONE_DAY_IN_SECONDS } },
    )
    .catch((err) =>
      logger.error('failed to publish quote request failed', {
        error: err instanceof Error ? err.message : (JSON.stringify(err) ?? String(err)),
      }),
    );
}

export function publishQuoteResponseSent(data: Record<string, unknown>): void {
  const queue = queues.quoteEvents;
  if (!queue) return;

  const quoteRequestId = logStorage.getStore();

  queue
    .add(
      'quote.response.sent',
      {
        ...serializeBigInts(data),
        quoteRequestId,
        timestamp: new Date().toISOString(),
        event: 'quote.response.sent',
      },
      { delay: env.MESSAGE_QUEUE_DELAY_MS, removeOnComplete: { age: ONE_DAY_IN_SECONDS } },
    )
    .catch((err) =>
      logger.error('failed to publish quote response sent', {
        error: err instanceof Error ? err.message : (JSON.stringify(err) ?? String(err)),
      }),
    );
}

export function publishQuoteOrderReceived(data: Record<string, unknown>): void {
  const queue = queues.quoteEvents;
  if (!queue) return;

  queue
    .add(
      'quote.order.received',
      {
        ...serializeBigInts(data),
        timestamp: new Date().toISOString(),
        event: 'quote.order.received',
      },
      { delay: env.MESSAGE_QUEUE_DELAY_MS, removeOnComplete: { age: ONE_DAY_IN_SECONDS } },
    )
    .catch((err) =>
      logger.error('failed to publish quote order received', {
        error: err instanceof Error ? err.message : (JSON.stringify(err) ?? String(err)),
      }),
    );
}

export function publishQuoteOrderTimeout(data: Record<string, unknown>): void {
  const queue = queues.quoteEvents;
  if (!queue) return;

  queue
    .add(
      'quote.order.timeout',
      {
        ...serializeBigInts(data),
        timestamp: new Date().toISOString(),
        event: 'quote.order.timeout',
      },
      { delay: env.MESSAGE_QUEUE_DELAY_MS, removeOnComplete: { age: ONE_DAY_IN_SECONDS } },
    )
    .catch((err) =>
      logger.error('failed to publish quote order timeout', {
        error: err instanceof Error ? err.message : (JSON.stringify(err) ?? String(err)),
      }),
    );
}

export function publishQuoteOrderError(data: Record<string, unknown>): void {
  const queue = queues.quoteEvents;
  if (!queue) return;

  queue
    .add(
      'quote.order.error',
      {
        ...serializeBigInts(data),
        timestamp: new Date().toISOString(),
        event: 'quote.order.error',
      },
      { delay: env.MESSAGE_QUEUE_DELAY_MS, removeOnComplete: { age: ONE_DAY_IN_SECONDS } },
    )
    .catch((err) =>
      logger.error('failed to publish quote order error', {
        error: err instanceof Error ? err.message : (JSON.stringify(err) ?? String(err)),
      }),
    );
}
