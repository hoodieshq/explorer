import type { ReactNode } from 'react';

// Line drawings in the style of the explorer's feature cards: thin light lines at low opacity, one accent, mono labels.
// They are drawn here rather than loaded because solana.com's own preview images for these pages fail to load.

export function TransactionsPreview() {
    return (
        <PreviewFrame>
            {/* Two signers: the two signatures belong to the first two account keys, so both rows light the same two
                cells. Cells stand for list items, so only the lists have them. */}
            <Label x={16} y={16.5}>
                signatures
            </Label>
            <Cells x={96} y={14} count={2} accent={2} />
            <Label x={16} y={29.5}>
                message
            </Label>
            <path
                d="M 19 33 V 79 M 19 40 H 25 M 19 53 H 25 M 19 66 H 25 M 19 79 H 25"
                stroke={ink(0.25)}
                strokeWidth={0.75}
            />
            <Label x={29} y={42.5}>
                header
            </Label>
            {/* Required signatures, read-only signed, read-only unsigned. */}
            {['2', '0', '1'].map((count, index) => (
                <g key={index}>
                    <rect
                        x={96 + index * 11}
                        y={35.5}
                        width={9}
                        height={9}
                        rx={1}
                        stroke={ink(0.35)}
                        strokeWidth={0.75}
                    />
                    <Label x={100.5 + index * 11} y={42.5} anchor="middle">
                        {count}
                    </Label>
                </g>
            ))}
            <Label x={29} y={55.5}>
                account keys
            </Label>
            <Cells x={96} y={53} count={6} accent={2} />
            <Label x={29} y={68.5}>
                blockhash
            </Label>
            {/* One hash, not a list: a single bar. */}
            <rect x={96} y={63.5} width={62} height={5} fill={ink(0.3)} />
            <Label x={29} y={81.5}>
                instructions
            </Label>
            <Cells x={96} y={79} count={3} />

            {/* The blockhash dates the transaction: it stays valid for a window of blocks, then expires. */}
            <path
                d="M 162 66 L 190 66 Q 196 66, 196 72 L 196 92"
                stroke={ink(0.25)}
                strokeWidth={0.75}
                strokeDasharray="2 2"
            />
            <line x1={16} x2={234} y1={96} y2={96} stroke={ink(0.18)} strokeWidth={0.75} />
            {Array.from({ length: 28 }, (_, index) => (
                <line
                    key={index}
                    x1={18 + index * 8}
                    x2={18 + index * 8}
                    y1={93.5}
                    y2={98.5}
                    stroke={ink(0.18)}
                    strokeWidth={0.75}
                />
            ))}
            <line x1={96} x2={196} y1={96} y2={96} stroke={ACCENT} strokeWidth={1} />
            <circle cx={196} cy={96} r={2} fill={BACKGROUND} stroke={ACCENT} strokeWidth={1} />
            <Label x={96} y={110}>
                valid
            </Label>
            <Label x={196} y={110} anchor="middle">
                expires
            </Label>
        </PreviewFrame>
    );
}

export function CoreConceptsPreview() {
    const accounts: [number, number][] = [
        [196, 28],
        [222, 28],
    ];
    return (
        <PreviewFrame>
            {/* The transaction is its own area: the fee payer, the signer and the instructions are its, not the
                program's. It reaches the program as a whole. */}
            <rect x={12} y={12} width={88} height={96} rx={3} stroke={ink(0.25)} strokeWidth={0.75} />
            <Label x={18} y={23}>
                transaction
            </Label>
            <circle cx={21} cy={36} r={2.5} stroke={ink(0.6)} strokeWidth={0.75} />
            <Label x={28} y={38.5}>
                fee payer
            </Label>
            <circle cx={21} cy={48} r={2.5} stroke={ink(0.6)} strokeWidth={0.75} />
            <Label x={28} y={50.5}>
                signer
            </Label>
            {[58, 72, 86].map(y => (
                <g key={y}>
                    <rect x={18} y={y} width={76} height={12} rx={2} stroke={ink(0.35)} strokeWidth={0.75} />
                    <Label x={23} y={y + 8.5}>
                        instruction
                    </Label>
                </g>
            ))}

            <line x1={100} x2={138} y1={60} y2={60} stroke={ink(0.3)} strokeWidth={0.75} />
            {accounts.map(([x, y]) => (
                <path key={x} d={`M 162 60 C 180 60, ${x} 50, ${x} ${y + 5}`} stroke={ink(0.3)} strokeWidth={0.75} />
            ))}
            <path d="M 162 60 C 172 60, 172 86, 182 86" stroke={ink(0.3)} strokeWidth={0.75} />

            <circle cx={150} cy={60} r={12} fill={BACKGROUND} stroke={ACCENT} strokeWidth={1} />
            <circle cx={150} cy={60} r={2.5} fill={ACCENT} />
            <Label x={150} y={40} anchor="middle">
                program
            </Label>

            <Label x={209} y={16} anchor="middle">
                accounts
            </Label>
            {accounts.map(([x, y]) => (
                <Square key={x} x={x} y={y} />
            ))}
            {/* PDAs are accounts too; the section around them marks the addresses derived from the program. */}
            <rect x={182} y={66} width={54} height={40} rx={3} stroke={ink(0.35)} strokeWidth={0.75} />
            <Label x={188} y={76}>
                pda
            </Label>
            <Square x={196} y={92} />
            <Square x={222} y={92} />
        </PreviewFrame>
    );
}

