// Removed static unusualWhalesAPI import to prevent pulling in discord/worker_threads on client bundles.
// Server-only access to upstream API will be done via dynamic import inside helper functions.
import { unusualWhalesWS } from './websocket-client';

const CUSTOM_FILTERS_STORAGE_KEY = 'unusual_whales_custom_filters';

export interface BigMoneyFilter {
  id: string;
  name: string;
  description: string;
  criteria: FilterCriteria;
  enabled: boolean;
  isPreset?: boolean;
  isCustom?: boolean;
}

export interface FilterCriteria {
  minPremium?: number;
  maxPremium?: number;
  minDTE?: number;
  maxDTE?: number;
  side?: 'ask' | 'bid' | 'both';
  moneyness?: 'ITM' | 'OTM' | 'ATM' | 'any';
  contractTypes?: ('call' | 'put')[];
  minSize?: number;
  sweepOnly?: boolean;
  blockOnly?: boolean;
  aggressiveness?: 'sweep' | 'block' | 'split' | 'any';
}
export interface GEXData {
  ticker: string;
  totalGEX: number;
  flipPoint: number;
  callGEX: number;
  putGEX: number;
  strikeData: Array<{
    strike: number;
    callGEX: number;
    putGEX: number;
    netGEX: number;
  }>;
  timestamp: number;
}

// Debug structures for filter evaluation transparency
interface FilterMatchDebug {
  filterId: string;
  passed: boolean;
  reasons?: string[]; // present when failed
}

interface ProcessedAlertDebug {
  at: number;
  ticker: string;
  premium: number;
  dte: number;
  size: number;
  moneyness: string;
  aggressiveness: string;
  side: string;
  type: string;
  matches: FilterMatchDebug[];
}

export interface FlowAlert {
  ticker: string;
  contractId: string;
  strike: number;
  expiry: string;
  type: 'call' | 'put';
  side: 'ask' | 'bid';
  premium: number;
  size: number;
  price: number;
  underlying_price: number;
  timestamp: number;
  dte: number;
  moneyness: 'ITM' | 'OTM' | 'ATM';
  aggressiveness: 'sweep' | 'block' | 'split';
  sentiment: 'bullish' | 'bearish' | 'neutral';
}

/**
 * Advanced Trading Filters System
 * Based on successful Unusual Whales trader strategies from social media research
 */
export class TradingFilterSystem {
  private static instance: TradingFilterSystem;
  private activeFilters: Map<string, BigMoneyFilter> = new Map();
  private alertSubscriptions: Map<string, (alert: FlowAlert) => void> = new Map();
  private gexSubscriptions: Map<string, (gex: GEXData) => void> = new Map();
  private debugRecent: ProcessedAlertDebug[] = [];

  static getInstance(): TradingFilterSystem {
    if (!TradingFilterSystem.instance) {
      TradingFilterSystem.instance = new TradingFilterSystem();
    }
    return TradingFilterSystem.instance;
  }

  constructor() {
    this.initializePresetFilters();
    this.loadCustomFilters();
  }

