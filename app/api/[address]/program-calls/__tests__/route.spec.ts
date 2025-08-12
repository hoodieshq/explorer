import { describe, it, expect, vi, afterEach } from 'vitest';

// Mocks scoped variables
let mockResultRows: any[] = [];
let capturedLimit: number | undefined;
let capturedOffset: number | undefined;

vi.mock('@/src/db/drizzle', () => {
    const chain: any = {
        _rows: () => mockResultRows,
        _limit: undefined as number | undefined,
        _offset: undefined as number | undefined,
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockImplementation((n: number) => {
            capturedLimit = n;
            chain._limit = n;
            return chain;
        }),
        offset: vi.fn().mockImplementation((n: number) => {
            capturedOffset = n;
            chain._offset = n;
            return Promise.resolve(chain._rows());
        }),
    };
    return { db: chain };
});

// Import dynamically inside tests so mocks are applied before module load
async function importRoute() {
    return await import('../route');
}

afterEach(() => {
    vi.clearAllMocks();
    mockResultRows = [];
    capturedLimit = undefined;
    capturedOffset = undefined;
});

describe('GET /api/[address]/program-calls', () => {
    it('returns data with provided limit/offset and proper headers', async () => {
        mockResultRows = [
            { program_address: 'Prog1', address: 'Caller1', name: 'Name1', description: 'Desc1', calls_number: 10 },
            { program_address: 'Prog1', address: 'Caller2', name: 'Name2', description: 'Desc2', calls_number: 5 },
        ];

        const { GET } = await importRoute();

        const request = new Request('http://localhost:3000/api/Prog1/program-calls?limit=10&offset=5');
        const res = await GET(request, { params: { address: 'Prog1' } });

        expect(res.status).toBe(200);
        expect(res.headers.get('cache-control')).toBe('no-store, max-age=0');

        const data = await res.json();
        expect(data).toEqual(mockResultRows);

        expect(capturedLimit).toBe(10);
        expect(capturedOffset).toBe(5);
    });

    it('applies default limit=50 and offset=0 when not provided', async () => {
        mockResultRows = [];

        const { GET } = await importRoute();

        const request = new Request('http://localhost:3000/api/Prog1/program-calls');
        const res = await GET(request, { params: { address: 'Prog1' } });

        expect(res.status).toBe(200);
        expect(capturedLimit).toBe(50);
        expect(capturedOffset).toBe(0);
    });
});
