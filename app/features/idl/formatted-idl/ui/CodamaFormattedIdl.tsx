import type { RootNode } from 'codama';

import { invariant } from '../lib/invariant';
import { useFormatCodamaIdl } from '../model/use-format-codama-idl';
import { useSearchIdl } from '../model/use-search';
import { FormattedIdlView } from './FormattedIdlView';
import type { StandardFormattedIdlProps } from './types';

export function CodamaFormattedIdl({ idl, searchStr = '' }: StandardFormattedIdlProps<RootNode>) {
    invariant(idl, 'IDL is absent');
    const formattedIdl = useFormatCodamaIdl(idl);
    const searchResults = useSearchIdl(formattedIdl, searchStr);
    return <FormattedIdlView idl={searchResults} originalIdl={idl} searchStr={searchStr} />;
}
