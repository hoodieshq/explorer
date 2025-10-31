'use client';

import { LoadingCard } from '@components/common/LoadingCard';
import { Suspense } from 'react';

import { IdlCard } from '@/app/components/account/idl/IdlCard';
import { IdlCard as InteractiveIdlCard } from '@/app/features/idl';

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
