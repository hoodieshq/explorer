/**
 * The preview route, in one place: the plaque links to it and the harness refuses it as a `?path=`
 * target so it cannot nest inside itself. A plain module, not the client component, so the server page
 * can read it too.
 */
export const NAV_PREVIEW_PATH = '/nav-preview';
