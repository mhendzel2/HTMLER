
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

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, this.rateLimitDelay));

    const url = this.buildUrl(endpoint, params);
    
    try {
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
    }
  }

  // Market Endpoints
  async getMarketTide(sector?: string, date?: string) {
    const endpoint = sector ? `/market/${sector}/sector-tide` : '/market/tide';
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

  async getEarningsCalendar(startDate?: string, endDate?: string) {
    const params: Record<string, string> = {};
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    return this.makeRequest('/earnings/calendar', { params });
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
    return this.makeRequest(`/stock/${ticker}/options`);
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

  async getStockGreekFlow(ticker: string, expiry?: string) {
    const endpoint = expiry 
      ? `/stock/${ticker}/greek-flow/${expiry}`
      : `/stock/${ticker}/greek-flow`;
    return this.makeRequest(endpoint);
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
