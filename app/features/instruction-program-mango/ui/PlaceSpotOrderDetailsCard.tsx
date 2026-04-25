import { Address } from '@components/common/Address';
import { InstructionCard } from '@components/instruction/InstructionCard';
import { getSpotMarketFromInstruction, OrderLotDetails, PlaceSpotOrder } from '@explorer/decoder-mango';
import { SignatureResult, TransactionInstruction } from '@solana/web3.js';
import BN from 'bn.js';
import { useMemo } from 'react';

import { useMangoSpotMarket } from '../model/use-mango-market';

export function PlaceSpotOrderDetailsCard(props: {
    ix: TransactionInstruction;
    index: number;
    result: SignatureResult;
    info: PlaceSpotOrder;
    innerCards?: JSX.Element[];
    childIndex?: number;
}) {
    const { ix, index, result, info, innerCards, childIndex } = props;
    const mangoSpotMarketConfig = getSpotMarketFromInstruction(ix, info.spotMarket);
    const spotMarket = useMangoSpotMarket(ix.programId, mangoSpotMarketConfig);

    const orderLotDetails = useMemo<OrderLotDetails | null>(() => {
        if (!spotMarket) return null;
        return {
            price: spotMarket.priceLotsToNumber(new BN(info.limitPrice.toString())),
            size: spotMarket.baseSizeLotsToNumber(new BN(info.maxBaseQuantity.toString())),
        };
    }, [spotMarket, info.limitPrice, info.maxBaseQuantity]);

    return (
        <InstructionCard
            ix={ix}
            index={index}
            result={result}
            title="Mango Program: PlaceSpotOrder"
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

            {mangoSpotMarketConfig !== undefined && (
                <tr>
                    <td>Spot market</td>
                    <td className="text-lg-end">{mangoSpotMarketConfig.name}</td>
                </tr>
            )}

            <tr>
                <td>Spot market address</td>
                <td>
                    <Address pubkey={info.spotMarket.pubkey} alignRight link />
                </td>
            </tr>

            <tr>
                <td>Order type</td>
                <td className="text-lg-end">{info.orderType}</td>
            </tr>

            {info.clientId !== '0' && (
                <tr>
                    <td>Client Id</td>
                    <td className="text-lg-end">{info.clientId}</td>
                </tr>
            )}

            <tr>
                <td>Side</td>
                <td className="text-lg-end">{info.side}</td>
            </tr>

            {orderLotDetails !== null && (
                <tr>
                    <td>Limit price</td>
                    {/* todo fix price */}
                    <td className="text-lg-end">{orderLotDetails?.price} USDC</td>
                </tr>
            )}

            {orderLotDetails !== null && (
                <tr>
                    <td>Size</td>
                    <td className="text-lg-end">{orderLotDetails?.size}</td>
                </tr>
            )}
        </InstructionCard>
    );
}
