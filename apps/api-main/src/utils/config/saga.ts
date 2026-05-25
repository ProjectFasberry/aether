export type TransactionalTask<T = unknown> = {
  name: string
  execute: (signal: AbortSignal) => Promise<T>;
  rollback?: (signal: AbortSignal) => Promise<unknown>;
}

export async function executeSaga<T>(
  tasks: TransactionalTask<T>[]
) {
  const controller = new AbortController();

  const completedTasks: TransactionalTask<T>[] = [];
  const results: T[] = [];

  try {
    for (const task of tasks) {
      if (controller.signal.aborted) {
        throw new Error("Saga was aborted but a new task was attempted.");
      }

      const result = await task.execute(controller.signal);

      completedTasks.push(task);
      results.push(result);
    }

    return { status: "success" as const, results };
  } catch (e) {
    controller.abort();

    for (let i = completedTasks.length - 1; i >= 0; i--) {
      const taskToRollback = completedTasks[i];

      if (taskToRollback.rollback) {
        try {
          console.log(`[Saga] Rolling back: ${taskToRollback.name}`);

          await taskToRollback.rollback(
            new AbortController().signal
          );
        } catch (e) {
          if (e instanceof Error) {
            console.error(e);
          }
        }
      }
    }

    return { status: "error" as const, error: e };
  }
}