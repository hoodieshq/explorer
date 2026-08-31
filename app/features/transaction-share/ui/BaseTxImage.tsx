import { truncateAddress } from '@entities/address';

import { Logo } from '@/app/shared/components/SolanaLogo';

import { MAX_INSTRUCTION_ROWS } from '../lib/constants';
import type { TxShareData } from '../model/get-tx-share-data';

// `truncateAddress` defaults to 4 characters a side, which reads as a hash fragment rather than a signature on a
// 1200px canvas. Wide enough to stay recognisable, short enough to hold one line.
const SIGNATURE_PAD = 20;

// Shorter than the headline signature: four cells share one row, and the label above already says what it is.
const FOOTER_ADDRESS_PAD = 6;

type BaseTxImageProps = {
    data: TxShareData | undefined;
};

export function BaseTxImage({ data }: BaseTxImageProps) {
    return (
        <div
            style={{
                backgroundColor: COLORS.background,
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                position: 'relative',
                width: '100%',
            }}
        >
            {/* Green gradient glow - large diffuse wash centered slightly above middle */}
            <div
                style={{
                    background: GLOW,
                    display: 'flex',
                    height: '100%',
                    left: 0,
                    position: 'absolute',
                    top: 0,
                    width: '100%',
                }}
            />

            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    flexGrow: 1,
                    padding: SPACING.canvasPadding,
                    position: 'relative',
                    width: '100%',
                }}
            >
                <Header dateUtc={data?.dateUtc} fee={data?.fee} />
                {data ? <TxSections data={data} /> : <NoTransaction />}
            </div>
        </div>
    );
}

function Header({ dateUtc, fee }: { dateUtc: string | undefined; fee: string | undefined }) {
    return (
        <div style={{ alignItems: 'flex-start', display: 'flex', justifyContent: 'space-between', width: '100%' }}>
            <div style={{ alignItems: 'center', display: 'flex', gap: SPACING.gap }}>
                <Logo variant="green" style={{ color: COLORS.white, ...LOGO }} />
                <span style={{ color: COLORS.neutral50, ...TYPO.wordmark }}>Explorer</span>
            </div>

            <div style={{ alignItems: 'flex-end', display: 'flex', flexDirection: 'column' }}>
                {dateUtc && (
                    <span data-testid="tx-image-date" style={{ color: COLORS.neutral400, ...TYPO.caption }}>
                        {dateUtc}
                    </span>
                )}

                {fee && (
                    <span data-testid="tx-image-fee" style={{ color: COLORS.neutral400, ...TYPO.caption }}>
                        {`Fee ${fee}`}
                    </span>
                )}
            </div>
        </div>
    );
}

function TxSections({ data }: { data: TxShareData }) {
    const visible = data.instructions.slice(0, MAX_INSTRUCTION_ROWS);
    const overflow = data.instructions.length - visible.length;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
            {/* Signature + Tx status */}
            <div
                data-testid="tx-image-section"
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: SPACING.gap,
                    marginTop: SPACING.gap,
                }}
            >
                <div style={{ alignItems: 'center', display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                    <div
                        data-testid="tx-image-signature"
                        style={{
                            ...TYPO.body,
                            color: COLORS.neutral100,
                            fontFamily: 'monospace',
                            letterSpacing: '-0.68px',
                        }}
                    >
                        {truncateAddress(data.signature, SIGNATURE_PAD)}
                    </div>
                    <StatusBadge status={data.status} />
                </div>
            </div>
            {/* Instructions list */}
            <div
                data-testid="tx-image-section"
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    flexGrow: 1,
                    gap: SPACING.gap,
                    marginTop: SPACING.gap,
                }}
            >
                {visible.map((instruction, index) => (
                    <span
                        key={index}
                        data-testid="tx-image-instruction"
                        style={{ color: COLORS.neutral100, ...TYPO.body }}
                    >
                        {`#${index + 1} ${instruction.programName}: ${instruction.name}`}
                    </span>
                ))}

                {overflow > 0 && (
                    <span
                        data-testid="tx-image-instruction-overflow"
                        style={{ color: COLORS.neutral400, ...TYPO.caption }}
                    >
                        {`and ${overflow} more`}
                    </span>
                )}
            </div>
            {/* Footer with transaction details (signer, block, compute units, version) */}
            <Footer data={data} />
        </div>
    );
}

