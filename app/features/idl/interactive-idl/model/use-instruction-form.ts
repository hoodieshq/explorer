import type { ArgField, InstructionAccountData, InstructionData, NestedInstructionAccountsData } from '@entities/idl';
import { type Path, type SubmitHandler, useForm, type UseFormSetValue } from 'react-hook-form';

import { isRequiredArg } from '../lib/instruction-args';

type ArgumentType =
    | 'bool'
    | 'u8'
    | 'u16'
    | 'u32'
    | 'u64'
    | 'u128'
    | 'i8'
    | 'i16'
    | 'i32'
    | 'i64'
    | 'i128'
    | 'f32'
    | 'f64'
    | 'string'
    | 'bytes'
    | 'publicKey'
    | 'pubkey';

/* eslint-disable sort-keys-fix/sort-keys-fix */
const DEFAULT_VALUES_PER_TYPE: Record<ArgumentType, string> = {
    bool: 'false',
    u8: '1',
    u16: '1',
    u32: '1',
    u64: '1',
    u128: '1',
    i8: '1',
    i16: '1',
    i32: '1',
    i64: '1',
    i128: '1',
    f32: '1.0',
    f64: '1.0',
    string: 'default',
    bytes: 'data',
    publicKey: '11111111111111111111111111111111',
    pubkey: '11111111111111111111111111111111',
} as const;
/* eslint-disable */

const WRAPPED_TYPES_REGEXP = /^(?:option|coption|vec|array)\s*\(\s*([^,)]+)/;

export type InstructionCallParams = {
    accounts: Record<string, string>;
    arguments: Record<string, string>;
};

export type AccountFormValueMap = Record<string, string | Record<string, string>>;

export type InstructionFormData = {
    accounts: Record<string, AccountFormValueMap>;
    arguments: Record<string, Record<string, string>>;
};

export type FormValue = Parameters<UseFormSetValue<InstructionFormData>>[1];

export type InstructionFormFieldNames = {
    account: (
        account: InstructionAccountData | NestedInstructionAccountsData,
        nestedAccount?: InstructionAccountData
    ) => Path<InstructionFormData>;
    argument: (arg: ArgField) => Path<InstructionFormData>;
};

export function useInstructionForm({
    instruction,
    onSubmit,
}: {
    instruction: InstructionData;
    onSubmit: (params: InstructionCallParams) => void;
}) {
    const form = useForm<InstructionFormData>({
        defaultValues: createDefaultValues(instruction),
    });

    const onInstructionSubmit: SubmitHandler<InstructionFormData> = data => {
        const formData = {
            accounts: flattenNestedRecord(data.accounts),
            arguments: flattenNestedRecord(data.arguments),
        };
        onSubmit(formData);
    };

    return {
        fieldNames: {
            account: (
                account: InstructionAccountData | NestedInstructionAccountsData,
                nestedAccount?: InstructionAccountData
            ): Path<InstructionFormData> =>
                nestedAccount
                    ? (`accounts.${instruction.name}.${account.name}.${nestedAccount.name}` as Path<InstructionFormData>)
                    : (`accounts.${instruction.name}.${account.name}` as Path<InstructionFormData>),
            argument: (arg: ArgField): Path<InstructionFormData> =>
                `arguments.${instruction.name}.${arg.name}` as Path<InstructionFormData>,
        },
        form,
        onSubmit: form.handleSubmit(onInstructionSubmit),
        validationRules: {
            account: (account: InstructionAccountData) => ({
                required: {
                    message: `${account.name} is required`,
                    value: !account.optional,
                },
            }),
            argument: (arg: ArgField) => ({
                required: {
                    message: `${arg.name} is required`,
                    value: isRequiredArg(arg),
                },
            }),
        },
    };
}

/**
 * Creates default form values for an instruction.
 * Pre-initializes all field paths to prevent uncontrolled to controlled warning.
 * React Hook Form uses dot notation (accounts.instructionName.accountName) which creates nested structures.
 * Handles both flat accounts and nested account groups.
 */
function createDefaultValues(instruction: InstructionData): InstructionFormData {
    const accountsDefault: Record<string, AccountFormValueMap> = {};

    const instructionAccounts: AccountFormValueMap = {};

    instruction.accounts.forEach(account => {
        if ('accounts' in account) {
            const accountGroup: Record<string, string> = {};
            account.accounts.forEach(nestedAccount => {
                accountGroup[nestedAccount.name] = '';
            });
            instructionAccounts[account.name] = accountGroup;
        } else {
            instructionAccounts[account.name] = '';
        }
    });

    accountsDefault[instruction.name] = instructionAccounts;

    return {
        accounts: accountsDefault,
        arguments: instruction.args.reduce((acc, arg) => {
            if (!acc[instruction.name]) {
                acc[instruction.name] = {};
            }
            acc[instruction.name][arg.name] = findDefaultValueForArgumentType(arg.type);
            return acc;
        }, {} as Record<string, Record<string, string>>),
    };
}

export function flattenNestedRecord(
    nested: Record<string, AccountFormValueMap> | Record<string, Record<string, string>>
): Record<string, string> {
    const result: Record<string, string> = {};

    Object.entries(nested).forEach(([instructionKey, instructionValue]) => {
        Object.entries(instructionValue).forEach(([accountKey, accountValue]) => {
            if (typeof accountValue === 'string') {
                result[`${instructionKey}.${accountKey}`] = accountValue;
            } else {
                Object.entries(accountValue).forEach(([nestedKey, nestedValue]) => {
                    result[`${instructionKey}.${accountKey}.${nestedKey}`] = nestedValue;
                });
            }
        });
    });

    return result;
}

function findDefaultValueForArgumentType(arg_type: string) {
    const matches = arg_type.match(WRAPPED_TYPES_REGEXP);
    if (matches) {
        return DEFAULT_VALUES_PER_TYPE[matches[1] as ArgumentType] || '';
    }
    return DEFAULT_VALUES_PER_TYPE[arg_type as ArgumentType] || '';
}
