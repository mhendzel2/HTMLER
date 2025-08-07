import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = 'https://api.unusualwhales.com/api';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbols = searchParams.get('symbols') || 'AAPL,TSLA,NVDA,AMD,MSFT,SPY,QQQ';
  const limit = parseInt(searchParams.get('limit') || '50');

  try {
    console.log('Fetching real-time flow alerts for symbols:', symbols);

    // Split symbols and fetch alerts for each
    const tickers = symbols.split(',').map(s => s.trim());
    const alertsPromises = tickers.map(async (ticker) => {
      try {
        console.log(`Fetching alerts for ${ticker}...`);
        
        // Use the options endpoint which returns flow data
        const response = await fetch(`${API_BASE_URL}/options/${ticker}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.UNUSUAL_WHALES_API_KEY}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          console.log(`Got ${data.data?.length || 0} alerts for ${ticker}`);
          
          // Filter for significant premium and recent activity
          return (data.data || [])
            .filter((alert: any) => {
              const premium = alert.total_premium || 0;
              const volume = alert.volume || 0;
              const timestamp = alert.executed_at || alert.created_at;
              
              // Only include alerts with significant premium and volume
              return premium > 25000 && volume > 50;
            })
            .map((alert: any) => ({
              ...alert,
              processed_at: Date.now(),
              source: 'api',
              filter_matches: analyzeAlert(alert)
            }));
        } else {
          console.error(`Failed to fetch alerts for ${ticker}: ${response.status}`);
          return [];
        }
      } catch (error) {
        console.error(`Error fetching alerts for ${ticker}:`, error);
        return [];
      }
    });

    const allAlerts = await Promise.all(alertsPromises);
    const flattenedAlerts = allAlerts.flat();
    
    // Sort by total premium (descending) and timestamp (most recent first)
    flattenedAlerts.sort((a, b) => {
      const premiumDiff = (b.total_premium || 0) - (a.total_premium || 0);
      if (premiumDiff !== 0) return premiumDiff;
      return (b.executed_at || b.created_at || 0) - (a.executed_at || a.created_at || 0);
    });
    
    // Apply limit
    const limitedAlerts = flattenedAlerts.slice(0, limit);
    
    console.log(`Returning ${limitedAlerts.length} filtered flow alerts`);
    
    return NextResponse.json({
      data: limitedAlerts,
      metadata: {
        total_alerts: limitedAlerts.length,
        symbols_requested: tickers,
        timestamp: Date.now(),
        has_websocket_access: false,
        polling_interval: 10000
      }
    });

  } catch (error) {
    console.error('Error in flow alerts API:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch flow alerts', 
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}

/**
 * Analyze an alert to determine which filters it matches
 */
function analyzeAlert(alert: any): string[] {
  const matches = [];
  const premium = alert.total_premium || 0;
  const volume = alert.volume || 0;
  const askPrem = alert.total_ask_side_prem || 0;
  const bidPrem = alert.total_bid_side_prem || 0;
  
  // Determine if this is ask-side (aggressive buying)
  const isAskSide = askPrem > bidPrem;
  
  // Calculate DTE
  const expiryDate = new Date(alert.expiry);
  const now = new Date();
  const dte = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  // Determine aggressiveness
  const isSweep = alert.has_sweep;
  const isBlock = alert.has_floor || premium > 500000;
  
  // Big Money Filter ($500K+, ask-side, OTM)
  if (premium >= 500000 && isAskSide) {
    matches.push('big-money');
  }
  
  // Aggressive Short-Term (0-14 DTE, $100K+, sweeps)
  if (premium >= 100000 && dte <= 14 && isSweep && isAskSide) {
    matches.push('aggressive-short-term');
  }
  
  // Dark Pool Correlation ($250K+, blocks, large size)
  if (premium >= 250000 && (isBlock || volume > 500)) {
    matches.push('dark-pool');
  }
  
  // Gamma Squeeze (calls, ask-side, OTM, near-term)
  if (alert.type === 'call' && isAskSide && dte <= 30 && premium >= 50000) {
    matches.push('gamma-squeeze');
  }
  
  return matches;
}