function Footer({ data }: { data: TxShareData }) {
    const cells = footerCells(data);
    // Nothing to draw beats an empty bordered strip. React accepts undefined, and the repo's lint
    // rules treat a bare `null` as a smell.
    if (cells.length === 0) return undefined;

    return (
        <div data-testid="tx-image-footer" style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
            {cells.map(cell => (
                <div key={cell.label} style={{ display: 'flex', flexDirection: 'column', gap: SPACING.footerCellGap }}>
                    <span style={{ color: COLORS.neutral400, ...TYPO.footer.label }}>{cell.label}</span>
                    <span style={{ color: COLORS.neutral100, ...TYPO.footer.value }}>{cell.value}</span>
                </div>
            ))}
        </div>
    );
}

/**
 * The footer cells that have a non-empty value.
 *
 * An absent cell is dropped rather than rendered with a placeholder.
 */
function footerCells(data: TxShareData): { label: string; value: string }[] {
    const cells: { label: string; value: string }[] = [];

    if (data.signer) cells.push({ label: 'Signer', value: truncateAddress(data.signer, FOOTER_ADDRESS_PAD) });
    cells.push({ label: 'Block', value: data.slot.toLocaleString('en-US') });
    if (data.computeUnits !== undefined) cells.push({ label: 'CU', value: data.computeUnits.toLocaleString('en-US') });
    if (data.version) cells.push({ label: 'Version', value: data.version });

    return cells;
}

function StatusBadge({ status }: { status: TxShareData['status'] }) {
    const failed = status === 'failed';

    return (
        <span
            data-testid="tx-image-status"
            style={{
                ...TYPO.body,
                backgroundColor: failed ? COLORS.dangerMuted : COLORS.successMuted,
                borderRadius: '999px',
                color: failed ? COLORS.danger : COLORS.success,
                padding: '6px 18px',
            }}
        >
            {failed ? 'Failed' : 'Success'}
        </span>
    );
}

function NoTransaction() {
    return (
        <div
            data-testid="tx-image-fallback"
            style={{ alignItems: 'center', display: 'flex', flexGrow: 1, justifyContent: 'center' }}
        >
            <span
                style={{
                    color: COLORS.neutral400,
                    fontSize: '48px',
                    fontWeight: 400,
                    letterSpacing: '-0.96px',
                    textAlign: 'center',
                }}
            >
                See the transaction details on the Solana Explorer.
            </span>
        </div>
    );
}

const COLORS = {
    background: '#161a18',
    danger: '#fca5a5',
    dangerMuted: 'rgba(153, 27, 27, 0.35)',
    neutral100: '#f5f5f5',
    neutral400: '#a1a1a1',
    neutral50: '#fafafa',
    success: '#86efac',
    successMuted: 'rgba(22, 101, 52, 0.35)',
    white: '#fff',
} as const;

/**
 * The card's type scale. Satori has no classes, so every style is inline and a shared object is the only
 * thing that keeps two rows the same size - the signature, an instruction row and the status badge all
 * read at `body`, and drifting one of them apart is a silent visual bug.
 */
const TYPO = {
    /** Signature, instruction rows, status badge - the card's reading size. */
    body: { fontSize: '24px' },
    /** Date, fee, overflow line: present, but not what the eye lands on. */
    caption: { fontSize: '18px' },
    footer: {
        label: { fontSize: '20px' },
        value: { fontSize: '26px' },
    },
    /** "Explorer", beside the logo. */
    wordmark: { fontSize: '36px', fontWeight: 400 },
} as const;

const SPACING = {
    /** 36 top, 76 sides and bottom - the mockup's frame is deliberately asymmetric. */
    canvasPadding: '36px 76px 76px',
    footerCellGap: '6px',
    /** One rhythm for every gap on the card: header, both sections, and the space above them. */
    gap: '18px',
} as const;

const LOGO = { height: '26px', width: '229px' } as const;

// Centred slightly above the middle so the glow sits behind the signature rather than the footer.
const GLOW =
    'radial-gradient(ellipse 120% 110% at 50% 40%, rgba(0, 90, 55, 0.55) 0%, rgba(0, 60, 40, 0.25) 40%, transparent 70%)';
