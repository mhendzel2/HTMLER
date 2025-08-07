import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Check both server-side and public environment variables
    const serverSideKey = process.env.UNUSUAL_WHALES_API_KEY;
    const publicKey = process.env.NEXT_PUBLIC_UNUSUAL_WHALES_API_KEY;

    return NextResponse.json({
      environment_check: {
        server_side_key_present: !!serverSideKey,
        server_side_key_length: serverSideKey?.length || 0,
        server_side_key_preview: serverSideKey?.substring(0, 8) + '...' || 'Not found',
        
        public_key_present: !!publicKey,
        public_key_length: publicKey?.length || 0,
        public_key_preview: publicKey?.substring(0, 8) + '...' || 'Not found',
        
        keys_match: serverSideKey === publicKey,
        
        all_env_vars: {
          UNUSUAL_WHALES_API_KEY: !!process.env.UNUSUAL_WHALES_API_KEY,
          NEXT_PUBLIC_UNUSUAL_WHALES_API_KEY: !!process.env.NEXT_PUBLIC_UNUSUAL_WHALES_API_KEY,
          UNUSUAL_WHALES_API_BASE_URL: !!process.env.UNUSUAL_WHALES_API_BASE_URL
        }
      }
    });

  } catch (error) {
    console.error('Environment check error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      environment_check: null
    }, { status: 500 });
  }
}
