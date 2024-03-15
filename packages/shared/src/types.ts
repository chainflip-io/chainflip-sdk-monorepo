export type Optional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>;

export type Required<T, K extends keyof T> = T & { [P in K]-?: T[P] };
