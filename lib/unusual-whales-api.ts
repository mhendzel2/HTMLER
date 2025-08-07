
import { NextRequest } from 'next/server';

const API_BASE_URL = process.env.UNUSUAL_WHALES_API_BASE_URL || 'https://api.unusualwhales.com';
const API_KEY = process.env.UNUSUAL_WHALES_API_KEY;

interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  params?: Record<string, string | number | boolean>;
  cache?: RequestCache;
}

class UnusualWhalesAPIError extends Error {
  constructor(
    message: string,
    public status?: number,
    public response?: any
  ) {
    super(message);
    this.name = 'UnusualWhalesAPIError';
  }
}

export class UnusualWhalesAPI {
  private static instance: UnusualWhalesAPI;
  private rateLimitDelay = 100; // 10 requests per second
  private maxConcurrentRequests = parseInt(process.env.UNUSUAL_WHALES_MAX_CONCURRENT || '2', 10);
  private activeRequests = 0;
  private queue: Array<() => void> = [];

  private constructor() {}

  static getInstance(): UnusualWhalesAPI {
    if (!UnusualWhalesAPI.instance) {
      UnusualWhalesAPI.instance = new UnusualWhalesAPI();
    }
    return UnusualWhalesAPI.instance;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };

    if (API_KEY) {
      headers['Authorization'] = `Bearer ${API_KEY}`;
    }

