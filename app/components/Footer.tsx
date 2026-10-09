'use client';

import { CustomIdlHighlightPicker } from '@entities/idl';
import { useClusterPath } from '@utils/url';
import Link from 'next/link';

import { CustomIdlCatalogTrigger } from '@/app/features/custom-idl-catalog';
import { FeedbackTrigger } from '@/app/features/feedback';
import { PageContainer } from '@/app/shared/ui/page-container/PageContainer';

export function Footer() {
    const tosPath = useClusterPath({ pathname: '/tos' });

    return (
        <footer className="border-0 border-t border-solid border-neutral-800">
            <PageContainer>
                <div className="flex flex-col gap-3 py-3 md:flex-row md:items-center md:justify-between md:py-5">
                    <span className="text-xs font-medium uppercase tracking-[0.72px] text-heavy-metal-400">
                        Solana explorer <span>(Beta)</span>
                    </span>
                    <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs tracking-[-0.24px] text-accent-700">
                        <FeedbackTrigger className="cursor-pointer border-0 bg-transparent p-0 text-inherit transition-colors hover:text-accent-500">
                            Feedback
                        </FeedbackTrigger>
                        <CustomIdlCatalogTrigger className="cursor-pointer border-0 bg-transparent p-0 text-inherit transition-colors hover:text-accent-500">
                            Custom IDLs
                        </CustomIdlCatalogTrigger>
                        {/* REVIEW(HOO-1971): review-only highlight switch; remove before the external PR. */}
                        <CustomIdlHighlightPicker />
                        <Link className="transition-colors hover:text-accent-500" href={tosPath}>
                            Terms of Services
                        </Link>
                    </nav>
                </div>
            </PageContainer>
        </footer>
    );
}
