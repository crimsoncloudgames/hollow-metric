import { createHash } from 'crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js';
import { openai } from '@/lib/openai';
import { COOKIE_NAMES, parseCookieHeader, readConsentFromCookieMap, sanitizeAppIdList } from '@/lib/cookie-consent';
import { createClient as createSupabaseServerClient, hasSupabaseServerEnv } from '@/utils/supabase/server';

type AnalyzeRequestBody = {
    userGame?: string;
    isUrl?: boolean;
    appId?: string;
    preview?: boolean;
};

type CachedPreviewRow = {
    preview_tag: string | null;
    preview_short_desc: string | null;
    preview_status: string | null;
};

type CookieAnalysisPayload = {
    previewMode: boolean;
    appId: string;
    isSignedIn: boolean;
    tag: string | null;
    shortDesc: string | null;
};

function parseJsonCookie<T>(raw: string | undefined, fallback: T): T {
    if (!raw) return fallback;
    try {
        return JSON.parse(raw) as T;
    } catch {
        return fallback;
    }
}

function appendTrackingCookies(
    response: NextResponse,
    requestCookieMap: Record<string, string>,
    payload: CookieAnalysisPayload
) {
    const useSecureCookies = process.env.NODE_ENV === 'production';
    const consent = readConsentFromCookieMap(requestCookieMap);
    const canStoreOptional = consent.functional || consent.personalization;

    response.cookies.set(COOKIE_NAMES.blurState, payload.previewMode && !payload.isSignedIn ? 'locked' : 'unlocked', {
        maxAge: 60 * 60 * 24,
        path: '/',
        sameSite: 'lax',
        secure: useSecureCookies,
    });

    if (payload.previewMode && payload.appId) {
        const previewUsed = parseJsonCookie<{ appIds: string[] }>(requestCookieMap[COOKIE_NAMES.previewLimit], { appIds: [] });
        const appIds = Array.from(new Set([...sanitizeAppIdList(previewUsed.appIds), payload.appId])).slice(0, 30);
        response.cookies.set(COOKIE_NAMES.previewLimit, JSON.stringify({ appIds, updatedAt: new Date().toISOString() }), {
            maxAge: 60 * 60 * 24,
            path: '/',
            sameSite: 'lax',
            secure: useSecureCookies,
        });
    }

    if (!canStoreOptional) {
        return response;
    }

    if (payload.appId) {
        const recentAppIds = sanitizeAppIdList(
            parseJsonCookie<{ appIds: string[] }>(requestCookieMap[COOKIE_NAMES.recentAppIds], { appIds: [] }).appIds
        );
        const mergedAppIds = Array.from(new Set([payload.appId, ...recentAppIds])).slice(0, 12);

        response.cookies.set(COOKIE_NAMES.recentAppIds, JSON.stringify({ appIds: mergedAppIds }), {
            maxAge: 60 * 60 * 24 * 7,
            path: '/',
            sameSite: 'lax',
            secure: useSecureCookies,
        });
    }

    if (payload.appId && payload.shortDesc) {
        const shortDescPreview = payload.shortDesc.slice(0, 320);
        response.cookies.set(
            COOKIE_NAMES.lastAnalysis,
            JSON.stringify({
                appId: payload.appId,
                tag: payload.tag,
                shortDesc: shortDescPreview,
                at: new Date().toISOString(),
            }),
            {
                maxAge: 60 * 60 * 24,
                path: '/',
                sameSite: 'lax',
                secure: useSecureCookies,
            }
        );
    }

    const usage = parseJsonCookie<{ total: number; preview: number; full: number }>(requestCookieMap[COOKIE_NAMES.usage], {
        total: 0,
        preview: 0,
        full: 0,
    });

    response.cookies.set(
        COOKIE_NAMES.usage,
        JSON.stringify({
            total: usage.total + 1,
            preview: usage.preview + (payload.previewMode ? 1 : 0),
            full: usage.full + (payload.previewMode ? 0 : 1),
            updatedAt: new Date().toISOString(),
        }),
        {
            maxAge: 60 * 60 * 24 * 7,
            path: '/',
            sameSite: 'lax',
            secure: useSecureCookies,
        }
    );

    return response;
}

