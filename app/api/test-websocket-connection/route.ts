import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Testing WebSocket connection...');
    
    const API_KEY = process.env.UNUSUAL_WHALES_API_KEY;
    if (!API_KEY) {
      return NextResponse.json({ 
        success: false,
        error: 'No API key found',
        timestamp: new Date().toISOString()
      });
    }

    // Test the socket endpoints to verify WebSocket access
    const testResults = [];
    const endpoints = [
      '/api/socket/gex',
      '/api/socket/price'
    ];

    for (const endpoint of endpoints) {
      try {
        console.log(`Testing ${endpoint}...`);
        const response = await fetch(`https://api.unusualwhales.com${endpoint}`, {
          headers: {
            'Authorization': `Bearer ${API_KEY}`,
            'Accept': 'application/json'
          }
        });

        const responseText = await response.text();
        console.log(`${endpoint} - Status: ${response.status}, Response: ${responseText.substring(0, 100)}`);
        
        testResults.push({
          endpoint,
          status: response.status,
          success: response.status === 200,
          hasData: responseText.includes('"data"'),
          response: responseText.substring(0, 200)
        });
      } catch (error) {
        console.error(`Error testing ${endpoint}:`, error);
        testResults.push({
          endpoint,
          status: 0,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const hasWebSocketAccess = testResults.some(result => result.success && result.hasData);
    
    // Get current market status
    const now = new Date();
    const est = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
    const hour = est.getHours();
    const day = est.getDay();
    
    const isWeekday = day >= 1 && day <= 5;
    const isMarketHours = hour >= 9.5 && hour < 16;
    const isPremarket = hour >= 4 && hour < 9.5;
    const isAftermarket = hour >= 16 && hour < 20;
    
    let marketStatus = '';
    if (!isWeekday) {
      marketStatus = 'WEEKEND';
    } else if (isMarketHours) {
      marketStatus = 'MARKET_HOURS';
    } else if (isPremarket) {
      marketStatus = 'PREMARKET';
    } else if (isAftermarket) {
      marketStatus = 'AFTERMARKET';
    } else {
      marketStatus = 'OVERNIGHT';
    }

    return NextResponse.json({
      websocket_test: {
        hasAccess: hasWebSocketAccess,
        apiKeyPresent: true,
        apiKeyLength: API_KEY.length,
        endpoints: testResults,
        marketInfo: {
          currentTime: est.toLocaleString(),
          marketStatus,
          isWeekday,
          expectedActivity: isMarketHours ? 'HIGH' : (isPremarket || isAftermarket) ? 'MODERATE' : 'LOW'
        },
        recommendation: hasWebSocketAccess 
          ? `WebSocket access confirmed. ${marketStatus === 'MARKET_HOURS' ? 'Expect active data flow.' : 'Limited activity expected outside market hours.'}`
          : 'WebSocket access denied. Check API subscription or contact support.'
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('WebSocket test error:', error);
    return NextResponse.json({ 
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
