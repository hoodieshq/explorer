// Vendored copy of app/shared/ui/navigation-tabs/model/types.ts with an added optional `disabled`
// flag. Used by the vendored BaseNavigationTabs so the inspector Enhancements slice can render tabs
// that are visible but non-interactive (e.g. Logs / CU profiling / SOL Balance Changes before a
// simulation has run). The app original stays unchanged.
export type NavigationTab<P extends string = string> = {
    path: P;
    title: string;
    disabled?: boolean;
};
