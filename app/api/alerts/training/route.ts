import { NextResponse } from 'next/server';
import { tradingFilters } from '@/lib/trading-filters';

export async function GET() {
  return NextResponse.json({ success: true, trainingMode: tradingFilters.isTrainingMode(), executions: tradingFilters.getTrainingExecutions() });
}
