import { createHash } from 'crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js';
import { openai } from '@/lib/openai';
import { createClient as createSupabaseServerClient, hasSupabaseServerEnv } from '@/utils/supabase/server';

type AnalyzeRequestBody = {
    userGame?: string;
    isUrl?: boolean;
    appId?: string;
    preview?: boolean;
};

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
                    content: `You are a Steam Store Page Consultant and Market Analyst.
                                        Analyze the provided content to help an indie dev optimize their conversion.

                                        1. FIND COMPETITORS: Identify 5 mechanically similar Steam games.

                                        2. STORE PAGE AUDIT:
                                             - SHORT DESCRIPTION: Check if it leads with gameplay "verbs" (Action). Flag if it's too much "Lore-dumping."
                                             - ABOUT THIS GAME: Check for scannability (headers/bullets). Flag if it's a "wall of text."

                                        3. ANALYSIS STRUCTURE:
                                             Use Markdown headers:
                                             ### 🎯 Tag Gaps (Specific Steam tags to add)
                                             ### 📊 Formal Market Feedback (Professional analysis)
                                             ### 🛠️ What This Means For You (Plain English/Blunt dev-to-dev advice)

                                        Return ONLY JSON in this structure:
                                        {
                                            "competitors": [
                                                { "name": "Title", "appId": "123", "primaryTag": "Genre", "estRevenue": "$500k", "estDevCost": "$100k" }
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

        if (requiresFreePreviewLimitCheck && supabaseAdmin && previewIpHash) {
            const { error: insertError } = await supabaseAdmin.from('free_preview_usage').insert({
                ip_hash: previewIpHash,
                steam_app_id: appId,
            });

            if (insertError) {
                if (insertError.code === '23505') {
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

        return NextResponse.json(result);
    } catch (error) {
        console.error('Audit Route Error:', error);
        const message = error instanceof Error ? error.message : 'Audit failed';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}