'use client';

import { LoadingCard } from '@components/common/LoadingCard';
import { IdlCard as InteractiveIdlCard } from '@features/idl';
import { Suspense } from 'react';

import { IdlCard } from '@/app/components/account/idl/IdlCard';

import { PageRenderer } from './page-renderer';

const isInteractiveIdlEnabled = process.env.NEXT_PUBLIC_INTERACTIVE_IDL_ENABLED === 'true';
export default function IdlPageClient({ address }: Readonly<{ address: string }>) {
    return <PageRenderer address={address} renderComponent={IdlRenderComponent} />;
}

function IdlRenderComponent({ address }: { address: string }) {
    return (
        <Suspense fallback={<LoadingCard message="Loading program IDL" />}>
            {isInteractiveIdlEnabled ? <InteractiveIdlCard programId={address} /> : <IdlCard programId={address} />}
        </Suspense>
    );
}
