/**
 * Catalog of the advanced-page documentation chunks. The overview lists every
 * chunk with its audience and benefit; each `anchor` must match a section id
 * on `/mcp/docs/advanced` (spec: mcp-docs-pages §4).
 */
export type AdvancedChunk = {
    anchor: string;
    title: string;
    audience: string;
    gives: string;
};

export const ADVANCED_CHUNKS: AdvancedChunk[] = [
    {
        anchor: 'access-control',
        audience: 'Deployment owners',
        gives: 'Turn the endpoint on, gate it with bearer keys, block abusive IPs — and why each knob exists.',
        title: 'Enabling & access control',
    },
    {
        anchor: 'rpc-configuration',
        audience: 'Deployment owners',
        gives: 'Dedicated per-cluster RPC endpoints that keep agent traffic off the RPC quota serving the UI.',
        title: 'RPC configuration',
    },
    {
        anchor: 'preview-deployments',
        audience: 'Developers testing previews',
        gives: 'The extra Vercel protection-bypass header preview deployments require on top of bearer auth.',
        title: 'Preview deployments',
    },
    {
        anchor: 'inspect-entity',
        audience: 'Agent users & tool builders',
        gives: 'Every account kind the tool returns, the transaction decode cascade, and program labeling.',
        title: 'inspect_entity reference',
    },
    {
        anchor: 'output-format',
        audience: 'Tool builders',
        gives: 'The { payload, errors } wire format, explicit unknown markers, BigInt coercion, and error codes.',
        title: 'Output envelope & errors',
    },
    {
        anchor: 'telemetry',
        audience: 'Deployment owners',
        gives: 'GA4 usage analytics and Sentry instrumentation — what is sent and what never leaves the server.',
        title: 'Telemetry & observability',
    },
    {
        anchor: 'smoke-test',
        audience: 'Everyone connecting a client',
        gives: 'The initialize → ping round-trip that verifies transport, auth and the preview bypass in one shot.',
        title: 'Smoke test',
    },
    {
        anchor: 'architecture',
        audience: 'Contributors',
        gives: 'How the route, MCP server, inspection core and parser packages fit together, and what is not wired yet.',
        title: 'Architecture',
    },
];
