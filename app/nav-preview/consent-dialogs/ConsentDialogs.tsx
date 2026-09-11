'use client';

import { rpcEndpoint } from '@entities/cluster';
import { type ConsentRequest, CustomUrlConsentPreview } from '@features/cluster-switcher';

/**
 * The two questions `CustomUrlConsentDialog` can ask, laid out side by side so their copy, type and
 * actions can be compared without provoking each in the app — one needs a link to an endpoint nobody has
 * approved, the other the developer switch in the cluster menu. The boxes are the dialog's own
 * (`CustomUrlConsentPreview`), so what is on this page is what ships, less the overlay and the motion.
 */
interface Sample {
    request: ConsentRequest;
    title: string;
    /** How the dialog is reached in the app. */
    when: string;
}

const SAMPLES: Sample[] = [
    {
        request: { endpoint: rpcEndpoint('https://rpc.example-node.io/v1?api-key=not-a-real-key'), kind: 'endpoint' },
        title: 'Endpoint from a link',
        when: 'Opening a link whose customUrl names an RPC server nobody has approved yet — it appears with the page, before anything connects.',
    },
    {
        request: { kind: 'developer-bypass' },
        title: 'Trusting any RPC server',
        when: 'Turning on "Trust any RPC server" at the foot of the cluster menu.',
    },
];

export function ConsentDialogs() {
    return (
        <main className="min-h-screen bg-heavy-metal-900 px-6 py-10 text-white">
            <h1 className="mb-2 text-xl font-medium">Custom RPC consent dialogs</h1>
            <p className="mb-10 max-w-2xl text-sm text-outer-space-300">
                The real dialog content in the real box, without the overlay or the entrance motion. Buttons do nothing
                here.
            </p>
            <div className="flex flex-wrap items-start gap-10">
                {SAMPLES.map(sample => (
                    <section key={sample.request.kind} className="flex w-full max-w-sm flex-col gap-3">
                        <h2 className="m-0 text-sm font-medium">{sample.title}</h2>
                        <p className="m-0 text-xs leading-relaxed text-outer-space-300">{sample.when}</p>
                        <CustomUrlConsentPreview request={sample.request} />
                    </section>
                ))}
            </div>
        </main>
    );
}
