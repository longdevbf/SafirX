import { NextRequest, NextResponse } from 'next/server';
import { initializeCacheTables } from '@/lib/db-cache';

export async function GET(request: NextRequest) {
  try {
    // Check for init key for security
    const { searchParams } = new URL(request.url);
    const initKey = searchParams.get('key');
    
    if (initKey !== process.env.DB_INIT_KEY && process.env.NODE_ENV === 'production') {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    console.log('Initializing database tables...');
    await initializeCacheTables();
    
    return NextResponse.json({
      success: true,
      message: 'Database tables initialized successfully',
      tables: [
        'cache_listings',
        'cache_auctions',
        'cache_views'
      ]
    });
    
  } catch (error) {
    console.error('Failed to initialize database:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}