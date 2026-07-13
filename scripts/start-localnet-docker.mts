#!/usr/bin/env node --import=tsx --no-warnings

/* eslint-disable no-console */
// Docker counterpart to start-localnet.mts. Spins up the selected sdk-monorepo apps as
// isolated containers against a separately-running chainflip-backend localnet. Each
// container's logs are followable on their own:
//
//   pnpm localnet:docker --apps swap                 # the SDK swap service (:8081)
//   pnpm localnet:docker --apps all --migrate        # migrate the swap DB first, then start
//   pnpm localnet:docker --apps all -d               # detached; then `... logs -f <service>`
//   pnpm localnet:docker --list                      # show available apps/groups
//   pnpm localnet:docker --down                      # stop and remove the stack
//
// Groups map to compose profiles; individual services are named explicitly on the
// `up` command (compose starts a profiled service when named, even if its profile is
// inactive). Infra (postgres, redis, ingest, indexer-gateway) has no profile and
// always comes up.
import { spawn } from 'child_process';
import * as path from 'path';
import * as url from 'url';
import yargs from 'yargs/yargs';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');
const COMPOSE_FILE = 'docker/localnet/docker-compose.yml';

// Individual service -> the compose service name(s) it maps to.
const SERVICES = {
  swap: ['swap'],
} satisfies Record<string, string[]>;

type ServiceKey = keyof typeof SERVICES;

// Surface groups — these names are compose profiles in docker-compose.yml.
const GROUPS = {
  all: ['swap'],
} satisfies Record<string, ServiceKey[]>;

const ALIASES: Record<string, ServiceKey> = {
  'sdk-swap': 'swap',
};

const color = (n: number, s: string) => `\x1b[${n}m${s}\x1b[0m`;

const args = yargs(process.argv)
  .scriptName('localnet:docker')
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
  .option('detach', {
    alias: 'd',
    type: 'boolean',
    default: false,
    description: 'Start containers in the background',
  })
  .option('build', {
    type: 'boolean',
    default: false,
    description: 'Build/rebuild the shared dev image before starting',
  })
  .option('down', {
    type: 'boolean',
    default: false,
    description: 'Stop and remove the stack (ignores --apps), then exit',
  })
  .option('list', {
    type: 'boolean',
    default: false,
    description: 'List available groups and services, then exit',
  })
  .example('$0 --apps swap', 'Start the SDK swap service')
  .example('$0 --apps all --migrate', 'Migrate the swap DB, then start everything')
  .example('$0 --apps all -d', 'Start everything detached, then `logs -f swap`')
  .help()
  .parseSync();

const isGroup = (name: string): name is keyof typeof GROUPS => name in GROUPS;
const isService = (name: string): name is ServiceKey => name in SERVICES;

function printList() {
  console.log('Groups (compose profiles):');
  for (const [g, svcs] of Object.entries(GROUPS))
    console.log(`  ${g.padEnd(10)} -> ${svcs.join(', ')}`);
  console.log('\nServices:');
  for (const s of Object.keys(SERVICES)) console.log(`  ${s}`);
}

function compose(extra: string[]): Promise<void> {
  const cmd = 'docker';
  const cmdArgs = ['compose', '-f', COMPOSE_FILE, ...extra];
  console.log(color(90, `> ${cmd} ${cmdArgs.join(' ')}`));
  return new Promise((res, rej) => {
    const child = spawn(cmd, cmdArgs, { cwd: rootDir, stdio: 'inherit' });
    child.on('exit', (code) => (code === 0 ? res() : rej(new Error(`exit ${code}`))));
    child.on('error', rej);
  });
}

async function main() {
  if (args.list) {
    printList();
    return;
  }

  if (args.down) {
    await compose(['down', '--remove-orphans']);
    return;
  }

  const apps = (args.apps ?? [])
    .flatMap((a) => String(a).split(/[,\s]+/))
    .map((s) => s.trim())
    .filter(Boolean);

  if (apps.length === 0) {
    console.error('No apps selected. Try: pnpm localnet:docker --apps swap   (or --list)');
    process.exit(1);
  }

  // Resolve apps into compose profiles (for groups) and explicit service names.
  const profiles = new Set<string>();
  const serviceNames = new Set<string>();
  const unknown: string[] = [];
  for (const app of apps) {
    if (isGroup(app)) profiles.add(app);
    else if (isService(app)) SERVICES[app].forEach((n) => serviceNames.add(n));
    else if (ALIASES[app]) SERVICES[ALIASES[app]].forEach((n) => serviceNames.add(n));
    else unknown.push(app);
  }
  if (unknown.length) {
    console.error(`Unknown app(s): ${unknown.join(', ')}. Run --list to see options.`);
    process.exit(1);
  }

  if (args.build) {
    console.log(color(33, '> building shared dev image ...'));
    await compose(['build']);
  }

  if (args.migrate) {
    console.log(color(33, '> running migrations (profile: migrate) ...'));
    await compose(['--profile', 'migrate', 'run', '--rm', 'migrate']);
  }

  const profileArgs = [...profiles].flatMap((p) => ['--profile', p]);
  const upArgs = ['up', ...(args.detach ? ['-d'] : []), ...serviceNames];
  console.log(
    color(
      33,
      `> starting: ${[...profiles]
        .map((p) => `@${p}`)
        .concat([...serviceNames])
        .join(', ')}`,
    ),
  );
  await compose([...profileArgs, ...upArgs]);

  if (args.detach) {
    console.log(
      color(
        36,
        `\n> started. Follow a single service: docker compose -f ${COMPOSE_FILE} logs -f <service>`,
      ),
    );
  }
}

main().catch((err) => {
  console.error(color(31, `localnet:docker failed: ${err.message}`));
  process.exit(1);
});
