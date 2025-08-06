import { NextRequest, NextResponse } from 'next/server';
import { IBApi, EventName, Contract, Order as IBOrder } from '@stoqey/ib';

interface OrderRequest {
  id: string;
  symbol: string;
  action: 'BUY' | 'SELL';
  orderType: 'MARKET' | 'LIMIT' | 'STOP';
  quantity: number;
  price?: number;
  stopPrice?: number;
  source: 'IBKR' | 'VIRTUAL';
}

export async function POST(request: NextRequest) {
  try {
    const order: OrderRequest = await request.json();
    
    console.log(`📤 Processing ${order.source} order:`, {
      symbol: order.symbol,
      action: order.action,
      type: order.orderType,
      quantity: order.quantity
    });
    
    if (order.source === 'IBKR') {
      const result = await submitToIBKR(order);
      return NextResponse.json(result);
    } else {
      // Virtual trading - simulate immediate fill
      const virtualResult = await simulateVirtualOrder(order);
      return NextResponse.json(virtualResult);
    }
    
  } catch (error) {
    console.error('Order submission error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to submit order'
    }, { status: 500 });
  }
}

async function submitToIBKR(order: OrderRequest) {
  const host = process.env.IBKR_HOST || '127.0.0.1';
  const port = Number(process.env.IBKR_PORT) || 7497;
  const clientId = Number(process.env.IBKR_CLIENT_ID) || 0;

  return new Promise(async (resolve) => {
    const ib = new IBApi({ host, port, clientId });

    ib.once(EventName.error, (err) => {
      ib.disconnect();
      resolve({
        success: false,
        error: 'IBKR order submission failed',
        details: String(err),
        fallbackToVirtual: true,
      });
    });

    ib.once(EventName.nextValidId, (id) => {
      const contract: Contract = {
        symbol: order.symbol,
        secType: 'STK',
        exchange: 'SMART',
        currency: 'USD',
      };

      const ibOrder: IBOrder = {
        action: order.action,
        orderType: order.orderType === 'LIMIT' ? 'LMT' : order.orderType === 'STOP' ? 'STP' : 'MKT',
        totalQuantity: order.quantity,
        lmtPrice: order.price,
        auxPrice: order.stopPrice,
      };

      ib.placeOrder(id, contract, ibOrder);
    });

    ib.once(EventName.orderStatus, (id, status, filled, remaining, avgFillPrice) => {
      ib.disconnect();
      resolve({
        success: true,
        orderId: id,
        status,
        filled,
        remaining,
        avgFillPrice,
        message: 'Order submitted to IBKR TWS',
        timestamp: new Date().toISOString(),
        source: 'IBKR',
      });
    });

    ib.connect();
  });
}

async function simulateVirtualOrder(order: OrderRequest) {
  // Simulate virtual order processing
  await new Promise(resolve => setTimeout(resolve, 200));
  
  // Mock market prices for simulation
  const mockPrices: Record<string, number> = {
    'AAPL': 175.50,
    'MSFT': 380.25,
    'GOOGL': 140.75,
    'TSLA': 245.30,
    'AMZN': 145.80,
    'NVDA': 480.60,
    'META': 325.40,
    'SPY': 445.20,
    'QQQ': 375.80,
    'IWM': 195.40
  };
  
  const basePrice = mockPrices[order.symbol] || 100 + Math.random() * 200;
  let fillPrice = basePrice;
  
  // Adjust fill price based on order type
  if (order.orderType === 'MARKET') {
    // Market orders get filled at current price +/- small spread
    const spread = basePrice * 0.001; // 0.1% spread
    fillPrice = order.action === 'BUY' ? basePrice + spread : basePrice - spread;
  } else if (order.orderType === 'LIMIT' && order.price) {
    // Limit orders fill at limit price if market is favorable
    fillPrice = order.price;
  }
  
  return {
    success: true,
    orderId: `virtual_${Date.now()}`,
    status: 'FILLED',
    fillPrice: Math.round(fillPrice * 100) / 100,
    fillTime: new Date().toISOString(),
    commission: 1.00, // $1 commission
    message: 'Virtual order filled',
    source: 'VIRTUAL'
  };
}

/*
Real IBKR Order Submission would look like:

import { IBApi, Contract, Order } from '@stoqey/ib';

const contract: Contract = {
  symbol: order.symbol,
  secType: 'STK',
  exchange: 'SMART',
  currency: 'USD',
};

const ibOrder: Order = {
  action: order.action,
  orderType: order.orderType,
  totalQuantity: order.quantity,
  lmtPrice: order.price,
  auxPrice: order.stopPrice,
};

ib.placeOrder(nextOrderId, contract, ibOrder);

ib.on('orderStatus', (orderId, status, filled, remaining, avgFillPrice) => {
  console.log(`Order ${orderId}: ${status}, Filled: ${filled}, Remaining: ${remaining}, Avg Price: ${avgFillPrice}`);
});
*/
