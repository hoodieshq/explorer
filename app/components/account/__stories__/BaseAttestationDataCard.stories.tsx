import type { Meta, StoryObj } from '@storybook-config/types';

import { BaseAttestationDataCard } from '../sas/BaseAttestationDataCard';

const meta = {
    component: BaseAttestationDataCard,
    parameters: {
        docs: {
            description: {
                component: [
                    'Schema layout or decoded data of a Solana Attestation Service account, shown as JSON. SAS data is',
                    'always flat: one value per schema field, and only primitives or arrays of primitives. Attestation',
                    'bytes that do not decode against their schema are shown as base64 instead (`raw`).',
                    '',
                    'The heading repeats the tab name, «Attestation Service», in every state. The body uses the',
                    'shared row padding (`ROW_PADDING`), the same as the rows of the Overview card above it.',
                    '',
                    'The examples are live mainnet accounts; the story comment names each address.',
                    '',
                    '## References',
                    '',
                    '- [CollapsibleSection](?path=/docs/components-shared-collapsiblesection--docs) — the heading above the surface with the Collapse/Expand toggle. Passed `className=""` so the surface comes from the `Card` below.',
                    '- [Card](?path=/docs/components-shared-card-basecard--docs) — the surface: `variant="tight"` with the outer-space border and background.',
                    '- [JsonViewer](?path=/docs/components-common-jsonviewer--docs) — `version="v2"`: the JSON tree with values wrapping inside their row, a copy button for the whole block in the corner and one after the text of each row on hover.',
                    '- [CopyButton](?path=/docs/shared-copybutton--docs) — borderless (`variant="quiet"`), copies the base64 of undecodable data.',
                ].join('\n'),
            },
        },
    },
    tags: ['autodocs', 'test'],
    title: 'Components/Account/BaseAttestationDataCard',
} satisfies Meta<typeof BaseAttestationDataCard>;

export default meta;
type Story = StoryObj<typeof meta>;

// Schema field order is what the page shows, so the data is built from entries: an object literal would
// have to be sorted by key for the sort-keys lint rule. 64- and 128-bit integers are strings, as the JSON
// view renders bigints.
function fromSchemaOrder(entries: [string, unknown][]): Record<string, unknown> {
    return Object.fromEntries(entries);
}

// 3rnRrg1bNRvsCegA8SRZMYP1CZhQtKFAftKj6JhhLqFA, Nomis Score Attestation: one field.
export const SchemaSingleField: Story = {
    args: {
        data: fromSchemaOrder([['score', 'U16']]),
    },
};

// FGBbTQtEWfMB4ddWpbmmnjRNSkxRurvTVWeTX2YvPACb, TrustaLabs Media Score (Lite): five String fields.
export const SchemaStringFields: Story = {
    args: {
        data: fromSchemaOrder([
            ['index', 'String'],
            ['chain', 'String'],
            ['subject', 'String'],
            ['score', 'String'],
            ['timestamp', 'String'],
        ]),
    },
};

// 6PadNB4Lh5EmQY4UkKB6xnB4XUjsMZPq18sDmQaqXE1h, SolidKYC: the largest schema on mainnet.
export const SchemaFourteenFields: Story = {
    args: {
        data: fromSchemaOrder([
            ['id', 'String'],
            ['given_name', 'VecU8'],
            ['surname', 'VecU8'],
            ['document_number', 'VecU8'],
            ['personal_number', 'VecU8'],
            ['birth_date', 'VecU8'],
            ['expiry_date', 'String'],
            ['document_type', 'String'],
            ['issuing_state', 'String'],
            ['nationality', 'String'],
            ['gender', 'String'],
            ['face_match', 'Bool'],
            ['face_liveness', 'Bool'],
            ['hash_type', 'U8'],
        ]),
    },
};

// 7Hr3YnweQfar5A4woygHaNbAYZsu7jn4u89SGqHYpk8M, ZKSignature_1777966318: a schema with no fields.
export const SchemaEmpty: Story = {
    args: {
        data: {},
    },
};

// 11UR6sZ57WRDtmd27JK9vMaoCwXeb8rVgdJ93zCajhH, TrustaLabs Media Score: an address and a unix time stored as strings.
export const AttestationStringFields: Story = {
    args: {
        data: fromSchemaOrder([
            ['index', '1'],
            ['chain', 'solana'],
            ['subject', 'DToHw4dE9SP67V9YPiADCein5T4HB6piE25VW6WhsxRG'],
            ['score', '56.59'],
            ['timestamp', '1757785289'],
        ]),
    },
};

// 8hsu9fxTYKT6p6mrA4cz4YGZXi4yLkVs21Jms44pcSV, sato-build-receipt: a 32-byte hash, an ISO date string and a long URL.
export const AttestationHashAndUrl: Story = {
    args: {
        data: fromSchemaOrder([
            ['subject_kind', 'package'],
            ['subject_id', 'npm:@bankr/cli'],
            ['version', '0.3.38'],
            ['digest', '0x7501721398554c67842ddb63c55699665e4e9c3015d94e44dbd3e3b1072a3340'],
            ['key_access', 'reads'],
            ['key_egress', 'not_observed'],
            ['fund_action_count', -1],
            ['method_version', 'custody-1'],
            ['as_of', '2026-09-26T03:04:25.858Z'],
            ['reading_url', 'https://satohub.ai/check/package/npm%3A%40bankr%2Fcli'],
        ]),
    },
};

// HToJsMs9BtMRmBbcXS1R3fKQA1KPnGAFK4zEuEdnYfDL, er-verified: a Bool, 48 bytes and an I64 unix time.
export const AttestationBoolAndBytes: Story = {
    args: {
        data: fromSchemaOrder([
            ['verified', true],
            ['status', 'UpToDate'],
            [
                'mr_td',
                '0xc1ee9c16e3afc506cfe042c5b846a368528f3b37618eafb27469bc114cf914e9222c91618470e7f2b28ac360968270a5',
            ],
            ['verified_at', '1792326199'],
            ['endpoint', 'mainnet-tee.magicblock.app'],
        ]),
    },
};

// VWMWUFGtfYQ5mcykA4N9GGcs524Z2M23tRMo61uSxtg, SATIReputationScoreV3: U128 values and a long byte vector.
export const AttestationLargeIntegers: Story = {
    args: {
        data: fromSchemaOrder([
            ['layout_version', 1],
            ['task_ref_hi', '80491662381001594820530084891300281030'],
            ['task_ref_lo', '297149769348445712296464393995939787678'],
            ['agent_mint_hi', '23408105675172548857146817932438832516'],
            ['agent_mint_lo', '267375535511066178895502907765889004472'],
            ['counterparty_hi', '40365229038643292153004164306483282620'],
            ['counterparty_lo', '50811629020336011295551197277847618214'],
            ['outcome', 0],
            ['data_hash_hi', '0'],
            ['data_hash_lo', '0'],
            ['content_type', 0],
            [
                'content',
                '0x7b2273636f7265223a32332c22636f6d706f6e656e7473223a5b35302c302c302c302c35395d2c2274786e73223a302c22757364223a307d',
            ],
        ]),
    },
};

// The 11UR6sZ57WRDtmd27JK9vMaoCwXeb8rVgdJ93zCajhH attestation bytes, as shown when its schema cannot be decoded.
export const RawFallback: Story = {
    args: {
        raw: 'AQAAADEGAAAAc29sYW5hLAAAAERUb0h3NGRFOVNQNjdWOVlQaUFEQ2VpbjVUNEhCNnBpRTI1Vlc2V2hzeFJHBQAAADU2LjU5CgAAADE3NTc3ODUyODk=',
    },
};
