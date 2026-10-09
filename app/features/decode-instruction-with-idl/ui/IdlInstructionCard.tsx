import { SignatureResult, TransactionInstruction } from '@solana/web3.js';
import { ErrorBoundary } from 'react-error-boundary';

import { UnknownDetailsCard } from '@/app/components/instruction/UnknownDetailsCard';

import { type IdlInstructionDecode, isIdlInstructionDecoded } from '../lib/decode-instruction-with-idl';
import { AnchorDetailsCard } from './AnchorDetailsCard';
import { CodamaInstructionCard } from './CodamaInstructionCard';
import { IdlDecodeFailureNotice } from './IdlDecodeFailureNotice';

/**
 * The single place both surfaces map an `IdlInstructionDecode` kind to a renderer, so they can't drift:
 * codama-first, with the rich Anchor card as the fallback the strategy selects when codama can't convert
 * the IDL. ErrorBoundary'd because the Anchor coder can throw on malformed instruction data. A failed decode
 * says so inside the card and points at the program's other IDLs that decode the instruction.
 */
export function IdlInstructionCard({
    decoded,
    ix,
    index,
    result,
    signature,
    innerCards,
    childIndex,
}: {
    decoded: IdlInstructionDecode & { isCustomIdl?: boolean };
    ix: TransactionInstruction;
    index: number;
    result: SignatureResult;
    signature: string;
    innerCards?: JSX.Element[];
    childIndex?: number;
}) {
    const nodeProps = { childIndex, index, innerCards, ix };
    const props = { ...nodeProps, result };
    // Inside the card: why the IDL failed, and which other IDL of the program decodes it.
    const failureNotice = isIdlInstructionDecoded(decoded) ? undefined : <IdlDecodeFailureNotice ix={ix} />;
    const unknownCard = <UnknownDetailsCard {...props} notice={<IdlDecodeFailureNotice ix={ix} />} />;

    return (
        <ErrorBoundary fallback={unknownCard}>
            {decoded.kind === 'codama' ? (
                <CodamaInstructionCard {...nodeProps} parsedIx={decoded.parsedIx} />
            ) : decoded.kind === 'anchor' ? (
                <AnchorDetailsCard
                    {...props}
                    signature={signature}
                    program={decoded.program}
                    decoded={decoded.details}
                    notice={failureNotice}
                />
            ) : (
                unknownCard
            )}
        </ErrorBoundary>
    );
}
