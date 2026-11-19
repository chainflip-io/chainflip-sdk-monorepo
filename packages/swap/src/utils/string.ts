export enum Comparison {
  Less = -1,
  Equal,
  Greater,
}

export const compareNumericStrings = (a: string, b: string): Comparison => {
  const bigintA = BigInt(a);
  const bigintB = BigInt(b);
  if (bigintA < bigintB) return Comparison.Less;
  if (bigintA > bigintB) return Comparison.Greater;
  return Comparison.Equal;
};

export const parseOrigin = (origin: string | undefined) => {
  if (!origin) return undefined;

  try {
    const parsed = new URL(origin).origin;
    return parsed !== 'null' && parsed.length <= 255 ? parsed : undefined;
  } catch {
    return undefined;
  }
};
