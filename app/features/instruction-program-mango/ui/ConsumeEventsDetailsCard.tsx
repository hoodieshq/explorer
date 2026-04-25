import { Address } from '@components/common/Address';
import { InstructionCard } from '@components/instruction/InstructionCard';
import { ConsumeEvents, getPerpMarketFromInstruction } from '@explorer/decoder-mango';
import { SignatureResult, TransactionInstruction } from '@solana/web3.js';

export function ConsumeEventsDetailsCard(props: {
    ix: TransactionInstruction;
    index: number;
    result: SignatureResult;
    info: ConsumeEvents;
    innerCards?: JSX.Element[];
    childIndex?: number;
}) {
    const { ix, index, result, info, innerCards, childIndex } = props;

    const mangoPerpMarketConfig = getPerpMarketFromInstruction(ix, info.perpMarket);

    return (
        <InstructionCard
            ix={ix}
            index={index}
            result={result}
            title={'Mango Program: ConsumeEvents'}
            innerCards={innerCards}
            childIndex={childIndex}
        >
            {mangoPerpMarketConfig !== undefined && (
                <tr>
                    <td>Perp market</td>
                    <td className="text-lg-end">{mangoPerpMarketConfig.name}</td>
                </tr>
            )}

            <tr>
                <td>Perp market address</td>
                <td>
                    <Address pubkey={info.perpMarket.pubkey} alignRight link />
                </td>
            </tr>
        </InstructionCard>
    );
}
