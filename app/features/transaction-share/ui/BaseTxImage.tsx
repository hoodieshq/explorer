import { truncateAddress } from '@entities/address';
import type { OgGlows } from '@entities/open-graph';
import { type InstructionSummary, UNKNOWN_PROGRAM_NAME } from '@entities/transaction-data';

import { Logo } from '@/app/shared/components/SolanaLogo';

import { MAX_INSTRUCTION_ROWS } from '../lib/constants';
import type { TxShareData } from '../model/get-tx-share-data';

// The design writes the signature as eight characters a side.
const SIGNATURE_PAD = 8;

// Every address that is not the headline signature: the fee payer cell and an unnamed program's id.
const ADDRESS_PAD = 6;

// Placeholder for an absent value.
const EMPTY_VALUE = '-';

// The instruction name comes from IDL metadata, which does not bound its length, so it is cut by layout
// rather than by a character count: the row cannot grow, and satori's own ellipsis draws U+2026. A character
// cap on top of this cuts twice and lands mid-word ("Liquidity M…").
// Only the instruction name carries this. The design shows the program name whole, so that span never
// shrinks and this one absorbs the difference.
const TEXT_ELLIPSIS = { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } as const;

const COLORS = {
    background: '#141917',
    emphasis: '#FFFFFF',
    footerLabel: '#A0AAA5',
    secondary: '#BAC4C0',
    separator: '#FFFFFF14',
    signature: '#2DD4A7',
} as const;

const PILL = {
    failed: { background: '#F43F5E1F', border: '#F43F5E59', text: '#FF8095' },
    success: { background: '#0EA4761F', border: '#2DD4A759', text: '#2DD4A7' },
} as const;

const TYPO = {
    /** The instruction rows, the widest band on the card. */
    body: { fontSize: '30px', lineHeight: '36px' },
    /** Date, pill label, every footer cell. */
    caption: { fontSize: '26px', lineHeight: '31px' },
    /** "Transaction" and the signature beside it. */
    headline: { fontSize: '60px' },
    /** "Explorer", beside the logo. */
    wordmark: { fontSize: '37px', fontWeight: 400 },
} as const;

const SPACING = {
    /** Between the headline and the first instruction row. */
    bodyGap: '2px',
    brandGap: '16px',
    canvasPadding: '52px 65px 92px',
    footerCellGap: '10px',
    /** A floor only: `space-between` sets the real distance whenever the cells leave room. */
    footerGap: '24px',
    /**
     * The design nudges the header's right group down 2px and lifts the footer 8px, both with a relative
     * `top`. Written as margins because satori lays out through yoga, which honours margin on a flex item
     * and ignores an offset on a relatively positioned one.
     */
    footerLift: '8px',
    headerGap: '22px',
    headerNudge: '2px',
    headlineGap: '16px',
    /**
     * Between a row's labels and its account count. Once the labels shrink, `space-between` has no free
     * space left to keep them apart, and the ellipsis touches the count.
     */
    rowGap: '24px',
    rowPadding: '14px 0',
} as const;

const LOGO = { height: '28px', width: '229px' } as const;

type BaseTxImageProps = {
    data: TxShareData | undefined;
    /** Both glows as data URIs. Satori resolves no relative URL, so the route reads the files. */
    glows: OgGlows;
};

export function BaseTxImage({ data, glows }: BaseTxImageProps) {
    // A card with no transaction has no status to colour, so it takes the success glow.
    const glow = data?.status === 'failed' ? glows.failed : glows.success;

    return (
        <div
            style={{
                alignItems: 'flex-start',
                backgroundColor: COLORS.background,
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                justifyContent: 'space-between',
                overflow: 'hidden',
                padding: SPACING.canvasPadding,
                position: 'relative',
                width: '100%',
            }}
        >
            <div
                data-testid="tx-image-glow"
                style={{
                    backgroundImage: `url(${glow})`,
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: '100% 100%',
                    display: 'flex',
                    height: '100%',
                    left: 0,
                    position: 'absolute',
                    top: 0,
                    width: '100%',
                }}
            />

            <Header dateUtc={data?.dateUtc} status={data?.status} />
            {data ? <Body data={data} /> : <NoTransaction />}
            {data ? <Footer data={data} /> : undefined}
        </div>
    );
}

