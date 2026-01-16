import { dollar } from './images';
import { Logo } from './Logo';
import { Zigzag } from './Zigzag';

export const IMAGE_SIZE = {
    height: 630,
    width: 1200,
};

type BaseReceiptImageProps = {
    data: {
        sender?: string;
        receiver?: string;
        date?: string;
        description?: string;
        network?: string;
        fee?: string;
        total?: string;
    };
    options?: {
        minimal?: boolean;
        size?: {
            height: number;
            width: number;
        };
    };
};

export function BaseReceiptImage({
    data: { sender, receiver, date, description, network, fee, total },
    options,
}: BaseReceiptImageProps) {
    const minimal = options?.minimal || false;
    const size = options?.size || IMAGE_SIZE;
    return (
        <div
            style={{
                alignItems: 'flex-start',
                backgroundImage: `radial-gradient(ellipse at 50% 50%, ${colors.emerald700} 0%, ${colors.outerSpace950} 80%)`,
                display: 'flex',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                height: size.height,
                justifyContent: 'center',
                width: size.width,
            }}
        >
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    padding: '0',
                    position: 'relative',
                    width: '1047px',
                }}
            >
                <div
                    style={{
                        background: colors.outerSpace900,
                        border: `1px solid ${colors.outerSpace950}`,
                        borderBottom: 'none',
                        display: 'flex',
                        flexDirection: 'column',
                    }}
                >
                    <Header date={date} minimal={minimal} />
                    {minimal ? null : (
                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                padding: '24px 54px',
                            }}
                        >
                            <ListItem label="Sender" value={sender} />
                            <ListItem label="Receiver" value={receiver} />
                            <ListItem label="Network" value={network} />
                            {description && <DescriptionText text={description} truncate />}
                        </div>
                    )}

                    <Footer fee={fee} total={total} minimal={minimal} />
                </div>

                <Zigzag style={{ color: colors.outerSpace900 }} />
            </div>
        </div>
    );
}

function Header({ date, minimal }: { date?: string; minimal?: boolean }) {
    return (
        <div
            style={{
                alignItems: 'center',
                borderBottom: '2px solid rgba(255, 255, 255, 0.1)',
                display: 'flex',
                justifyContent: 'space-between',
                padding: minimal ? '54px 84px' : '32px 54px',
            }}
        >
            <div
                style={{
                    alignItems: 'center',
                    display: 'flex',
                    gap: '12px',
                }}
            >
                <Logo style={{ height: minimal ? '38px' : '26px', width: minimal ? '326px' : '229px' }} />

                <span
                    style={{
                        color: colors.neutral200,
                        fontSize: minimal ? '50px' : '35px',
                        fontWeight: 500,
                        marginLeft: '18px',
                    }}
                >
                    Receipt
                </span>
            </div>
            {date && !minimal && (
                <span
                    style={{
                        color: colors.neutral500,
                        fontFamily: 'monospace',
                        fontSize: '28px',
                    }}
                >
                    {date}
                </span>
            )}
        </div>
    );
}

function Footer({ fee, total, minimal }: { fee?: string; total?: string; minimal?: boolean }) {
    if (!total) return null;
    return (
        <div
            style={{
                borderTop: minimal ? 'none' : '2px dashed rgba(255, 255, 255, 0.15)',
                display: 'flex',
                flexDirection: 'column',
                padding: minimal ? '40px 84px' : '29px 54px 16px',
            }}
        >
            <Total total={total} minimal={minimal} />

            {fee && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: colors.neutral500, fontSize: '44px', lineHeight: '1em' }}>Fee</span>
                    <span style={{ color: colors.neutral500, fontSize: '50px', lineHeight: '1em' }}>{fee}</span>
                </div>
            )}
        </div>
    );
}

function Total({ total, minimal }: { total?: string; minimal?: boolean }) {
    return (
        <div
            style={{
                alignItems: 'center',
                display: 'flex',
                justifyContent: 'space-between',
            }}
        >
            <span
                style={{
                    color: colors.neutral200,
                    fontSize: minimal ? '44px' : '31px',
                }}
            >
                Total
            </span>
            <div
                style={{
                    alignItems: 'center',
                    display: 'flex',
                    gap: '8px',
                }}
            >
                <img
                    alt="Dollar icon"
                    src={dollar}
                    height={minimal ? '80px' : '60px'}
                    width={minimal ? '80px' : '60px'}
                />

                <span
                    style={{
                        color: colors.neutral200,
                        fontSize: minimal ? '101px' : '70px',
                        lineHeight: '1em',
                        marginLeft: '10px',
                    }}
                >
                    {total}
                </span>
            </div>
        </div>
    );
}

function ListItem({ label, value }: { label: string; value: React.ReactNode | string | undefined | null }) {
    if (!value) return null;
    return (
        <div
            style={{
                alignItems: 'center',
                display: 'flex',
                gap: '16px',
                justifyContent: 'space-between',
            }}
        >
            <DescriptionText text={label} />
            {typeof value === 'string' ? (
                <span
                    style={{
                        color: colors.emerald700,
                        display: 'flex',
                        flex: 1,
                        fontFamily: 'monospace',
                        fontSize: '26px',
                        justifyContent: 'flex-end',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                    }}
                >
                    {value}
                </span>
            ) : (
                value
            )}
        </div>
    );
}

function DescriptionText({ text, truncate }: { text: string; truncate?: boolean }) {
    return (
        <span
            style={{
                color: colors.neutral500,
                fontSize: '28px',
                lineHeight: '1em',
                padding: '16px 0',
                ...(truncate
                    ? {
                          display: 'block',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          width: '100%',
                      }
                    : {
                          flexShrink: 0,
                      }),
            }}
        >
            {text}
        </span>
    );
}

const colors = {
    emerald700: '#0ea476',
    heavyMetal800: '#29302c',
    neutral200: '#e5e5e5',
    neutral500: '#737373',
    outerSpace900: '#1d2322',
    outerSpace950: '#101413',
};
