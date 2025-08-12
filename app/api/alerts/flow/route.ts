import { NextRequest, NextResponse } from 'next/server';
import { unusualWhalesAPI } from '@/lib/unusual-whales-api';
import { cacheGet, cacheSet, cacheKey } from '@/lib/server-cache';
import fs from 'fs/promises';
import path from 'path';

/**
 * Consolidated flow alerts API.
 * Instead of per-ticker endpoints (which produced 404s), fetch a larger pool once
 * and filter on server. Supports optional premium, volume, since filters.
 */
// Lightweight watchlist caching
let _watchlistsCache: any[] | null = null;
let _watchlistsLoadedAt = 0;
const WATCHLIST_CACHE_MS = 60_000; // 1 minute

async function loadWatchlists(): Promise<any[]> {
  const now = Date.now();
  if (_watchlistsCache && (now - _watchlistsLoadedAt) < WATCHLIST_CACHE_MS) {
    return _watchlistsCache;
  }
  try {
    const fp = path.join(process.cwd(), 'data', 'watchlists.json');
    const raw = await fs.readFile(fp, 'utf-8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      _watchlistsCache = parsed;
      _watchlistsLoadedAt = now;
      return parsed;
    }
    return [];
  } catch {
    return [];
  }
}

async function getWatchlistTickers(watchlistId?: string): Promise<string[]> {
  const lists = await loadWatchlists();
  if (!lists.length) return [];
  let list = watchlistId ? lists.find(l => l.id === watchlistId) : undefined;
  if (!list) list = lists.find(l => l.isDefault) || lists[0];
  return (list.items || []).map((i: any) => String(i.ticker || '').trim().toUpperCase()).filter(Boolean);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbolsParam = searchParams.get('symbols') || 'AAPL,TSLA,NVDA,AMD,MSFT,SPY,QQQ';
  const includeWatchlist = searchParams.get('include_watchlist') === '1' || searchParams.get('use_watchlist') === '1';
  const watchlistId = searchParams.get('watchlist_id') || undefined;
  const limit = parseInt(searchParams.get('limit') || '50');
  const poolSize = Math.min(limit * 5, 500); // fetch a broader pool for filtering
  const minPremium = parseInt(searchParams.get('min_premium') || '25000');
  const minVolume = parseInt(searchParams.get('min_volume') || '50');
  const sinceMinutes = parseInt(searchParams.get('since_minutes') || '60');
  const sinceTs = Date.now() - sinceMinutes * 60 * 1000;
  const page = parseInt(searchParams.get('page') || '0');
  const noCache = searchParams.get('no_cache') === '1';
  let requested = symbolsParam.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
  let watchlistSymbols: string[] = [];
  if (includeWatchlist) {
    watchlistSymbols = await getWatchlistTickers(watchlistId);
    if (watchlistSymbols.length) {
      const set = new Set([...requested, ...watchlistSymbols]);
      requested = Array.from(set);
    }
  }

  const cKey = cacheKey(['flow-alerts', symbolsParam, limit, poolSize, minPremium, minVolume, sinceMinutes, page]);
  if (!noCache) {
    const cached = await cacheGet<any>(cKey);
    if (cached) {
      return NextResponse.json({ ...cached, metadata: { ...cached.metadata, cache: true } });
    }
  }

  try {
    // Fetch a pool of flow alerts once
    // Use paged API call if page > 0
    let apiResp: any;
    if (page > 0 && (unusualWhalesAPI as any).getFlowAlertsPaged) {
      apiResp = await (unusualWhalesAPI as any).getFlowAlertsPaged(page, poolSize);
    } else {
      apiResp = await unusualWhalesAPI.getFlowAlerts(poolSize);
    }
    const rawArray = apiResp?.data?.data || apiResp?.data || apiResp || [];
    if (!Array.isArray(rawArray)) {
      return NextResponse.json({ data: [], metadata: { total_alerts: 0, symbols_requested: requested } });
    }

    const filtered = rawArray
      .filter(alert => {
        const sym = (alert.underlying_symbol || alert.ticker || '').toUpperCase();
        if (requested.length && !requested.includes(sym)) return false;
        const premium = alert.total_premium || alert.premium || 0;
        const volume = alert.volume || alert.total_size || 0;
        const ts = alert.executed_at || alert.timestamp || alert.created_at || 0;
        if (premium < minPremium || volume < minVolume) return false;
        if (ts < sinceTs) return false;
        return true;
      })
      .map(alert => {
        const syntheticFlags = {
          option_symbol: !alert.option_symbol,
          expiry: !alert.expiry,
          strike: !alert.strike
        };
        // Apply fallback derivations (mirror logic in client but here for transparency)
        if (!alert.option_symbol && alert.ticker && alert.strike && alert.expiry && alert.type) {
          alert.option_symbol = `${alert.ticker}_${alert.strike}_${alert.expiry}_${String(alert.type).toUpperCase()}`;
        }
        if (!alert.expiry) {
          alert.expiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        }
        if (!alert.strike && alert.option_symbol) {
          const m = String(alert.option_symbol).match(/(\d+\.?\d*)/);
          if (m) alert.strike = parseFloat(m[1]);
        }
        return {
          ...alert,
          processed_at: Date.now(),
          source: 'api',
          filter_matches: analyzeAlert(alert),
          synthetic: syntheticFlags
        };
      });

    // Sort and slice
    filtered.sort((a, b) => {
      const premiumDiff = (b.total_premium || 0) - (a.total_premium || 0);
      if (premiumDiff !== 0) return premiumDiff;
      return (b.executed_at || b.created_at || 0) - (a.executed_at || a.created_at || 0);
    });

    const limited = filtered.slice(0, limit);

  const body = {
      data: limited,
      metadata: {
        total_alerts: limited.length,
        pool_considered: rawArray.length,
        symbols_requested: requested,
    watchlist_merged: includeWatchlist,
    watchlist_id: includeWatchlist ? (watchlistId || 'default') : undefined,
    watchlist_symbol_count: watchlistSymbols.length || undefined,
        timestamp: Date.now(),
        min_premium: minPremium,
        min_volume: minVolume,
        lookback_minutes: sinceMinutes,
        page,
        cache: false,
        upstream_endpoint: '/option-trades/flow-alerts'
      }
    };
    // Cache for short TTL (15s) to absorb bursts
    await cacheSet(cKey, body, 15);
    return NextResponse.json(body);
  } catch (error) {
    console.error('Flow alerts API error:', error);
    const status = (error as any)?.status || 500;
    return NextResponse.json({ error: 'Failed to fetch flow alerts' }, { status });
  }
}

