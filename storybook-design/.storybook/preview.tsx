import '@/app/styles/styles.css';

import { createPreview } from '../../.storybook/create-preview';

// MSW is enabled so the tx-page slice can intercept the one live RPC call the AccountsCard makes
// (new Connection(url).getMultipleAccountsInfo) and answer it with the transaction's real account
// data. Stories without `parameters.msw.handlers` simply have no handlers registered.
const preview = createPreview({ mswEnabled: true });

// Design spec canvas background: #161A18. The closest design token is `heavy-metal-900`
// (tailwind.config.ts → colors['heavy-metal'][900]), whose OKLCH value converts to #161A18 exactly.
// Use the token value verbatim rather than a hardcoded hex so the swatch tracks the token.
const DARK_BG = 'oklch(21.275% 0.00721 164.22)'; // heavy-metal-900 ≈ #161A18

// Force the dark canvas on every page of this Storybook (stories and autodocs alike): retarget the
// `dark` swatch to the spec background and lock it in as the default global.
export default {
    ...preview,
    initialGlobals: {
        ...preview.initialGlobals,
        backgrounds: { value: 'dark' },
    },
    parameters: {
        ...preview.parameters,
        backgrounds: {
            ...preview.parameters?.backgrounds,
            options: {
                ...preview.parameters?.backgrounds?.options,
                dark: { name: 'Dark', value: DARK_BG },
            },
        },
    },
};
