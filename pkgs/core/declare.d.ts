declare global {
  type Awaitable<T> = T | Promise<T>;
}

export {}
