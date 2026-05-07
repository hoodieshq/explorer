import { AccountThumbnailIndexView } from '@/app/features/account-thumbnail';

export const metadata = {
    description: 'Examples for testing account thumbnail rendering in isolation',
    title: 'Account thumbnail playground',
};

export default function AccountThumbnailIndexPage() {
    return (
        <div className="e-mx-auto e-flex e-max-w-6xl e-flex-col e-gap-6 e-p-8 e-text-neutral-100">
            <header className="e-flex e-flex-col e-gap-2">
                <div className="e-flex e-flex-wrap e-items-baseline e-gap-3">
                    <h1 className="e-text-2xl e-font-semibold e-leading-none">Account thumbnail playground</h1>
                    <span
                        title="The playground reads from NEXT_PUBLIC_MAINNET_RPC_URL only. Devnet/testnet/custom clusters are not wired."
                        className="e-inline-flex e-items-center e-gap-1.5 e-rounded-full e-bg-amber-500/15 e-px-2.5 e-py-1 e-text-[11px] e-font-semibold e-uppercase e-tracking-[0.12em] e-text-amber-300 e-ring-1 e-ring-inset e-ring-amber-500/40"
                    >
                        <span aria-hidden className="e-h-1.5 e-w-1.5 e-animate-pulse e-rounded-full e-bg-amber-400" />
                        Mainnet only
                    </span>
                </div>
                <p className="e-text-sm e-text-neutral-400">
                    Pick an example on the left — the thumbnail renders in the sticky preview on the right.
                </p>
            </header>
            <AccountThumbnailIndexView />
        </div>
    );
}
