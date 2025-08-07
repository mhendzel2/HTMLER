import { unusualWhalesAPI } from './unusual-whales-api';
import { unusualWhalesWS } from './websocket-client';

export interface BigMoneyFilter {
  id: string;
  name: string;
  description: string;
  criteria: FilterCriteria;
  enabled: boolean;
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

/**
 * Advanced Trading Filters System
 * Based on successful Unusual Whales trader strategies from social media research
 */
export class TradingFilterSystem {
  private static instance: TradingFilterSystem;
  private activeFilters: Map<string, BigMoneyFilter> = new Map();
  private alertSubscriptions: Map<string, (alert: FlowAlert) => void> = new Map();
  private gexSubscriptions: Map<string, (gex: GEXData) => void> = new Map();

  static getInstance(): TradingFilterSystem {
    if (!TradingFilterSystem.instance) {
      TradingFilterSystem.instance = new TradingFilterSystem();
    }
    return TradingFilterSystem.instance;
  }

  constructor() {
    this.initializePresetFilters();
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
    console.log('🚀 Starting real-time monitoring...');
    
    // Test WebSocket access
    const wsTest = await unusualWhalesWS.testWebSocketAccess();
    console.log('🔍 WebSocket access test:', wsTest);
    
    if (!wsTest.hasWebSocketScope) {
      console.warn('⚠️ WebSocket not available, falling back to polling');
      this.startPollingMode();
      return false;
    }

    // Connect to WebSocket
    console.log('🔌 Connecting to WebSocket...');
    const connected = await unusualWhalesWS.connect();
    console.log('🔌 WebSocket connection result:', connected);
    
    if (!connected) {
      console.warn('⚠️ WebSocket connection failed, falling back to polling');
      this.startPollingMode();
      return false;
    }

    console.log('✅ WebSocket connected successfully - subscribing to channels...');

    // Subscribe to flow alerts - this replaces multiple inefficient API calls
    unusualWhalesWS.subscribe('flow-alerts', (data) => {
      console.log('🚨 RAW WebSocket flow alert received:', JSON.stringify(data, null, 2));
      
      // Handle WebSocket client wrapper format: { channel, payload, timestamp }
      if (data.channel === 'flow-alerts' && data.payload) {
        console.log('📨 Processing WebSocket client wrapper format flow alert');
        this.processFlowAlert(this.normalizeFlowAlert(data.payload));
      }
      // Handle WebSocket array format: ["flow-alerts", {...}]
      else if (Array.isArray(data) && data.length === 2 && data[0] === 'flow-alerts') {
        console.log('📨 Processing WebSocket array format flow alert');
        this.processFlowAlert(this.normalizeFlowAlert(data[1]));
      } 
      // Handle object format with payload
      else if (data.payload) {
        console.log('📨 Processing WebSocket payload format flow alert');
        this.processFlowAlert(this.normalizeFlowAlert(data.payload));
      }
      // Handle direct flow alert data
      else {
        console.log('📨 Processing WebSocket direct format flow alert');
        this.processFlowAlert(this.normalizeFlowAlert(data));
      }
    });

    // Subscribe to news for additional context
    unusualWhalesWS.subscribe('news', (data) => {
      console.log('Received news data:', data);
      if (Array.isArray(data) && data.length === 2 && data[0] === 'news') {
        this.processNewsAlert(data[1]);
      }
    });

    console.log('Real-time monitoring started with WebSocket');
    return true;
  }

  /**
   * Fallback polling mode when WebSocket is not available
   */
  private startPollingMode(): void {
    console.log('Starting polling mode for flow alerts');
    
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
      const response: any = await unusualWhalesAPI.getFlowAlerts(50);
      const alerts = response.data || response;

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
    console.log('🔍 Processing flow alert:', {
      ticker: alert.ticker,
      premium: alert.premium,
      side: alert.side,
      type: alert.type,
      dte: alert.dte,
      moneyness: alert.moneyness,
      aggressiveness: alert.aggressiveness,
      sentiment: alert.sentiment
    });
    
    let matched = 0;
    
    for (const [filterId, filter] of this.activeFilters) {
      if (!filter.enabled) {
        console.log(`❌ Filter ${filter.name} is disabled`);
        continue;
      }

      console.log(`🎯 Testing against filter: ${filter.name}`, {
        criteria: filter.criteria,
        alert: {
          premium: alert.premium,
          dte: alert.dte,
          side: alert.side,
          moneyness: alert.moneyness,
          type: alert.type,
          size: alert.size,
          aggressiveness: alert.aggressiveness
        }
      });

      if (this.matchesFilter(alert, filter.criteria)) {
        matched++;
        console.log(`✅ Alert matches filter: ${filter.name}`, alert);
        
        // Alert matches filter criteria - notify subscribers
        const callback = this.alertSubscriptions.get(filterId);
        if (callback) {
          callback(alert);
        }
      } else {
        console.log(`❌ Alert does NOT match filter: ${filter.name}`);
        this.debugFilterMatch(alert, filter.criteria);
      }
    }
    
    console.log(`📊 Alert processed - ${matched} filters matched out of ${this.activeFilters.size} active filters`);
  }

