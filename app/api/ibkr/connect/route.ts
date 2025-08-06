import { NextRequest, NextResponse } from 'next/server';
import { IBApi, EventName } from '@stoqey/ib';

interface IBKRConnectionRequest {
  host: string;
  port: number;
  clientId: number;
}

export async function POST(request: NextRequest) {
  try {
    const { host, port, clientId }: IBKRConnectionRequest = await request.json();

    return await new Promise<NextResponse>((resolve) => {
      const ib = new IBApi({ host, port, clientId });
      const timeout = setTimeout(() => {
        ib.disconnect();
        resolve(
          NextResponse.json(
            {
              success: false,
              error: 'Unable to connect to IBKR TWS. Please ensure TWS is running and API is enabled.',
              fallbackMode: 'virtual',
            },
            { status: 503 },
          ),
        );
      }, 5000);

      ib.once(EventName.connected, () => {
        clearTimeout(timeout);
        ib.disconnect();
        resolve(
          NextResponse.json({
            success: true,
            status: 'connected',
            connectionTime: new Date().toISOString(),
          }),
        );
      });

      ib.once(EventName.error, (err) => {
        clearTimeout(timeout);
        ib.disconnect();
        resolve(
          NextResponse.json(
            {
              success: false,
              error:
                'Unable to connect to IBKR TWS. Please ensure TWS is running and API is enabled.',
              details: String(err),
              fallbackMode: 'virtual',
            },
            { status: 503 },
          ),
        );
      });

      ib.connect();
    });
  } catch (error) {
    console.error('IBKR connection error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Connection failed',
        fallbackMode: 'virtual',
      },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'disconnected',
    message: 'Use POST to establish connection',
  });
}
