import { logger } from "@repo/shared/utils/logger";
import { isError } from "@repo/shared/lib/helpers";

export type BootstrapStep = {
  name: string;
  run: (() => Promise<void> | void);
  critical?: boolean;
}

export const createBootstrap = (
  pipeline: BootstrapStep[]
) => {
  return {
    async start() {
      const start = Date.now();

      for (const { run, critical = false, name } of pipeline) {
        try {
          logger.info(`Executing: ${name}`);
          await run();
        } catch (e) {
          logger.error(`Error executing: ${name} ${isError(e) ? e.message : String(e)}`);

          if (critical) {
            process.exit(1);
          }
        }
      }

      logger.info(`Finished in ${Date.now() - start}ms`);
    }
  }
}
