import { ErrorCard } from '@components/shared/ErrorCard';
import { getDisplayIdlSpecType } from '@entities/idl/convert';
import { PublicKey } from '@solana/web3.js';
import { useSetAtom } from 'jotai';
import { memo, useEffect } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import ReactJson from 'react-json-view';

import { AnchorFormattedIdl } from '../formatted-idl/ui/AnchorFormattedIdl';
import { CodamaFormattedIdl } from '../formatted-idl/ui/CodamaFormattedIdl';
import { originalIdlAtom, programIdAtom } from '../interactive-idl/model/state-atoms';
import { IdlErrorFallback } from './IdlErrorFallback';

export function IdlRenderer({
    idl,
    collapsed,
    raw,
    searchStr = '',
    programId,
}: {
    idl: any;
    collapsed: boolean | number;
    raw: boolean;
    searchStr: string;
    programId: string;
}) {
    const setOriginalIdl = useSetAtom(originalIdlAtom);
    const setProgramId = useSetAtom(programIdAtom);

    useEffect(() => {
        setOriginalIdl(idl);
        setProgramId(new PublicKey(programId));
    }, [idl, programId, setOriginalIdl, setProgramId]);

    if (raw) {
        return <IdlJson idl={idl} collapsed={collapsed} />;
    }

    const spec = getDisplayIdlSpecType(idl);
    switch (spec) {
        case 'codama':
            return (
                <ErrorBoundary fallback={<IdlErrorFallback message="Error rendering PMP IDL" />}>
                    <CodamaFormattedIdl idl={idl} programId={programId} searchStr={searchStr} />
                </ErrorBoundary>
            );
        default:
            return (
                <ErrorBoundary fallback={<IdlErrorFallback message="Error rendering Anchor IDL" />}>
                    {spec === 'legacy-shank' ? (
                        <ErrorCard
                            message={`Right now, we don’t support IDL with the “${spec}” origin in full. Some data might be absent.`}
                        />
                    ) : null}
                    <AnchorFormattedIdl idl={idl} programId={programId} searchStr={searchStr} />
                </ErrorBoundary>
            );
    }
}

const IdlJson = memo(({ idl, collapsed }: { idl: any; collapsed: boolean | number }) => {
    return (
        <ReactJson
            src={idl}
            theme="solarized"
            style={{ padding: 25 }}
            name={null}
            enableClipboard={true}
            collapsed={collapsed}
            displayObjectSize={false}
            displayDataTypes={false}
            displayArrayKey={false}
        />
    );
});
IdlJson.displayName = 'IdlJsonViewer';
