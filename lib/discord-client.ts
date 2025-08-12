// Intentionally no 'use server' directive to avoid Next.js Server Actions validation on sync exports.
import { Client, GatewayIntentBits, TextChannel, Message, Partials, Collection } from 'discord.js';

/**
 * NOTE: This module should only be imported dynamically (await import('./discord-client'))
 * inside server-side code paths (Node runtime). Avoid static imports in Next.js route
 * handlers to prevent bundling issues and missing native dependencies in edge/runtime.
 *
 * Lightweight Discord client helper for sending slash-like commands to a channel
 * and waiting for a response from a target bot (e.g., Unusual Whales bot).
 */
export interface DiscordCommandOptions {
  command: string;                 // Raw command text to send (e.g. /uwalert ...)
  channelId?: string;              // Override channel id
  respondUserId?: string;          // Bot user ID whose response we await
  timeoutMs?: number;              // Max wait time
  maxMessages?: number;            // Max messages to scan before giving up
}

export interface DiscordAlertConfig {
  symbols: string[];              // Symbols to monitor
  minPremium?: number;            // Minimum premium threshold
  minVolume?: number;             // Minimum volume threshold
  channels?: string[];            // Additional Discord channel IDs to forward to
  enabled?: boolean;              // Master enable switch
  strategies?: string[];          // Strategy tags (e.g. big-money, aggressive-short-term)
}

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const DEFAULT_CHANNEL_ID = process.env.DISCORD_CHANNEL_ID;
const TARGET_BOT_USER_ID = process.env.UNUSUAL_WHALES_DISCORD_BOT_ID; // The responding bot user id

let sharedClient: Client | null = null;

function getClient(): Client {
  if (typeof process === 'undefined' || process.release?.name !== 'node') {
    throw new Error('discord-client can only run in a Node.js server environment');
  }
  if (sharedClient) return sharedClient;
  if (!BOT_TOKEN) throw new Error('DISCORD_BOT_TOKEN missing');

  sharedClient = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Channel]
  });
  return sharedClient;
}

async function ensureLogin(): Promise<Client> {
  const client = getClient();
  if (!client.isReady()) {
    await client.login(BOT_TOKEN);
  }
  return client;
}

export async function sendDiscordCommand(opts: DiscordCommandOptions): Promise<string | null> {
  const {
    command,
    channelId = DEFAULT_CHANNEL_ID!,
    respondUserId = TARGET_BOT_USER_ID!,
    timeoutMs = 8000,
    maxMessages = 25
  } = opts;

  if (!channelId) throw new Error('channelId required');
  if (!BOT_TOKEN) throw new Error('DISCORD_BOT_TOKEN missing');
  if (!respondUserId) throw new Error('UNUSUAL_WHALES_DISCORD_BOT_ID missing');

  const client = await ensureLogin();

  const channel = await client.channels.fetch(channelId);
  if (!channel || !(channel instanceof TextChannel)) throw new Error('Channel not found or not text channel');

  const sent = await channel.send(command);
  // Wait for response message authored by target bot after timestamp of our sent message
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const messages = await channel.messages.fetch({ limit: maxMessages });
    let match: Message | undefined;
    messages.forEach((m: Message) => {
      if (!match && m.author?.id === respondUserId && m.createdTimestamp >= sent.createdTimestamp) {
        match = m;
      }
    });
    if (match) return match.content;
    await new Promise(r => setTimeout(r, 750));
  }
  return null; // timeout
}

// Parse JSON fenced code from bot markdown response if present
function extractJsonBlocks(text: string): any[] {
  const blocks: any[] = [];
  const regex = /```(?:json)?\n([\s\S]*?)```/gi;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text))) {
    const raw = m[1].trim();
    try { blocks.push(JSON.parse(raw)); } catch { /* ignore */ }
  }
  return blocks;
}

export async function fetchCongressTradesFromDiscord(limit = 50, ticker?: string, congressMember?: string) {
  const parts = ['/uwcongress'];
  if (ticker) parts.push(`ticker:${ticker}`);
  if (congressMember) parts.push(`member:${congressMember}`);
  parts.push(`limit:${limit}`);
  const command = parts.join(' ');
  const resp = await sendDiscordCommand({ command });
  if (!resp) return [];
  const jsons = extractJsonBlocks(resp);
  if (jsons.length) return jsons[0];
  return [{ raw: resp }];
}

export async function fetchTopTradedTickersFromDiscord(limit = 10) {
  const command = `/uwcongress_top limit:${limit}`;
  const resp = await sendDiscordCommand({ command });
  if (!resp) return [];
  const jsons = extractJsonBlocks(resp);
  if (jsons.length) return jsons[0];
  return [{ raw: resp }];
}

export async function fetchFlowAlertsFromDiscord(symbols: string[], limit = 50) {
  // Hypothetical command pattern: /uwflow symbols:AAPL,TSLA limit:50
  const command = `/uwflow symbols:${symbols.join(',')} limit:${limit}`;
  const resp = await sendDiscordCommand({ command });
  if (!resp) return [];
  const jsons = extractJsonBlocks(resp);
  if (jsons.length) return jsons[0];
  return [{ raw: resp }];
}

// In-memory alert configuration store (could upgrade to Redis later)
let alertConfig: DiscordAlertConfig = {
  symbols: ['AAPL','TSLA','NVDA'],
  minPremium: 25000,
  minVolume: 50,
  channels: [],
  enabled: false,
  strategies: ['big-money','aggressive-short-term']
};

export async function getDiscordAlertConfig(): Promise<DiscordAlertConfig> { return { ...alertConfig }; }
export async function updateDiscordAlertConfig(patch: Partial<DiscordAlertConfig>): Promise<DiscordAlertConfig> {
  alertConfig = { ...alertConfig, ...patch };
  return { ...alertConfig };
}
