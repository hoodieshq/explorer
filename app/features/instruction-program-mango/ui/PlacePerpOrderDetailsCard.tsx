import { Address } from '@components/common/Address';
import { InstructionCard } from '@components/instruction/InstructionCard';
import { getPerpMarketFromInstruction, OrderLotDetails, PlacePerpOrder } from '@explorer/decoder-mango';
import { SignatureResult, TransactionInstruction } from '@solana/web3.js';
import BN from 'bn.js';
import { useMemo } from 'react';

import { useMangoPerpMarket } from '../model/use-mango-market';

export function PlacePerpOrderDetailsCard(props: {
    ix: TransactionInstruction;
    index: number;
    result: SignatureResult;
    info: PlacePerpOrder;
    innerCards?: JSX.Element[];
    childIndex?: number;
}) {
    const { ix, index, result, info, innerCards, childIndex } = props;
    const mangoPerpMarketConfig = getPerpMarketFromInstruction(ix, info.perpMarket);
    const perpMarket = useMangoPerpMarket(mangoPerpMarketConfig);

    const orderLotDetails = useMemo<OrderLotDetails | null>(() => {
        if (!perpMarket) return null;
        return {
            price: perpMarket.priceLotsToNumber(new BN(info.price.toString())),
            size: perpMarket.baseLotsToNumber(new BN(info.quantity.toString())),
        };
    }, [perpMarket, info.price, info.quantity]);

    return (
        <InstructionCard
            ix={ix}
            index={index}
            result={result}
            title="Mango Program: PlacePerpOrder"
            innerCards={innerCards}
            childIndex={childIndex}
        >
            <tr>
                <td>Mango account</td>
                <td>
                    {' '}
                    <Address pubkey={info.mangoAccount.pubkey} alignRight link />
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
                    <Address pubkey={info.perpMarket.pubkey} alignRight link />
                </td>
            </tr>

            {info.clientOrderId !== '0' && (
                <tr>
                    <td>Client order Id</td>
                    <td className="text-lg-end">{info.clientOrderId}</td>
                </tr>
            )}

            <tr>
                <td>Order type</td>
                <td className="text-lg-end">{info.orderType}</td>
            </tr>
            <tr>
                <td>side</td>
                <td className="text-lg-end">{info.side}</td>
            </tr>

            {orderLotDetails !== null && (
                <tr>
                    <td>price</td>
                    <td className="text-lg-end">{orderLotDetails?.price} USDC</td>
                </tr>
            )}

            {orderLotDetails !== null && (
                <tr>
                    <td>quantity</td>
                    <td className="text-lg-end">{orderLotDetails?.size}</td>
                </tr>
            )}
            <tr>
                <td>Reduce only</td>
                <td className="text-lg-end">{info.reduceOnly}</td>
            </tr>
        </InstructionCard>
    );
}
