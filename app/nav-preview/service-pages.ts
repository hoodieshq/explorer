/**
 * Review surfaces the app serves on its own routes — component galleries and the like, as opposed to
 * explorer content. Listed here so the harness can offer them instead of a page.
 *
 * `/nav-preview` is the only consumer, and this is the only list: the prism (ALX_LOCAL/prism) stays a
 * plain explorer-page previewer on purpose, so nothing needs keeping in step.
 */
export interface ServicePage {
    id: string;
    label: string;
    /** What it shows, and anything needed to make it render. */
    note: string;
    path: string;
}

export const SERVICE_PAGES: ServicePage[] = [
    {
        id: 'cluster-states',
        label: 'cluster selector states',
        note: 'Every state of the navbar cluster button, side by side.',
        path: '/nav-preview/cluster-states',
    },
];
