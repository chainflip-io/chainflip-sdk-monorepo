import { schema } from '../cliFundStateChainAccount';
import { parseArgs } from '../utils';

const localnet = `fund-state-chain-account
--account-id 0x1
--chainflip-network localnet
--amount 1000000
--wallet-private-key 0x2
--state-chain-manager-contract-address 0x3
--flip-token-contract-address 0x4
--eth-network test`;

describe('schema', () => {
  it.each([localnet, localnet.replace('localnet', 'sisyphos')])(
    'properly parses the arguments',
    (args) => {
      expect(schema.parse(parseArgs(args.split(/\s+/)))).toMatchSnapshot();
    },
  );
});
