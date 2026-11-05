'use client';

import { HomeHero, HomeSection, HomeStatsActivator, NetworkStats, SlotStrip, ToolsSection } from '@components/home';
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
                <div id="network" className="flex scroll-mt-24 flex-col gap-8 sm:gap-10">
                    <HomeSection>
                        <SlotStrip />
                    </HomeSection>

                    <HomeSection>
                        <NetworkStats />
                    </HomeSection>

                    <HomeSection>
                        <AlpenglowCard />
                    </HomeSection>

                    <HomeSection>
                        <LiveTransactionStatsCard />
                    </HomeSection>
                </div>

                <HomeSection>
                    <ToolsSection />
                </HomeSection>

                <div className="border-0 border-t border-solid border-dark-border pt-10">
                    <DeveloperResources />
                </div>
            </PageContainer>
        </StatsProvider>
    );
}
