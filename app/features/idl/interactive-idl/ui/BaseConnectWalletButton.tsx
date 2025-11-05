import WalletIcon from '@img/wallet-icon.svg';
import Image from 'next/image';

type BaseConnectWalletButtonProps = {
    displayAddress: string;
    onClick?: () => void;
    isVisible?: boolean;
};

export function BaseConnectWalletButton({ displayAddress, onClick, isVisible = true }: BaseConnectWalletButtonProps) {
    if (!isVisible) {
        return null;
    }

    return (
        <button
            onClick={onClick}
            className="e-flex e-items-center e-gap-2 e-rounded e-border e-border-solid e-border-[#49504E] e-border-opacity-100 e-bg-transparent e-px-3 e-py-1.5 e-text-xs e-text-white"
        >
            <Image src={WalletIcon} width={12} height={12} alt="" />
            <div className="e-whitespace-nowrap">{displayAddress}</div>
        </button>
    );
}