  /**
   * Initialize preset filters based on social media research
   */
  private initializePresetFilters(): void {
    // Big Money OTM Whales - Based on @BigMoneyBets methodology
    this.activeFilters.set('big-money-otm', {
      id: 'big-money-otm',
      name: 'Big Money OTM Whales',
      description: 'Tracks $500K+ premium OTM options targeting institutional plays',
      enabled: true,
      isPreset: true,
      criteria: {
        minPremium: 500000, // $500K minimum
        side: 'ask', // Ask-side only (aggressive buying)
        moneyness: 'OTM', // Out of the money
        minDTE: 14, // 2+ weeks
        maxDTE: 180, // Under 6 months
        aggressiveness: 'sweep' // Sweeps only
      }
    });

    // Aggressive Short-Term Plays - 0-14 DTE momentum
    this.activeFilters.set('aggressive-short-term', {
      id: 'aggressive-short-term',
      name: 'Aggressive Short-Term Plays',
      description: '0-14 DTE high-premium sweeps indicating immediate catalysts',
      enabled: true,
      isPreset: true,
      criteria: {
        minPremium: 100000, // $100K minimum for short-term
        maxDTE: 14, // 2 weeks or less
        side: 'ask', // Aggressive buying
        aggressiveness: 'sweep',
        minSize: 100 // Significant size
      }
    });

    // Dark Pool Correlation - Large blocks with institutional characteristics
    this.activeFilters.set('dark-pool-correlation', {
      id: 'dark-pool-correlation',
      name: 'Dark Pool Correlation',
      description: 'Large blocks that may correlate with dark pool activity',
      enabled: true,
      isPreset: true,
      criteria: {
        minPremium: 250000, // $250K threshold
        aggressiveness: 'block', // Block trades
        minSize: 500, // Large size
        minDTE: 30, // Longer-term positioning
        maxDTE: 120
      }
    });

    // Gamma Squeeze Setup - High GEX strikes with unusual activity
    this.activeFilters.set('gamma-squeeze', {
      id: 'gamma-squeeze',
      name: 'Gamma Squeeze Setup',
      description: 'Identifies potential gamma squeeze scenarios',
      enabled: true,
      isPreset: true,
      criteria: {
        contractTypes: ['call'], // Calls only
        side: 'ask',
        moneyness: 'OTM',
        maxDTE: 30, // Near-term expiry for gamma effects
        minPremium: 50000 // $50K minimum
      }
    });

    // Unusual Put Volume - Hedging or bearish positioning
    this.activeFilters.set('unusual-puts', {
      id: 'unusual-puts',
      name: 'Unusual Put Volume',
      description: 'Large put activity indicating hedging or bearish bets',
      enabled: false, // Disabled by default
      isPreset: true,
      criteria: {
        contractTypes: ['put'],
        minPremium: 200000, // $200K minimum
        side: 'ask',
        minSize: 200
      }
    });

    // Earnings Play Detector - Activity around earnings dates
    this.activeFilters.set('earnings-plays', {
      id: 'earnings-plays',
      name: 'Earnings Plays',
      description: 'Options activity likely tied to earnings events',
      enabled: true,
      isPreset: true,
      criteria: {
        maxDTE: 45, // Within earnings season timeframe
        minPremium: 75000, // $75K minimum
        side: 'ask'
      }
    });
  }

  /**
   * Start real-time monitoring with WebSocket
   */
  async startRealTimeMonitoring(): Promise<boolean> {
    // Test WebSocket access
    const wsTest = await unusualWhalesWS.testWebSocketAccess();
    
    if (!wsTest.hasWebSocketScope) {
      console.warn('⚠️ WebSocket not available, falling back to polling');
      this.startPollingMode();
      return false;
    }

    // Connect to WebSocket
    const connected = await unusualWhalesWS.connect();
    
    if (!connected) {
      console.warn('⚠️ WebSocket connection failed, falling back to polling');
      this.startPollingMode();
      return false;
    }

    // Subscribe to flow alerts - this replaces multiple inefficient API calls
    unusualWhalesWS.subscribe('flow-alerts', (data) => {
      // Handle WebSocket client wrapper format: { channel, payload, timestamp }
      if (data.channel === 'flow-alerts' && data.payload) {
        this.processFlowAlert(this.normalizeFlowAlert(data.payload));
      }
      // Handle WebSocket array format: ["flow-alerts", {...}]
      else if (Array.isArray(data) && data.length === 2 && data[0] === 'flow-alerts') {
        this.processFlowAlert(this.normalizeFlowAlert(data[1]));
      } 
      // Handle object format with payload
      else if (data.payload) {
        this.processFlowAlert(this.normalizeFlowAlert(data.payload));
      }
      // Handle direct flow alert data
      else {
        this.processFlowAlert(this.normalizeFlowAlert(data));
      }
    });

    // Subscribe to news for additional context
    unusualWhalesWS.subscribe('news', (data) => {
      if (Array.isArray(data) && data.length === 2 && data[0] === 'news') {
        this.processNewsAlert(data[1]);
      }
    });

    console.log('Real-time monitoring started.');
    return true;
  }

