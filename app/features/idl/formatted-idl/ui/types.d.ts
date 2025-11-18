import type { FormattedIdl } from '@entities/idl/formatters/formatted-idl';

export type StandardFormattedIdlProps<T> = {
    idl?: T;
    programId: string;
    searchStr?: string;
};

export type FormattedIdlViewProps<T> = {
    idl: FormattedIdl | null;
    originalIdl: T;
    searchStr?: string;
};

export type IdlDataKeys = keyof FormattedIdl;

export interface FormattedIdlDataView<K extends keyof FormattedIdl> {
    data: FormattedIdl[K];
}
