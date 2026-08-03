import { PmpDetailsCard } from '@features/decode-instruction-pmp';
import { PublicKey, TransactionInstruction } from '@solana/web3.js';
import {
    Compression,
    DataSource,
    Encoding,
    Format,
    getInitializeInstructionDataEncoder,
    getSetDataInstructionDataEncoder,
    getWriteInstructionDataEncoder,
    packDirectData,
    PROGRAM_METADATA_PROGRAM_ADDRESS,
} from '@solana-program/program-metadata';
import {
    nextjsParameters,
    withCluster,
    withMockTransactions,
    withScrollAnchor,
    withTokenInfoBatch,
} from '@storybook-config/decorators';
import type { Meta, StoryObj } from '@storybook-config/types';

const PROGRAM_ID = new PublicKey(PROGRAM_METADATA_PROGRAM_ADDRESS);

const IDL_DOC = JSON.stringify({
    instructions: [{ name: 'initialize' }],
    name: 'company_program',
    version: '1.0.0',
});

// Account addresses are labelled positionally from the card's static name table, so any keys work here.
function makeIx(data: Uint8Array, accountCount: number): TransactionInstruction {
    return new TransactionInstruction({
        data: Buffer.from(data),
        keys: Array.from({ length: accountCount }, () => ({
            isSigner: false,
            isWritable: true,
            pubkey: PublicKey.unique(),
        })),
        programId: PROGRAM_ID,
    });
}

function setDataIx({
    compression,
    content,
    dataSource = DataSource.Direct,
    format,
}: {
    compression: Compression;
    content: string;
    dataSource?: DataSource;
    format: Format;
}) {
    const packed = packDirectData({ compression, content, encoding: Encoding.Utf8 });
    return makeIx(
        getSetDataInstructionDataEncoder().encode({
            compression: packed.compression,
            data: packed.data,
            dataSource,
            encoding: packed.encoding,
            format,
        }) as Uint8Array,
        5,
    );
}

const meta = {
    component: PmpDetailsCard,
    decorators: [withCluster, withScrollAnchor, withTokenInfoBatch, withMockTransactions],
    parameters: nextjsParameters,
    tags: ['autodocs', 'test'],
    title: 'Features/DecodeInstructionPmp/PmpDetailsCard',
} satisfies Meta<typeof PmpDetailsCard>;

export default meta;
type Story = StoryObj<typeof meta>;

// `fallback` is never exercised by these stories - every fixture below is a content instruction, so the card
// always takes its custom-render path. `null` is fine here: stories are exempt from `unicorn/no-null`.
const baseArgs = {
    fallback: null,
    index: 0,
    result: { err: null },
};

export const SetDataInlineJson: Story = {
    args: { ...baseArgs, ix: setDataIx({ compression: Compression.None, content: IDL_DOC, format: Format.Json }) },
};

export const SetDataZlibCompressedJson: Story = {
    args: { ...baseArgs, ix: setDataIx({ compression: Compression.Zlib, content: IDL_DOC, format: Format.Json }) },
};

export const SetDataYamlVerbatim: Story = {
    args: {
        ...baseArgs,
        ix: setDataIx({
            compression: Compression.None,
            content: 'name: company\nversion: 1.0.0\n',
            format: Format.Yaml,
        }),
    },
};

export const SetDataEncodingNoneAsHex: Story = {
    args: {
        ...baseArgs,
        ix: makeIx(
            getSetDataInstructionDataEncoder().encode({
                compression: Compression.None,
                data: new Uint8Array([0xde, 0xad, 0xbe, 0xef, 0x00, 0x11, 0x22, 0x33]),
                dataSource: DataSource.Direct,
                encoding: Encoding.None,
                format: Format.None,
            }) as Uint8Array,
            5,
        ),
    },
};

// The 4-byte header-only shape. The generated encoder cannot build it, so the bytes are a literal:
// discriminator 3, encoding Utf8, compression None, format Json.
export const SetDataHeaderOnly: Story = {
    args: { ...baseArgs, ix: makeIx(new Uint8Array([3, 1, 0, 1]), 5) },
};

// A Zlib stream that is not a Zlib stream, so the local decode fallback renders instead of the document.
export const SetDataDecodeFailure: Story = {
    args: {
        ...baseArgs,
        ix: makeIx(
            getSetDataInstructionDataEncoder().encode({
                compression: Compression.Zlib,
                data: new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]),
                dataSource: DataSource.Direct,
                encoding: Encoding.Utf8,
                format: Format.Json,
            }) as Uint8Array,
            5,
        ),
    },
};

export const SetDataUrlSource: Story = {
    args: {
        ...baseArgs,
        ix: setDataIx({
            compression: Compression.None,
            content: 'https://example.com/company-idl.json',
            dataSource: DataSource.Url,
            format: Format.Json,
        }),
    },
};

export const InitializeInlineJson: Story = {
    args: {
        ...baseArgs,
        ix: makeIx(
            getInitializeInstructionDataEncoder().encode({
                compression: Compression.None,
                data: new TextEncoder().encode(IDL_DOC),
                dataSource: DataSource.Direct,
                encoding: Encoding.Utf8,
                format: Format.Json,
                seed: 'idl',
            }) as Uint8Array,
            5,
        ),
    },
};

export const WriteChunk: Story = {
    args: {
        ...baseArgs,
        ix: makeIx(
            getWriteInstructionDataEncoder().encode({
                data: new TextEncoder().encode('{"instructions":['),
                offset: 0,
            }) as Uint8Array,
            3,
        ),
    },
};
