import { eq, desc } from 'drizzle-orm';
import { db } from '@/src/db/drizzle';
import { program_call_stats } from "@/src/db/schema"
import { NextResponse } from 'next/server';

type Params = {
    params: {
        address: string;
    };
};

export async function GET(request: Request, { params: { address } }: Params) {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const data =
        await db
            .select()
            .from(program_call_stats)
            .where(eq(program_call_stats.program_address, address))
            .orderBy(desc(program_call_stats.calls_number))
            .limit(limit)
            .offset(offset);

    return NextResponse.json(data, {
        headers: {
            'Cache-Control': 'no-store, max-age=0'
        },
    });
}
