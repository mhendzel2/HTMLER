import { unusualWhalesAPI } from './unusual-whales-api';
import { FlowSentiment, FlowAlert, GreekFlow, NetPremiumTick, MaxPain } from './types';

export class FlowAnalysisService {
  private static instance: FlowAnalysisService;

  static getInstance(): FlowAnalysisService {
    if (!FlowAnalysisService.instance) {
      FlowAnalysisService.instance = new FlowAnalysisService();
    }
    return FlowAnalysisService.instance;
  }

  /**
   * Check if ticker has sufficient options volume for analysis
   */
  private async checkOptionsLiquidity(ticker: string): Promise<{ hasLiquidity: boolean; volume: number; premium: number }> {
    try {
      const response = await unusualWhalesAPI.getStockOptionsVolume(ticker, 1) as any;
      const data = response?.data?.data?.[0];
      
      if (data) {
        const totalVolume = parseFloat(data.total_volume || '0');
        const totalPremium = parseFloat(data.total_premium || '0');
        
        // Minimum thresholds for liquidity
        const MIN_VOLUME = 100; // minimum 100 contracts
        const MIN_PREMIUM = 10000; // minimum $10K premium
        
        const hasLiquidity = totalVolume >= MIN_VOLUME && totalPremium >= MIN_PREMIUM;
        
        return {
          hasLiquidity,
          volume: totalVolume,
          premium: totalPremium
        };
      }
      
      return { hasLiquidity: false, volume: 0, premium: 0 };
    } catch (error) {
      console.warn(`Failed to check options liquidity for ${ticker}:`, error);
      // Default to allowing analysis if we can't check liquidity
      return { hasLiquidity: true, volume: 0, premium: 0 };
    }
  }

  /**
   * Analyzes ticker flow sentiment using only flow alerts (rate limit optimized)
   */
  async analyzeTickerFlow(ticker: string): Promise<FlowSentiment> {
    try {
      // First check if ticker has sufficient options liquidity
      const liquidityCheck = await this.checkOptionsLiquidity(ticker);
      
      if (!liquidityCheck.hasLiquidity) {
        return {
          ticker,
          overall_sentiment: 'neutral',
          confidence_score: 15,
          metrics: {
            net_premium_ratio: 1,
            volume_ratio: 1,
            delta_flow: 0,
            gamma_exposure: 0,
            unusual_activity_score: 0,
            max_pain_distance: 0
          },
          breakdown: {
            bullish_signals: [],
            bearish_signals: [],
            key_levels: [],
            risk_factors: [`Low options liquidity (${liquidityCheck.volume} contracts, $${(liquidityCheck.premium/1000).toFixed(1)}K premium)`]
          },
          last_updated: new Date().toISOString()
        };
      }

      // Only fetch flow alerts to minimize API calls
      const alerts = await this.getFlowAlerts(ticker);

      // Calculate sentiment metrics from flow alerts only
      const metrics = this.calculateFlowMetricsFromAlerts(alerts, liquidityCheck);
      
      // Determine overall sentiment
      const sentiment = this.determineSentimentFromAlerts(metrics, alerts);
      
      // Generate breakdown
      const breakdown = this.generateBreakdownFromAlerts(alerts, metrics, liquidityCheck);

      return {
        ticker,
        overall_sentiment: sentiment.sentiment,
        confidence_score: sentiment.confidence,
        metrics,
        breakdown,
        last_updated: new Date().toISOString()
      };
    } catch (error) {
      console.error(`Flow analysis failed for ${ticker}:`, error);
      return this.getDefaultSentiment(ticker);
    }
  }

  private async getFlowAlerts(ticker: string): Promise<FlowAlert[]> {
    try {
      // Limit to 50 alerts to reduce API load
      const response = await unusualWhalesAPI.getStockFlowAlerts(ticker, true, true, 50) as any;
      return response?.data?.data || [];
    } catch (error) {
      console.warn(`Failed to get flow alerts for ${ticker}:`, error);
      return [];
    }
  }

