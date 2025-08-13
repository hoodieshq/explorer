import { DuneClient, ResultsResponse, RunQueryArgs } from '@duneanalytics/client-sdk';
import { Cluster } from '@utils/cluster';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

import { respondWithError } from '@/app/api/shared/errors';
import { fetchProgramMetadataIdl, programNameFromIdl } from '@/app/components/instruction/codama/getProgramMetadataIdl';
import Logger from '@/app/utils/logger';
import { PROGRAM_INFO_BY_ID } from '@/app/utils/programs';
import { db } from '@/src/db/drizzle';
import { program_call_stats } from '@/src/db/schema';

const { DUNE_API_KEY, DUNE_PROGRAM_CALLS_MV_ID, CRON_SECRET } = process.env;

if (!DUNE_API_KEY || !DUNE_PROGRAM_CALLS_MV_ID || !CRON_SECRET) {
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
        const opts: RunQueryArgs = { queryId: Number(DUNE_PROGRAM_CALLS_MV_ID) };
        executionResult = await client.getLatestResult(opts);
    } catch (error) {
        Logger.error(error);
        return respondWithError(500);
    }

    try {
        await db.transaction(async tx => {
            await tx.delete(program_call_stats).execute();

            const values = await Promise.all(
                (executionResult.result?.rows ?? []).map(async row => ({
                    address: String(row.address),
                    calls_number: Number(row.calls_number),
                    description: String(row.program_description),
                    name: await buildProgramName(row),
                    program_address: String(row.program_address),
                }))
            );

            await tx.insert(program_call_stats).values(values).execute();
        });
    } catch (error) {
        Logger.error(error);
        return respondWithError(500);
    }

    return NextResponse.json({ ok: true });
}

async function buildProgramName(row: Record<string, any>): Promise<string> {
    if (PROGRAM_INFO_BY_ID[row.address]) {
        return String(PROGRAM_INFO_BY_ID[row.address].name);
    }
    const pmName = await getPmName(String(row.address));
    if (pmName !== null && pmName !== undefined && pmName !== '') {
        return String(pmName);
    }
    return String(row.program_name);
}

async function getPmName(address: string): Promise<string> {
    const idl = await fetchProgramMetadataIdl(address, 'https://api.mainnet-beta.solana.com', Cluster.MainnetBeta);

    // if there’s no IDL, just return “None”
    if (!idl) {
        return '';
    }

    // otherwise run your existing parser, and still fall back to “None”
    try {
        return programNameFromIdl(idl) ?? '';
    } catch (error) {
        Logger.error(error, address);
        return '';
    }
}
