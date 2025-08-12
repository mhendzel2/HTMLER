import { NextRequest, NextResponse } from 'next/server';
// Lazy import discord client to avoid bundling in routes that may not use it
async function getConfigModule() {
  return import('@/lib/discord-client');
}

// Simple route to view/update Discord alert configuration in-memory.
// POST with JSON body { symbols?: string[], minPremium?: number, minVolume?: number, channels?: string[], enabled?: boolean, strategies?: string[] }
// GET returns current config.

export async function GET() {
  try {
    if (!process.env.DISCORD_BOT_TOKEN) return NextResponse.json({ config: null, discord: false });
  const { getDiscordAlertConfig } = await getConfigModule();
  return NextResponse.json({ config: await getDiscordAlertConfig(), discord: true });
  } catch (e) {
    return NextResponse.json({ error: 'Discord module unavailable', discord: false });
  }
}

export async function POST(req: NextRequest) {
  try {
  if (!process.env.DISCORD_BOT_TOKEN) return NextResponse.json({ error: 'Discord not configured' }, { status: 400 });
  const body = await req.json();
  const { updateDiscordAlertConfig } = await getConfigModule();
  const updated = await updateDiscordAlertConfig(body);
  return NextResponse.json({ config: updated, updated: true, discord: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update config' }, { status: 400 });
  }
}
