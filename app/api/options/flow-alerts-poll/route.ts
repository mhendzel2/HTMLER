import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = 'https://api.unusualwhales.com/api';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const volumeThreshold = parseInt(searchParams.get('volume_threshold') || '50');
  const tickers = searchParams.get('tickers')?.split(',') || ['AAPL', 'TSLA', 'NVDA', 'MSFT', 'SPY', 'QQQ', 'IWM'];

  try {
    // Since we don't have direct access to flow alerts API, we'll use flow-alerts endpoint for each ticker
    const flowAlertsPromises = tickers.map(async (ticker) => {
      try {
        const response = await fetch(`${API_BASE_URL}/options/${ticker}/flow-alerts`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.UNUSUAL_WHALES_API_KEY}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          // Transform the data to match flow alert format and filter by volume
          return (data.data || [])
            .filter((alert: any) => (alert.volume || alert.size || 0) >= volumeThreshold)
            .map((alert: any) => ({
              rule_id: alert.rule_id || `alert-${Date.now()}-${Math.random()}`,
              rule_name: alert.rule_name || 'FlowAlert',
              ticker: ticker,
              option_chain: alert.option_symbol || alert.option_chain,
              underlying_price: alert.underlying_price || 0,
              volume: alert.volume || alert.size || 0,
              total_size: alert.total_size || alert.size || 0,
              total_premium: alert.total_premium || alert.premium || 0,
              total_ask_side_prem: alert.total_ask_side_prem || 0,
              total_bid_side_prem: alert.total_bid_side_prem || 0,
              start_time: alert.start_time || Date.now(),
              end_time: alert.end_time || Date.now(),
              price: alert.price || 0,
              has_multileg: alert.has_multileg || false,
              has_sweep: alert.has_sweep || alert.tags?.includes('sweep') || false,
              has_floor: alert.has_floor || false,
              open_interest: alert.open_interest || 0,
              all_opening_trades: alert.all_opening_trades || false,
              id: alert.id || `${ticker}-${Date.now()}`,
              has_singleleg: alert.has_singleleg || true,
              volume_oi_ratio: alert.volume_oi_ratio || 0,
              trade_ids: alert.trade_ids || [],
              trade_count: alert.trade_count || 1,
              expiry_count: alert.expiry_count || 1,
              executed_at: alert.executed_at || Date.now(),
              ask_vol: alert.ask_vol || 0,
              bid_vol: alert.bid_vol || 0,
              no_side_vol: alert.no_side_vol || 0,
              mid_vol: alert.mid_vol || 0,
              multi_vol: alert.multi_vol || 0,
              stock_multi_vol: alert.stock_multi_vol || 0,
              upstream_condition_details: alert.upstream_condition_details || [],
              exchanges: alert.exchanges || [],
              bid: alert.bid?.toString() || '0',
              ask: alert.ask?.toString() || '0'
            }));
        }
      } catch (error) {
        console.error(`Failed to fetch flow alerts for ${ticker}:`, error);
      }
      return [];
    });

    const allFlowAlerts = await Promise.all(flowAlertsPromises);
    const flattenedAlerts = allFlowAlerts.flat();
    
    // Sort by executed_at timestamp (most recent first)
    flattenedAlerts.sort((a, b) => b.executed_at - a.executed_at);
    
    // Limit to most recent 100 alerts
    const recentAlerts = flattenedAlerts.slice(0, 100);
    
    return NextResponse.json(recentAlerts);
  } catch (error) {
    console.error('Error fetching flow alerts:', error);
    return NextResponse.json({ error: 'Failed to fetch flow alerts' }, { status: 500 });
  }
}
