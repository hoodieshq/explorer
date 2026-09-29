import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from 'react';

/** The last "Show all / Hide all intents" request. The nonce makes a repeated request distinct. */
export type IntentExpansionCommand = { open: boolean; nonce: number };

type IntentExpansion = {
    command: IntentExpansionCommand | undefined;
    /** How many cards on the page currently offer an intent: the section button hides at zero. */
    supportedCount: number;
    /** Registers a card that offers an intent; returns its unregister. */
    register: () => () => void;
    setAll: (open: boolean) => void;
};

const IntentExpansionContext = createContext<IntentExpansion | undefined>(undefined);

/**
 * Lets one section-level button open or close every instruction intent in it.
 * Cards own their open state; the provider only broadcasts commands, so a card toggled by hand after a
 * "Show all" simply keeps its own state until the next command.
 */
export function IntentExpansionProvider({ children }: { children: ReactNode }) {
    const [command, setCommand] = useState<IntentExpansionCommand>();
    const [supportedCount, setSupportedCount] = useState(0);

    const register = useCallback(() => {
        setSupportedCount(count => count + 1);
        return () => setSupportedCount(count => count - 1);
    }, []);

    const setAll = useCallback((open: boolean) => {
        setCommand(previous => ({ nonce: (previous?.nonce ?? 0) + 1, open }));
    }, []);

    const value = useMemo(
        () => ({ command, register, setAll, supportedCount }),
        [command, register, setAll, supportedCount],
    );

    return <IntentExpansionContext.Provider value={value}>{children}</IntentExpansionContext.Provider>;
}

/** Undefined outside a provider: a card then simply has no section-level control. */
export function useIntentExpansion(): IntentExpansion | undefined {
    return useContext(IntentExpansionContext);
}
