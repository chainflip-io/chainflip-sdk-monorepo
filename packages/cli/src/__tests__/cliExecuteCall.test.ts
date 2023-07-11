import { schema } from '../cliExecuteSwap';
import { parseArgs } from '../utils';

const localnet = `call
  --wallet-private-key 0x2
  --chainflip-network localnet
  --dest-asset USDC
  --amount 1000000000
  --dest-address 0x0
  --message=0xdeadc0de
  --gasAmount=500000
  --src-token-contract-address 0x0
  --vault-contract-address 0x0
  --eth-network test`;

describe('schema', () => {
  it.each([localnet, localnet.replace('localnet', 'sisyphos')])(
    'properly parses the arguments',
    (args) => {
      expect(schema.parse(parseArgs(args.split(/\s+/)))).toMatchSnapshot();
    },
  );
});
