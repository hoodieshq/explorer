// The legacy document acquired the way real consumers meet it: NTT's IDL served from its anchor
// PDA through the public latest-IDL resolution, over a mocked transport.
import { address } from '@solana/kit';

import { createLatestIdlFetcher } from '../../fetch/index';
import { anchorIdlAccount, anchorIdlAddress, mockRpc } from '../fetch/helpers';
import { loadNtt029Idl, NTT_PROGRAM_ADDRESS } from '../fixtures';

export async function fetchNtt029Idl(): Promise<unknown> {
    const program = address(NTT_PROGRAM_ADDRESS);
    const rpc = mockRpc({ [await anchorIdlAddress(program)]: anchorIdlAccount(loadNtt029Idl()) });
    return createLatestIdlFetcher(rpc)(NTT_PROGRAM_ADDRESS);
}
