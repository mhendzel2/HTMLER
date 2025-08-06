import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const API_BASE_URL = process.env.UNUSUAL_WHALES_API_BASE_URL || 'https://api.unusualwhales.com';
    const API_KEY = process.env.UNUSUAL_WHALES_API_KEY;

    if (!API_KEY) {
      return NextResponse.json({ 
        error: 'API key not configured',
        hasWebSocketScope: false 
      }, { status: 500 });
    }

    console.log('Testing WebSocket access...');

    // Test the socket endpoints as documented
    const testEndpoints = [
      '/api/socket/gex',
      '/api/socket/price'
    ];

    const results = [];
    let hasAccess = false;

    for (const endpoint of testEndpoints) {
      try {
        console.log(`Testing endpoint: ${API_BASE_URL}${endpoint}`);
        
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${API_KEY}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });

        const responseText = await response.text();
        
        console.log(`Endpoint ${endpoint} - Status: ${response.status}, Response: ${responseText.substring(0, 100)}`);
        
        // WebSocket endpoints return 200 with {"data":[]} when accessible
        const isAccessible = response.status === 200 && responseText.includes('"data"');
        if (isAccessible) hasAccess = true;
        
        results.push({
          endpoint,
          status: response.status,
          statusText: response.statusText,
          accessible: isAccessible,
          response: responseText.substring(0, 200) // Limit response length
        });
        
      } catch (error) {
        console.error(`Error testing ${endpoint}:`, error);
        results.push({
          endpoint,
          status: 0,
          statusText: 'Network Error',
          accessible: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({
      hasWebSocketScope: hasAccess,
      testResults: results,
      message: hasAccess 
        ? 'WebSocket endpoints are accessible - real-time data streaming available!' 
        : 'WebSocket endpoints are not accessible - contact support@unusualwhales.com',
      availableChannels: hasAccess ? [
        'gex_strike_expiry:<TICKER>',
        'gex:TICKER', 
        'gex_strike:TICKER',
        'price:TICKER',
        'flow-alerts',
        'news'
      ] : []
    });

  } catch (error) {
    console.error('WebSocket test API error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      hasWebSocketScope: false 
    }, { status: 500 });
  }
}
