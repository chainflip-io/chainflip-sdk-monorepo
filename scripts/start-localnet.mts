#!/usr/bin/env node --import=tsx --trace-uncaught --no-warnings

/* eslint-disable no-console */
// Spin up selected sdk-monorepo apps against the running chainflip-backend localnet.
//
//   pnpm localnet --apps swap                # the SDK swap service (:8081)
//   pnpm localnet --apps all --migrate       # migrate the swap DB first, then start everything
//   pnpm localnet --list                     # show available apps/groups
//
// Apps may be surface groups or individual package names (comma- or space-separated).
// Each app runs its `dev:localnet` script.
import { spawn, type ChildProcess } from 'child_process';
import * as path from 'path';
import * as url from 'url';
import yargs from 'yargs/yargs';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

type ProcSpec = { label: string; dir: string; script: string };

// One process spec per entry (under packages/).
const SERVICES = {
  swap: [{ label: 'swap', dir: 'swap', script: 'dev:localnet' }],
} satisfies Record<string, ProcSpec[]>;

type ServiceKey = keyof typeof SERVICES;

// Surface groups expand to a set of services (deduped across groups when combined).
const GROUPS = {
  all: ['swap'],
} satisfies Record<string, ServiceKey[]>;

// Friendly aliases for individual services.
const ALIASES: Record<string, ServiceKey> = {
  'sdk-swap': 'swap',
};

const COLORS = [36, 32, 35, 33, 34, 31, 96, 92, 95, 93];
const color = (n: number, s: string) => `\x1b[${n}m${s}\x1b[0m`;

const args = yargs(process.argv)
  .scriptName('localnet')
  .option('apps', {
    alias: 'a',
    type: 'array',
    string: true,
    default: ['all'],
    description: 'Surface groups or package names to start (comma- or space-separated)',
  })
  .option('migrate', {
    type: 'boolean',
    default: false,
    description: 'Run migrate:deploy:localnet for all DBs before starting',
  })
  .option('list', {
    type: 'boolean',
    default: false,
    description: 'List available groups and services, then exit',
  })
  .example('$0 --apps swap', 'Start the SDK swap service')
  .example('$0 --apps all --migrate', 'Migrate the swap DB, then start everything')
  .help()
  .parseSync();

const isGroup = (name: string): name is keyof typeof GROUPS => name in GROUPS;
const isService = (name: string): name is ServiceKey => name in SERVICES;

function printList() {
  console.log('Groups:');
  for (const [g, svcs] of Object.entries(GROUPS)) console.log(`  ${g.padEnd(10)} -> ${svcs.join(', ')}`);
  console.log('\nServices:');
  for (const s of Object.keys(SERVICES)) console.log(`  ${s}`);
}

function resolve(apps: string[]): { keys: ServiceKey[]; unknown: string[] } {
  const keys: ServiceKey[] = [];
  const unknown: string[] = [];
  for (const app of apps) {
    if (isGroup(app)) keys.push(...GROUPS[app]);
    else if (isService(app)) keys.push(app);
    else if (ALIASES[app]) keys.push(ALIASES[app]);
    else unknown.push(app);
  }
  return { keys: [...new Set(keys)], unknown };
}

function runToCompletion(cmd: string, cmdArgs: string[]): Promise<void> {
  return new Promise((res, rej) => {
    const child = spawn(cmd, cmdArgs, { cwd: rootDir, stdio: 'inherit' });
    child.on('exit', (code) =>
      code === 0 ? res() : rej(new Error(`${cmd} ${cmdArgs.join(' ')} -> exit ${code}`)),
    );
    child.on('error', rej);
  });
}

function startProc(spec: ProcSpec, c: number): ChildProcess {
  const tag = color(c, `[${spec.label}]`);
  const child = spawn('pnpm', ['-C', `packages/${spec.dir}`, 'run', spec.script], { cwd: rootDir });
  const pipe = (stream: NodeJS.ReadableStream, out: NodeJS.WritableStream) => {
    let buf = '';
    stream.on('data', (d: Buffer) => {
      buf += d.toString();
      const lines = buf.split('\n');
      buf = lines.pop() ?? '';
      for (const l of lines) out.write(`${tag} ${l}\n`);
    });
  };
  pipe(child.stdout!, process.stdout);
  pipe(child.stderr!, process.stderr);
  child.on('exit', (code) =>
    process.stdout.write(`${tag} ${color(90, `process exited (code ${code})`)}\n`),
  );
  return child;
}

if (args.list) {
  printList();
  process.exit(0);
}

if (args.migrate) {
  console.log(color(33, '> running migrate:deploy:localnet for all DBs ...'));
  await runToCompletion('pnpm', ['migrate:deploy:localnet']);
}

const apps = (args.apps ?? [])
  .flatMap((a) => String(a).split(/[,\s]+/))
  .map((s) => s.trim())
  .filter(Boolean);

if (apps.length === 0) {
  console.error('No apps selected. Try: pnpm localnet --apps swap   (or --list)');
  process.exit(1);
}

const { keys, unknown } = resolve(apps);
if (unknown.length) {
  console.error(`Unknown app(s): ${unknown.join(', ')}. Run --list to see options.`);
  process.exit(1);
}

const specs = keys.flatMap((k) => SERVICES[k]);
console.log(color(33, `> starting: ${specs.map((s) => s.label).join(', ')}`));

const children = specs.map((spec, i) => startProc(spec, COLORS[i % COLORS.length]));

let shuttingDown = false;
const shutdown = () => {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(color(33, '\n> shutting down ...'));
  for (const c of children) c.kill('SIGINT');
  setTimeout(() => {
    for (const c of children) c.kill('SIGKILL');
    process.exit(0);
  }, 5000);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
