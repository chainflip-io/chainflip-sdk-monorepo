export type Semver = `${string}.${string}.${string}`;

type Handler<T extends string, U> = {
  name: T;
  handler: U;
};

enum Cmp {
  Lt = -1,
  Eq = 0,
  Gt = 1,
}

const compareSemver = (a: Semver, b: Semver) => {
  const aParts = a.split('.').map(Number);
  const bParts = b.split('.').map(Number);

  for (let i = 0; i < 3; i += 1) {
    if (aParts[i] > bParts[i]) return Cmp.Gt;
    if (aParts[i] < bParts[i]) return Cmp.Lt;
  }

  return Cmp.Eq;
};

const cache = new Map<string, Semver>();

export const parseSemver = (specId: string): Semver => {
  // the specId is in the format of "chainflip-node@<specId>"
  const cached = cache.get(specId);
  if (cached) return cached;
  const specNumber = Number.parseInt(specId.split('@')[1], 10);
  if (Number.isNaN(specNumber)) throw new Error('Invalid specId');
  const n = specNumber.toString();
  const desiredLenPerPart = Math.ceil(n.length / 3);
  const padded = n.padStart(desiredLenPerPart * 3, '0');
  const major = padded.slice(0, desiredLenPerPart);
  const minor = padded.slice(desiredLenPerPart, desiredLenPerPart * 2);
  const patch = padded.slice(desiredLenPerPart * 2, desiredLenPerPart * 3);
  const semver = `${Number(major)}.${Number(minor)}.${Number(patch)}` as const;
  cache.set(specId, semver);
  return semver;
};

export class HandlerMap<T extends string, U> {
  private cache = new Map<`${T}-${Semver}`, U | null>();

  private handlersByName: Record<T, { spec: Semver; handler: U }[]>;

  constructor(
    specs: {
      spec: Semver;
      handlers: Handler<T, U>[];
    }[],
  ) {
    this.handlersByName = specs
      .toSorted((a, b) => compareSemver(b.spec, a.spec))
      .flatMap(({ spec, handlers }) =>
        handlers.map(({ name, handler }) => ({ spec, name, handler })),
      )
      .reduce(
        (acc, { spec, name, handler }) => {
          acc[name] ??= [];
          acc[name].push({ spec, handler });

          return acc;
        },
        {} as HandlerMap<T, U>['handlersByName'],
      );
  }

  getHandler(name: T, specId: string): U | null {
    const specNumber = parseSemver(specId);

    const handlerName = `${name}-${specNumber}` as const;

    let handler: U | null | undefined = this.cache.get(handlerName);

    if (handler !== undefined) return handler;

    const handlers = this.handlersByName[name] ?? [];

    const index = handlers.findIndex(({ spec }) => compareSemver(spec, specNumber) !== Cmp.Gt);

    handler = index === -1 ? null : handlers[index].handler;

    this.cache.set(handlerName, handler);

    return handler;
  }
}
