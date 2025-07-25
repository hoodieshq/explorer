import { RootNode } from 'codama';

import { useFormatCodamaIdl } from '@/app/components/account/idl/formatted-idl/formatters/codama';
import { useSearchIdl } from '@/app/components/account/idl/formatted-idl/formatters/search';

import { invariant } from '../model/invariant';
import type { FormattedIdlProps } from './formatted-idl';
import { FormattedIdlView } from './FormattedIdlView';

export function CodamaFormattedIdl({ idl, programId, searchStr = '' }: FormattedIdlProps<RootNode>) {
    invariant(idl, 'IDL is absent');
    const formattedIdl = useFormatCodamaIdl(idl);
    const searchResults = useSearchIdl(formattedIdl, searchStr);
    return <FormattedIdlView idl={searchResults} programId={programId} originalIdl={idl} withInteractive />;
}
