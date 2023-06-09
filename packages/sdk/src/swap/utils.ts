export const unreachable = (x: never, message: string): never => {
  throw new Error(`${message}: ${x}`);
};
