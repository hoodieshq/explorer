import { headers } from 'next/headers';
import { db } from '@/src/db/drizzle';
import { program_stats } from '@/src/db/schema';
import { NextResponse } from 'next/server';
import { DuneClient, ResultsResponse, RunQueryArgs } from '@duneanalytics/client-sdk';
import { respondWithError } from '@/app/api/shared/errors';
import Logger from '@/app/utils/logger';

const { DUNE_API_KEY, DUNE_PROGRAM_STATS_MV_ID, CRON_SECRET } = process.env;

if (!DUNE_API_KEY || !DUNE_PROGRAM_STATS_MV_ID || !CRON_SECRET) {
    throw new Error('DUNE_API_KEY, DUNE_PROGRAM_CALLS_MV_ID, CRON_SECRET must be set in environment variables');
}

export async function GET() {
    const headersList = headers();
    if (headersList.get('Authorization') !== `Bearer ${CRON_SECRET}`) {
        Logger.error(new Error('Unauthorized access attempt'));
        return respondWithError(401);
    }

    let executionResult: ResultsResponse;
    try {
        const client = new DuneClient(DUNE_API_KEY ?? '');
        const opts: RunQueryArgs = { queryId: Number(DUNE_PROGRAM_STATS_MV_ID) };
        executionResult = await client.getLatestResult(opts);
    } catch (error) {
        Logger.error(error);
        return respondWithError(500);
    }

    try {
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
    } catch (error) {
        Logger.error(error);
        return respondWithError(500);
    }

    return NextResponse.json({ ok: true });
}
