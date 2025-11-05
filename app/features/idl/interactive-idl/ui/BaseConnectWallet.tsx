import { truncateAddress } from '@entities/address/utils';
import WalletIcon from '@img/wallet-icon.svg';
import { Slot } from '@radix-ui/react-slot';
import { Card } from '@shared/ui/card';
import { cn } from '@shared/utils';
import { cva } from 'class-variance-authority';
import Image from 'next/image';
import { ReactNode, useMemo } from 'react';

import { BaseConnectWalletButton } from './BaseConnectWalletButton';

const LABELS = {
    'change-wallet': 'Change wallet',
    connecting: 'Connecting ...',
    'copy-address': 'Copy address',
    copied: 'Copied',
    disconnect: 'Disconnect',
    'has-wallet': 'Connect',
    'no-wallet': 'Select Wallet',
} as const;

const cardVariants = cva(
    'e-flex e-w-full e-items-center e-justify-between e-gap-[7px] e-border e-border-[#000000] e-bg-[#282D2B] e-px-3 e-py-2 e-shadow-[3px_12px_24px_0px_rgba(20,24,22,0.5)]',
    {
        defaultVariants: {
            clickable: false,
            disabled: false,
        },
        variants: {
            clickable: {
                true: 'e-cursor-pointer hover:e-bg-[#2A2F2D]',
            },
            disabled: {
                true: 'e-opacity-50 e-cursor-not-allowed',
            },
        },
    }
);

type BaseConnectWalletProps = {
    connected: boolean;
    connecting: boolean;
    onConnect?: () => void;
    onDisconnect?: () => void;
    address?: string;
    asChild?: boolean;
    buttonState?: string;
    disabled?: boolean;
    className?: string;
    children?: ReactNode;
    labels?: typeof LABELS;
};

export function BaseConnectWallet({
    connected,
    connecting,
    onConnect,
    onDisconnect,
    address,
    asChild = false,
    buttonState,
    disabled = false,
    className,
    labels = LABELS,
}: BaseConnectWalletProps) {
    const isDisabled = disabled || (!connected && !onConnect);
    const isClickable = !connected && !isDisabled && Boolean(onConnect);

    const handleClick = () => {
        if (isClickable && onConnect) {
            onConnect();
        }
    };

    const cardProps = {
        className: cn(
            cardVariants({
                clickable: isClickable,
                disabled: isDisabled,
            }),
            className
        ),
        disabled: isDisabled,
        onClick: handleClick,
    };

    const displayLabel = useMemo(() => {
        if (buttonState === 'connecting' || buttonState === 'has-wallet') {
            return labels?.[buttonState];
        } else {
            return labels?.['no-wallet'];
        }
    }, [buttonState, labels]);

    const content = (
        <>
            <div className="e-flex e-w-full e-items-center e-gap-0.5">
                <div className="e-w-full e-grow">
                    {!connected ? (
                        <>
                            <div className="e-py-1 e-text-sm e-font-normal e-text-white">Connect wallet</div>
                            <div className="e-text-xs e-font-normal e-text-[#8A8D8C]">Link your wallet</div>
                        </>
                    ) : (
                        <>
                            <div className="e-py-1 e-text-sm e-font-normal e-text-white">Connect wallet</div>
                            <div className="e-text-xs e-font-normal e-text-[#8A8D8C]">Wallet connected</div>
                        </>
                    )}
                </div>
                <div className="e-grow-0">
                    {!connected && (
                        <button
                            onClick={onConnect}
                            disabled={isDisabled}
                            className="e-flex e-items-center e-gap-2 e-rounded e-border e-border-solid e-border-[#49504E] e-border-opacity-100 e-bg-transparent e-px-3 e-py-1.5 e-text-xs e-text-white hover:e-bg-[#2A2F2D] disabled:e-cursor-not-allowed disabled:e-opacity-50"
                        >
                            <Image src={WalletIcon} width={12} height={12} alt="" />
                            <div className="e-whitespace-nowrap">{displayLabel}</div>
                        </button>
                    )}
                    {connected && address && (
                        <BaseConnectWalletButton onClick={onDisconnect} displayAddress={truncateAddress(address)} />
                    )}
                </div>
            </div>
        </>
    );

    const Comp = asChild ? Slot : Card;

    return (
        <Comp
            variant="narrow"
            className={cn(
                cardVariants({
                    clickable: isClickable,
                    disabled: isDisabled,
                }),
                className
            )}
            onClick={handleClick}
        >
            {content}
        </Comp>
    );
}
