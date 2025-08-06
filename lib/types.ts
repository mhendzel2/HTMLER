
export interface Stock {
  id: string;
  ticker: string;
  companyName?: string;
  sector?: string;
  industry?: string;
  marketCap?: number;
  description?: string;
  exchange?: string;
  currency: string;
  isActive: boolean;
}

export interface Watchlist {
  id: string;
  name: string;
  description?: string;
  isDefault: boolean;
  isActive: boolean;
  userId: string;
  items: WatchlistItem[];
}

export interface WatchlistItem {
  id: string;
  watchlistId: string;
  stockId: string;
  position: number;
  notes?: string;
  stock: Stock;
}

export interface EarningsData {
  id: string;
  stockId: string;
  earningsDate: Date;
  reportTime?: string;
  fiscalQuarter?: string;
  fiscalYear?: number;
  epsEstimate?: number;
  epsActual?: number;
  epsSurprise?: number;
  epsSurprisePercent?: number;
  revenueEstimate?: number;
  revenueActual?: number;
  revenueSurprise?: number;
  revenueSurprisePercent?: number;
  expectedMove?: number;
  expectedMovePercent?: number;
  actualMove1d?: number;
  actualMove1w?: number;
  actualMove4w?: number;
}

export interface OptionsData {
  id: string;
  stockId: string;
  contractId: string;
  strike: number;
  expiry: Date;
  optionType: 'CALL' | 'PUT';
  volume?: number;
  openInterest?: number;
  premium?: number;
  impliedVolatility?: number;
  delta?: number;
  gamma?: number;
  theta?: number;
  vega?: number;
  unusualActivity: boolean;
  tradeDate: Date;
}

export interface PriceData {
  id: string;
  stockId: string;
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  adjustedClose?: number;
}

export interface MarketData {
  id: string;
  sector?: string;
  date: Date;
  netCallPremium?: number;
  netPutPremium?: number;
  netVolume?: number;
  timestamp: Date;
}

// Unusual Whales API Response Types
export interface UnusualWhalesApiResponse<T> {
  data: T;
  success: boolean;
  error?: string;
}

export interface EarningsApiData {
  ticker: string;
  actual_eps?: string;
  continent: string;
  country_code: string;
  country_name: string;
  ending_fiscal_quarter: string;
  expected_move?: string;
  expected_move_perc?: string;
  long_straddle_1d?: string;
  long_straddle_1w?: string;
  post_earnings_move_1d?: string;
  post_earnings_move_1w?: string;
  post_earnings_move_4w?: string;
  pre_earnings_move_1d?: string;
  pre_earnings_move_1w?: string;
  pre_earnings_move_4w?: string;
  time: string;
  trading_day: string;
  type: string;
}

export interface OptionContractApiData {
  contract_id: string;
  ticker: string;
  strike: number;
  expiry: string;
  option_type: string;
  volume?: number;
  open_interest?: number;
  premium?: number;
  iv?: number;
  delta?: number;
  gamma?: number;
  theta?: number;
  vega?: number;
}

export interface MarketTideApiData {
  date: string;
  net_call_premium: string;
  net_put_premium: string;
  net_volume: number;
  timestamp: string;
}

export interface CongressTradeApiData {
  date: string;
  ticker: string;
  asset_type: string;
  trade_type: string;
  amount: string;
  congress_member: string;
  house: string;
  party: string;
  disclosure_date: string;
}

// Dashboard State Types
export interface DashboardFilters {
  sectors: string[];
  dateRange: {
    start: Date;
    end: Date;
  };
  minVolume?: number;
  minPremium?: number;
  onlyUnusualActivity: boolean;
}

export interface AutoRefreshSettings {
  enabled: boolean;
  intervalMinutes: number;
}

// Chart Data Types
export interface ChartData {
  x: string | number;
  y: number;
  label?: string;
  color?: string;
}

export interface TimeSeriesData {
  timestamp: string;
  value: number;
  volume?: number;
}
