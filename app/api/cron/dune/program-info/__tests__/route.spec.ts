import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'

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

// Mock DB transaction and tables
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
  process.env.DUNE_PROGRAM_STATS_MV_ID = '67890';
  mockGetLatestResult.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/cron/dune/program-info', () => {
  it('rejects when unauthorized', async () => {
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
            calling_programs_count: 2,
            transaction_references_count: 5,
          },
        ],
      },
    });

    const { GET } = await importRoute();
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(mockGetLatestResult).toHaveBeenCalledWith({ queryId: 67890 });
  });
});
