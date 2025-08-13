import { NextRequest, NextResponse } from 'next/server';
import { tradingFilters } from '@/lib/trading-filters';

// GET: return retained alerts (last 5 days)
export async function GET() {
  const alerts = tradingFilters.getRetainedAlerts();
  return NextResponse.json({ success: true, count: alerts.length, data: alerts });
}

// POST: enable/disable training mode or adjust risk
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(()=>({}));
    if (body.trainingMode === true) {
      tradingFilters.enableTrainingMode(body.risk || {});
    } else if (body.trainingMode === false) {
      tradingFilters.disableTrainingMode();
    }
    return NextResponse.json({ success: true, trainingMode: tradingFilters.isTrainingMode() });
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Failed to update training mode' }, { status: 400 });
  }
}