  /**
   * Load historical flow alerts up to lookbackDays (default 5) days back and feed through filters.
   * Uses paginated API until cutoff. Processes in batches to avoid blocking.
   */
  async loadHistoricalAlerts(lookbackDays: number = 5): Promise<number> {
    const since = Date.now() - lookbackDays * 24 * 60 * 60 * 1000;
    try {
      let rawAlerts: any[] = [];
      if (typeof window === 'undefined') {
        try {
          const mod = await import('./unusual-whales-api');
          if ((mod as any).unusualWhalesAPI?.getFlowAlertsSince) {
            rawAlerts = await (mod as any).unusualWhalesAPI.getFlowAlertsSince(since, 50, 100);
          }
        } catch (e) {
          console.warn('Server historical fetch failed, falling back to API route paging', e);
        }
      }
      if (!rawAlerts.length) {
        // Client or fallback: page through our consolidated API route until cutoff
        for (let page = 0; page < 20; page++) {
          const resp = await fetch(`/api/alerts/flow?limit=100&page=${page}&no_cache=1&since_minutes=${Math.ceil((Date.now()-since)/60000)}`);
          if (!resp.ok) break;
            const json: any = await resp.json();
          const arr = json?.data || [];
          if (!Array.isArray(arr) || !arr.length) break;
          rawAlerts.push(...arr);
          if (arr.length < 100) break;
        }
      }
      let processed = 0;
      for (const raw of rawAlerts) {
        const normalized = this.normalizeFlowAlert(raw);
        if (normalized.timestamp >= since) {
          this.processFlowAlert(normalized);
          processed++;
        }
        if (processed % 250 === 0) await new Promise(r => setTimeout(r, 0));
      }
      console.log(`Loaded ${processed} historical alerts.`);
      return processed;
    } catch (e) {
      console.error('Failed loading historical alerts', e);
      return 0;
    }
  }

  /**
   * Fallback polling mode when WebSocket is not available
   */
  private startPollingMode(): void {
    console.log('Starting polling mode for flow alerts.');
    
    // Poll every 30 seconds to respect rate limits
    setInterval(async () => {
      try {
        await this.pollRecentFlowAlerts();
      } catch (error) {
        console.error('Error polling flow alerts:', error);
      }
    }, 30000);
  }

  /**
   * Poll recent flow alerts (fallback method)
   */
  private async pollRecentFlowAlerts(): Promise<void> {
    try {
      let alerts: any[] = [];
      if (typeof window === 'undefined') {
        try {
          const mod = await import('./unusual-whales-api');
          const resp: any = await (mod as any).unusualWhalesAPI.getFlowAlerts(50);
          alerts = resp?.data?.data || resp?.data || resp || [];
        } catch {}
      }
      if (!alerts.length) {
        const resp = await fetch('/api/alerts/flow?limit=50&no_cache=1');
        if (resp.ok) {
          const json = await resp.json();
          alerts = json.data || [];
        }
      }
      if (Array.isArray(alerts)) {
        for (const alert of alerts) {
          this.processFlowAlert(this.normalizeFlowAlert(alert));
        }
      }
    } catch (error) {
      console.error('Error fetching flow alerts:', error);
    }
  }

  /**
   * Process incoming flow alert against all active filters
   */
  private processFlowAlert(alert: FlowAlert): void {
    for (const [filterId, filter] of this.activeFilters) {
      if (!filter.enabled) {
        continue;
      }

      if (this.matchesFilter(alert, filter.criteria)) {
        // Alert matches filter criteria - notify subscribers
        const callback = this.alertSubscriptions.get(filterId);
        if (callback) {
          callback(alert);
        }
      }
    }
  }

  /**
   * Process incoming news alert for context
   */
  private processNewsAlert(news: any): void {
    // Store recent news for context in trading decisions
    if (news.tickers && news.tickers.length > 0) {
      // News affects specific tickers - could influence flow analysis
    }
  }

  /**
   * Check if flow alert matches filter criteria
   */
  private matchesFilter(alert: FlowAlert, criteria: FilterCriteria): boolean {
  // Consolidated logic (used internally + for debug reasons list)
  const reasons: string[] = [];
  if (criteria.minPremium && alert.premium < criteria.minPremium) reasons.push(`premium < minPremium (${alert.premium} < ${criteria.minPremium})`);
  if (criteria.maxPremium && alert.premium > criteria.maxPremium) reasons.push(`premium > maxPremium (${alert.premium} > ${criteria.maxPremium})`);
  if (criteria.minDTE && alert.dte < criteria.minDTE) reasons.push(`dte < minDTE (${alert.dte} < ${criteria.minDTE})`);
  if (criteria.maxDTE && alert.dte > criteria.maxDTE) reasons.push(`dte > maxDTE (${alert.dte} > ${criteria.maxDTE})`);
  if (criteria.side && criteria.side !== 'both' && alert.side !== criteria.side) reasons.push(`side mismatch (${alert.side} != ${criteria.side})`);
  if (criteria.moneyness && criteria.moneyness !== 'any' && alert.moneyness !== criteria.moneyness) reasons.push(`moneyness mismatch (${alert.moneyness} != ${criteria.moneyness})`);
  if (criteria.contractTypes && !criteria.contractTypes.includes(alert.type)) reasons.push(`type not in contractTypes (${alert.type})`);
  if (criteria.minSize && alert.size < criteria.minSize) reasons.push(`size < minSize (${alert.size} < ${criteria.minSize})`);
  if (criteria.aggressiveness && criteria.aggressiveness !== 'any' && alert.aggressiveness !== criteria.aggressiveness) reasons.push(`aggressiveness mismatch (${alert.aggressiveness} != ${criteria.aggressiveness})`);
  if (criteria.sweepOnly && alert.aggressiveness !== 'sweep') reasons.push(`not sweep (agg=${alert.aggressiveness})`);
  if (criteria.blockOnly && alert.aggressiveness !== 'block') reasons.push(`not block (agg=${alert.aggressiveness})`);
  return reasons.length === 0;
  }

