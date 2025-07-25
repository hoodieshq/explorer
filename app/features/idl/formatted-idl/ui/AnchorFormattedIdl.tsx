import { Idl } from '@coral-xyz/anchor';
import { formatDisplayIdl, getFormattedIdl } from '@entities/idl/format';

import { useFormatAnchorIdl } from '@/app/components/account/idl/formatted-idl/formatters/anchor';
import { useSearchIdl } from '@/app/components/account/idl/formatted-idl/formatters/search';

import { invariant } from '../model/invariant';
import type { FormattedIdlProps } from './formatted-idl';
import { FormattedIdlView } from './FormattedIdlView';

export function AnchorFormattedIdl({ idl, programId, searchStr = '' }: FormattedIdlProps<Idl>) {
    invariant(idl, 'IDL is absent');
    const formattedIdl = getFormattedIdl(formatDisplayIdl, idl, programId);
    const anchorFormattedIdl = useFormatAnchorIdl(idl ? formattedIdl : idl);
    const searchResults = useSearchIdl(anchorFormattedIdl, searchStr);
    return <FormattedIdlView idl={searchResults} programId={programId} originalIdl={idl} withInteractive />;
}
