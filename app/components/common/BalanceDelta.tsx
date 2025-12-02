import { SolBalance } from '@components/common/SolBalance';
import BN from 'bn.js';
import React from 'react';

export function BalanceDelta({ delta, isSol = false }: { delta: BN; isSol?: boolean }) {
    let sols;

    if (isSol) {
        sols = <SolBalance lamports={Math.abs(delta.toNumber())} />;
    }

    if (delta.gt(new BN(0))) {
        return <span className="badge bg-success-soft">+{isSol ? sols : delta.toString()}</span>;
    } else if (delta.lt(new BN(0))) {
        return <span className="badge bg-warning-soft">{isSol ? <>-{sols}</> : delta.toString()}</span>;
    }

    return <span className="badge bg-secondary-soft">0</span>;
}