  /**
   * Subscribe to filtered alerts
   */
  subscribeToFilter(filterId: string, callback: (alert: FlowAlert) => void): void {
    this.alertSubscriptions.set(filterId, callback);
  }

  /**
   * Unsubscribe from filtered alerts
   */
  unsubscribeFromFilter(filterId: string): void {
    this.alertSubscriptions.delete(filterId);
  }

  /**
   * Get all available filters
   */
  getAvailableFilters(): BigMoneyFilter[] {
    return Array.from(this.activeFilters.values());
  }

  /**
   * Enable/disable a filter
   */
  toggleFilter(filterId: string, enabled: boolean): void {
    const filter = this.activeFilters.get(filterId);
    if (filter) {
      filter.enabled = enabled;
    }
  }

  /**
   * Update filter criteria
   */
  updateFilterCriteria(filterId: string, criteria: Partial<FilterCriteria>): void {
    const filter = this.activeFilters.get(filterId);
    if (filter) {
      filter.criteria = { ...filter.criteria, ...criteria };
      if (filter.isCustom) {
        this.saveCustomFilters();
      }
    }
  }

  addCustomFilter(filterData: Omit<BigMoneyFilter, 'id' | 'isCustom' | 'isPreset'>): BigMoneyFilter {
    const id = `custom-${Date.now()}`;
    const newFilter: BigMoneyFilter = {
      ...filterData,
      id,
      isCustom: true,
      enabled: true,
    };
    this.activeFilters.set(id, newFilter);
    this.saveCustomFilters();
    return newFilter;
  }

  deleteCustomFilter(filterId: string): void {
    const filter = this.activeFilters.get(filterId);
    if (filter && filter.isCustom) {
      this.activeFilters.delete(filterId);
      this.saveCustomFilters();
    }
  }

  private loadCustomFilters(): void {
    try {
      if (typeof window === 'undefined') return;
      const storedFilters = localStorage.getItem(CUSTOM_FILTERS_STORAGE_KEY);
      if (storedFilters) {
        const customFilters: BigMoneyFilter[] = JSON.parse(storedFilters);
        customFilters.forEach(filter => {
          this.activeFilters.set(filter.id, { ...filter, isCustom: true });
        });
      }
    } catch (error) {
      console.error("Failed to load custom filters from localStorage", error);
    }
  }

  private saveCustomFilters(): void {
    try {
      if (typeof window === 'undefined') return;
      const customFilters = Array.from(this.activeFilters.values()).filter(f => f.isCustom);
      localStorage.setItem(CUSTOM_FILTERS_STORAGE_KEY, JSON.stringify(customFilters));
    } catch (error) {
      console.error("Failed to save custom filters to localStorage", error);
    }
  }

  /**
   * Monitor GEX for a specific ticker using WebSocket (much more efficient)
   */
  async monitorGEX(ticker: string, callback: (gex: GEXData) => void): Promise<void> {
    // Try WebSocket first for real-time data
    const wsStatus = unusualWhalesWS.getStatus();
    
    if (wsStatus === 'connected') {
      // Subscribe to real-time GEX updates
      unusualWhalesWS.subscribe(`gex:${ticker}`, (data) => {
        if (Array.isArray(data) && data.length === 2 && data[0] === `gex:${ticker}`) {
          const gexData = this.normalizeGEXData(ticker, data[1]);
          callback(gexData);
        }
      });
      
      // Also subscribe to strike-level GEX for detailed analysis
      unusualWhalesWS.subscribe(`gex_strike:${ticker}`, (data) => {
        if (Array.isArray(data) && data.length === 2 && data[0] === `gex_strike:${ticker}`) {
          // This provides strike-level gamma data - very valuable for squeeze detection
        }
      });
      
    } else {
      console.warn(`WebSocket not connected for ${ticker}, falling back to periodic fetching for GEX.`);
      // Fallback to periodic fetching
      this.gexSubscriptions.set(ticker, callback);
      this.startGEXPolling(ticker);
    }
  }

