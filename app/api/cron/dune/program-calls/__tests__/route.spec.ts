import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';

// Mock next/headers to provide Authorization
vi.mock('next/headers', () => {
    return {
        headers: vi.fn().mockResolvedValue({
            get: (key: string) => (key.toLowerCase() === 'authorization' ? `Bearer test-secret` : null),
        }),
    };
});

// Mock Dune client
const mockGetLatestResult = vi.fn();
vi.mock('@duneanalytics/client-sdk', () => {
    return {
        DuneClient: vi.fn().mockImplementation(() => ({ getLatestResult: mockGetLatestResult })),
    };
});

// Mock program metadata helpers to keep name resolution deterministic
vi.mock('@/app/components/instruction/codama/getProgramMetadataIdl', () => ({
    fetchProgramMetadataIdl: vi.fn().mockResolvedValue(null),
    programNameFromIdl: vi.fn().mockReturnValue(undefined),
}));

// Mock programs map
vi.mock('@/app/utils/programs', () => ({ PROGRAM_INFO_BY_ID: {} }));

// Mock DB transaction and tables
const mockDelete = vi.fn().mockReturnThis();
const mockInsert = vi.fn().mockReturnThis();
const mockValues = vi.fn().mockReturnThis();
const mockExecute = vi.fn().mockResolvedValue(undefined);

vi.mock('@/src/db/drizzle', () => {
    return {
        db: {
            transaction: vi.fn(async (cb: any) => {
                const tx = {
                    delete: () => ({ execute: mockExecute }),
                    insert: () => ({ values: () => ({ execute: mockExecute }) }),
                } as any;
                await cb(tx);
            }),
        },
    };
});

async function importRoute() {
    return await import('../route');
}

beforeEach(() => {
    process.env.CRON_SECRET = 'test-secret';
    process.env.DUNE_API_KEY = 'dummy';
    process.env.DUNE_PROGRAM_CALLS_MV_ID = '12345';
    mockGetLatestResult.mockReset();
});

afterEach(() => {
    vi.clearAllMocks();
});

describe('GET /api/cron/dune/program-calls', () => {
    it('rejects when unauthorized', async () => {
        // Override header mock for this test to return wrong token
        const { headers } = await import('next/headers');
        (headers as any).mockResolvedValueOnce({ get: () => 'Bearer wrong' });

        const { GET } = await importRoute();
        const res = await GET();
        expect(res.status).toBe(401);
    });

    it('ingests rows and returns ok true', async () => {
        mockGetLatestResult.mockResolvedValueOnce({
            result: {
                rows: [
                    {
                        program_address: 'Prog1',
                        program_description: 'desc',
                        program_name: 'fallbackName',
                        calls_number: 42,
                        address: 'Caller1',
                    },
                ],
            },
        });

        const { GET } = await importRoute();
        const res = await GET();
        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ ok: true });
        expect(mockGetLatestResult).toHaveBeenCalledWith({ queryId: 12345 });
    });
});
