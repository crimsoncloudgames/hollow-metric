import { NextResponse } from 'next/server';
import { openai } from '@/lib/openai';

export async function POST(req: Request) {
    try {
        if (!process.env.OPENAI_API_KEY) {
            return NextResponse.json(
                { error: 'Server is missing OPENAI_API_KEY. Add it in Vercel environment variables.' },
                { status: 500 }
            );
        }

        const { userGame, isUrl, appId } = await req.json();
        let finalContext = userGame;

        if (isUrl && appId) {
            try {
                const steamRes = await fetch(
                    `https://store.steampowered.com/api/appdetails?appids=${appId}`,
                    { next: { revalidate: 3600 } }
                );
                const steamData = await steamRes.json();
                if (steamData[appId]?.success) {
                    const data = steamData[appId].data;
                    // We grab the short description AND the long description for the audit
                    finalContext = `Game Name: ${data.name}\n\nShort Description: ${data.short_description}\n\nAbout The Game: ${data.about_the_game}`;
                }
            } catch (fetchError) {
                console.error("Steam API fetch failed", fetchError);
            }
        }

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
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
                    }`
                },
                { role: "user", content: finalContext }
            ],
            response_format: { type: "json_object" }
        });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    result.suggestedTags = Array.isArray(result.suggestedTags) ? result.suggestedTags : [];
        return NextResponse.json(result);

    } catch (error) {
        console.error("Audit Route Error:", error);
        const message = error instanceof Error ? error.message : "Audit failed";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}