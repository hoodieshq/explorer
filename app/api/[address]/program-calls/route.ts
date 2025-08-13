import { desc, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { respondWithError } from '@/app/api/shared/errors';
import Logger from '@/app/utils/logger';
import { db } from '@/src/db/drizzle';
import { program_call_stats } from '@/src/db/schema';

type Params = {
    params: {
        address: string;
    };
};

export async function GET(request: Request, { params: { address } }: Params) {
    const { searchParams } = new URL(request.url);
    let limit: number;
    let offset: number;

    try {
        limit = parseInt(searchParams.get('limit') || '50');
        offset = parseInt(searchParams.get('offset') || '0');

        // Check for invalid values (NaN or negative numbers)
        if (isNaN(limit) || isNaN(offset) || limit < 0 || offset < 0) {
            return respondWithError(400);
        }
    } catch (error) {
        Logger.error(error);
        return respondWithError(400);
    }

    let data;
    try {
        data = await db
            .select()
            .from(program_call_stats)
            .where(eq(program_call_stats.program_address, address))
            .orderBy(desc(program_call_stats.calls_number))
            .limit(limit)
            .offset(offset);
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
