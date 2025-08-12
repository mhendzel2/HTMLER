import { NextRequest, NextResponse } from 'next/server';

async function getAnalysis(tickers: string[]) {
  const mod = await import('@/lib/enhanced-flow-analysis');
  const svc: any = (mod as any).enhancedFlowAnalysis;
  if (!svc || typeof svc.getFlowAnalysisForTickers !== 'function') return {};
  return svc.getFlowAnalysisForTickers(tickers);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbolsParam = searchParams.get('symbols');
  if (!symbolsParam) return NextResponse.json({ error: 'symbols required' }, { status: 400 });
  const symbols = symbolsParam.split(',').map(s => s.trim().toUpperCase()).filter(Boolean).slice(0, 50);
  try {
    const data = await getAnalysis(symbols);
    return NextResponse.json({ data, symbols, timestamp: Date.now() });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'failed' }, { status: 500 });
  }
}
