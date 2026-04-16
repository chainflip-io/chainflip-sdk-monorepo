import { queues } from './initialize.js';
import env from '../config/env.js';
import baseLogger, { logStorage } from '../utils/logger.js';

const logger = baseLogger.child({ module: 'quote-events' });

function serializeBigInts(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => {
      if (typeof v === 'bigint') return [k, v.toString()];
      if (v === null || v === undefined) return [k, v];
      if (Array.isArray(v))
        return [
          k,
          v.map((item) => {
            if (typeof item === 'bigint') return item.toString();
            if (typeof item === 'object' && item !== null)
              return serializeBigInts(item as Record<string, unknown>);
            return item;
          }),
        ];
      if (typeof v === 'object') return [k, serializeBigInts(v as Record<string, unknown>)];
      return [k, v];
    }),
  );
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
      { delay: env.MESSAGE_QUEUE_DELAY_MS, removeOnComplete: true },
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
      { delay: env.MESSAGE_QUEUE_DELAY_MS, removeOnComplete: true },
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
      { delay: env.MESSAGE_QUEUE_DELAY_MS, removeOnComplete: true },
    )
    .catch((err) =>
      logger.error('failed to publish quote response sent', {
        error: err instanceof Error ? err.message : (JSON.stringify(err) ?? String(err)),
      }),
    );
}
