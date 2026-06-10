declare global {
  type Awaitable<T> = T | Promise<T>;
  type Gettable<T> = T | (() => T)
}

export {}
