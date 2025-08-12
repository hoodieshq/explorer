import { headers } from 'next/headers';
import { db } from '@/src/db/drizzle';
import { program_stats } from '@/src/db/schema';
import { NextResponse } from 'next/server';
import { DuneClient, RunQueryArgs } from '@duneanalytics/client-sdk';

const { DUNE_API_KEY, DUNE_PROGRAM_STATS_MV_ID } = process.env;

export async function GET() {
    const headersList = await headers();
    if (headersList.get('Authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const client = new DuneClient(DUNE_API_KEY ?? '');
    const opts: RunQueryArgs = { queryId: Number(DUNE_PROGRAM_STATS_MV_ID) };
    const executionResult = await client.getLatestResult(opts);

    await db.transaction(async tx => {
        await tx.delete(program_stats).execute();

        const values = await Promise.all(
            (executionResult.result?.rows ?? []).map(async row => ({
                program_address: String(row.program_address),
                calling_programs_count: Number(row.calling_programs_count),
                transaction_references_count: Number(row.transaction_references_count),
            }))
        );

        await tx.insert(program_stats).values(values).execute();
    });

    return NextResponse.json({ ok: true });
}