  /**
   * Debug why an alert didn't match a filter
   */
  private debugFilterMatch(alert: FlowAlert, criteria: FilterCriteria): void {
    const failures = [];
    
    if (criteria.minPremium && alert.premium < criteria.minPremium) {
      failures.push(`premium ${alert.premium} < ${criteria.minPremium}`);
    }
    if (criteria.maxPremium && alert.premium > criteria.maxPremium) {
      failures.push(`premium ${alert.premium} > ${criteria.maxPremium}`);
    }
    if (criteria.minDTE && alert.dte < criteria.minDTE) {
      failures.push(`DTE ${alert.dte} < ${criteria.minDTE}`);
    }
    if (criteria.maxDTE && alert.dte > criteria.maxDTE) {
      failures.push(`DTE ${alert.dte} > ${criteria.maxDTE}`);
    }
    if (criteria.side && criteria.side !== 'both' && alert.side !== criteria.side) {
      failures.push(`side ${alert.side} != ${criteria.side}`);
    }
    if (criteria.moneyness && criteria.moneyness !== 'any' && alert.moneyness !== criteria.moneyness) {
      failures.push(`moneyness ${alert.moneyness} != ${criteria.moneyness}`);
    }
    if (criteria.contractTypes && !criteria.contractTypes.includes(alert.type)) {
      failures.push(`type ${alert.type} not in ${criteria.contractTypes}`);
    }
    if (criteria.minSize && alert.size < criteria.minSize) {
      failures.push(`size ${alert.size} < ${criteria.minSize}`);
    }
    if (criteria.aggressiveness && criteria.aggressiveness !== 'any' && alert.aggressiveness !== criteria.aggressiveness) {
      failures.push(`aggressiveness ${alert.aggressiveness} != ${criteria.aggressiveness}`);
    }
    if (criteria.sweepOnly && alert.aggressiveness !== 'sweep') {
      failures.push(`not a sweep (${alert.aggressiveness})`);
    }
    if (criteria.blockOnly && alert.aggressiveness !== 'block') {
      failures.push(`not a block (${alert.aggressiveness})`);
    }
    
    console.log(`🚫 Filter match failures:`, failures);
  }

  /**
   * Process incoming news alert for context
   */
  private processNewsAlert(news: any): void {
    console.log('Processing news alert:', news.headline);
    
    // Store recent news for context in trading decisions
    if (news.tickers && news.tickers.length > 0) {
      // News affects specific tickers - could influence flow analysis
      console.log('News affects tickers:', news.tickers);
    }
  }

  /**
   * Check if flow alert matches filter criteria
   */
  private matchesFilter(alert: FlowAlert, criteria: FilterCriteria): boolean {
    // Premium checks
    if (criteria.minPremium && alert.premium < criteria.minPremium) return false;
    if (criteria.maxPremium && alert.premium > criteria.maxPremium) return false;

    // DTE checks
    if (criteria.minDTE && alert.dte < criteria.minDTE) return false;
    if (criteria.maxDTE && alert.dte > criteria.maxDTE) return false;

    // Side check
    if (criteria.side && criteria.side !== 'both' && alert.side !== criteria.side) return false;

    // Moneyness check
    if (criteria.moneyness && criteria.moneyness !== 'any' && alert.moneyness !== criteria.moneyness) return false;

    // Contract type check
    if (criteria.contractTypes && !criteria.contractTypes.includes(alert.type)) return false;

    // Size check
    if (criteria.minSize && alert.size < criteria.minSize) return false;

    // Aggressiveness check
    if (criteria.aggressiveness && criteria.aggressiveness !== 'any' && alert.aggressiveness !== criteria.aggressiveness) return false;

    // Sweep only check
    if (criteria.sweepOnly && alert.aggressiveness !== 'sweep') return false;

    // Block only check
    if (criteria.blockOnly && alert.aggressiveness !== 'block') return false;

    return true;
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
    }
  }