/**
 * Analyze an alert to determine which filters it matches
 */
function analyzeAlert(alert: any): string[] {
  const matches = [];
  const premium = alert.total_premium || 0;
  const volume = alert.volume || 0;
  const askPrem = alert.total_ask_side_prem || 0;
  const bidPrem = alert.total_bid_side_prem || 0;
  
  // Determine if this is ask-side (aggressive buying)
  const isAskSide = askPrem > bidPrem;
  
  // Calculate DTE
  const expiryDate = new Date(alert.expiry);
  const now = new Date();
  const dte = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  // Determine aggressiveness
  const isSweep = alert.has_sweep;
  const isBlock = alert.has_floor || premium > 500000;
  
  // Big Money Filter ($500K+, ask-side, OTM)
  if (premium >= 500000 && isAskSide) {
    matches.push('big-money');
  }
  
  // Aggressive Short-Term (0-14 DTE, $100K+, sweeps)
  if (premium >= 100000 && dte <= 14 && isSweep && isAskSide) {
    matches.push('aggressive-short-term');
  }
  
  // Dark Pool Correlation ($250K+, blocks, large size)
  if (premium >= 250000 && (isBlock || volume > 500)) {
    matches.push('dark-pool');
  }
  
  // Gamma Squeeze (calls, ask-side, OTM, near-term)
  if (alert.type === 'call' && isAskSide && dte <= 30 && premium >= 50000) {
    matches.push('gamma-squeeze');
  }
  
  return matches;
}
