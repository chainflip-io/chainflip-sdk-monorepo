import getConnectionHandler from '../getConnectionHandler';

describe(getConnectionHandler, () => {
  it('ignores malformed quote responses', () => {
    const { handler, quotes$ } = getConnectionHandler();
    const socket = { on: jest.fn(), data: { marketMaker: 'MM' } };
    const next = jest.fn();
    quotes$.subscribe(next);

    handler(socket as any);

    const callback = socket.on.mock.calls[1][1];

    callback({ id: 'string', limit_orders: [[-1, '123456']] });
    callback({ id: 'string', range_orders: [] });

    expect(next).toHaveBeenCalledTimes(1);
  });
});
