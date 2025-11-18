import type { ArgField } from '@entities/idl/formatters/formatted-idl';

export function isRequiredArg(arg: ArgField): boolean {
    return !/^(option|coption)\(/.test(arg.type);
}
