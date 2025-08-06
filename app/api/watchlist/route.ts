export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { watchlists, Watchlist } from './store';

export async function GET() {
  try {
    return NextResponse.json(watchlists);
  } catch (error) {
    console.error('Error fetching watchlists:', error);
    return NextResponse.json(
      { error: 'Failed to fetch watchlists' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!body.name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    const newWatchlist: Watchlist = {
      id: (watchlists.length + 1).toString(),
      name: body.name,
      description: body.description || '',
      isDefault: false,
      items: []
    };

    watchlists.push(newWatchlist);

    return NextResponse.json(newWatchlist, { status: 201 });
  } catch (error) {
    console.error('Error creating watchlist:', error);
    return NextResponse.json(
      { error: 'Failed to create watchlist' },
      { status: 500 }
    );
  }
}