  /**
   * Stop monitoring GEX for a ticker (removes subscriptions and polling)
   */
  stopGEXMonitoring(ticker: string): void {
    // Remove callback subscription
    this.gexSubscriptions.delete(ticker);
    // WebSocket client wrapper likely keeps internal map; attempt unsubscribe if available
    try {
      unusualWhalesWS.unsubscribe?.(`gex:${ticker}`);
      unusualWhalesWS.unsubscribe?.(`gex_strike:${ticker}`);
    } catch (e) {
      // non-fatal
    }
  }

  /**
   * Start GEX polling for a ticker (fallback method)
   */
  private startGEXPolling(ticker: string): void {
    const interval = setInterval(async () => {
      if (!this.gexSubscriptions.has(ticker)) {
        clearInterval(interval);
        return;
      }
      try {
        let raw: any = null;
        if (typeof window === 'undefined') {
          try {
            const mod = await import('./unusual-whales-api');
            if ((mod as any).unusualWhalesAPI?.getGEX) {
              raw = await (mod as any).unusualWhalesAPI.getGEX(ticker);
            }
          } catch (e) {
            console.warn('Server GEX fetch failed, falling back to API route', e);
          }
        }
        if (!raw) {
          try {
            const resp = await fetch(`/api/market/gex?ticker=${ticker}`);
            if (resp.ok) raw = await resp.json();
          } catch {}
        }
        if (raw) {
          const data = this.normalizeGEXData(ticker, raw.data || raw);
          const cb = this.gexSubscriptions.get(ticker);
          if (cb) cb(data);
        }
      } catch (err) {
        console.error('GEX polling error', err);
      }
    }, 60000);
  }

  private normalizeFlowAlert(raw: any): FlowAlert {
    // Handle WebSocket format: ["flow-alerts", {...}]
    let alertData = raw;
    if (Array.isArray(raw) && raw.length === 2 && raw[0] === 'flow-alerts') {
      alertData = raw[1];
    }

    // Extract option details from contract ID
  const contractId = alertData.option_chain || alertData.contract_id || alertData.contractId || alertData.option_symbol;
    let ticker = alertData.ticker;
    let strike = alertData.strike;
    let expiry = alertData.expiry;
    let type: 'call' | 'put' = alertData.type || 'call';

    // Parse contract ID if available (format: TICKER241018C00415000)
    if (contractId && !ticker) {
      const match = contractId.match(/^([A-Z]+)(\d{6})([CP])(\d+)$/);
      if (match) {
        ticker = match[1];
        const dateStr = match[2]; // YYMMDD
        type = match[3] === 'C' ? 'call' : 'put';
        strike = parseInt(match[4]) / 1000; // Strike in thousands
        
        // Convert YYMMDD to full date
        const year = 2000 + parseInt(dateStr.substring(0, 2));
        const month = parseInt(dateStr.substring(2, 4));
        const day = parseInt(dateStr.substring(4, 6));
        expiry = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      }
    }

    const underlyingPrice = alertData.underlying_price || alertData.underlyingPrice || alertData.price || 0;
    const premium = alertData.total_premium || alertData.premium || 0;
  const size = alertData.total_size || alertData.size || alertData.volume || 0;
    const price = alertData.price || 0;

    const side = this.determineSide(alertData);
    const dte = expiry ? this.calculateDTE(expiry) : 0;
    const moneyness = this.calculateMoneyness({ strike, underlying_price: underlyingPrice, type });
    const aggressiveness = this.determineAggressiveness(alertData);
    const sentiment = this.calculateSentiment({ type, side });

    // Attempt parse from option_symbol if still missing expiry or strike
    if ((!expiry || !strike) && alertData.option_symbol) {
      const sym = String(alertData.option_symbol);
      // Common OCC format underlying + YYMMDD + C/P + strike * 1000 maybe
      const m2 = sym.match(/^[A-Z]+(\d{6})([CP])(\d{2,8})/);
      if (m2) {
        const dateStr = m2[1];
        const year = 2000 + parseInt(dateStr.substring(0,2));
        const month = parseInt(dateStr.substring(2,4));
        const day = parseInt(dateStr.substring(4,6));
        if (!expiry) expiry = `${year}-${month.toString().padStart(2,'0')}-${day.toString().padStart(2,'0')}`;
        if (!strike) {
          const rawStrike = parseInt(m2[3]);
            if (!isNaN(rawStrike)) strike = rawStrike / 1000; // heuristic
        }
      }
    }

    const normalizedAlert = {
      ticker: ticker || 'UNKNOWN',
      contractId: contractId || '',
      strike: strike || 0,
      expiry: expiry || '',
      type,
      side,
      premium,
      size,
      price,
      underlying_price: underlyingPrice,
      timestamp: alertData.executed_at || alertData.timestamp || Date.now(),
      dte,
      moneyness,
      aggressiveness,
      sentiment
    };

    return normalizedAlert;
  }

