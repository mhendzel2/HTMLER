export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server';
import { watchlists, saveWatchlists } from '../../../store';

export async function DELETE(
  request: Request,
  context: any,
) {
  const { params } = context;
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
    saveWatchlists();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting watchlist item:', error);
    return NextResponse.json(
      { error: 'Failed to delete item' },
      { status: 500 }
    );
  }
}