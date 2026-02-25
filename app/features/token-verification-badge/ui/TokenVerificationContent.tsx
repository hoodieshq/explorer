import { cva } from 'class-variance-authority';
import { Check, X } from 'react-feather';

import { cn } from '@/app/components/shared/utils';

import { EVerificationSource, VerificationSource } from '../lib/types';
import { ERiskLevel } from '../model/use-rugcheck';

const riskLevelVariants = cva('', {
    variants: {
        level: {
            [ERiskLevel.Danger]: 'e-text-red-400',
            [ERiskLevel.Good]: 'e-text-green-400',
            [ERiskLevel.Warning]: 'e-text-orange-400',
        },
    },
});

function RiskLevelText({ level, children }: { level?: ERiskLevel; children: React.ReactNode }) {
    return <span className={cn(riskLevelVariants({ level }))}>{children}</span>;
}

function VerificationBadge({ source }: { source: VerificationSource }) {
    if (source.name === EVerificationSource.RugCheck && source.score !== undefined) {
        return (
            <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="e-flex e-items-center e-gap-1 e-rounded-md e-border e-border-solid e-border-heavy-metal-600 e-bg-heavy-metal-800 e-p-1 hover:e-border-heavy-metal-500 hover:e-bg-heavy-metal-700"
            >
                {source.icon}
                <span className="e-text-xs e-text-gray-200">
                    {source.name} risk: {source.score}/100 -{' '}
                    <RiskLevelText level={source.level as ERiskLevel}>{source.level}</RiskLevelText>
                </span>
            </a>
        );
    }

    return (
        <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="e-flex e-items-center e-gap-1 e-rounded-md e-border e-border-solid e-border-heavy-metal-600 e-bg-heavy-metal-800 e-p-1 hover:e-border-heavy-metal-500 hover:e-bg-heavy-metal-700"
        >
            {source.icon}
            <span className="e-text-xs e-text-gray-200">{source.name}</span>
            {source.verified ? (
                <Check className="e-text-green-400" size={16} />
            ) : (
                <X className="e-text-red-400" size={16} />
            )}
        </a>
    );
}

function ApplyForVerificationLink({ source }: { source: VerificationSource }) {
    const sourceName =
        source.name === EVerificationSource.RugCheck ? `${EVerificationSource.RugCheck} risk: Unknown` : source.name;

    return (
        <a
            href={source.applyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="e-text-xs e-text-white e-underline hover:e-text-gray-400"
        >
            {sourceName}
        </a>
    );
}

export function TokenVerificationContent({
    unverifiedSources,
    verificationFoundSources,
}: {
    unverifiedSources: VerificationSource[];
    verificationFoundSources: VerificationSource[];
}) {
    const hasVerification = verificationFoundSources.length > 0;

    return (
        <div>
            <p className="e-mb-1 e-text-base e-font-semibold e-text-gray-200">
                {hasVerification ? (
                    <>
                        This token is verified
                        <br />
                        by independent validators
                    </>
                ) : (
                    <>
                        This token is not verified
                        <br />
                        by independent validators
                    </>
                )}
            </p>
            {hasVerification ? (
                <div className="e-flex e-flex-wrap e-gap-2">
                    {verificationFoundSources.map((source, idx) => (
                        <VerificationBadge key={idx} source={source} />
                    ))}
                </div>
            ) : (
                <span className="e-mb-2 e-text-xs e-text-heavy-metal-400">
                    This doesn&apos;t mean it&apos;s scam, just make double check if it&apos;s what you need.
                </span>
            )}

            {unverifiedSources.length > 0 && (
                <div className="e-mt-4">
                    <p className="e-mb-1 e-text-[10px] e-uppercase e-tracking-wider e-text-heavy-metal-400">
                        Apply for {hasVerification ? 'extra ' : ''}verification
                    </p>
                    <div className="e-flex e-flex-wrap e-gap-x-3 e-gap-y-1">
                        {unverifiedSources.map((source, idx) => (
                            <ApplyForVerificationLink key={idx} source={source} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
