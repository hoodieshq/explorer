// Reuse note: production loading states often use `LoadingCard` from
// `@components/common/LoadingCard`. This skeleton is a simple Tailwind-only
// version sized to match `ThumbnailShell`.

export function ThumbnailSkeleton() {
    return (
        <div className="e-flex e-w-96 e-flex-col e-gap-3 e-rounded-lg e-border e-border-neutral-700 e-bg-neutral-900 e-p-4">
            <div className="e-flex e-items-center e-justify-between">
                <SkeletonBar className="e-h-3 e-w-28" />
                <SkeletonBar className="e-h-4 e-w-16" />
            </div>
            <div className="e-flex e-flex-col e-gap-2">
                <SkeletonField />
                <div className="e-grid e-grid-cols-2 e-gap-3">
                    <SkeletonField />
                    <SkeletonField />
                    <SkeletonField />
                    <SkeletonField />
                </div>
                <SkeletonField />
            </div>
        </div>
    );
}

function SkeletonField() {
    return (
        <div className="e-flex e-flex-col e-gap-1">
            <SkeletonBar className="e-h-2 e-w-16" />
            <SkeletonBar className="e-h-3 e-w-full" tone="light" />
        </div>
    );
}

function SkeletonBar({ className, tone = 'dark' }: { className: string; tone?: 'dark' | 'light' }) {
    const toneClass = tone === 'light' ? 'e-bg-neutral-800/60' : 'e-bg-neutral-800';
    return <div className={`e-animate-pulse e-rounded ${toneClass} ${className}`} />;
}
