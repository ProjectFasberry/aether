import consola from "consola";

export type BootstrapStep = {
  name: string;
  run: (() => Promise<void> | void);
}

export const createBootstrap = (
  pipeline: BootstrapStep[]
) => {
  return {
    async start() {
      const start = Date.now();
      const bootstrapLogger = consola.withTag("bootstrap")

      for (const step of pipeline) {
        bootstrapLogger.log(`Executing: ${step.name}`);
        await step.run();
      }

      bootstrapLogger.success(`Finished in ${Date.now() - start}ms`);
    }
  }
}
