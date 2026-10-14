import { Button } from '@components/shared/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@components/shared/ui/popover';
import { ChevronDown } from 'react-feather';

/**
 * The IDL selector's stand-in on an instruction the RPC decoded: same size, dimmed, and a click explains why
 * no IDL can be chosen. Built like the unavailable Filters control of the account history.
 */
export function BaseIdlSelectUnavailable() {
    return (
        <Popover>
            <PopoverTrigger asChild>
                {/* Not natively `disabled`: the click has to reach the trigger to open the explanation. */}
                <Button size="sm" variant="outline" aria-label="IDL: RPC, unavailable" className="opacity-50">
                    <span>IDL: RPC</span>
                    <ChevronDown />
                </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="flex w-72 flex-col gap-2 p-4">
                <p className="m-0 text-sm font-medium text-white">Custom IDL unavailable</p>
                <p className="m-0 text-sm text-neutral-400">
                    The RPC returns this program already decoded, without raw data. An IDL has nothing to decode.
                </p>
            </PopoverContent>
        </Popover>
    );
}
