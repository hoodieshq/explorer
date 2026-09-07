import { notFound } from 'next/navigation';

import { NAV_VARIANTS_ENABLED } from '@/app/components/navbar-variants/nav-variant-storage';

import { NavPreview } from './NavPreview';
import { NAV_PREVIEW_PATH } from './path';

/**
 * What the frame shows unless `?path=` says otherwise. A transaction page, because that is the densest
 * layout the navigation has to sit above — long addresses, wide tables, a tall scroll.
 *
 * Signatures age out of RPC history, so if this one stops resolving the navigation still renders (which
 * is what the page is for) and the fix is either this constant or a `?path=` on the URL.
 */
const DEFAULT_PATH = '/tx/3CcMKCCzC9FnEDcer1x3iCAjyxBRYSjh4HYoMM4fW1tQ4isEHD5gywGJ9AoBo9jJNfE3iDSddjKTKsR5172e3r2e';

/**
 * Generated rather than a static `metadata` export, and gated first: a static export is evaluated before
 * the component, which starts the response — and a `notFound()` after that streams the not-found body
 * with a 200 and this page's own title on it.
 */
export async function generateMetadata() {
    if (!NAV_VARIANTS_ENABLED) notFound();
    return {
        description: 'Review the main navigation at each breakpoint',
        title: 'Navigation preview | Solana',
    };
}

/**
 * Only a same-origin app path is accepted. A protocol-relative or absolute URL would turn the frame into
 * an open embed of someone else's page, and a path back into this route would nest the harness in itself.
 */
function resolvePath(raw: string | string[] | undefined): string {
    if (typeof raw !== 'string' || !raw.startsWith('/') || raw.startsWith('//')) return DEFAULT_PATH;
    if (raw.startsWith(NAV_PREVIEW_PATH)) return DEFAULT_PATH;
    return raw;
}

export default async function NavPreviewPage(props: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
    // Gated on the same flag as the switcher, so the route simply does not exist in production.
    if (!NAV_VARIANTS_ENABLED) notFound();

    const searchParams = await props.searchParams;
    return <NavPreview path={resolvePath(searchParams.path)} />;
}
