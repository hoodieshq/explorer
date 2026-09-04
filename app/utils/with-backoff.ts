import { Logger } from '@/app/shared/lib/logger';

export type BackoffOptions = {
    maxRetries?: number;
    initialDelay?: number;
    factor?: number;
    /** Which failures are worth another attempt. */
    shouldRetry?: (error: unknown) => boolean;
};

export function withBackoff<T>(fn: () => Promise<T>, options?: BackoffOptions): Promise<T> {
    const { maxRetries = 5, initialDelay = 300, factor = 2, shouldRetry = () => true } = options ?? {};

    async function attempt(retries: number, delay: number): Promise<T> {
        try {
            return await fn();
        } catch (error) {
            // The predicate is checked with the retry budget, not before it, so an exhausted budget and a
            // fatal error throw the same way and neither logs a retry it is not about to make.
            if (retries <= 0 || !shouldRetry(error)) throw error;
            Logger.debug('[utils:with-backoff] Retrying after failure', { delay, error, retriesLeft: retries });
            await new Promise(resolve => setTimeout(resolve, delay));
            return attempt(retries - 1, delay * factor);
        }
    }

    return attempt(maxRetries, initialDelay);
}