function getRequestIp(req: Request): string | null {
    const forwardedFor = req.headers.get('x-forwarded-for');
    const realIp = req.headers.get('x-real-ip');
    const ip = forwardedFor?.split(',')[0]?.trim() || realIp?.trim() || null;

    if (!ip) {
        return null;
    }

    return ip.replace('::ffff:', '');
}

function hashIp(ip: string): string {
    const salt = process.env.PREVIEW_IP_HASH_SALT || 'hollowmetric-preview';
    return createHash('sha256').update(`${salt}:${ip}`).digest('hex');
}

function getSupabaseAdminClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

    if (!supabaseUrl || !serviceRoleKey) {
        return null;
    }

    return createSupabaseAdminClient(supabaseUrl, serviceRoleKey);
}

function getPreviewRetentionDays(): number {
    const raw = process.env.PREVIEW_USAGE_RETENTION_DAYS?.trim();
    const parsed = Number(raw);

    if (!Number.isFinite(parsed) || parsed <= 0) {
        return 30;
    }

    return Math.min(Math.floor(parsed), 365);
}

export async function POST(req: Request) {
    try {
        if (!process.env.OPENAI_API_KEY) {
            return NextResponse.json(
                { error: 'Server is missing OPENAI_API_KEY. Add it in Vercel environment variables.' },
                { status: 500 }
            );
        }

        const payload = (await req.json()) as AnalyzeRequestBody;
        const requestCookieMap = parseCookieHeader(req.headers.get('cookie'));
        const userGame = (payload.userGame || '').trim();
        const isUrl = Boolean(payload.isUrl);
        const previewMode = Boolean(payload.preview);
        const appId = (payload.appId || '').trim();

        if (!userGame) {
            return NextResponse.json({ error: 'Please provide a Steam URL or App ID.' }, { status: 400 });
        }

        let isSignedIn = false;
        if (previewMode && hasSupabaseServerEnv) {
            try {
                const cookieStore = await cookies();
                const supabaseServer = createSupabaseServerClient(cookieStore);
                if (supabaseServer) {
                    const {
                        data: { user },
                    } = await supabaseServer.auth.getUser();
                    isSignedIn = Boolean(user);
                }
            } catch (authError) {
                console.error('Preview auth check failed:', authError);
            }
        }

        let supabaseAdmin: ReturnType<typeof getSupabaseAdminClient> = null;
        let previewIpHash: string | null = null;
        const requiresFreePreviewLimitCheck = previewMode && !isSignedIn;

        if (requiresFreePreviewLimitCheck) {
            if (!/^\d+$/.test(appId)) {
                return NextResponse.json(
                    {
                        error: 'Free preview requires a valid Steam App ID or Steam store URL.',
                    },
                    { status: 400 }
                );
            }

            const previewCookie = parseJsonCookie<{ appIds: string[] }>(requestCookieMap[COOKIE_NAMES.previewLimit], {
                appIds: [],
            });
            const previewCookieAppIds = sanitizeAppIdList(previewCookie.appIds);
            const previewCookieHasAppId = previewCookieAppIds.includes(appId);
            supabaseAdmin = getSupabaseAdminClient();
            const retentionDays = getPreviewRetentionDays();
            const retentionCutoffIso = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();

            if (!supabaseAdmin) {
                return NextResponse.json(
                    {
                        error: 'Free preview limits are not configured. Add SUPABASE_SERVICE_ROLE_KEY to enable free preview checks.',
                    },
                    { status: 500 }
                );
            }

            const { error: cleanupError } = await supabaseAdmin
                .from('free_preview_usage')
                .delete()
                .lt('created_at', retentionCutoffIso);

            if (cleanupError) {
                console.error('Preview usage cleanup failed:', cleanupError);
                return NextResponse.json(
                    { error: 'Could not refresh free preview limits right now. Please try again shortly.' },
                    { status: 500 }
                );
            }

            const cachedPreviewLookup = await supabaseAdmin
                .from('free_preview_usage')
                .select('preview_tag, preview_short_desc, preview_status')
                .eq('steam_app_id', appId)
                .gte('created_at', retentionCutoffIso)
                .limit(1)
                .maybeSingle<CachedPreviewRow>();

            if (cachedPreviewLookup.error) {
                console.error('Preview cache lookup failed:', cachedPreviewLookup.error);
                return NextResponse.json(
                    { error: 'Could not validate free preview usage right now. Please try again shortly.' },
                    { status: 500 }
                );
            }

            if (cachedPreviewLookup.data?.preview_short_desc) {
                const cachedResponse = NextResponse.json({
                    suggestedTags: [cachedPreviewLookup.data.preview_tag ?? 'Discoverability'],
                    storeAudit: {
                        shortDesc: {
                            status: cachedPreviewLookup.data.preview_status ?? 'Warning',
                            feedback: cachedPreviewLookup.data.preview_short_desc,
                        },
                    },
                    competitors: [],
                    analysis: '',
                    cachedPreview: true,
                    blurLocked: previewMode && !isSignedIn,
                });

                return appendTrackingCookies(cachedResponse, requestCookieMap, {
                    previewMode,
                    appId,
                    isSignedIn,
                    tag: cachedPreviewLookup.data.preview_tag,
                    shortDesc: cachedPreviewLookup.data.preview_short_desc,
                });
            }

            if (previewCookieHasAppId) {
                return NextResponse.json(
                    {
                        error:
                            'You have reached the free preview limit for this Steam App ID. Sign up or buy credits to keep analyzing.',
                        errorCode: 'FREE_PREVIEW_LIMIT_REACHED',
                    },
                    { status: 429 }
                );
            }

            const requestIp = getRequestIp(req);
            if (!requestIp) {
                return NextResponse.json(
                    {
                        error: 'Could not verify your free-preview eligibility from this network. Please sign in to continue.',
                    },
                    { status: 400 }
                );
            }

            previewIpHash = hashIp(requestIp);

            const [ipLookup, appLookup] = await Promise.all([
                supabaseAdmin
                    .from('free_preview_usage')
                    .select('id')
                    .eq('ip_hash', previewIpHash)
                    .gte('created_at', retentionCutoffIso)
                    .limit(1)
                    .maybeSingle(),
                supabaseAdmin
                    .from('free_preview_usage')
                    .select('id')
                    .eq('steam_app_id', appId)
                    .gte('created_at', retentionCutoffIso)
                    .limit(1)
                    .maybeSingle(),
            ]);

            if (ipLookup.error) {
                console.error('Preview IP lookup failed:', ipLookup.error);
                return NextResponse.json(
                    { error: 'Could not validate free preview usage right now. Please try again shortly.' },
                    { status: 500 }
                );
            }

            if (appLookup.error) {
                console.error('Preview App ID lookup failed:', appLookup.error);
                return NextResponse.json(
                    { error: 'Could not validate free preview usage right now. Please try again shortly.' },
                    { status: 500 }
                );
            }

            if (ipLookup.data || appLookup.data) {
                return NextResponse.json(
                    {
                        error:
                            'You have reached the free preview limit for this network or Steam App ID. Sign up or buy credits to keep analyzing.',
                        errorCode: 'FREE_PREVIEW_LIMIT_REACHED',
                    },
                    { status: 429 }
                );
            }
        }

        let finalContext = userGame;

        if (isUrl && appId) {
            try {
                const steamRes = await fetch(`https://store.steampowered.com/api/appdetails?appids=${appId}`, {
                    next: { revalidate: 3600 },
                });
                const steamData = await steamRes.json();
                if (steamData[appId]?.success) {
                    const data = steamData[appId].data;
                    finalContext = `Game Name: ${data.name}\n\nShort Description: ${data.short_description}\n\nAbout The Game: ${data.about_the_game}`;
                }
            } catch (fetchError) {
                console.error('Steam API fetch failed', fetchError);
            }
        }

        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: `You are a Steam store page writing assistant for indie developers.
                                        Analyze the provided page content and suggest clearer positioning and messaging.

                                        1. FIND REFERENCE GAMES: Identify 5 mechanically similar Steam games.

                                        2. STORE PAGE REVIEW:
                                             - SHORT DESCRIPTION: Check whether it leads with clear gameplay actions and player fantasy.
                                             - ABOUT THIS GAME: Check readability and structure (headers, bullets, clear sections).

                                        3. ANALYSIS STRUCTURE:
                                             Use Markdown headers:
                                             ### 🎯 Tag Opportunities
                                             ### 📝 Store Page Feedback
                                             ### 🛠️ What To Improve Next

                                        Return ONLY JSON in this structure:
                                        {
                                            "competitors": [
                                                { "name": "Title", "appId": "123", "primaryTag": "Genre" }
                                            ],
                                            "suggestedTags": ["Precision Platformer", "Difficult", "Physics"],
                                            "storeAudit": {
                                                "shortDesc": { "status": "Pass/Fail/Warning", "feedback": "Critique here" },
                                                "aboutGame": { "status": "Pass/Fail/Warning", "feedback": "Critique here" }
                                            },
                                            "analysis": "Markdown content with the three headers requested."
                                        }`,
                },
                { role: 'user', content: finalContext },
            ],
            response_format: { type: 'json_object' },
        });

        const result = JSON.parse(response.choices[0].message.content || '{}');
        const suggestedTags = Array.isArray(result.suggestedTags)
            ? result.suggestedTags.filter((tag: unknown) => typeof tag === 'string')
            : [];

        result.suggestedTags = previewMode ? suggestedTags.slice(0, 1) : suggestedTags;
        result.blurLocked = previewMode && !isSignedIn;

        const previewTag = typeof result.suggestedTags?.[0] === 'string' ? result.suggestedTags[0] : null;
        const previewShortDesc =
            typeof result?.storeAudit?.shortDesc?.feedback === 'string'
                ? result.storeAudit.shortDesc.feedback
                : null;
        const previewStatus =
            typeof result?.storeAudit?.shortDesc?.status === 'string'
                ? result.storeAudit.shortDesc.status
                : null;

        if (requiresFreePreviewLimitCheck && supabaseAdmin && previewIpHash) {
            const { error: insertError } = await supabaseAdmin.from('free_preview_usage').insert({
                ip_hash: previewIpHash,
                steam_app_id: appId,
                preview_tag: previewTag,
                preview_short_desc: previewShortDesc,
                preview_status: previewStatus,
            });

            if (insertError) {
                if (insertError.code === '23505') {
                    const cachedPreviewLookup = await supabaseAdmin
                        .from('free_preview_usage')
                        .select('preview_tag, preview_short_desc, preview_status')
                        .eq('steam_app_id', appId)
                        .limit(1)
                        .maybeSingle<CachedPreviewRow>();

                    if (!cachedPreviewLookup.error && cachedPreviewLookup.data?.preview_short_desc) {
                        const cachedRaceResponse = NextResponse.json({
                            suggestedTags: [cachedPreviewLookup.data.preview_tag ?? 'Discoverability'],
                            storeAudit: {
                                shortDesc: {
                                    status: cachedPreviewLookup.data.preview_status ?? 'Warning',
                                    feedback: cachedPreviewLookup.data.preview_short_desc,
                                },
                            },
                            competitors: [],
                            analysis: '',
                            cachedPreview: true,
                            blurLocked: previewMode && !isSignedIn,
                        });

                        return appendTrackingCookies(cachedRaceResponse, requestCookieMap, {
                            previewMode,
                            appId,
                            isSignedIn,
                            tag: cachedPreviewLookup.data.preview_tag,
                            shortDesc: cachedPreviewLookup.data.preview_short_desc,
                        });
                    }

                    return NextResponse.json(
                        {
                            error:
                                'You have reached the free preview limit for this network or Steam App ID. Sign up or buy credits to keep analyzing.',
                            errorCode: 'FREE_PREVIEW_LIMIT_REACHED',
                        },
                        { status: 429 }
                    );
                }

                console.error('Preview usage insert failed:', insertError);
                return NextResponse.json(
                    { error: 'Could not save free preview usage right now. Please try again shortly.' },
                    { status: 500 }
                );
            }
        }

        const successResponse = NextResponse.json(result);
        return appendTrackingCookies(successResponse, requestCookieMap, {
            previewMode,
            appId,
            isSignedIn,
            tag: previewTag,
            shortDesc: previewShortDesc,
        });
    } catch (error) {
        console.error('Audit Route Error:', error);
        const message = error instanceof Error ? error.message : 'Audit failed';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}