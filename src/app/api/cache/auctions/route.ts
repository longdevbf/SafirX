import { NextRequest, NextResponse } from 'next/server';
import { cacheQueries, dbToProcessedNFT } from '@/lib/db-cache';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const seller = searchParams.get('seller');

    let auctions;

    if (seller) {
      // Get auctions by seller
      auctions = await cacheQueries.getAuctionsBySeller(seller);
    } else {
      // Get all active auctions
      auctions = await cacheQueries.getActiveAuctions(limit, offset);
    }

    // Convert to ProcessedNFT format
    const processedNFTs = auctions.map(dbToProcessedNFT);

    return NextResponse.json({
      success: true,
      data: processedNFTs,
      total: processedNFTs.length,
      limit,
      offset
    });

  } catch (error) {
    console.error('Error fetching cached auctions:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch cached auctions'
    }, { status: 500 });
  }
}