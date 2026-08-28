import { truncateAddress } from '@entities/address';

import { Logo } from '@/app/shared/components/SolanaLogo';

import type { TxShareData } from '../model/get-tx-share-data';

/** Rows past this collapse into one "and N more" line. Exported so the stories assert against a single number. */
export const MAX_INSTRUCTION_ROWS = 5;

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
                backgroundColor: colors.background,
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
                    background:
                        'radial-gradient(ellipse 120% 110% at 50% 40%, rgba(0, 90, 55, 0.55) 0%, rgba(0, 60, 40, 0.25) 40%, transparent 70%)',
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
                    padding: '36px 76px 76px',
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
            <div style={{ alignItems: 'center', display: 'flex', gap: '18px' }}>
                <Logo variant="green" style={{ color: colors.white, height: '26px', width: '229px' }} />
                <span style={{ color: colors.neutral50, fontSize: '36px', fontWeight: 400 }}>Explorer</span>
            </div>

            {/* A column so the fee stacks under the date. `flex-end` is the right edge on a column's cross axis. */}
            <div style={{ alignItems: 'flex-end', display: 'flex', flexDirection: 'column' }}>
                {dateUtc && (
                    <span data-testid="tx-image-date" style={{ color: colors.neutral400, fontSize: '18px' }}>
                        {dateUtc}
                    </span>
                )}

                {fee && (
                    <span data-testid="tx-image-fee" style={{ color: colors.neutral400, fontSize: '18px' }}>
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
            <div
                data-testid="tx-image-section"
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '18px',
                    marginTop: '20px',
                }}
            >
                <div style={{ alignItems: 'center', display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                    <div
                        data-testid="tx-image-signature"
                        style={{
                            color: colors.neutral100,
                            fontFamily: 'monospace',
                            fontSize: '24px',
                            letterSpacing: '-0.68px',
                        }}
                    >
                        {truncateAddress(data.signature, SIGNATURE_PAD)}
                    </div>
                    <StatusBadge status={data.status} />
                </div>
            </div>

            <div
                data-testid="tx-image-section"
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    flexGrow: 1,
                    gap: '8px',
                    marginTop: '20px',
                }}
            >
                {visible.map((instruction, index) => (
                    // Index key: a summary carries no id, and two rows of the same program and name are
                    // indistinguishable by value. The list is built once per render from a frozen response,
                    // so nothing reorders or splices it.
                    <span
                        key={index}
                        data-testid="tx-image-instruction"
                        style={{ color: colors.neutral100, fontSize: '24px' }}
                    >
                        {/* Numbered over the rows shown, so the list reads 1..n with no gaps. The detail page
                            numbers the raw instructions instead, so a transaction carrying Compute Budget - which
                            this list drops - is numbered differently there. */}
                        {`#${index + 1} ${instruction.programName}: ${instruction.name}`}
                    </span>
                ))}

                {overflow > 0 && (
                    <span
                        data-testid="tx-image-instruction-overflow"
                        style={{ color: colors.neutral400, fontSize: '18px' }}
                    >
                        {`and ${overflow} more`}
                    </span>
                )}
            </div>

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
                <div key={cell.label} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <span style={{ color: colors.neutral400, fontSize: '20px' }}>{cell.label}</span>
                    <span style={{ color: colors.neutral100, fontSize: '26px' }}>{cell.value}</span>
                </div>
            ))}
        </div>
    );
}

/**
 * The footer cells that have a value, in mockup order.
 *
 * An absent cell is dropped rather than rendered with a placeholder: CU and Version are legitimately
 * missing on many transactions, and a row of dashes reads as broken data.
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
                backgroundColor: failed ? colors.dangerMuted : colors.successMuted,
                borderRadius: '999px',
                color: failed ? colors.danger : colors.success,
                fontSize: '24px',
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
                    color: colors.neutral400,
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

const colors = {
    background: '#161a18',
    danger: '#fca5a5',
    dangerMuted: 'rgba(153, 27, 27, 0.35)',
    neutral100: '#f5f5f5',
    neutral400: '#a1a1a1',
    neutral50: '#fafafa',
    neutral800: '#262626',
    success: '#86efac',
    successMuted: 'rgba(22, 101, 52, 0.35)',
    white: '#fff',
};