function Header({ dateUtc, status }: { dateUtc: string | undefined; status: TxShareData['status'] | undefined }) {
    return (
        <div
            style={{
                alignItems: 'center',
                display: 'flex',
                justifyContent: 'space-between',
                position: 'relative',
                width: '100%',
            }}
        >
            <div style={{ alignItems: 'center', display: 'flex', gap: SPACING.brandGap }}>
                <Logo variant="green" style={{ color: COLORS.emphasis, ...LOGO }} />
                <span style={{ color: COLORS.emphasis, ...TYPO.wordmark }}>Explorer</span>
            </div>

            <div
                style={{
                    alignItems: 'center',
                    display: 'flex',
                    gap: SPACING.headerGap,
                    marginTop: SPACING.headerNudge,
                }}
            >
                {dateUtc && (
                    <span data-testid="tx-image-date" style={{ color: COLORS.secondary, ...TYPO.caption }}>
                        {dateUtc}
                    </span>
                )}
                {status && <StatusBadge status={status} />}
            </div>
        </div>
    );
}

function Body({ data }: { data: TxShareData }) {
    const visible = data.instructions.slice(0, MAX_INSTRUCTION_ROWS);
    const overflow = data.instructions.length - visible.length;

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                gap: SPACING.bodyGap,
                position: 'relative',
                width: '100%',
            }}
        >
            <div style={{ alignItems: 'flex-end', display: 'flex', gap: SPACING.headlineGap, width: '100%' }}>
                <span style={{ color: COLORS.secondary, ...TYPO.headline, lineHeight: '66px' }}>Transaction</span>
                <span
                    data-testid="tx-image-signature"
                    style={{
                        color: COLORS.signature,
                        fontFamily: 'Roboto Mono',
                        fontWeight: 500,
                        lineHeight: '72px',
                        ...TYPO.headline,
                    }}
                >
                    {truncateAddress(data.signature, SIGNATURE_PAD)}
                </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', paddingTop: '8px', width: '100%' }}>
                {visible.map((instruction, index) => (
                    <div key={index} style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                        {index > 0 && <Separator />}
                        <InstructionRow instruction={instruction} />
                    </div>
                ))}

                {overflow > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                        {visible.length > 0 && <Separator />}
                        <span
                            data-testid="tx-image-instruction-overflow"
                            style={{
                                color: COLORS.secondary,
                                padding: SPACING.rowPadding,
                                ...TYPO.body,
                            }}
                        >
                            {`and ${overflow} more instructions`}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}

function Separator() {
    return <div style={{ backgroundColor: COLORS.separator, display: 'flex', height: '1px', width: '100%' }} />;
}

function InstructionRow({ instruction }: { instruction: InstructionSummary }) {
    return (
        <div
            data-testid="tx-image-instruction"
            style={{
                alignItems: 'flex-end',
                display: 'flex',
                gap: SPACING.rowGap,
                justifyContent: 'space-between',
                padding: SPACING.rowPadding,
                width: '100%',
            }}
        >
            <div
                style={{
                    alignItems: 'flex-end',
                    display: 'flex',
                    // Both written out on purpose. Satori defaults `flexShrink` to 0, so without it the
                    // labels keep their content width and push the count past the canvas padding; a browser
                    // defaults it to 1 but needs `minWidth: 0` to shrink a flex child below its content.
                    flexShrink: 1,
                    gap: '12px',
                    minWidth: 0,
                }}
            >
                {/* Never shrinks, so the name beside it is what gives way. Satori already defaults
                    `flexShrink` to 0, but a browser defaults it to 1, and the two have to agree. */}
                <span style={{ color: COLORS.secondary, flexShrink: 0, ...TYPO.body, whiteSpace: 'nowrap' }}>
                    {programLabel(instruction)}
                </span>
                <span
                    style={{
                        color: COLORS.emphasis,
                        // The one thing on the row that gives way. Written out for satori, which defaults it
                        // to 0; `minWidth: 0` is what lets a browser shrink it below its content.
                        flexShrink: 1,
                        fontWeight: 500,
                        minWidth: 0,
                        ...TYPO.body,
                        ...TEXT_ELLIPSIS,
                    }}
                >
                    {instruction.name}
                </span>
            </div>

            {instruction.accountCount !== undefined && (
                <span style={{ color: COLORS.secondary, flexShrink: 0, ...TYPO.body }}>
                    {accountCountLabel(instruction.accountCount)}
                </span>
            )}
        </div>
    );
}

