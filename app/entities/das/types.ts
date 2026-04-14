/**
 * Standard DAS (Digital Asset Standard) response types.
 * Only standard parameters are used — no provider-specific fields.
 */

export type DasAssetInterface =
    | 'Custom'
    | 'FungibleAsset'
    | 'FungibleToken'
    | 'Nft'
    | 'ProgrammableNft'
    | 'V1_NFT'
    | 'V1_PRINT'
    | string;

export type DasAsset = {
    burnt: boolean;
    content: {
        $schema: string;
        files?: Array<{
            cdn_uri?: string;
            mime?: string;
            uri?: string;
        }>;
        json_uri: string;
        links?: {
            external_url?: string;
            image?: string;
        };
        metadata: {
            description?: string;
            name?: string;
            symbol?: string;
            token_standard?: string;
        };
    };
    id: string;
    interface: DasAssetInterface;
    mutable: boolean;
    token_info?: {
        decimals?: number;
        mint_authority?: string;
        price_info?: {
            currency?: string;
            price_per_token?: number;
        };
        supply?: number;
        symbol?: string;
        token_program?: string;
    };
};

export type DasJsonRpcResponse<T> = {
    id: string;
    jsonrpc: '2.0';
    result: T;
};

export type DasJsonRpcError = {
    error: {
        code: number;
        message: string;
    };
    id: string;
    jsonrpc: '2.0';
};

export type DasGetAssetBatchResponse = DasJsonRpcResponse<DasAsset[]>;
