// Simple test to debug flow alerts using HTTP API instead of WebSocket
const API_KEY = process.env.UNUSUAL_WHALES_API_KEY || 'your-api-key';

async function fetchFlowAlerts(ticker = 'AAPL') {
  console.log(`Fetching flow alerts for ${ticker} via HTTP...`);
  try {
    const response = await fetch(`https://api.unusualwhales.com/api/options/${ticker}/flow-alerts`, {
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        Accept: 'application/json'
      }
    });

    if (!response.ok) {
      console.error('HTTP error:', response.status, response.statusText);
      return;
    }

    const data = await response.json();
    console.log('Received flow alerts:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Request failed:', error);
  }
}

fetchFlowAlerts();
