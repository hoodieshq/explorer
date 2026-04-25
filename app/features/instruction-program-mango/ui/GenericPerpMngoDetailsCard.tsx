import { Address } from '@components/common/Address';
import { InstructionCard } from '@components/instruction/InstructionCard';
import { getPerpMarketFromInstruction } from '@explorer/decoder-mango';
import { SignatureResult, TransactionInstruction } from '@solana/web3.js';

export function GenericPerpMngoDetailsCard(props: {
    ix: TransactionInstruction;
    index: number;
    result: SignatureResult;
    mangoAccountKeyLocation: number;
    perpMarketKeyLocation: number;
    title: string;
    innerCards?: JSX.Element[];
    childIndex?: number;
}) {
    const { ix, index, result, mangoAccountKeyLocation, perpMarketKeyLocation, title, innerCards, childIndex } = props;
    const mangoAccount = ix.keys[mangoAccountKeyLocation];
    const perpMarketAccountMeta = ix.keys[perpMarketKeyLocation];
    const mangoPerpMarketConfig = getPerpMarketFromInstruction(ix, perpMarketAccountMeta);

    return (
        <InstructionCard
            ix={ix}
            index={index}
            result={result}
            title={'Mango Program: ' + title}
            innerCards={innerCards}
            childIndex={childIndex}
        >
            <tr>
                <td>Mango account</td>
                <td>
                    <Address pubkey={mangoAccount.pubkey} alignRight link />
                </td>
            </tr>

            {mangoPerpMarketConfig !== undefined && (
                <tr>
                    <td>Perp market</td>
                    <td className="text-lg-end">{mangoPerpMarketConfig.name}</td>
                </tr>
            )}

            <tr>
                <td>Perp market address</td>
                <td>
                    <Address pubkey={perpMarketAccountMeta.pubkey} alignRight link />
                </td>
            </tr>
        </InstructionCard>
    );
}
