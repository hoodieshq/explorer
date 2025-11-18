import type { Idl } from '@coral-xyz/anchor';
import { formatDisplayIdl, getFormattedIdl } from '@entities/idl/format';

import { invariant } from '../lib/invariant';
import { useFormatAnchorIdl } from '../model/use-format-anchor-idl';
import { useSearchIdl } from '../model/use-search';
import { FormattedIdlView } from './FormattedIdlView';
import type { StandardFormattedIdlProps } from './types';

export function AnchorFormattedIdl({ idl, programId, searchStr = '' }: StandardFormattedIdlProps<Idl>) {
    invariant(idl, 'IDL is absent');
    const formattedIdl = getFormattedIdl(formatDisplayIdl, idl, programId);
    const anchorFormattedIdl = useFormatAnchorIdl(idl ? formattedIdl : idl);
    const searchResults = useSearchIdl(anchorFormattedIdl, searchStr);
    return <FormattedIdlView idl={searchResults} originalIdl={idl} searchStr={searchStr} />;
}