  private calculateFlowMetricsFromAlerts(alerts: FlowAlert[], liquidityData?: { hasLiquidity: boolean; volume: number; premium: number }) {
    if (alerts.length === 0) {
      return {
        net_premium_ratio: 1,
        volume_ratio: 1,
        delta_flow: 0,
        gamma_exposure: 0,
        unusual_activity_score: 0,
        max_pain_distance: 0
      };
    }

    // Calculate premium and volume ratios from alerts
    const callAlerts = alerts.filter(alert => alert.option_type === 'call');
    const putAlerts = alerts.filter(alert => alert.option_type === 'put');

    const callPremium = callAlerts.reduce((sum, alert) => sum + alert.premium, 0);
    const putPremium = putAlerts.reduce((sum, alert) => sum + alert.premium, 0);
    const callVolume = callAlerts.reduce((sum, alert) => sum + alert.volume, 0);
    const putVolume = putAlerts.reduce((sum, alert) => sum + alert.volume, 0);

    const net_premium_ratio = putPremium > 0 ? callPremium / putPremium : callPremium > 0 ? 2 : 1;
    const volume_ratio = putVolume > 0 ? callVolume / putVolume : callVolume > 0 ? 2 : 1;

    // Estimate delta flow from alerts (approximate)
    const callDelta = callAlerts.reduce((sum, alert) => sum + (alert.delta * alert.premium), 0);
    const putDelta = putAlerts.reduce((sum, alert) => sum + (Math.abs(alert.delta) * alert.premium), 0);
    const delta_flow = callDelta - putDelta;

    // Estimate gamma exposure from alerts
    const gamma_exposure = alerts.reduce((sum, alert) => sum + (alert.gamma * alert.premium * 100), 0);

    // Average unusual score
    const unusual_activity_score = alerts.reduce((sum, alert) => sum + alert.unusual_score, 0) / alerts.length;

    // Max pain distance - not available from flow alerts alone
    const max_pain_distance = 0;

    return {
      net_premium_ratio,
      volume_ratio,
      delta_flow,
      gamma_exposure,
      unusual_activity_score,
      max_pain_distance
    };
  }

  private determineSentimentFromAlerts(metrics: any, alerts: FlowAlert[]): { sentiment: 'bullish' | 'bearish' | 'neutral', confidence: number } {
    let bullish_score = 0;
    let bearish_score = 0;
    let total_signals = 0;

    // Premium ratio analysis
    if (metrics.net_premium_ratio > 1.5) {
      bullish_score += 2;
      total_signals++;
    } else if (metrics.net_premium_ratio < 0.67) {
      bearish_score += 2;
      total_signals++;
    }

    // Volume ratio analysis
    if (metrics.volume_ratio > 1.3) {
      bullish_score += 1;
      total_signals++;
    } else if (metrics.volume_ratio < 0.77) {
      bearish_score += 1;
      total_signals++;
    }

    // Delta flow analysis (estimated from alerts)
    if (metrics.delta_flow > 100000) {
      bullish_score += 2;
      total_signals++;
    } else if (metrics.delta_flow < -100000) {
      bearish_score += 2;
      total_signals++;
    }

    // Unusual activity scoring
    if (metrics.unusual_activity_score > 70) {
      total_signals++;
      // Determine direction based on call vs put dominance
      if (metrics.net_premium_ratio > 1) {
        bullish_score += 1;
      } else {
        bearish_score += 1;
      }
    }

    // Recent alert timing analysis (more recent = higher weight)
    const recentAlerts = alerts
      .filter(alert => {
        const alertTime = new Date(alert.alert_time);
        const hoursAgo = (Date.now() - alertTime.getTime()) / (1000 * 60 * 60);
        return hoursAgo <= 2; // Last 2 hours
      });

    if (recentAlerts.length > 0) {
      const recentCallPremium = recentAlerts
        .filter(alert => alert.option_type === 'call')
        .reduce((sum, alert) => sum + alert.premium, 0);
      const recentPutPremium = recentAlerts
        .filter(alert => alert.option_type === 'put')
        .reduce((sum, alert) => sum + alert.premium, 0);

      if (recentCallPremium > recentPutPremium * 1.5) {
        bullish_score += 1;
        total_signals++;
      } else if (recentPutPremium > recentCallPremium * 1.5) {
        bearish_score += 1;
        total_signals++;
      }
    }

    // Determine final sentiment
    const net_score = bullish_score - bearish_score;
    const confidence = total_signals > 0 ? Math.min(90, Math.abs(net_score) * 15 + 10) : 10;

    if (net_score > 1) {
      return { sentiment: 'bullish', confidence };
    } else if (net_score < -1) {
      return { sentiment: 'bearish', confidence };
    } else {
      return { sentiment: 'neutral', confidence: Math.max(10, confidence - 20) };
    }
  }

