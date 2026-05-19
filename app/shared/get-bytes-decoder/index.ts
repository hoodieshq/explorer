import {
    type Decoder,
    fixDecoderSize,
    getBytesDecoder as getVariableSizeBytesDecoder,
    type ReadonlyUint8Array,
} from '@solana/kit';

// Workaround for Codama-generated decoders that use a variable-size bytes decoder for a
// fixed-size discriminator, causing it to greedily consume the entire instruction buffer.
export function getBytesDecoder(size: number = 8): Decoder<ReadonlyUint8Array> {
    return fixDecoderSize(getVariableSizeBytesDecoder(), size);
}

export function getDiscriminatorBytesDecoder(): Decoder<ReadonlyUint8Array> {
    return getBytesDecoder(8);
}
