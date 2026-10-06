import { logger } from "@repo/shared/utils/logger";
import { isError } from "@repo/shared/lib/helpers";

export type BootstrapStep = {
  name: string;
  run: (() => Promise<void> | void);
  critical?: boolean;
}

const bootLogger = logger.child({ name: "boot" });

export function createBootstrap(pipeline: BootstrapStep[]) {
  async function start() {
    const start = Date.now();

    for (const { run, critical = true, name } of pipeline) {
      try {
        bootLogger.info(`Executing: ${name}`);
        await run();
      } catch (e) {
        bootLogger.error(`Error executing: ${name} ${isError(e) ? e.message : String(e)}`);

        if (critical) {
          process.exit(1);
        }
      }
    }

    bootLogger.info(`Finished in ${Date.now() - start}ms`);
  }

  return {
    start
  }
}

export function definePipe(name: string, params: Omit<BootstrapStep, 'name'>): BootstrapStep {
  return {
    name,
    ...params,
  }
}
