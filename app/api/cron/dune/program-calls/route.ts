import { headers } from 'next/headers';
import { db } from '@/src/db/drizzle';
import { program_call_stats } from '@/src/db/schema';
import { NextResponse } from 'next/server';
import { DuneClient, RunQueryArgs } from '@duneanalytics/client-sdk';
import { Cluster } from '@utils/cluster';
import { fetchProgramMetadataIdl, programNameFromIdl } from '@/app/components/instruction/codama/getProgramMetadataIdl';
import { PROGRAM_INFO_BY_ID } from '@/app/utils/programs';

const { DUNE_API_KEY, DUNE_PROGRAM_CALLS_MV_ID } = process.env;

export async function GET() {
    const headersList = await headers();
    if (headersList.get('Authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const client = new DuneClient(DUNE_API_KEY ?? '');
    const opts: RunQueryArgs = { queryId: Number(DUNE_PROGRAM_CALLS_MV_ID) };
    const executionResult = await client.getLatestResult(opts);

    await db.transaction(async tx => {
        await tx.delete(program_call_stats).execute();

        const values = await Promise.all(
            (executionResult.result?.rows ?? []).map(async row => ({
                program_address: String(row.program_address),
                name: await buildProgramName(row),
                description: String(row.program_description),
                address: String(row.address),
                calls_number: Number(row.calls_number),
            }))
        );

        await tx.insert(program_call_stats).values(values).execute();
    });

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
    } catch (err) {
        console.error('[getPmName] failed to parse IDL for', address, err);
        return '';
    }
}
