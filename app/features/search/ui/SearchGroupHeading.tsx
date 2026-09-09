// Twice the air above as below: the heading belongs to the group under it, and the wider gap is what
// separates that group from the one that ended above.
export function SearchGroupHeading({ label }: { label: string }) {
    return (
        <div className="px-3 pb-2 pt-6">
            {/* The card tables' column headers, as the transaction page sets them: 12px, regular, caps,
                `outer-space-300`. Not the legacy `<table>` head, which is 10px dashkit type the project is
                moving off. */}
            <span className="shrink-0 select-none text-xs font-normal uppercase text-outer-space-300">{label}</span>
        </div>
    );
}
