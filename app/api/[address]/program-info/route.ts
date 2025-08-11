import { eq } from 'drizzle-orm';
import { db } from '@/src/db/drizzle';
import { program_stats } from "@/src/db/schema"
import { NextResponse } from 'next/server';

type Params = {
    params: {
        address: string;
    };
};

export async function GET(request: Request, { params: { address } }: Params) {
    const data =
        await db
            .select()
            .from(program_stats)
            .where(eq(program_stats.program_address, address))

    return NextResponse.json(data, {
        headers: {
            'Cache-Control': 'no-store, max-age=0'
        },
    });
}
