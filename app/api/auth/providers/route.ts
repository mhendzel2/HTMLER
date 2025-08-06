
import { NextResponse } from 'next/server';

export async function GET() {
  // Return empty providers since we're not using authentication
  return NextResponse.json({});
}
