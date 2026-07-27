import { createServer } from 'node:http';

import sirv from 'sirv';

export interface StaticServer {
    url: string;
    close: () => Promise<void>;
}

/** Serves a built Storybook dir on an ephemeral localhost port. */
export async function serveStatic(dir: string): Promise<StaticServer> {
    const server = createServer(sirv(dir, { dev: true }));
    await new Promise<void>((resolve, reject) => {
        server.once('error', reject);
        server.listen(0, '127.0.0.1', resolve);
    });
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('static server has no bound port');
    return {
        close: () => new Promise((resolve, reject) => server.close(err => (err ? reject(err) : resolve()))),
        url: `http://127.0.0.1:${address.port}`,
    };
}
