import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!process.env.DISCORD_BOT_TOKEN) {
    return NextResponse.json({ ok: false, error: 'DISCORD_BOT_TOKEN not set' }, { status: 400 });
  }
  try {
    const { searchParams } = new URL(req.url);
    const command = searchParams.get('cmd') || '/uwcongress limit:1';
    const started = Date.now();
    const mod = await import('@/lib/discord-client');
    const resp = await mod.sendDiscordCommand({ command, timeoutMs: 10_000 });
    const elapsed = Date.now() - started;
    return NextResponse.json({ ok: true, command, elapsed_ms: elapsed, response_excerpt: resp ? resp.slice(0, 400) : null });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message || String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return GET(req); // same behavior (allow POST test)
}
