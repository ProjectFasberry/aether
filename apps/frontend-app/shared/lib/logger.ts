type NoopLogger = {
  log: (...args: any[]) => void;
  info: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  error: (...args: any[]) => void;
  withTag: (tag: string) => NoopLogger;
}

const createNoopLogger = (): NoopLogger => ({
  log: (...args: any[]) => console.log(...args),
  info: (...args: any[]) => console.info(...args),
  warn: (...args: any[]) => console.warn(...args),
  error: (...args: any[]) => console.error(...args),
  withTag: () => createNoopLogger(),
});

export const logger = import.meta.env.DEV
  ? await import("consola").then(d => d.createConsola())
  : createNoopLogger()
