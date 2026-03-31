import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const appId = req.nextUrl.searchParams.get('appid');
  if (!appId || !/^\d+$/.test(appId)) {
    return NextResponse.json({ error: 'Invalid appid' }, { status: 400 });
  }

  try {
    const res = await fetch(
      `https://store.steampowered.com/api/appdetails?appids=${appId}&filters=basic`,
      { next: { revalidate: 3600 } }
    );
    const data = await res.json();
    const game = data?.[appId]?.data;
    if (!game) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json({
      name: game.name,
      header_image: game.header_image,
    });
  } catch {
    return NextResponse.json({ error: 'Steam API error' }, { status: 500 });
  }
}