  private generateBreakdownFromAlerts(alerts: FlowAlert[], metrics: any, liquidityData?: { hasLiquidity: boolean; volume: number; premium: number }) {
    const bullish_signals: string[] = [];
    const bearish_signals: string[] = [];
    const risk_factors: string[] = [];
    const key_levels: number[] = [];

    // Add liquidity information to risk factors if relevant
    if (liquidityData && liquidityData.volume > 0) {
      if (liquidityData.volume < 500) {
        risk_factors.push(`Moderate options volume (${liquidityData.volume} contracts)`);
      } else if (liquidityData.volume > 2000) {
        bullish_signals.push(`High options liquidity (${liquidityData.volume} contracts)`);
      }
    }

    // Analyze premium flow
    if (metrics.net_premium_ratio > 1.5) {
      bullish_signals.push(`Call premium dominance (${metrics.net_premium_ratio.toFixed(2)}:1 ratio)`);
    } else if (metrics.net_premium_ratio < 0.67) {
      bearish_signals.push(`Put premium dominance (${(1/metrics.net_premium_ratio).toFixed(2)}:1 ratio)`);
    }

    // Analyze volume
    if (metrics.volume_ratio > 1.3) {
      bullish_signals.push(`Call volume advantage (${metrics.volume_ratio.toFixed(2)}:1 ratio)`);
    } else if (metrics.volume_ratio < 0.77) {
      bearish_signals.push(`Put volume advantage (${(1/metrics.volume_ratio).toFixed(2)}:1 ratio)`);
    }

    // Delta flow analysis
    if (metrics.delta_flow > 100000) {
      bullish_signals.push(`Positive delta flow (+$${(metrics.delta_flow/1000).toFixed(0)}K)`);
    } else if (metrics.delta_flow < -100000) {
      bearish_signals.push(`Negative delta flow (-$${Math.abs(metrics.delta_flow/1000).toFixed(0)}K)`);
    }

    // High unusual activity
    if (metrics.unusual_activity_score > 70) {
      risk_factors.push(`Elevated unusual options activity (${metrics.unusual_activity_score.toFixed(0)}%)`);
    }

    // Recent activity analysis
    const recentAlerts = alerts.filter(alert => {
      const alertTime = new Date(alert.alert_time);
      const hoursAgo = (Date.now() - alertTime.getTime()) / (1000 * 60 * 60);
      return hoursAgo <= 1; // Last hour
    });

    if (recentAlerts.length > 0) {
      risk_factors.push(`${recentAlerts.length} alerts in the last hour`);
    }

    // Extract popular strikes from alerts
    const popularStrikes = this.getPopularStrikes(alerts);
    key_levels.push(...popularStrikes);

    return {
      bullish_signals,
      bearish_signals,
      key_levels: [...new Set(key_levels)].sort((a, b) => a - b).slice(0, 5),
      risk_factors
    };
  }

