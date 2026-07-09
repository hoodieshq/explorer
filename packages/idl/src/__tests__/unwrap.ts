import { expect } from 'vitest';

import type { Result } from '../errors';

// Infer the ok-arm value from the whole Result — inferring `T` through the tuple union leaks `undefined`.
type OkValue<R> = R extends readonly [undefined, infer T] ? T : never;

/** Assert an ok Result (fails the test via `expect` on error) and return its value. */
export function unwrap<R extends Result<unknown>>(result: R): OkValue<R> {
    const [error, value] = result;
    expect(error).toBeUndefined();
    if (value === undefined) throw error ?? new Error('unwrap: expected an ok Result'); // narrows value off undefined
    return value as OkValue<R>;
}
