import { tradingFilters } from '@/lib/trading-filters';

console.log('🧪 Mock flow alerts module loaded');

// Mock flow alert data for testing
const mockFlowAlerts = [
  {
    ticker: 'AAPL',
    total_premium: 750000, // $750K - should match big-money-otm filter
    total_size: 150,
    price: 5.00,
    underlying_price: 180.50,
    strike: 185,
    expiry: '2024-12-20',
    type: 'call',
    side: 'ask',
    executed_at: Date.now(),
    has_sweep: true,
    aggressiveness: 'sweep'
  },
  {
    ticker: 'TSLA', 
    total_premium: 300000, // $300K - should match dark-pool-correlation
    total_size: 600,
    price: 2.50,
    underlying_price: 200.00,
    strike: 195,
    expiry: '2024-11-15',
    type: 'put',
    side: 'ask',
    executed_at: Date.now(),
    has_floor: true,
    aggressiveness: 'block'
  },
  {
    ticker: 'SPY',
    total_premium: 150000, // $150K - should match aggressive-short-term
    total_size: 200,
    price: 3.00,
    underlying_price: 450.00,
    strike: 455,
    expiry: '2024-10-25', // 7 days out
    type: 'call',
    side: 'ask',
    executed_at: Date.now(),
    has_sweep: true,
    aggressiveness: 'sweep'
  },
  {
    ticker: 'QQQ',
    total_premium: 25000, // $25K - too small, shouldn't match any filter
    total_size: 50,
    price: 1.00,
    underlying_price: 380.00,
    strike: 382,
    expiry: '2024-11-01',
    type: 'call',
    side: 'ask',
    executed_at: Date.now(),
    aggressiveness: 'split'
  }
];

export function injectMockFlowAlerts() {
  console.log('🧪 injectMockFlowAlerts function called!');
  console.log('🧪 Injecting mock flow alerts for testing...');
  
  // Simulate WebSocket messages arriving
  mockFlowAlerts.forEach((alert, index) => {
    setTimeout(() => {
      console.log(`🧪 Injecting mock alert ${index + 1}:`, alert.ticker, alert.total_premium);
      
      // Simulate the WebSocket callback directly
      // This mimics what happens when unusualWhalesWS.subscribe('flow-alerts', callback) is called
      const mockWebSocketData = {
        channel: 'flow-alerts',
        payload: alert,
        timestamp: Date.now()
      };
      
      // Access the private methods using bracket notation (TypeScript workaround)
      const systemInstance = tradingFilters as any;
      const normalizedAlert = systemInstance.normalizeFlowAlert(alert);
      systemInstance.processFlowAlert(normalizedAlert);
      
    }, index * 2000); // Spread out over 8 seconds
  });
}

// Also export individual test functions
export function testBigMoneyFilter() {
  console.log('🧪 testBigMoneyFilter function called!');
  console.log('🧪 Testing Big Money OTM filter with AAPL $750K call...');
  const alert = mockFlowAlerts[0];
  const systemInstance = tradingFilters as any;
  const normalizedAlert = systemInstance.normalizeFlowAlert(alert);
  systemInstance.processFlowAlert(normalizedAlert);
}

export function testDarkPoolFilter() {
  console.log('🧪 testDarkPoolFilter function called!');
  console.log('🧪 Testing Dark Pool Correlation filter with TSLA $300K put...');
  const alert = mockFlowAlerts[1];
  const systemInstance = tradingFilters as any;
  const normalizedAlert = systemInstance.normalizeFlowAlert(alert);
  systemInstance.processFlowAlert(normalizedAlert);
}

export function testAggressiveShortTermFilter() {
  console.log('🧪 testAggressiveShortTermFilter function called!');
  console.log('🧪 Testing Aggressive Short-Term filter with SPY $150K call...');
  const alert = mockFlowAlerts[2];
  const systemInstance = tradingFilters as any;
  const normalizedAlert = systemInstance.normalizeFlowAlert(alert);
  systemInstance.processFlowAlert(normalizedAlert);
}

export function testSmallAlert() {
  console.log('🧪 testSmallAlert function called!');
  console.log('🧪 Testing small alert that should NOT match any filter...');
  const alert = mockFlowAlerts[3];
  const systemInstance = tradingFilters as any;
  const normalizedAlert = systemInstance.normalizeFlowAlert(alert);
  systemInstance.processFlowAlert(normalizedAlert);
}
