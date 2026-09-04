/**
 * Every task's value, in input order, with `undefined` in place of any task that had not settled within
 * `timeoutMs`.
 *
 * One timer for the batch rather than one per task: they all start together, so a shared budget and
 * per-task budgets expire at the same instant, and there is a single handle to clear. Clearing matters on
 * the fast path - an uncleared timer holds the event loop open for the rest of the budget after the work is
 * already done.
 *
 * A task that runs out of budget is abandoned, not cancelled: nothing here can stop work already in flight,
 * so pair this with an `AbortSignal` when the task supports one.
 *
 * Rejections propagate, exactly as `Promise.all` does. Catch inside each task when the batch has to survive
 * one failure.
 * @param timeoutMs - How long the whole batch gets
 * @param tasks - Already-started promises, so they run concurrently rather than in sequence
 */
export async function settleWithin<T>(timeoutMs: number, tasks: readonly Promise<T>[]): Promise<(T | undefined)[]> {
    let timer: ReturnType<typeof setTimeout> | undefined;

    const elapsed = new Promise<undefined>(resolve => {
        timer = setTimeout(() => resolve(undefined), timeoutMs);
    });

    try {
        return await Promise.all(tasks.map(task => Promise.race([task, elapsed])));
    } finally {
        clearTimeout(timer);
    }
}
