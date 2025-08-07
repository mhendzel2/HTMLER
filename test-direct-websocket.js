// Test HTTP access to Unusual Whales API endpoints
console.log('\u{1F50D} Testing HTTP connection to Unusual Whales...');

const API_KEY = process.env.UNUSUAL_WHALES_API_KEY;
if (!API_KEY) {
  console.error('❌ UNUSUAL_WHALES_API_KEY not found in environment');
  process.exit(1);
}

async function testHTTPFlowAlerts(ticker) {
  const url = `https://api.unusualwhales.com/api/options/${ticker}/flow-alerts`;
  console.log(`\n🔌 Fetching: ${url}`);
  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        Accept: 'application/json'
      }
    });
    if (!response.ok) {
      console.log(`❌ HTTP ${response.status}: ${response.statusText}`);
      return;
    }
    const data = await response.json();
    const count = Array.isArray(data.data) ? data.data.length : Array.isArray(data) ? data.length : 0;
    console.log(`✅ Received ${count} alerts for ${ticker}`);
  } catch (error) {
    console.log('❌ Request failed:', error.message);
  }
}

async function main() {
  const tickers = ['AAPL', 'TSLA', 'NVDA', 'MSFT', 'SPY', 'QQQ', 'IWM'];
  for (const ticker of tickers) {
    await testHTTPFlowAlerts(ticker);
  }
  console.log('\n\u{1F3C1} HTTP testing complete!');
}

main();
