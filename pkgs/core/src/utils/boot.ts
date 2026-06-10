import { logger } from "../constants/logger";

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
      const bootstrapLogger = logger.withTag("bootstrap")

      for (const step of pipeline) {
        bootstrapLogger.log(`Executing: ${step.name}`);
        await step.run();
      }

      bootstrapLogger.success(`Finished in ${Date.now() - start}ms`);
    }
  }
}
