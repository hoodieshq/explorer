import type {
    InstructionAccountData,
    InstructionData,
    NestedInstructionAccountsData,
    SupportedIdl,
} from '@entities/idl';
import { Button } from '@shared/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@shared/ui/tooltip';
import { useWallet } from '@solana/wallet-adapter-react';
import { Loader, Play, Send } from 'react-feather';
import { Control, Controller, FieldPath } from 'react-hook-form';

import { Card, CardSection } from '@/app/shared/ui/Card';

import { createGetAutocompleteItems } from '../model/account-autocomplete/createGetAutocompleteItems';
import type { AutocompleteItem } from '../model/account-autocomplete/types';
import { createKnownAccountsPrefillDependency } from '../model/form-prefill/providers/known-accounts-prefill-provider';
import { usePdaPrefill } from '../model/form-prefill/providers/use-pda-prefill';
import { createWalletPrefillDependency } from '../model/form-prefill/providers/wallet-prefill-provider';
import { useFormPrefill } from '../model/form-prefill/use-form-prefill';
import {
    type InstructionCallParams,
    type InstructionFormData,
    useInstructionForm,
} from '../model/use-instruction-form';
import { usePdas } from '../model/use-pdas';
import { AccordionContent, AccordionItem, AccordionTrigger } from './Accordion';
import { AccountInput } from './AccountInput';
import { ArgumentInput } from './ArgumentInput';

// FIXME: missing Storybook story — uses useWallet + react-hook-form Controllers + nested IDL fixtures.
export function InteractInstruction({
    idl,
    instruction,
    onExecuteInstruction,
    onSimulateInstruction,
    isExecuting,
    isSimulating,
}: {
    idl: SupportedIdl | undefined;
    onExecuteInstruction: (data: InstructionData, params: InstructionCallParams) => void;
    onSimulateInstruction: (data: InstructionData, params: InstructionCallParams) => void;
    instruction: InstructionData;
    isExecuting: boolean;
    isSimulating: boolean;
}) {
    const { connected: walletConnected, publicKey } = useWallet();

    const { form, onSubmit, onSimulate, validationRules, fieldNames } = useInstructionForm({
        instruction,
        onSimulate: params => {
            onSimulateInstruction(instruction, params);
        },
        onSubmit: params => {
            onExecuteInstruction(instruction, params);
        },
    });

    const pdas = usePdas({ form, idl, instruction });
    const getAutocompleteItems = createGetAutocompleteItems({ pdas, publicKey });

    const walletPrefillDependency = createWalletPrefillDependency(instruction, publicKey, fieldNames);
    const knownAccountsPrefillDependency = createKnownAccountsPrefillDependency(instruction, fieldNames);
    useFormPrefill({
        config: {
            externalDependencies: [walletPrefillDependency, knownAccountsPrefillDependency],
        },
        form,
    });
    usePdaPrefill({ fieldNames, form, instruction, pdas });

    const interactionDisabled = !walletConnected || isExecuting || isSimulating;

    return (
        <Card variant="tight">
            <AccordionItem value={instruction.name} className="">
                <AccordionTrigger>
                    <div className="e-flex e-w-full e-items-center e-justify-between">
                        <span className="e-min-w-0 e-flex-1 e-truncate e-pr-4 e-text-left e-text-sm e-font-medium e-text-white md:e-w-[170px] [@media(min-width:992px)]:e-w-[300px]">
                            {instruction.name}
                        </span>
                    </div>
                </AccordionTrigger>
                <AccordionContent>
                    {/* Instruction Documentation */}
                    {instruction.docs && instruction.docs.length > 0 && (
                        <div className="e-mb-4 e-rounded-lg e-bg-[#1a1b1d] e-p-3">
                            <p className="e-text-xs e-text-neutral-400">{instruction.docs.join(' ')}</p>
                        </div>
                    )}

                    {/* Arguments Section - shown first as accounts may depend on argument values */}
                    {instruction.args.length > 0 && (
                        <CardSection title="Arguments">
                            <div className="e-space-y-3 e-px-6">
                                {instruction.args.map(arg => (
                                    <Controller
                                        key={arg.name}
                                        name={fieldNames.argument(arg)}
                                        control={form.control}
                                        rules={validationRules.argument(arg)}
                                        render={({ field, fieldState: { error } }) => (
                                            <ArgumentInput
                                                {...field}
                                                value={
                                                    typeof field.value === 'string'
                                                        ? field.value
                                                        : String(field.value || '')
                                                }
                                                arg={arg}
                                                error={error}
                                            />
                                        )}
                                    />
                                ))}
                            </div>
                        </CardSection>
                    )}

                    {/* Accounts Section */}
                    {instruction.accounts.length > 0 && (
                        <CardSection title="Accounts">
                            <div className="e-space-y-3 e-px-6">
                                {instruction.accounts.map(account =>
                                    'accounts' in account ? (
                                        <NestedAccountGroup
                                            key={account.name}
                                            group={account}
                                            control={form.control}
                                            fieldNames={fieldNames}
                                            validationRules={validationRules}
                                            getAutocompleteItems={getAutocompleteItems}
                                            seeds={pdas[account.name]?.seeds || []}
                                        />
                                    ) : (
                                        <AccountController
                                            key={account.name}
                                            account={account}
                                            name={fieldNames.account(account)}
                                            control={form.control}
                                            rules={validationRules.account(account)}
                                            getAutocompleteItems={getAutocompleteItems}
                                            seeds={pdas[account.name]?.seeds || []}
                                        />
                                    ),
                                )}
                            </div>
                        </CardSection>
                    )}
                    <div className="e-flex e-gap-2 e-px-6 e-pb-2.5">
                        <ExecuteButton
                            onClick={onSubmit}
                            disabled={interactionDisabled}
                            isExecuting={isExecuting}
                            tooltipText="Connect your wallet to execute the instruction"
                        />
                        <SimulateButton
                            onClick={onSimulate}
                            disabled={interactionDisabled}
                            isSimulating={isSimulating}
                        />
                    </div>
                </AccordionContent>
            </AccordionItem>
        </Card>
    );
}