function Footer({ data }: { data: TxShareData }) {
    return (
        <div
            data-testid="tx-image-footer"
            style={{
                alignItems: 'flex-end',
                display: 'flex',
                gap: SPACING.footerGap,
                justifyContent: 'space-between',
                marginBottom: SPACING.footerLift,
                position: 'relative',
                width: '100%',
            }}
        >
            {footerCells(data).map(cell => (
                <div key={cell.label} style={{ alignItems: 'flex-end', display: 'flex', gap: SPACING.footerCellGap }}>
                    <span style={{ color: COLORS.footerLabel, ...TYPO.caption }}>{cell.label}</span>
                    <span
                        style={{
                            color: COLORS.secondary,
                            ...(cell.mono ? { fontFamily: 'Roboto Mono' } : {}),
                            ...TYPO.caption,
                        }}
                    >
                        {cell.value}
                    </span>
                </div>
            ))}
        </div>
    );
}

/**
 * The program's name, or the name plus its truncated address when nothing named it.
 */
function programLabel({ nameLookup, programName }: InstructionSummary): string {
    if (programName !== UNKNOWN_PROGRAM_NAME || !nameLookup) return programName;

    return `${programName} (${truncateAddress(nameLookup.programId, ADDRESS_PAD)})`;
}

/**
 * `N accounts`, singular at one. A partially decoded instruction can pass exactly one.
 */
function accountCountLabel(count: number): string {
    return `${count} ${count === 1 ? 'account' : 'accounts'}`;
}

/**
 * The four footer cells, always all four.
 * An absent value prints {@link EMPTY_VALUE} rather than dropping its cell.
 */
function footerCells(data: TxShareData): { label: string; mono?: boolean; value: string }[] {
    return [
        { label: 'Fee', value: data.fee },
        { label: 'Slot', value: data.slot.toLocaleString('en-US') },
        { label: 'Version', value: data.version ?? EMPTY_VALUE },
        {
            label: 'Fee payer',
            mono: true,
            value: data.signer ? truncateAddress(data.signer, ADDRESS_PAD) : EMPTY_VALUE,
        },
    ];
}

function StatusBadge({ status }: { status: TxShareData['status'] }) {
    const pill = status === 'failed' ? PILL.failed : PILL.success;

    return (
        <span
            data-testid="tx-image-status"
            style={{
                backgroundColor: pill.background,
                // Satori does not draw `outline`, which is what the design uses.
                border: `1px solid ${pill.border}`,
                borderRadius: '999px',
                color: pill.text,
                fontWeight: 500,
                padding: '8px 22px',
                ...TYPO.caption,
            }}
        >
            {status === 'failed' ? 'Failed' : 'Success'}
        </span>
    );
}

function NoTransaction() {
    return (
        <div
            data-testid="tx-image-fallback"
            style={{
                alignItems: 'center',
                display: 'flex',
                flexGrow: 1,
                justifyContent: 'center',
                position: 'relative',
            }}
        >
            <span
                style={{
                    color: COLORS.secondary,
                    fontSize: '48px',
                    fontWeight: 400,
                    textAlign: 'center',
                }}
            >
                See the transaction details on the Solana Explorer.
            </span>
        </div>
    );
}
