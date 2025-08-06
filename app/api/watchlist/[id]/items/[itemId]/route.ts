export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';

// External storage reference (shared with main route)
let watchlists: any[] = [];

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; itemId: string } }
) {
  try {
    const watchlist = watchlists.find(w => w.id === params.id);
    
    if (!watchlist) {
      return NextResponse.json(
        { error: 'Watchlist not found' },
        { status: 404 }
      );
    }

    const itemIndex = watchlist.items.findIndex((item: any) => item.id === params.itemId);
    
    if (itemIndex === -1) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      );
    }

    watchlist.items.splice(itemIndex, 1);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting watchlist item:', error);
    return NextResponse.json(
      { error: 'Failed to delete item' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { ticker } = body;
    
    if (!ticker) {
      return NextResponse.json(
        { error: 'Ticker is required' },
        { status: 400 }
      );
    }

    const watchlist = watchlists.find(w => w.id === params.id);
    
    if (!watchlist) {
      return NextResponse.json(
        { error: 'Watchlist not found' },
        { status: 404 }
      );
    }

    // Check if ticker already exists
    const existingItem = watchlist.items.find((item: any) => item.ticker === ticker);
    if (existingItem) {
      return NextResponse.json(
        { error: 'Ticker already in watchlist' },
        { status: 400 }
      );
    }

    const newItem = {
      id: Date.now().toString(),
      ticker: ticker.toUpperCase(),
      createdAt: new Date().toISOString()
    };

    watchlist.items.push(newItem);

    return NextResponse.json({ data: newItem }, { status: 201 });
  } catch (error) {
    console.error('Error adding watchlist item:', error);
    return NextResponse.json(
      { error: 'Failed to add item' },
      { status: 500 }
    );
  }
}