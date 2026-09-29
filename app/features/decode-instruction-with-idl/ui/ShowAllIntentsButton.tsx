import { Button } from '@components/shared/ui/button';
import { AlignLeft } from 'react-feather';

import { useIntentExpansion } from '../model/intent-expansion';

/**
 * Section-level "Show all intents": opens every card that offers one. Hidden while no card on the page
 * does, so it never promises summaries that cannot exist.
 */
export function ShowAllIntentsButton() {
    const expansion = useIntentExpansion();
    if (!expansion || expansion.supportedCount === 0) return undefined;

    const open = expansion.command?.open ?? false;

    return (
        <Button
            variant="outline"
            size="sm"
            aria-expanded={open}
            onClick={() => expansion.setAll(!open)}
            data-testid="show-all-intents"
        >
            <AlignLeft size={12} />
            <span className="hidden md:inline">{open ? 'Hide all intents' : 'Show all intents'}</span>
            <span className="md:hidden">{open ? 'Hide intents' : 'Intents'}</span>
        </Button>
    );
}
