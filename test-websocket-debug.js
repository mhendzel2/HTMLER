// Simple test to debug WebSocket flow alerts
const { WebSocket } = require('ws');
const API_KEY = process.env.UNUSUAL_WHALES_API_KEY || 'your-api-key';

console.log('Testing WebSocket connection...');

// Test actual WebSocket connection
const ws = new WebSocket('wss://api.unusualwhales.com/ws', {
  headers: {
    'Authorization': `Bearer ${API_KEY}`
  }
});

ws.on('open', function open() {
  console.log('✅ WebSocket connected');
  
  // Subscribe to flow-alerts channel
  ws.send(JSON.stringify({ 
    action: 'subscribe',
    channel: 'flow-alerts'
  }));
  
  console.log('📡 Subscribed to flow-alerts channel');
});

ws.on('message', function message(data) {
  try {
    const parsed = JSON.parse(data.toString());
    console.log('📨 Raw WebSocket message:', JSON.stringify(parsed, null, 2));
    
    // Log specifically flow-alerts messages
    if (Array.isArray(parsed) && parsed[0] === 'flow-alerts') {
      console.log('🎯 FLOW ALERT DETECTED:', JSON.stringify(parsed[1], null, 2));
      console.log('Premium:', parsed[1].total_premium || parsed[1].premium);
      console.log('Ticker:', parsed[1].ticker);
      console.log('Type:', parsed[1].type);
      console.log('Side:', parsed[1].side || 'unknown');
    }
  } catch (e) {
    console.log('📨 Raw data (non-JSON):', data.toString());
  }
});

ws.on('error', function error(err) {
  console.error('❌ WebSocket error:', err);
});

ws.on('close', function close() {
  console.log('🔌 WebSocket connection closed');
});

// Keep alive for 60 seconds to catch some messages
setTimeout(() => {
  console.log('⏰ Test timeout - closing connection');
  ws.close();
}, 60000);
