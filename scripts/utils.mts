import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as util from 'util';

export const execAsync = util.promisify(exec);

export async function* ls(dirname: string): AsyncGenerator<string> {
  const entities = await fs.promises.readdir(dirname, { withFileTypes: true });

  for (const entity of entities) {
    const newPath = path.join(dirname, entity.name);
    if (entity.isDirectory()) {
      yield* ls(newPath);
    } else if (entity.isFile()) {
      yield newPath;
    }
  }
}

export async function* enumerate<T>(
  iterable: AsyncIterable<T>,
): AsyncGenerator<[number, T]> {
  let i = 0;
  for await (const item of iterable) {
    yield [i, item];
    i += 1;
  }
}
