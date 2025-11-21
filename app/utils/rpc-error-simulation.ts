const originalFetch = globalThis.fetch

export function setupRpcErrorSimulation(): void {
    globalThis.fetch = interceptedFetch;
}


// Could be getEpochInfo, getFirstAvailableBlock, getEpochSchedule, etc.
const RPC_METHODS_TO_FAIL = new Set(['getEpochInfo']);

function requestBodyContainsMethod(body: string | undefined, method: string): boolean {
    if (!body) return false;
    const parsed = JSON.parse(body);
    console.log({parsed});
    return parsed.method === method;
}

function interceptedFetch(
    input: RequestInfo | URL,
    init?: RequestInit
): Promise<Response> {

    const body = init?.body;
    const bodyStr = typeof body === 'string' ? body : body?.toString() || '';

    for (const method of RPC_METHODS_TO_FAIL) {
        if (requestBodyContainsMethod(bodyStr, method)) {
            console.error(`[SIMULATED RPC ERROR] Failing RPC call: ${method}`);
            throw new Error(`Simulated RPC error: ${method}`);
        }
    }

    return originalFetch(input, init);
}

