export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { aiTradingAssistant } from '@/lib/ai-trading-assistant';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, data, context } = body;

    if (!type || !data) {
      return NextResponse.json(
        { error: 'Missing required parameters: type and data' },
        { status: 400 }
      );
    }

    let tradeIdea;

    switch (type) {
      case 'earnings':
        tradeIdea = await aiTradingAssistant.analyzeEarningsPlay(data);
        break;
      case 'market':
        tradeIdea = await aiTradingAssistant.analyzeMarketTide(data, context);
        break;
      case 'alert':
        tradeIdea = await aiTradingAssistant.analyzeAlert(data);
        break;
      case 'general':
        tradeIdea = await aiTradingAssistant.generateTradeIdea(data, context);
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid analysis type. Supported types: earnings, market, alert, general' },
          { status: 400 }
        );
    }

    if (!tradeIdea) {
      return NextResponse.json(
        { error: 'Failed to generate trade idea' },
        { status: 500 }
      );
    }

    return NextResponse.json({ tradeIdea });
  } catch (error) {
    console.error('AI Analysis API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
