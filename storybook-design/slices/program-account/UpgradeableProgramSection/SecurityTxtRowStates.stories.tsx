import type { Meta, StoryObj } from '@storybook-config/types';
import React from 'react';

import { KeyValue } from '../../key-value/KeyValue';
import { LABEL_WIDTH } from './constants';
import { SecurityTXTBadge } from './SecurityTXTBadge';
import { ProgramSecurityTXTLabel } from './SecurityTXTLabel';

// The presentational SecurityTXTBadge has two states: without an error it shows "Included" + a
// link to the security tab; with an error it shows the error text itself. (The connected
// ProgramSecurityTXTBadge maps any decode/fetch failure onto the error case.)
const STATES: { name: string; error?: string }[] = [
    { name: 'included' },
    { error: 'Program has no security.txt', name: 'error — "Program has no security.txt"' },
];

// Placeholder security-tab href for the presentational badge (no router in the isolated gallery).
const SECURITY_TAB_HREF = '#';

/**
 * Gallery of every state of the Security.txt row — the real KeyValue row (ProgramSecurityTXTLabel +
 * presentational SecurityTXTBadge) rendered once per state, each captioned with the state name.
 */
function SecurityTxtRowStates() {
    return (
        <div className="max-w-col mx-auto flex w-full flex-col gap-6">
            {STATES.map(({ name, error }) => (
                <div key={name}>
                    <p className="mb-2 text-xs uppercase tracking-wide text-outer-space-300">{name}</p>
                    <div className="rounded-lg border border-solid border-dk-card-outline-dark bg-dk-gray-800-dark">
                        <KeyValue label={<ProgramSecurityTXTLabel />} labelWidth={LABEL_WIDTH} row>
                            <SecurityTXTBadge error={error} href={SECURITY_TAB_HREF} />
                        </KeyValue>
                    </div>
                </div>
            ))}
        </div>
    );
}

const meta = {
    component: SecurityTxtRowStates,
    parameters: { layout: 'padded' },
    title: 'Design Slices/program-account/Security.txt Row States',
} satisfies Meta<typeof SecurityTxtRowStates>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AllStates: Story = {};
