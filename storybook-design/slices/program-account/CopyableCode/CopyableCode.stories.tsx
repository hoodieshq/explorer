import type { Meta, StoryObj } from '@storybook-config/types';

import { CopyableCode } from './CopyableCode';

// Wrapping code block with a trailing (inside-right) copy affordance — the value
// renderer for the VerifiedBuildCard "Verify Command" row and any other
// `DisplayType.LongString` field. The copy glyph now sits inside the box on the
// right; it previously sat outside the box on the left.
const meta = {
    component: CopyableCode,
    parameters: { layout: 'padded' },
    title: 'Design Slices/program-account/CopyableCode',
} satisfies Meta<typeof CopyableCode>;

export default meta;
type Story = StoryObj<typeof meta>;

// The canonical "Verify Command" value — a full solana-verify invocation that wraps
// across a few lines in the value column.
export const Default: Story = {
    args: {
        value: 'solana-verify verify-from-repo -um --program-id TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA https://github.com/example-protocol/program',
    },
};

// Short value — the box hugs a single line with the copy glyph beside it.
export const Short: Story = {
    args: { value: 'anchor build --verifiable' },
};

// Long value with no natural break points — exercises the `break-words` wrap so the
// text never overflows the column or shoves the copy glyph off-screen.
export const LongWrapping: Story = {
    args: {
        value: 'solana-verify verify-from-repo -um --program-id TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA https://github.com/example-protocol/really-long-monorepo-name --library-name my_program --mount-path programs/my-program --commit-hash 0123456789abcdef0123456789abcdef01234567',
    },
};
