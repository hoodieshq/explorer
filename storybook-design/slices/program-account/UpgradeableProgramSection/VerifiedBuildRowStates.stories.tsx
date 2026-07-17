import type { Meta, StoryObj } from '@storybook-config/types';
import React from 'react';

import { KeyValue } from '../../key-value/KeyValue';
import { LABEL_WIDTH } from './constants';
import { InfoTooltip } from './InfoTooltip';
import { VerifiedBuildBadge, type VerifiedBuildState } from './VerifiedProgramBadge';

// Mirrors VerifiedLabel in UpgradeableProgramSection.tsx (kept local there, replicated here so the
// gallery row reads exactly like the page row).
function VerifiedLabel() {
    return (
        <InfoTooltip text="Verified builds allow users to ensure that the hash of the on-chain program matches the hash of the program of the given codebase (registry hosted by osec.io).">
            Verified Build
        </InfoTooltip>
    );
}

// Every value the connected VerifiedProgramBadge can resolve to, in review order.
const STATES: VerifiedBuildState[] = ['verified', 'not-verified', 'loading', 'error', 'not-mainnet'];

/**
 * Gallery of every state of the Verified Build row — the real KeyValue row (VerifiedLabel +
 * presentational VerifiedBuildBadge) rendered once per state, each captioned with the state name,
 * so all states can be reviewed side by side without wiring the on-chain query.
 */
function VerifiedBuildRowStates() {
    return (
        <div className="max-w-col mx-auto flex w-full flex-col gap-6">
            {STATES.map(state => (
                <div key={state}>
                    <p className="mb-2 text-xs uppercase tracking-wide text-outer-space-300">{state}</p>
                    <div className="rounded-lg border border-solid border-dk-card-outline-dark bg-dk-gray-800-dark">
                        <KeyValue label={<VerifiedLabel />} labelWidth={LABEL_WIDTH} row>
                            <VerifiedBuildBadge state={state} />
                        </KeyValue>
                    </div>
                </div>
            ))}
        </div>
    );
}

const meta = {
    component: VerifiedBuildRowStates,
    parameters: { layout: 'padded' },
    title: 'Design Slices/program-account/Verified Build Row States',
} satisfies Meta<typeof VerifiedBuildRowStates>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AllStates: Story = {};
