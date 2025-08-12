import { NextRequest, NextResponse } from 'next/server';
import { getDiscordAlertConfig, updateDiscordAlertConfig } from '@/lib/discord-client';

// Simple route to view/update Discord alert configuration in-memory.
// POST with JSON body { symbols?: string[], minPremium?: number, minVolume?: number, channels?: string[], enabled?: boolean, strategies?: string[] }
// GET returns current config.

export async function GET() {
  return NextResponse.json({ config: getDiscordAlertConfig() });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const updated = updateDiscordAlertConfig(body);
    return NextResponse.json({ config: updated, updated: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update config' }, { status: 400 });
  }
}