  /**
   * Monitor GEX for a specific ticker using WebSocket (much more efficient)
   */
  async monitorGEX(ticker: string, callback: (gex: GEXData) => void): Promise<void> {
    console.log(`Starting GEX monitoring for ${ticker}`);
    
    // Try WebSocket first for real-time data
    const wsStatus = unusualWhalesWS.getStatus();
    
    if (wsStatus === 'connected') {
      console.log(`Using WebSocket for real-time GEX data on ${ticker}`);
      
      // Subscribe to real-time GEX updates
      unusualWhalesWS.subscribe(`gex:${ticker}`, (data) => {
        console.log(`Received GEX data for ${ticker}:`, data);
        
        if (Array.isArray(data) && data.length === 2 && data[0] === `gex:${ticker}`) {
          const gexData = this.normalizeGEXData(ticker, data[1]);
          callback(gexData);
        }
      });
      
      // Also subscribe to strike-level GEX for detailed analysis
      unusualWhalesWS.subscribe(`gex_strike:${ticker}`, (data) => {
        console.log(`Received strike GEX data for ${ticker}:`, data);
        
        if (Array.isArray(data) && data.length === 2 && data[0] === `gex_strike:${ticker}`) {
          // This provides strike-level gamma data - very valuable for squeeze detection
          console.log('Strike-level GEX update:', data[1]);
        }
      });
      
    } else {
      console.log(`WebSocket not connected for ${ticker}, falling back to periodic fetching`);
      // Fallback to periodic fetching
      this.gexSubscriptions.set(ticker, callback);
      this.startGEXPolling(ticker);
    }
  }

  /**
   * Start GEX polling for a ticker (fallback method)
   */
  private startGEXPolling(ticker: string): void {
    const pollGEX = async () => {
      try {
        const response = await unusualWhalesAPI.getStockGEX(ticker);
        const gexData = this.normalizeGEXData(ticker, response);
        
        const callback = this.gexSubscriptions.get(ticker);
        if (callback) {
          callback(gexData);
        }
      } catch (error) {
        console.error(`Error fetching GEX for ${ticker}:`, error);
      }
    };

    // Poll every 60 seconds for GEX updates
    const intervalId = setInterval(pollGEX, 60000);
    
    // Initial fetch
    pollGEX();
  }

  /**
   * Stop monitoring GEX for a ticker
   */
  stopGEXMonitoring(ticker: string): void {
    this.gexSubscriptions.delete(ticker);
    unusualWhalesWS.unsubscribe(`gex:${ticker}`);
  }

  /**
   * Normalize flow alert data from WebSocket or API
   */
  private normalizeFlowAlert(raw: any): FlowAlert {
    console.log('🔄 Normalizing flow alert from raw data:', JSON.stringify(raw, null, 2));
    
    // Handle WebSocket format: ["flow-alerts", {...}]
    let alertData = raw;
    if (Array.isArray(raw) && raw.length === 2 && raw[0] === 'flow-alerts') {
      alertData = raw[1];
      console.log('🔄 Extracted from array format:', alertData);
    }

    // Extract option details from contract ID
    const contractId = alertData.option_chain || alertData.contract_id || alertData.contractId;
    let ticker = alertData.ticker;
    let strike = alertData.strike;
    let expiry = alertData.expiry;
    let type: 'call' | 'put' = alertData.type || 'call';

    console.log('🔄 Initial extraction:', { contractId, ticker, strike, expiry, type });

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
        
        console.log('🔄 Parsed from contract ID:', { ticker, type, strike, expiry });
      }
    }

    const underlyingPrice = alertData.underlying_price || alertData.underlyingPrice || alertData.price || 0;
    const premium = alertData.total_premium || alertData.premium || 0;
    const size = alertData.total_size || alertData.size || 0;
    const price = alertData.price || 0;

    const side = this.determineSide(alertData);
    const dte = expiry ? this.calculateDTE(expiry) : 0;
    const moneyness = this.calculateMoneyness({ strike, underlying_price: underlyingPrice, type });
    const aggressiveness = this.determineAggressiveness(alertData);
    const sentiment = this.calculateSentiment({ type, side });

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

    console.log('✅ Normalized flow alert:', normalizedAlert);
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
}

export const tradingFilters = TradingFilterSystem.getInstance();