  /**
   * Pre-filter tickers by options liquidity before analysis
   */
  async filterTickersByLiquidity(tickers: string[]): Promise<{ liquid: string[], illiquid: string[] }> {
    const liquid: string[] = [];
    const illiquid: string[] = [];
    
    // Check liquidity in small batches to avoid rate limits
    const batchSize = 5;
    for (let i = 0; i < Math.min(tickers.length, 15); i += batchSize) { // Limit to first 15 tickers
      const batch = tickers.slice(i, i + batchSize);
      const promises = batch.map(async (ticker) => {
        const liquidityCheck = await this.checkOptionsLiquidity(ticker);
        return { ticker, hasLiquidity: liquidityCheck.hasLiquidity };
      });
      
      try {
        const results = await Promise.all(promises);
        results.forEach(({ ticker, hasLiquidity }) => {
          if (hasLiquidity) {
            liquid.push(ticker);
          } else {
            illiquid.push(ticker);
          }
        });
      } catch (error) {
        console.error('Liquidity filtering failed for batch:', batch, error);
        // Default to allowing analysis for failed batch
        liquid.push(...batch);
      }

      // Rate limiting delay
      if (i + batchSize < Math.min(tickers.length, 15)) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return { liquid, illiquid };
  }

  /**
   * Batch analyze multiple tickers for efficiency (rate limit optimized)
   */
  async analyzeBatch(tickers: string[]): Promise<Record<string, FlowSentiment>> {
    const results: Record<string, FlowSentiment> = {};
    
    // Pre-filter by liquidity to avoid wasting API calls
    console.log('Filtering tickers by options liquidity...');
    const { liquid: liquidTickers, illiquid: illiquidTickers } = await this.filterTickersByLiquidity(tickers);
    
    // Add default sentiments for illiquid tickers
    illiquidTickers.forEach(ticker => {
      results[ticker] = {
        ticker,
        overall_sentiment: 'neutral',
        confidence_score: 15,
        metrics: {
          net_premium_ratio: 1,
          volume_ratio: 1,
          delta_flow: 0,
          gamma_exposure: 0,
          unusual_activity_score: 0,
          max_pain_distance: 0
        },
        breakdown: {
          bullish_signals: [],
          bearish_signals: [],
          key_levels: [],
          risk_factors: ['Insufficient options liquidity for analysis']
        },
        last_updated: new Date().toISOString()
      };
    });
    
    // Process liquid tickers in smaller batches
    console.log(`Analyzing ${liquidTickers.length} liquid tickers...`);
    const batchSize = 2; // Very conservative batch size
    for (let i = 0; i < liquidTickers.length; i += batchSize) {
      const batch = liquidTickers.slice(i, i + batchSize);
      const promises = batch.map(ticker => this.analyzeTickerFlow(ticker));
      
      try {
        const batchResults = await Promise.all(promises);
        batchResults.forEach((result, index) => {
          results[batch[index]] = result;
        });
      } catch (error) {
        console.error('Batch analysis failed:', error);
        // Add default sentiments for failed batch
        batch.forEach(ticker => {
          results[ticker] = this.getDefaultSentiment(ticker);
        });
      }

      // Longer delay between batches to respect rate limits
      if (i + batchSize < liquidTickers.length) {
        await new Promise(resolve => setTimeout(resolve, 3000)); // 3 second delay
      }
    }

    return results;
  }

  private getPopularStrikes(alerts: FlowAlert[]): number[] {
    const strikeFrequency = alerts.reduce((acc, alert) => {
      acc[alert.strike] = (acc[alert.strike] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    return Object.entries(strikeFrequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([strike]) => Number(strike));
  }

  private getDefaultSentiment(ticker: string): FlowSentiment {
    return {
      ticker,
      overall_sentiment: 'neutral',
      confidence_score: 10,
      metrics: {
        net_premium_ratio: 1,
        volume_ratio: 1,
        delta_flow: 0,
        gamma_exposure: 0,
        unusual_activity_score: 0,
        max_pain_distance: 0
      },
      breakdown: {
        bullish_signals: [],
        bearish_signals: [],
        key_levels: [],
        risk_factors: ['Insufficient data for analysis']
      },
      last_updated: new Date().toISOString()
    };
  }
}

export const flowAnalysisService = FlowAnalysisService.getInstance();
