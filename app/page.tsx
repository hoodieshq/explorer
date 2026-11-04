'use client';

import {
    HomeHero,
    HomeSection,
    HomeStatsActivator,
    HowItWorks,
    NetworkStats,
    SlotStrip,
    ToolsSection,
} from '@components/home';
import { LiveTransactionStatsCard } from '@components/LiveTransactionStatsCard';
import { AlpenglowCard } from '@features/alpenglow';
import { StatsProvider } from '@providers/stats';

import { PageContainer } from '@/app/shared/ui/page-container/PageContainer';

import { DeveloperResources } from './components/DeveloperResources';

export default function Page() {
    return (
        <StatsProvider>
            <HomeStatsActivator />

            <HomeHero />

            <PageContainer className="mt-10 flex flex-col gap-10 sm:mt-14 sm:gap-14">
                <div id="network" className="flex scroll-mt-24 flex-col gap-10 sm:gap-14">
                    <HomeSection>
                        <SlotStrip />
                    </HomeSection>

                    <HomeSection>
                        <NetworkStats />
                    </HomeSection>
                </div>

                <HomeSection>
                    <ToolsSection />
                </HomeSection>

                <HomeSection>
                    <HowItWorks />
                </HomeSection>

                {/* Secondary content: the TPS history chart (longer window than the bento), network upgrade
                    status, and developer links. */}
                <div className="flex flex-col gap-6 border-0 border-t border-solid border-dark-border pt-10">
                    <LiveTransactionStatsCard />
                    <AlpenglowCard />
                    <DeveloperResources />
                </div>
            </PageContainer>
        </StatsProvider>
    );
}
