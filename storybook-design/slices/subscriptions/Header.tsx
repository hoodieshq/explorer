// Slice-local page header matching the transaction page's heading
// (app/tx/[signature]/page-client.tsx): a muted "DETAILS" eyebrow above a large
// title, no divider under it. For this wallet page the title is "Account".
// Typography is copied verbatim from that page's <header> so the two pages match.
export function Header() {
    return (
        <header className="mb-3 mt-4 flex flex-col gap-1.5 py-6">
            <span className="text-xs font-normal uppercase text-muted">Details</span>
            <h1 className="m-0 text-2xl font-normal leading-none text-white md:text-3xl">Account</h1>
        </header>
    );
}
