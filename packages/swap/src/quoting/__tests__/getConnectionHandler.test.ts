import getConnectionHandler from '../getConnectionHandler';

describe(getConnectionHandler, () => {
  it('ignores malformed quote responses', () => {
    const { handler, quotes$ } = getConnectionHandler();
    const socket = { on: jest.fn(), data: { marketMaker: 'MM' } };
    const next = jest.fn();
    quotes$.subscribe(next);

    handler(socket as any);

    const callback = socket.on.mock.calls[1][1];

    callback({ request_id: 'string', legs: [[[-1, '123456']]] });
    callback({ request_id: 'string', range_orders: [] });

    expect(next).toHaveBeenCalledTimes(1);
  });
});
