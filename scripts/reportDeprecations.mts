#!/usr/bin/env node --import=tsx --trace-uncaught --no-warnings
/* eslint-disable no-console */
/* eslint-disable no-continue */
import assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import { createInterface } from 'readline';
import * as url from 'url';
import { ls, enumerate } from './utils.mjs';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const majorMinorRegex = /^\d+\.\d+$/;

const isReleaseLte = (version: string, target: string) => {
  const [majorA, minorA] = version.split('.').map(Number);
  const [majorB, minorB] = target.split('.').map(Number);

  return majorA < majorB || (majorA === majorB && minorA <= minorB);
};

const checkDeprecations = async () => {
  // get the N-2 release
  const removableDeprecationVersion = JSON.parse(
    await fs.promises.readFile(path.join(__dirname, 'releases.json'), 'utf8'),
  )[2];

  assert(majorMinorRegex.test(removableDeprecationVersion));

  const deprecationRegex = /(?:\/\/ )?DEPRECATED\((\d+\.\d+)/;
  const deprecationsToRemove: Record<string, string[]> = {};
  const packages = path.join(root, 'packages');

  for await (const file of ls(packages)) {
    if (!file.endsWith('.ts') || /\.(d|test)\.ts$/.test(file)) continue;

    const iterable = enumerate(createInterface(fs.createReadStream(file, 'utf8')));

    for await (const [lineNumber, line] of iterable) {
      const match = deprecationRegex.exec(line);
      if (!match) continue;
      const [, version] = match;
      const shouldBeRemoved = isReleaseLte(version, removableDeprecationVersion);

      if (!shouldBeRemoved) continue;

      const pathToLog = `${file.replace(root, '').slice(1)}:${lineNumber + 1}:${match.index + 1}`;
      deprecationsToRemove[file] ??= [];
      deprecationsToRemove[file].push(pathToLog);
    }
  }

  return deprecationsToRemove;
};

const main = async () => {
  const deprecationsToRemove = await checkDeprecations();

  if (Object.keys(deprecationsToRemove).length === 0) return 0;

  console.error('Found deprecations to remove:');
  console.error(
    Object.values(deprecationsToRemove)
      .flatMap((l) => `  ${l}`)
      .join('\n'),
  );

  return 1;
};

process.exit(await main());
