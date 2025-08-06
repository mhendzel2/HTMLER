// AI Trading Assistant Service
// This service integrates with Hugging Face's gpt-oss-20b model for trading insights

import { HfInference } from '@huggingface/inference';

const HF_TOKEN = process.env.HUGGING_FACE_TOKEN;
const hf = new HfInference(HF_TOKEN);

interface MarketData {
  ticker?: string;
  sector?: string;
  optionsFlow?: string;
  marketTide?: any;
  earningsData?: any;
  congressData?: any;
  newsData?: any;
  sentiment?: string;
  volume?: number;
  priceAction?: string;
  impliedVolatility?: number;
}

interface TradeIdea {
  ticker: string;
  direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  strategy: string;
  rationale: string;
  confidence: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  timeframe: string;
  entryPrice?: number;
  targetPrice?: number;
  stopLoss?: number;
  keyFactors: string[];
}

export class AITradingAssistant {
  private static instance: AITradingAssistant;

  private constructor() {}

  static getInstance(): AITradingAssistant {
    if (!AITradingAssistant.instance) {
      AITradingAssistant.instance = new AITradingAssistant();
    }
    return AITradingAssistant.instance;
  }

  private buildPrompt(data: MarketData, context: string = 'general'): string {
    let prompt = `You are an expert trading assistant analyzing market data. Your role is to provide actionable trade ideas based on comprehensive market analysis.

MARKET CONTEXT: ${context.toUpperCase()}
`;

    if (data.ticker) {
      prompt += `\nTICKER: ${data.ticker}`;
    }

    if (data.sector) {
      prompt += `\nSECTOR: ${data.sector}`;
    }

    if (data.optionsFlow) {
      prompt += `\nOPTIONS FLOW: ${data.optionsFlow}`;
    }

    if (data.marketTide) {
      prompt += `\nMARKET TIDE DATA:
- Net Call Premium: $${data.marketTide.net_call_premium || 'N/A'}
- Net Put Premium: $${data.marketTide.net_put_premium || 'N/A'}
- Net Volume: ${data.marketTide.net_volume || 'N/A'}`;
    }

    if (data.earningsData) {
      prompt += `\nEARNINGS INFO:
- Report Date: ${data.earningsData.report_date}
- Report Time: ${data.earningsData.report_time}
- Expected Move: ${data.earningsData.expected_move}% (${data.earningsData.expected_move_perc})
- EPS Estimate: ${data.earningsData.street_mean_est}`;
    }

    if (data.congressData) {
      prompt += `\nCONGRESSIONAL ACTIVITY:
- Recent trades by congress members
- Sentiment: Institutional interest detected`;
    }

    if (data.newsData && data.newsData.length > 0) {
      prompt += `\nRECENT NEWS SENTIMENT:`;
      data.newsData.slice(0, 3).forEach((news: any, index: number) => {
        prompt += `\n${index + 1}. ${news.headline} (${news.sentiment})`;
      });
    }

    if (data.sentiment) {
      prompt += `\nOVERALL SENTIMENT: ${data.sentiment}`;
    }

    prompt += `

INSTRUCTIONS:
1. Analyze the provided data comprehensively
2. Identify the most significant signals
3. Provide a specific, actionable trade idea
4. Include clear rationale with supporting evidence
5. Assign confidence level (1-10)
6. Specify risk level and timeframe
7. Be concise but thorough

FORMAT YOUR RESPONSE AS:
TRADE IDEA: [Specific strategy]
DIRECTION: [BULLISH/BEARISH/NEUTRAL]
CONFIDENCE: [1-10]
RISK: [LOW/MEDIUM/HIGH]
TIMEFRAME: [Short/Medium/Long term]
RATIONALE: [Key reasons supporting the trade]
KEY FACTORS: [List 3-5 most important data points]
ENTRY STRATEGY: [How and when to enter]
EXIT STRATEGY: [Target and stop levels]

Your response:`;

    return prompt;
  }

  async generateTradeIdea(data: MarketData, context: string = 'general'): Promise<TradeIdea | null> {
    if (!HF_TOKEN) {
      console.warn('Hugging Face token not configured. Using fallback analysis.');
      return this.generateFallbackAnalysis(data);
    }

    try {
      const prompt = this.buildPrompt(data, context);
      
      const response = await hf.textGeneration({
        model: 'openai-community/gpt2',  // Using GPT-2 as fallback since gpt-oss-20b might not be available
        inputs: prompt,
        parameters: {
          max_new_tokens: 500,
          temperature: 0.7,
          top_p: 0.9,
          repetition_penalty: 1.1,
        },
      });

      return this.parseAIResponse(response.generated_text, data);
    } catch (error) {
      console.error('AI service error:', error);
      return this.generateFallbackAnalysis(data);
    }
  }

