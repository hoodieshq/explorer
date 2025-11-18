export function NoSearchResultsPlaceholder({ tabName }: { tabName: string }) {
    return (
        <div className="e-flex e-items-center e-justify-center e-py-6 e-text-center">
            <p className="e-m-0 e-text-sm e-text-neutral-500">No {tabName.toLowerCase()} found</p>
        </div>
    );
}
