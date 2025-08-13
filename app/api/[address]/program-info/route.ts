import { eq } from 'drizzle-orm';
import { db } from '@/src/db/drizzle';
import { program_stats } from '@/src/db/schema';
import { NextResponse } from 'next/server';
import { respondWithError } from '@/app/api/shared/errors';
import Logger from '@/app/utils/logger';

type Params = {
    params: {
        address: string;
    };
};

export async function GET(request: Request, { params: { address } }: Params) {
    let data;
    try {
        data = await db.select().from(program_stats).where(eq(program_stats.program_address, address));
    } catch (error) {
        Logger.error(error);
        return respondWithError(500);
    }

    return NextResponse.json(data, {
        headers: {
            'Cache-Control': 'no-store, max-age=0',
        },
    });
}