    return headers;
  }

  private buildUrl(endpoint: string, params?: Record<string, string | number | boolean>): string {
    const url = new URL(`/api${endpoint}`, API_BASE_URL);
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    return url.toString();
  }

  private async makeRequest<T>(
    endpoint: string, 
    options: ApiRequestOptions = {}
  ): Promise<T> {
    const { method = 'GET', params, cache = 'default' } = options;
    await this.acquireSlot();

    try {
      // Rate limiting between requests
      await new Promise(resolve => setTimeout(resolve, this.rateLimitDelay));

      const url = this.buildUrl(endpoint, params);

      const response = await fetch(url, {
        method,
        headers: this.getHeaders(),
        cache,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new UnusualWhalesAPIError(
          `API request failed: ${response.status} ${response.statusText}`,
          response.status,
          errorText
        );
      }

      const data = await response.json();
      return data;
    } catch (error) {
      if (error instanceof UnusualWhalesAPIError) {
        throw error;
      }
      throw new UnusualWhalesAPIError(
        `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      this.releaseSlot();
    }
  }

  private async acquireSlot(): Promise<void> {
    if (this.activeRequests >= this.maxConcurrentRequests) {
      await new Promise<void>(resolve => this.queue.push(resolve));
    }
    this.activeRequests++;
  }

  private releaseSlot(): void {
    this.activeRequests--;
    const next = this.queue.shift();
    if (next) {
      next();
    }
  }

  // Market Endpoints
  async getMarketTide(date?: string, interval5m = true, otmOnly = false) {
    const endpoint = '/market/market-tide';
    const params: Record<string, string | boolean> = {};
    if (date) params.date = date;
    params.interval_5m = interval5m;
    params.otm_only = otmOnly;
    
    return this.makeRequest(endpoint, { params, cache: 'no-store' });
  }

  async getSectorTide(sector: string, date?: string) {
    const endpoint = `/market/${encodeURIComponent(sector)}/sector-tide`;
    const params: Record<string, string> = {};
    if (date) params.date = date;
    
    return this.makeRequest(endpoint, { params, cache: 'no-store' });
  }

  async getMarketCorrelations(startDate?: string, endDate?: string) {
    const params: Record<string, string> = {};
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    return this.makeRequest('/market/correlations', { params });
  }

  // Earnings Endpoints
  async getEarningsAfterHours(date?: string, limit = 50, page = 0) {
    const params: Record<string, string | number> = { limit, page };
    if (date) params.date = date;
    return this.makeRequest('/earnings/afterhours', { params });
  }

  async getEarningsPreMarket(date?: string, limit = 50, page = 0) {
    const params: Record<string, string | number> = { limit, page };
    if (date) params.date = date;
    return this.makeRequest('/earnings/premarket', { params });
  }

  async getEarningsHistorical(ticker: string) {
    return this.makeRequest(`/earnings/${ticker}`);
  }

  // Options Endpoints
  async getOptionContract(contractId: string) {
    return this.makeRequest(`/option-contract/${contractId}`);
  }

  async getOptionContractIntraday(contractId: string, date?: string) {
    const params: Record<string, string> = {};
    if (date) params.date = date;
    return this.makeRequest(`/option-contract/${contractId}/intraday`, { params });
  }

  async getOptionContractVolumeProfile(contractId: string) {
    return this.makeRequest(`/option-contract/${contractId}/volume-profile`);
  }

  async getStockOptionsData(ticker: string) {
    // Since /stock/{ticker}/options doesn't exist, use flow-alerts as an alternative
    // This will give us recent options activity for the ticker
    return this.getStockFlowAlerts(ticker, true, true, 50);
  }

  async getStockGreeks(ticker: string) {
    return this.makeRequest(`/stock/${ticker}/greeks`);
  }

  async getStockOIPerStrike(ticker: string) {
    return this.makeRequest(`/stock/${ticker}/oi-per-strike`);
  }

  async getStockOIPerExpiry(ticker: string) {
    return this.makeRequest(`/stock/${ticker}/oi-per-expiry`);
  }

  async getStockOptionsVolume(ticker: string, limit: number = 1) {
    const params: Record<string, number> = { limit };
    return this.makeRequest(`/stock/${ticker}/options-volume`, { params });
  }

  // Stock Endpoints
  async getStockInfo(ticker: string) {
    return this.makeRequest(`/stock/${ticker}`);
  }

  async getStockState(ticker: string) {
    return this.makeRequest(`/stock/${ticker}/stock-state`);
  }

  async getStockNetPremTicks(ticker: string, date?: string) {
    const params: Record<string, string> = {};
    if (date) params.date = date;
    return this.makeRequest(`/stock/${ticker}/net-prem-ticks`, { params });
  }

  // GEX and Flow Analytics Endpoints
  async getStockFlowAlerts(
    ticker: string, 
    isAskSide: boolean = true, 
    isBidSide: boolean = true, 
    limit: number = 100
  ) {
    // Since /stock/{ticker}/flow-alerts doesn't exist, use general flow alerts and filter
    const params: Record<string, string | boolean | number> = { 
      limit: limit * 2 // Get more to account for filtering
    };
    
    try {
      const response: any = await this.makeRequest('/option-trades/flow-alerts', { params });
      // Filter the results by ticker if we got data
      if (response?.data?.data) {
        response.data.data = response.data.data.filter((alert: any) => 
          alert.underlying_symbol === ticker.toUpperCase()
        );
      }
      return response;
    } catch (error) {
      // Fallback to using OI changes which is known to work
      return this.makeRequest('/market/oi-change', { params: { limit: 50, page: 0 } });
    }
  }

  async getFlowAlerts(limit: number = 50) {
    const params: Record<string, string | number> = { limit };
    return this.makeRequest('/option-trades/flow-alerts', { params });
  }

  async getStockGEX(ticker: string) {
    return this.makeRequest(`/stock/${ticker}/gex`);
  }

  async getStockGreekFlow(ticker: string, date?: string, expiry?: string) {
    const params: Record<string, string> = {};
    if (date) params.date = date;
    if (expiry) params.expiry = expiry;
    return this.makeRequest(`/stock/${ticker}/greek-flow`, { params });
  }

  async getStockMaxPain(ticker: string, date?: string) {
    const params: Record<string, string> = {};
    if (date) params.date = date;
    return this.makeRequest(`/stock/${ticker}/max-pain`, { params });
  }

  // Enhanced Net Premium Analysis with cumulative calculation
  async getStockNetPremTicksProcessed(ticker: string, date?: string) {
    try {
      const response: any = await this.getStockNetPremTicks(ticker, date);
      
      if (!response?.data?.data || !Array.isArray(response.data.data)) {
        return response;
      }

      const { data } = response.data;
      const fieldsToSum = [
        "net_call_premium",
        "net_call_volume", 
        "net_put_premium",
        "net_put_volume"
      ];

      let result: any[] = [];
      data.forEach((tick: any, idx: number) => {
        // Parse numeric values
        tick.net_call_premium = parseFloat(tick.net_call_premium || '0');
        tick.net_put_premium = parseFloat(tick.net_put_premium || '0');
        tick.net_call_volume = parseFloat(tick.net_call_volume || '0');
        tick.net_put_volume = parseFloat(tick.net_put_volume || '0');
        
        // Add cumulative data from previous tick
        if (idx !== 0) {
          fieldsToSum.forEach((field) => {
            tick[field] = tick[field] + result[idx - 1][field];
          });
        }
        
        result.push(tick);
      });

      return {
        ...response,
        data: {
          ...response.data,
          data: result
        }
      };
    } catch (error) {
      throw new UnusualWhalesAPIError(
        `Failed to get processed net premium ticks for ${ticker}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  // Congress Endpoints
  async getCongressRecentTrades(
    limit = 100, 
    offset = 0, 
    startDate?: string, 
    endDate?: string, 
    ticker?: string,
    congressMember?: string
  ) {
    const params: Record<string, string | number> = { limit, offset };
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    if (ticker) params.ticker = ticker;
    if (congressMember) params.congress_member = congressMember;
    return this.makeRequest('/congress/recent-trades', { params });
  }

  async getCongressTopTradedTickers(
    limit = 10,
    startDate?: string,
    endDate?: string
  ) {
    const params: Record<string, string | number> = { limit };
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    return this.makeRequest('/congress/top-traded-tickers', { params });
  }

  // Alerts Endpoints
  async getAlerts(
    configIds?: string[],
    intradayOnly = true,
    limit = 100,
    page = 0,
    notiTypes?: string[],
    tickerSymbols?: string
  ) {
    const params: Record<string, any> = {
      intraday_only: intradayOnly,
      limit,
      page
    };

    if (configIds?.length) {
      configIds.forEach((id, index) => {
        params[`config_ids[${index}]`] = id;
      });
    }

    if (notiTypes?.length) {
      notiTypes.forEach((type, index) => {
        params[`noti_types[${index}]`] = type;
      });
    }

    if (tickerSymbols) {
      params.ticker_symbols = tickerSymbols;
    }

    return this.makeRequest('/alerts', { params });
  }

  async getAlertConfigurations() {
    return this.makeRequest('/alerts/configuration');
  }

  // News Endpoints
  async getNewsHeadlines(
    limit = 50,
    page = 0,
    startDate?: string,
    endDate?: string,
    ticker?: string
  ) {
    const params: Record<string, string | number> = { limit, page };
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    if (ticker) params.ticker = ticker;
    return this.makeRequest('/news/headlines', { params });
  }

  // Institution Endpoints
  async getInstitutions() {
    return this.makeRequest('/institutions');
  }

  async getInstitutionHoldings(name: string) {
    return this.makeRequest(`/institution/${encodeURIComponent(name)}/holdings`);
  }

  async getInstitutionActivity(name: string) {
    return this.makeRequest(`/institution/${encodeURIComponent(name)}/activity`);
  }

  async getInstitutionSectors(name: string) {
    return this.makeRequest(`/institution/${encodeURIComponent(name)}/sectors`);
  }

  // ETF Endpoints
  async getETFInflowOutflow(ticker: string) {
    return this.makeRequest(`/etfs/${ticker}/in_outflow`);
  }

  // Shorts Endpoints
  async getShortsData(ticker: string) {
    return this.makeRequest(`/shorts/${ticker}/data`);
  }

  async getShortsVolumesByExchange(ticker: string) {
    return this.makeRequest(`/shorts/${ticker}/volumes-by-exchange`);
  }

  async getShortsFTDs(ticker: string) {
    return this.makeRequest(`/shorts/${ticker}/ftds`);
  }

  async getShortsInterestFloat(ticker: string) {
    return this.makeRequest(`/shorts/${ticker}/interest-float`);
  }

  async getShortsVolumeAndRatio(ticker: string) {
    return this.makeRequest(`/shorts/${ticker}/volume-and-ratio`);
  }

  // Additional Market Endpoints
  async getMarketFDACalendar(startDate?: string, endDate?: string) {
    const params: Record<string, string> = {};
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    return this.makeRequest('/market/fda-calendar', { params });
  }

  async getMarketOIChange(limit = 100, page = 0) {
    const params = { limit, page };
    return this.makeRequest('/market/oi-change', { params });
  }

  async getNetFlowExpiry(
    tickerSymbol?: string,
    tideType?: string,
    moneyness?: string,
    expiryCategory?: string
  ) {
    const params: Record<string, string> = {};
    if (tickerSymbol) params.ticker_symbol = tickerSymbol;
    if (tideType) params.tide_type = tideType;
    if (moneyness) params.moneyness = moneyness;
    if (expiryCategory) params.expiry_category = expiryCategory;
    return this.makeRequest('/net-flow/expiry', { params });
  }

  // Stock Advanced Endpoints
  async getStockInterpolatedIV(ticker: string, days?: number[]) {
    const params: Record<string, any> = {};
    if (days?.length) {
      days.forEach((day, index) => {
        params[`days[${index}]`] = day;
      });
    }
    return this.makeRequest(`/stock/${ticker}/interpolated-iv`, { params });
  }

  async getStockNOPE(ticker: string) {
    return this.makeRequest(`/stock/${ticker}/nope`);
  }

  async getStockSpotExposures(ticker: string, expiry?: string, strike?: number) {
    if (expiry && strike) {
      return this.makeRequest(`/stock/${ticker}/spot-exposures/expiry-strike`, {
        params: { expiry: expiry, strike: strike }
      });
    }
    return this.makeRequest(`/stock/${ticker}/spot-exposures`);
  }

  // Dark Pool / Off-Lit Endpoints
  async getDarkPoolData(
    ticker: string,
    startDate?: string,
    endDate?: string,
    minSize?: number,
    minPremium?: number
  ) {
    const params: Record<string, any> = {};
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    if (minSize) params.min_size = minSize;
    if (minPremium) params.min_premium = minPremium;
    return this.makeRequest(`/stock/${ticker}/darkpool`, { params });
  }

  // Group Flow Endpoints
  async getGroupFlowGreekFlow(flowGroup: string, expiry?: string) {
    const endpoint = expiry
      ? `/group-flow/${flowGroup}/greek-flow/${expiry}`
      : `/group-flow/${flowGroup}/greek-flow`;
    return this.makeRequest(endpoint);
  }

  // Institution Advanced Endpoints
  async getInstitutionLatestFilings(limit = 50, page = 0) {
    const params = { limit, page };
    return this.makeRequest('/institution/latest_filings', { params });
  }

  async getInstitutionOwnership(ticker: string) {
    return this.makeRequest(`/institution/${ticker}/ownership`);
  }
}

export const unusualWhalesAPI = UnusualWhalesAPI.getInstance();
export { UnusualWhalesAPIError };
