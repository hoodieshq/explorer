import { isEnvEnabled } from '@utils/env';
import { checkBotId } from 'botid/server';
import { type NextRequest, NextResponse } from 'next/server';

import { Logger } from '@/app/shared/lib/logger';

const BOT_RESPONSE = { body: { error: 'Access denied: request identified as automated bot' }, status: 401 } as const;

const BOT_UA_PATTERN = /Twitterbot|facebookexternalhit|LinkedInBot|Slackbot|Discordbot|WhatsApp/i;

// TODO: temporary bot fast-path — remove after debugging Twitter card issue
function serveBotMetaPage(request: NextRequest): Response | undefined {
    const ua = request.headers.get('user-agent') ?? '';
    if (!BOT_UA_PATTERN.test(ua)) return undefined;

    const { pathname } = request.nextUrl;
    const match = pathname.match(/^\/address\/([^/]+)/);
    if (!match) return undefined;

    const address = match[1];
    const baseUrl = request.nextUrl.origin;
    const ogImageUrl = `${baseUrl}/og/feature-gate/${address}`;
    const pageUrl = `${baseUrl}${pathname}`;
    const title = `Feature Gate | ${address} | Solana`;

    const html = `<!DOCTYPE html>
<html><head>
<meta property="og:title" content="${title}" />
<meta property="og:image" content="${ogImageUrl}" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:url" content="${pageUrl}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${title}" />
<meta name="twitter:image" content="${ogImageUrl}" />
</head><body></body></html>`;

    return new Response(html, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
}

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // TODO: temporary bot fast-path — remove after debugging Twitter card issue
    const botResponse = serveBotMetaPage(request);
    if (botResponse) return botResponse;

    if (!isEnvEnabled(process.env.NEXT_PUBLIC_BOTID_ENABLED)) {
        return NextResponse.next();
    }

    // Allow requests without x-is-human header (direct API calls)
    if (!request.headers.has('x-is-human')) {
        Logger.info('[middleware] No x-is-human header, allowing', { pathname });
        return NextResponse.next();
    }

    // Verify requests with x-is-human header (browser requests via BotIdClient)
    let verification;
    try {
        verification = await checkBotId({
            developmentOptions: {
                bypass: isEnvEnabled(process.env.NEXT_PUBLIC_BOTID_SIMULATE_BOT) ? 'BAD-BOT' : undefined,
            },
        });
    } catch (error) {
        // checkBotId can throw SyntaxError when Vercel's bot-protection API
        // returns a non-JSON response (e.g. 504 with HTML body).
        Logger.warn('[middleware] BotId verification failed, allowing request', { error, pathname });
        return NextResponse.next();
    }

    Logger.info('[middleware] BotId verification', {
        bypassed: verification.bypassed,
        isBot: verification.isBot,
        isHuman: verification.isHuman,
        isVerifiedBot: verification.isVerifiedBot,
        pathname,
    });

    // Block bots only when challenge mode is enabled
    if (verification.isBot) {
        Logger.warn('[middleware] Bot detected', { pathname });

        if (isEnvEnabled(process.env.NEXT_PUBLIC_BOTID_CHALLENGE_MODE_ENABLED)) {
            Logger.error(new Error('[middleware] Challenge mode enabled, blocking'), { pathname });
            return NextResponse.json(BOT_RESPONSE.body, { status: BOT_RESPONSE.status });
        }
    } else {
        Logger.info('[middleware] Human verified', { pathname });
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/api/:path*', '/address/:path*'],
};

// BotIdClient protected routes - only API routes need protection
export const botIdProtectedRoutes: { path: string; method: string }[] = [{ method: '*', path: '/api/*' }];
