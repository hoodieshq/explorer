import { describe, it, expect, vi, afterEach } from 'vitest';

let mockResultRows: any[] = [];

vi.mock('@/src/db/drizzle', () => {
    const chain: any = {
        _rows: () => mockResultRows,
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockImplementation(() => Promise.resolve(chain._rows())),
    };
    return { db: chain };
});

async function importRoute() {
    return await import('../route');
}

afterEach(() => {
    vi.clearAllMocks();
    mockResultRows = [];
});

describe('GET /api/[address]/program-info', () => {
    it('returns program info and sets cache-control header', async () => {
        mockResultRows = [{ program_address: 'Prog1', calling_programs_count: 3, transaction_references_count: 12 }];

        const { GET } = await importRoute();
        const request = new Request('http://localhost:3000/api/Prog1/program-info');

        const res = await GET(request, { params: { address: 'Prog1' } });
        expect(res.status).toBe(200);
        expect(res.headers.get('cache-control')).toBe('no-store, max-age=0');

        const data = await res.json();
        expect(data).toEqual(mockResultRows);
    });
});
