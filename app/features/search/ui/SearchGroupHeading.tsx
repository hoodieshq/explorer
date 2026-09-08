export function SearchGroupHeading({ label }: { label: string }) {
    return (
        <div className="px-3 pb-1 pt-3">
            {/* The card tables' column headers, as the transaction page sets them: 12px, regular, caps,
                `outer-space-300`. Not the legacy `<table>` head, which is 10px dashkit type the project is
                moving off. */}
            <span className="shrink-0 select-none text-xs font-normal uppercase text-outer-space-300">{label}</span>
        </div>
    );
}
