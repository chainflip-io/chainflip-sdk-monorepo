import { Server } from 'socket.io';
import Quoter from '../Quoter';

describe(Quoter, () => {
  it('ignores malformed quote responses', () => {
    const fakeServer = { on: jest.fn() };

    const quoter = new Quoter(fakeServer as unknown as Server);

    expect(fakeServer.on).toHaveBeenCalledWith('connection', expect.any(Function));

    const handler = fakeServer.on.mock.calls[0][1];

    const socket = { on: jest.fn(), data: { marketMaker: 'MM' } };
    const next = jest.fn();
    // eslint-disable-next-line dot-notation
    quoter['quotes$'].subscribe(next);

    handler(socket as any);

    const callback = socket.on.mock.calls[1][1];

    callback({ request_id: 'string', legs: [[[-1, '123456']]] });
    callback({ request_id: 'string', range_orders: [] });

    expect(next).toHaveBeenCalledTimes(1);
  });
});
