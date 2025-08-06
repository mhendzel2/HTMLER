export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory storage for standalone app
let watchlists: any[] = [
  {
    id: '1',
    name: 'Default Watchlist',
    description: 'My main watchlist',
    isDefault: true,
    items: []
  }
];

export async function GET() {
  try {
    return NextResponse.json({ data: watchlists });
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

    const newWatchlist = {
      id: (watchlists.length + 1).toString(),
      name: body.name,
      description: body.description || '',
      isDefault: false,
      items: []
    };

    watchlists.push(newWatchlist);

    return NextResponse.json({ data: newWatchlist }, { status: 201 });
  } catch (error) {
    console.error('Error creating watchlist:', error);
    return NextResponse.json(
      { error: 'Failed to create watchlist' },
      { status: 500 }
    );
  }
}