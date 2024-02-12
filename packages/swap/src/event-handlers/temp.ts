import { Metadata, TypeRegistry } from '@polkadot/types';
import axios from 'axios';
import * as fs from 'fs/promises';

const getMetadata = async () => {
  const res = await axios.post('https://backspin-rpc.staging', {
    id: 1,
    jsonrpc: '2.0',
    method: 'state_getMetadata',
  });

  const registry = new TypeRegistry();
  const metadata = new Metadata(registry, res.data.result);
  registry.setMetadata(metadata);

  return metadata;
};

getMetadata().then(async (m) => {
  await fs.writeFile('metadata.json', JSON.stringify(m.toJSON()));
});
