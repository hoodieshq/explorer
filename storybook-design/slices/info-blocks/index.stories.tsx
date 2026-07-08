// Gallery slice: every "info block" style component on one page for visual review.
// Pulls the real components (Alert, ErrorCard, BaseSecurityNotification, toasts); MessageBanner
// is data-driven and renders null without a populated announcement, so it's shown as a static
// preview of its look rather than the live (empty) component.
import type { Meta, StoryObj } from '@storybook-config/types';
import React from 'react';
import { AlertCircle, AlertOctagon, AlertTriangle, CheckCircle, Info } from 'react-feather';

import { ErrorCard } from '@/app/components/common/ErrorCard';
import { Button } from '@/app/components/shared/ui/button';
import { Toaster } from '@/app/components/shared/ui/sonner/toaster';
import { useToast } from '@/app/components/shared/ui/sonner/use-toast';
import { BaseSecurityNotification } from '@/app/features/security-txt/ui/BaseSecurityNotification';
import { Alert } from '@/app/shared/ui/Alert';

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
    return (
        <section className="mb-10">
            <h3 className="mb-1 text-sm font-medium uppercase tracking-wide text-white">{title}</h3>
            {note && <p className="mb-3 mt-0 text-xs text-outer-space-300">{note}</p>}
            <div className="flex flex-col gap-3">{children}</div>
        </section>
    );
}

const ALERT_VARIANTS = [
    ['default', <Info key="i" size={16} />, 'A neutral notice without colour — a styled container for inline info.'],
    ['info', <Info key="i" size={16} />, 'Informational message.'],
    ['success', <CheckCircle key="i" size={16} />, 'Success message.'],
    ['warning', <AlertTriangle key="i" size={16} />, 'Warning message.'],
    ['danger', <AlertCircle key="i" size={16} />, 'Danger / error message.'],
    ['scam', <AlertOctagon key="i" size={16} />, 'This account has been flagged by the community as a scam account.'],
] as const;

function InfoBlocksGallery() {
    const { custom } = useToast();

    return (
        <div className="mx-auto max-w-[720px]">
            <Toaster position="bottom-right" />

            <Section
                title="Alert · Filled"
                note="Design-system notice block — app/shared/ui/Alert (appearance=filled, the default). With a left icon slot:"
            >
                {ALERT_VARIANTS.map(([variant, icon, text]) => (
                    <Alert key={variant} variant={variant} appearance="filled" icon={icon}>
                        <span className="font-medium capitalize">{variant}: </span>
                        {text}
                    </Alert>
                ))}
            </Section>

            <Section
                title="Alert · Outlined"
                note="Same component, appearance=outlined — transparent background, coloured border + text:"
            >
                {ALERT_VARIANTS.map(([variant, icon, text]) => (
                    <Alert key={variant} variant={variant} appearance="outlined" icon={icon}>
                        <span className="font-medium capitalize">{variant}: </span>
                        {text}
                    </Alert>
                ))}
            </Section>

            <Section title="Alert · no icon" note="Icon slot is optional — omit `icon` for a text-only block:">
                <Alert variant="info">Informational message without an icon.</Alert>
                <Alert variant="warning" appearance="outlined">
                    Outlined warning without an icon.
                </Alert>
            </Section>

            <Section title="ErrorCard" note="app/components/common/ErrorCard — fetch-failure card, with optional retry / subtext.">
                <ErrorCard text="Fetch Failed" />
                <ErrorCard text="Fetch Failed" retry={() => {}} />
                <ErrorCard
                    text="Unable to load account"
                    retry={() => {}}
                    retryText="Reload"
                    subtext="If this keeps happening, try switching RPC endpoint."
                />
            </Section>

            <Section title="Security notification" note="app/features/security-txt — Card-based notice with icon, title and body.">
                <BaseSecurityNotification
                    message={
                        'Contact security@example.com to report vulnerabilities.\nA PGP key is available on our website.'
                    }
                />
            </Section>

            <Section
                title="MessageBanner"
                note="app/components/MessageBanner — page-level announcement. Data-driven (empty by default), so this is a static preview of its look."
            >
                <div className="rounded-dk bg-dk-info text-white">
                    <div className="flex flex-col items-center justify-center py-3 text-center">
                        <h3 className="mb-0 leading-6">
                            <AlertCircle className="mr-1.5" size={15} />
                            Devnet API node is restarting — transactions may be delayed.
                        </h3>
                    </div>
                </div>
            </Section>

            <Section title="Toasts" note="app/components/shared/ui/sonner — transient notifications. Click to trigger:">
                <div className="flex flex-wrap gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => custom({ type: 'success', title: 'Copied', description: 'Signature copied to clipboard.' })}
                    >
                        Success toast
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => custom({ type: 'error', title: 'Failed', description: 'Could not fetch account data.' })}
                    >
                        Error toast
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => custom({ type: 'info', title: 'Heads up', description: 'This is an informational toast.' })}
                    >
                        Info toast
                    </Button>
                </div>
            </Section>
        </div>
    );
}

const meta: Meta<typeof InfoBlocksGallery> = {
    component: InfoBlocksGallery,
    parameters: { layout: 'padded' },
    tags: ['autodocs'],
    title: 'Design Slices/info-blocks',
};

export default meta;
type Story = StoryObj<typeof meta>;

export const AllBlocks: Story = {};
