import { Button } from '@components/shared/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@components/shared/ui/dropdown-menu';
import { cva } from 'class-variance-authority';
import { ChevronDown } from 'react-feather';

import { type IdlSourceOption, type OnChainIdlSourceOption } from '../model/custom-idl/idl-source-options';

const IDL_SOURCE_LABELS: Record<OnChainIdlSourceOption, string> = {
    anchor: 'Anchor',
    programMetadata: 'PMP',
};

/**
 * Picks which IDL a program is decoded with: a dropdown over the program's on-chain sources and its custom
 * IDL, with add, or replace and remove, for the custom one.
 */
export function BaseIdlSourceSelect({
    options,
    value,
    hasCustomIdl,
    customIdlFileName,
    onSelect,
    onAdd,
    onRemove,
}: {
    /** On-chain sources the program has, in display order. */
    options: OnChainIdlSourceOption[];
    value: IdlSourceOption | undefined;
    hasCustomIdl: boolean;
    /** The stored custom IDL's file name; absent for pasted JSON. */
    customIdlFileName?: string;
    onSelect: (value: IdlSourceOption) => void;
    onAdd: () => void;
    onRemove: () => void;
}) {
    const isCustom = value === 'custom';
    const sourceLabel = isCustom ? 'Custom' : value ? IDL_SOURCE_LABELS[value] : 'None';
    const hasSources = options.length > 0 || hasCustomIdl;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className={idlSourceTriggerVariants({ custom: isCustom })}>
                    <span className="truncate">IDL: {sourceLabel}</span>
                    <ChevronDown />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                {hasSources && (
                    <>
                        <DropdownMenuRadioGroup value={value} onValueChange={next => onSelect(next as IdlSourceOption)}>
                            {options.map(option => (
                                <DropdownMenuRadioItem key={option} value={option}>
                                    {IDL_SOURCE_LABELS[option]} (on-chain)
                                </DropdownMenuRadioItem>
                            ))}
                            {hasCustomIdl && (
                                <DropdownMenuRadioItem value="custom">
                                    Custom{customIdlFileName ? ` (${customIdlFileName})` : ''}
                                </DropdownMenuRadioItem>
                            )}
                        </DropdownMenuRadioGroup>
                        <DropdownMenuSeparator />
                    </>
                )}
                {hasCustomIdl ? (
                    <>
                        <DropdownMenuItem onSelect={onAdd}>Replace custom IDL…</DropdownMenuItem>
                        <DropdownMenuItem onSelect={onRemove}>Remove custom IDL</DropdownMenuItem>
                    </>
                ) : (
                    <DropdownMenuItem onSelect={onAdd}>Add custom IDL…</DropdownMenuItem>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

// `!` because the outline Button's own border, background and text colours are emitted after these.
const idlSourceTriggerVariants = cva('max-w-64', {
    variants: {
        custom: {
            false: '',
            true: '!border-custom-idl !bg-custom-idl/15 !text-custom-idl hover:!bg-custom-idl/25',
        },
    },
});