export function DeveloperToolsPreview() {
    return (
        <PreviewFrame>
            <Label x={16} y={20.5}>
                sdk
            </Label>
            <path d="M 19 24 V 44 M 19 31 H 25 M 19 44 H 25" stroke={ink(0.25)} strokeWidth={0.75} />
            <Label x={29} y={33.5}>
                @solana/kit
            </Label>
            <Label x={29} y={46.5}>
                web3.js
            </Label>
            <Label x={16} y={62.5}>
                rpc api
            </Label>
            {/* The command line is the section the window on the right shows. */}
            <rect x={12} y={69} width={52} height={14} rx={2} stroke={ACCENT} strokeWidth={0.75} />
            <Label x={16} y={78.5} color={ACCENT}>
                cli
            </Label>
            <Label x={16} y={94.5}>
                cookbook
            </Label>
            <Label x={16} y={108.5}>
                courses
            </Label>

            <rect x={100} y={14} width={134} height={92} rx={3} stroke={ink(0.35)} strokeWidth={0.75} />
            <line x1={100} x2={234} y1={25} y2={25} stroke={ink(0.35)} strokeWidth={0.75} />
            {[106, 112, 118].map(cx => (
                <circle key={cx} cx={cx} cy={19.5} r={1.4} stroke={ink(0.45)} strokeWidth={0.75} />
            ))}
            <Label x={108} y={39} opacity={0.7}>
                $ solana --version
            </Label>
            <Label x={108} y={51} opacity={0.4}>
                solana-cli 2.2.0
            </Label>
            {[80, 56].map((width, index) => (
                <line
                    key={index}
                    x1={108}
                    x2={108 + width}
                    y1={62 + index * 10}
                    y2={62 + index * 10}
                    stroke={ink(0.18)}
                    strokeWidth={2}
                    strokeDasharray="4 2"
                />
            ))}
            <Label x={108} y={91} opacity={0.7}>
                $
            </Label>
            <rect x={116} y={85} width={4} height={7} fill={ACCENT} />
        </PreviewFrame>
    );
}

export function QuickStartPreview() {
    return (
        <PreviewFrame>
            {/* Two areas: building the program, and the client that sends it transactions once it is deployed. */}
            <rect x={12} y={8} width={226} height={54} rx={3} stroke={ink(0.2)} strokeWidth={0.75} />
            <Label x={18} y={18}>
                program
            </Label>
            <line x1={125} x2={190} y1={33} y2={33} stroke={ink(0.25)} strokeWidth={0.75} strokeDasharray="3 2" />
            <line x1={60} x2={125} y1={33} y2={33} stroke={ACCENT} strokeWidth={1} />
            <Step x={60} y={33} number="1" label="write" done />
            <Step x={125} y={33} number="2" label="build" done />
            <Step x={190} y={33} number="3" label="deploy" />

            <rect x={12} y={68} width={226} height={44} rx={3} stroke={ink(0.2)} strokeWidth={0.75} />
            <Label x={18} y={78}>
                client
            </Label>
            <line x1={125} x2={190} y1={88} y2={88} stroke={ink(0.25)} strokeWidth={0.75} strokeDasharray="3 2" />
            <Step x={125} y={88} number="1" label="write tx" />
            <Step x={190} y={88} number="2" label="send tx" />

            {/* The transaction goes to the deployed program. */}
            <path
                d="M 197 33 H 222 Q 226 33, 226 37 V 84 Q 226 88, 222 88 H 197"
                stroke={ink(0.3)}
                strokeWidth={0.75}
            />
        </PreviewFrame>
    );
}