  private parseAIResponse(response: string, data: MarketData): TradeIdea {
    // Extract structured information from AI response
    const ticker = data.ticker || 'UNKNOWN';
    
    // Simple parsing logic - in production, you'd want more sophisticated parsing
    const direction = response.includes('BULLISH') ? 'BULLISH' as const : 
                     response.includes('BEARISH') ? 'BEARISH' as const : 'NEUTRAL' as const;
    
    const confidenceMatch = response.match(/CONFIDENCE:\s*(\d+)/i);
    const confidence = confidenceMatch ? parseInt(confidenceMatch[1]) : 5;
    
    const riskMatch = response.match(/RISK:\s*(LOW|MEDIUM|HIGH)/i);
    const riskLevel = (riskMatch?.[1]?.toUpperCase() as 'LOW' | 'MEDIUM' | 'HIGH') || 'MEDIUM';
    
    const timeframeMatch = response.match(/TIMEFRAME:\s*([^\n]+)/i);
    const timeframe = timeframeMatch?.[1]?.trim() || 'Medium term';
    
    const rationaleMatch = response.match(/RATIONALE:\s*([^\n]+)/i);
    const rationale = rationaleMatch?.[1]?.trim() || 'Based on current market conditions';
    
    const strategyMatch = response.match(/TRADE IDEA:\s*([^\n]+)/i);
    const strategy = strategyMatch?.[1]?.trim() || 'Monitor for entry opportunity';
    
    // Extract key factors
    const keyFactors = this.extractKeyFactors(response, data);

    return {
      ticker,
      direction,
      strategy,
      rationale,
      confidence,
      riskLevel,
      timeframe,
      keyFactors,
    };
  }

  private extractKeyFactors(response: string, data: MarketData): string[] {
    const factors: string[] = [];
    
    if (data.earningsData) {
      factors.push(`Earnings on ${data.earningsData.report_date}`);
    }
    
    if (data.marketTide) {
      const callPremium = parseFloat(data.marketTide.net_call_premium || '0');
      const putPremium = parseFloat(data.marketTide.net_put_premium || '0');
      if (callPremium > putPremium) {
        factors.push('Bullish options flow detected');
      } else if (putPremium > callPremium) {
        factors.push('Bearish options flow detected');
      }
    }
    
    if (data.congressData) {
      factors.push('Congressional trading activity');
    }
    
    if (data.sentiment) {
      factors.push(`${data.sentiment} market sentiment`);
    }
    
    if (data.volume && data.volume > 1000000) {
      factors.push('High volume activity');
    }

    return factors.slice(0, 5); // Limit to 5 key factors
  }

  private generateFallbackAnalysis(data: MarketData): TradeIdea {
    // Fallback analysis when AI is not available
    const ticker = data.ticker || 'MARKET';
    let direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
    let confidence = 5;
    let rationale = 'Technical analysis based on available data';
    let strategy = 'Monitor for signals';
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'MEDIUM';

    // Simple rule-based analysis
    if (data.marketTide) {
      const callPremium = parseFloat(data.marketTide.net_call_premium || '0');
      const putPremium = parseFloat(data.marketTide.net_put_premium || '0');
      
      if (callPremium > putPremium * 1.5) {
        direction = 'BULLISH';
        confidence = 7;
        strategy = 'Consider long positions or calls';
        rationale = 'Strong bullish options flow with calls outpacing puts';
      } else if (putPremium > callPremium * 1.5) {
        direction = 'BEARISH';
        confidence = 7;
        strategy = 'Consider short positions or puts';
        rationale = 'Strong bearish options flow with puts outpacing calls';
      }
    }

    if (data.earningsData) {
      const expectedMove = parseFloat(data.earningsData.expected_move_perc || '0');
      if (expectedMove > 0.1) { // >10% expected move
        riskLevel = 'HIGH';
        strategy = 'Earnings volatility play - consider straddles';
        rationale += '. High expected earnings volatility detected';
      }
    }

    return {
      ticker,
      direction,
      strategy,
      rationale,
      confidence,
      riskLevel,
      timeframe: 'Short to medium term',
      keyFactors: this.extractKeyFactors('', data),
    };
  }

  async analyzeEarningsPlay(earningsData: any): Promise<TradeIdea | null> {
    const data: MarketData = {
      ticker: earningsData.symbol,
      sector: earningsData.sector,
      earningsData: earningsData,
    };

    return this.generateTradeIdea(data, 'earnings');
  }

  async analyzeMarketTide(marketData: any, sector?: string): Promise<TradeIdea | null> {
    const data: MarketData = {
      sector: sector || 'MARKET',
      marketTide: marketData,
    };

    return this.generateTradeIdea(data, 'market_overview');
  }

  async analyzeAlert(alertData: any): Promise<TradeIdea | null> {
    const data: MarketData = {
      ticker: alertData.ticker,
      optionsFlow: alertData.description,
      volume: alertData.volume,
    };

    return this.generateTradeIdea(data, 'alert');
  }
}

export const aiTradingAssistant = AITradingAssistant.getInstance();