  /**
   * Determine trade side from alert data
   */
  private determineSide(alertData: any): 'ask' | 'bid' {
    if (alertData.side) return alertData.side;
    
    // WebSocket format analysis
    const askPrem = alertData.total_ask_side_prem || 0;
    const bidPrem = alertData.total_bid_side_prem || 0;
    
    if (askPrem > bidPrem) return 'ask';
    if (bidPrem > askPrem) return 'bid';
    
    // Default to ask for aggressive trades
    return 'ask';
  }

  /**
   * Determine aggressiveness from alert data
   */
  private determineAggressiveness(alertData: any): 'sweep' | 'block' | 'split' {
    if (alertData.aggressiveness) return alertData.aggressiveness;
    if (alertData.aggression) return alertData.aggression;
    
    // WebSocket format analysis
    if (alertData.has_sweep) return 'sweep';
    if (alertData.has_floor) return 'block';
    
    // Analyze by size and premium
    const size = alertData.total_size || alertData.size || 0;
    const premium = alertData.total_premium || alertData.premium || 0;
    
    if (premium > 1000000 && size > 500) return 'block'; // Large institutional block
    if (size > 100) return 'sweep'; // Likely sweep
    
    return 'split';
  }

  /**
   * Normalize GEX data
   */
  private normalizeGEXData(ticker: string, raw: any): GEXData {
    return {
      ticker,
      totalGEX: raw.total_gex || raw.totalGEX || 0,
      flipPoint: raw.flip_point || raw.flipPoint || 0,
      callGEX: raw.call_gex || raw.callGEX || 0,
      putGEX: raw.put_gex || raw.putGEX || 0,
      strikeData: raw.strike_data || raw.strikeData || [],
      timestamp: raw.timestamp || Date.now()
    };
  }

  /**
   * Calculate days to expiration
   */
  private calculateDTE(expiry: string): number {
    const expiryDate = new Date(expiry);
    const now = new Date();
    const diffTime = expiryDate.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Calculate moneyness
   */
  private calculateMoneyness(alert: any): 'ITM' | 'OTM' | 'ATM' {
    const strike = alert.strike;
    const underlyingPrice = alert.underlying_price || alert.underlyingPrice;
    
    if (!underlyingPrice) return 'ATM';
    
    const diff = Math.abs(strike - underlyingPrice) / underlyingPrice;
    
    if (diff < 0.02) return 'ATM'; // Within 2%
    
    if (alert.type === 'call') {
      return strike > underlyingPrice ? 'OTM' : 'ITM';
    } else {
      return strike < underlyingPrice ? 'OTM' : 'ITM';
    }
  }

  /**
   * Calculate sentiment
   */
  private calculateSentiment(alert: any): 'bullish' | 'bearish' | 'neutral' {
    const { type, side } = alert;
    
    // Call buying (ask-side) = bullish
    if (type === 'call' && side === 'ask') return 'bullish';
    
    // Put buying (ask-side) = bearish  
    if (type === 'put' && side === 'ask') return 'bearish';
    
    // Call selling (bid-side) = bearish
    if (type === 'call' && side === 'bid') return 'bearish';
    
    // Put selling (bid-side) = bullish
    if (type === 'put' && side === 'bid') return 'bullish';
    
    return 'neutral';
  }

  /**
   * Get real-time statistics
   */
  getFilterStatistics(): { [filterId: string]: { count: number; totalPremium: number } } {
    // Implementation would track statistics for each filter
    // This is a placeholder for the statistical tracking system
    return {};
  }

  getDebugRecent(): ProcessedAlertDebug[] { return this.debugRecent.slice().reverse(); }
  getFilters(): any[] { return this.getAvailableFilters().map(f => ({ id: f.id, enabled: f.enabled, criteria: f.criteria })); }
}

export const tradingFilters = TradingFilterSystem.getInstance();
