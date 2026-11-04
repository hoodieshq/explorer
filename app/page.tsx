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
import { UpcomingFeatures } from '@features/feature-gate';
import { StatsProvider } from '@providers/stats';

import { PageContainer } from '@/app/shared/ui/page-container/PageContainer';

import { DeveloperResources } from './components/DeveloperResources';
import { StakingSection } from './components/StakingSection';

export default function Page() {
    return (
        <StatsProvider>
            <HomeStatsActivator />
            <PageContainer className="mt-4 flex flex-col gap-10 sm:gap-14">
                <HomeHero />

                <HomeSection>
                    <SlotStrip />
                </HomeSection>

                <HomeSection>
                    <NetworkStats />
                </HomeSection>

                <HomeSection>
                    <ToolsSection />
                </HomeSection>

                <HomeSection>
                    <HowItWorks />
                </HomeSection>

                {/* Legacy sections, preserved below the redesigned content. */}
                <div className="flex flex-col gap-6 border-0 border-t border-solid border-dark-border pt-10">
                    <StakingSection />
                    <LiveTransactionStatsCard />
                    <AlpenglowCard />
                    <DeveloperResources />
                    <UpcomingFeatures />
                </div>
            </PageContainer>
        </StatsProvider>
    );
}