export function JobsPreview() {
    const pins: { x: number; y: number; label?: string }[] = [
        { label: 'rust', x: 61, y: 44 },
        { x: 93, y: 76 },
        { label: 'frontend', x: 141, y: 28 },
        { x: 165, y: 68 },
        { label: 'devrel', x: 197, y: 52 },
        { x: 117, y: 92 },
    ];
    const dots: [number, number][] = [];
    for (let x = 13; x <= 237; x += 8) {
        for (let y = 12; y <= 108; y += 8) {
            // An ellipse of dots reads as the globe the openings are spread across.
            if (((x - 125) / 112) ** 2 + ((y - 60) / 52) ** 2 <= 1) dots.push([x, y]);
        }
    }
    return (
        <PreviewFrame>
            {dots.map(([x, y]) => (
                <circle key={`${x}-${y}`} cx={x} cy={y} r={0.8} fill={ink(0.2)} />
            ))}
            {pins.map(({ x, y, label }) => (
                <g key={`${x}-${y}`}>
                    <ellipse cx={x} cy={y} rx={6} ry={2.5} stroke={ink(0.25)} strokeWidth={0.75} />
                    <line x1={x} x2={x} y1={y} y2={y - 9} stroke={ACCENT} strokeWidth={1} />
                    <circle cx={x} cy={y - 10} r={2} fill={ACCENT} />
                    {label && (
                        <Label x={x + 6} y={y - 8}>
                            {label}
                        </Label>
                    )}
                </g>
            ))}
        </PreviewFrame>
    );
}

const ACCENT = '#1dd79b';
// The card's own surface, so shapes drawn over lines cut them cleanly.
const BACKGROUND = '#0f1513';

function ink(opacity: number) {
    return `rgba(229, 235, 233, ${opacity})`;
}

function PreviewFrame({ children }: { children: ReactNode }) {
    return (
        <svg
            aria-hidden
            viewBox="0 0 250 120"
            preserveAspectRatio="xMidYMid slice"
            fill="none"
            className="block h-full w-full"
            style={{ backgroundColor: BACKGROUND }}
        >
            {children}
        </svg>
    );
}

function Label({
    x,
    y,
    children,
    anchor = 'start',
    color,
    opacity = 0.55,
}: {
    x: number;
    y: number;
    children: string;
    anchor?: 'start' | 'middle' | 'end';
    color?: string;
    opacity?: number;
}) {
    return (
        <text x={x} y={y} textAnchor={anchor} fontSize={7} className="font-mono" fill={color ?? ink(opacity)}>
            {children}
        </text>
    );
}

function Cells({ x, y, count, accent = 0 }: { x: number; y: number; count: number; accent?: number }) {
    return (
        <>
            {Array.from({ length: count }, (_, index) => (
                <rect
                    key={index}
                    x={x + index * 8}
                    y={y - 2.5}
                    width={6}
                    height={5}
                    fill={index < accent ? ACCENT : ink(0.3)}
                />
            ))}
        </>
    );
}

function Square({ x, y }: { x: number; y: number }) {
    return <rect x={x - 5} y={y - 5} width={10} height={10} fill={BACKGROUND} stroke={ink(0.6)} strokeWidth={0.75} />;
}

/** A numbered step box with its name under it; a done step is in the accent. */
function Step({
    x,
    y,
    number,
    label,
    done = false,
}: {
    x: number;
    y: number;
    number: string;
    label: string;
    done?: boolean;
}) {
    return (
        <>
            <rect
                x={x - 7}
                y={y - 7}
                width={14}
                height={14}
                rx={2}
                fill={BACKGROUND}
                stroke={done ? ACCENT : ink(0.45)}
                strokeWidth={1}
            />
            <Label x={x} y={y + 2.5} anchor="middle" color={done ? ACCENT : undefined}>
                {number}
            </Label>
            <Label x={x} y={y + 19} anchor="middle">
                {label}
            </Label>
        </>
    );
}
