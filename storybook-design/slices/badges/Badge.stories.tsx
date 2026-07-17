import type { Meta, StoryObj } from '@storybook-config/types';
import React from 'react';

import { Badge } from '@/app/components/shared/ui/badge';

// Every parameter of the design-system Badge, grouped by what actually varies per lineage.
// tw is the lineage in use; the dashkit section is kept only as a deprecated reference (it owns
// the `solid` tone and the `pill` modifier, which the tw lineage doesn't render).

type Variant =
    | 'default'
    | 'secondary'
    | 'success'
    | 'warning'
    | 'info'
    | 'danger'
    | 'destructive'
    | 'gray'
    | 'dark'
    | 'transparent';

// Variants that each lineage/tone actually defines a style for (others render unstyled).
const TW_ORIGINAL: Variant[] = [
    'default',
    'secondary',
    'success',
    'warning',
    'info',
    'danger',
    'destructive',
    'transparent',
];
const TW_SOFT: Variant[] = [
    'default',
    'secondary',
    'gray',
    'dark',
    'success',
    'warning',
    'info',
    'danger',
    'destructive',
    'transparent',
];
const DK_SOFT: Variant[] = ['success', 'info', 'warning', 'danger', 'destructive', 'secondary', 'gray', 'dark'];
const DK_SOLID: Variant[] = ['success', 'info', 'warning', 'danger', 'destructive', 'secondary', 'dark'];

const SIZES = ['xs', 'sm', 'md', 'lg'] as const;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section className="flex flex-col gap-3">
            <h3 className="text-xs uppercase tracking-wide text-outer-space-300">{title}</h3>
            <div className="flex flex-wrap items-center gap-2">{children}</div>
        </section>
    );
}

function BadgeParameters() {
    return (
        <div className="max-w-col mx-auto flex flex-col gap-8">
            <Section title="ui=tw · tone=original · variants">
                {TW_ORIGINAL.map(v => (
                    // @ts-expect-error -- `tone="original"` exists on the vendored badge (served by the Storybook vendor-redirect in .storybook/main.ts); tsc resolves the app original, which lacks it
                    <Badge key={v} ui="tw" tone="original" variant={v}>
                        {v}
                    </Badge>
                ))}
            </Section>

            <Section title="ui=tw · tone=soft · variants">
                {TW_SOFT.map(v => (
                    <Badge key={v} ui="tw" tone="soft" variant={v}>
                        {v}
                    </Badge>
                ))}
            </Section>

            <Section title="ui=tw · sizes (soft · success)">
                <div className="flex flex-wrap items-end gap-3">
                    {SIZES.map(s => (
                        <Badge key={s} ui="tw" tone="soft" variant="success" size={s}>
                            {s}
                        </Badge>
                    ))}
                </div>
            </Section>

            <Section title="ui=tw · status (soft · success)">
                <Badge ui="tw" tone="soft" variant="success" status="inactive">
                    inactive
                </Badge>
                <Badge ui="tw" tone="soft" variant="success" status="active">
                    active (shadow ring)
                </Badge>
            </Section>

            <Section title="ui=tw · asChild link (whole badge is a link)">
                <Badge ui="tw" tone="soft" variant="success" asChild>
                    <a href="#">success link</a>
                </Badge>
                <Badge ui="tw" tone="soft" variant="warning" asChild>
                    <a href="#">warning link</a>
                </Badge>
            </Section>

            <Section title="ui=dashkit · tone=soft · variants (deprecated — reference)">
                {DK_SOFT.map(v => (
                    <Badge key={v} ui="dashkit" tone="soft" variant={v}>
                        {v}
                    </Badge>
                ))}
            </Section>

            <Section title="ui=dashkit · tone=solid · variants (deprecated — reference)">
                {DK_SOLID.map(v => (
                    <Badge key={v} ui="dashkit" tone="solid" variant={v}>
                        {v}
                    </Badge>
                ))}
            </Section>

            <Section title="ui=dashkit · pill (deprecated — reference)">
                <Badge ui="dashkit" tone="soft" variant="success" pill={false}>
                    pill=false
                </Badge>
                <Badge ui="dashkit" tone="soft" variant="success" pill>
                    pill=true
                </Badge>
            </Section>
        </div>
    );
}

const meta = {
    component: BadgeParameters,
    parameters: { layout: 'padded' },
    title: 'Design Slices/badges/Badge',
} satisfies Meta<typeof BadgeParameters>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AllParameters: Story = {};
