// Direct WebSocket test to diagnose connection issues
console.log('🔍 Testing WebSocket connection to Unusual Whales...');

// Check if we have the necessary environment variables
const API_KEY = process.env.UNUSUAL_WHALES_API_KEY;
if (!API_KEY) {
  console.error('❌ UNUSUAL_WHALES_API_KEY not found in environment');
  process.exit(1);
}

console.log('✅ API Key found, testing connection...');

// Test different WebSocket URLs
const testUrls = [
  `wss://api.unusualwhales.com/ws?api_key=${API_KEY}`,
  `wss://api.unusualwhales.com/ws`,
  'wss://api.unusualwhales.com/socket',
  'wss://stream.unusualwhales.com/ws'
];

async function testWebSocketURL(url, useHeaders = false) {
  return new Promise((resolve) => {
    console.log(`\n🔌 Testing: ${url.replace(API_KEY, 'API_KEY')}`);
    
    const options = {};
    if (useHeaders && !url.includes('api_key=')) {
      options.headers = {
        'Authorization': `Bearer ${API_KEY}`,
        'Origin': 'https://app.unusualwhales.com'
      };
      console.log('📋 Using Authorization header');
    }
    
    const ws = new (require('ws'))(url, options);
    
    const timeout = setTimeout(() => {
      console.log('⏰ Connection timeout (10s)');
      ws.close();
      resolve({ success: false, error: 'Timeout' });
    }, 10000);
    
    ws.on('open', () => {
      console.log('✅ Connected successfully!');
      clearTimeout(timeout);
      
      // Try to subscribe to flow-alerts
      try {
        ws.send(JSON.stringify({
          action: 'subscribe',
          channel: 'flow-alerts'
        }));
        console.log('📡 Sent subscription to flow-alerts');
        
        // Wait a bit for messages
        setTimeout(() => {
          ws.close();
          resolve({ success: true, error: null });
        }, 3000);
        
      } catch (e) {
        console.log('❌ Failed to send subscription:', e.message);
        ws.close();
        resolve({ success: false, error: e.message });
      }
    });
    
    ws.on('message', (data) => {
      try {
        const parsed = JSON.parse(data.toString());
        console.log('📨 Received message:', JSON.stringify(parsed, null, 2));
      } catch (e) {
        console.log('📨 Received raw data:', data.toString());
      }
    });
    
    ws.on('error', (error) => {
      console.log('❌ Connection error:', error.message);
      clearTimeout(timeout);
      resolve({ success: false, error: error.message });
    });
    
    ws.on('close', (code, reason) => {
      console.log(`🔌 Connection closed: ${code} - ${reason || 'No reason'}`);
      clearTimeout(timeout);
      if (!timeout._destroyed) {
        resolve({ success: false, error: `Closed: ${code}` });
      }
    });
  });
}

async function testMarketHours() {
  const now = new Date();
  const est = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
  const hour = est.getHours();
  const day = est.getDay(); // 0 = Sunday, 6 = Saturday
  
  console.log(`\n📅 Current time: ${est.toLocaleString()} EST`);
  console.log(`📅 Day of week: ${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][day]}`);
  
  // Market hours: 9:30 AM - 4:00 PM EST, Monday-Friday
  const isWeekday = day >= 1 && day <= 5;
  const isMarketHours = hour >= 9.5 && hour < 16;
  const isPremarket = hour >= 4 && hour < 9.5;
  const isAftermarket = hour >= 16 && hour < 20;
  
  console.log(`📊 Market Status:`);
  console.log(`   Weekday: ${isWeekday ? '✅' : '❌'}`);
  console.log(`   Market Hours (9:30-4:00): ${isMarketHours ? '✅' : '❌'}`);
  console.log(`   Pre-market (4:00-9:30): ${isPremarket ? '✅' : '❌'}`);
  console.log(`   After-market (4:00-8:00): ${isAftermarket ? '✅' : '❌'}`);
  
  if (!isWeekday) {
    console.log('⚠️  WEEKEND: Limited WebSocket activity expected');
  } else if (!isMarketHours && !isPremarket && !isAftermarket) {
    console.log('⚠️  OVERNIGHT: Limited WebSocket activity expected');
  } else {
    console.log('✅ ACTIVE TRADING PERIOD: WebSocket should have activity');
  }
  
  return { isWeekday, isMarketHours, isPremarket, isAftermarket };
}

async function main() {
  try {
    // Test market hours first
    const marketStatus = await testMarketHours();
    
    // Test different WebSocket URLs
    for (const url of testUrls) {
      await testWebSocketURL(url, false);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait between tests
    }
    
    // Test with headers
    console.log('\n🔄 Testing with Authorization headers...');
    await testWebSocketURL('wss://api.unusualwhales.com/ws', true);
    
    console.log('\n🏁 WebSocket testing complete!');
    
    if (!marketStatus.isWeekday || (!marketStatus.isMarketHours && !marketStatus.isPremarket && !marketStatus.isAftermarket)) {
      console.log('\n💡 RECOMMENDATION: If connections succeed but no data flows, this may be normal outside trading hours.');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

main();