function AccountController({
    account,
    name,
    control,
    rules,
    getAutocompleteItems,
    seeds,
}: {
    account: InstructionAccountData;
    name: FieldPath<InstructionFormData>;
    control: Control<InstructionFormData>;
    rules: { required: { value: boolean; message: string } };
    getAutocompleteItems: (accountName: string) => AutocompleteItem[];
    seeds: { name: string }[];
}) {
    const autocompleteItems = getAutocompleteItems(account.name);
    return (
        <Controller
            name={name}
            control={control}
            rules={rules}
            render={({ field, fieldState: { error } }) => (
                <AccountInput
                    {...field}
                    value={typeof field.value === 'string' ? field.value : ''}
                    account={account}
                    error={error}
                    autocompleteItems={autocompleteItems}
                    seeds={seeds}
                />
            )}
        />
    );
}

function NestedAccountGroup({
    group,
    control,
    fieldNames,
    validationRules,
    getAutocompleteItems,
    seeds,
}: {
    group: NestedInstructionAccountsData;
    control: Control<InstructionFormData>;
    fieldNames: ReturnType<typeof useInstructionForm>['fieldNames'];
    validationRules: ReturnType<typeof useInstructionForm>['validationRules'];
    getAutocompleteItems: (accountName: string) => AutocompleteItem[];
    seeds: { name: string }[];
}) {
    return (
        <div className="e-space-y-3">
            <h4 className="e-text-sm e-font-medium e-text-gray-400">{group.name}</h4>
            <div className="e-ml-4 e-space-y-3 e-rounded-lg e-border e-border-neutral-800 e-bg-neutral-900/50 e-p-3">
                {group.accounts.map(nestedAccount => (
                    <AccountController
                        key={nestedAccount.name}
                        account={nestedAccount}
                        name={fieldNames.account(group, nestedAccount)}
                        control={control}
                        rules={validationRules.account(nestedAccount)}
                        getAutocompleteItems={getAutocompleteItems}
                        seeds={seeds}
                    />
                ))}
            </div>
        </div>
    );
}

function ExecuteButton({
    onClick,
    disabled,
    isExecuting,
    tooltipText,
}: {
    onClick: () => void;
    disabled: boolean;
    isExecuting: boolean;
    tooltipText?: string;
}) {
    const button = (
        <Button variant="accent" size="sm" onClick={onClick} disabled={disabled}>
            {isExecuting ? <Loader size={16} className="e-animate-spin" /> : <Send size={16} />}
            Execute
        </Button>
    );

    if (!disabled || !tooltipText) {
        return button;
    }

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <div className="e-w-fit">{button}</div>
            </TooltipTrigger>
            <TooltipContent>
                <div className="e-min-w-36 e-max-w-16">{tooltipText}</div>
            </TooltipContent>
        </Tooltip>
    );
}

function SimulateButton({
    onClick,
    disabled,
    isSimulating,
}: {
    onClick: () => void;
    disabled: boolean;
    isSimulating: boolean;
}) {
    return (
        <Button variant="outline" size="sm" onClick={onClick} disabled={disabled}>
            {isSimulating ? <Loader size={16} className="e-animate-spin" /> : <Play size={16} />}
            Simulate
        </Button>
    );
}
