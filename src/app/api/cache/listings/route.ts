import { NextRequest, NextResponse } from 'next/server';
import { cacheQueries, dbToProcessedNFT } from '@/lib/db-cache';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const collection = searchParams.get('collection');
    const seller = searchParams.get('seller');
    const search = searchParams.get('search');

    let listings;

    if (search) {
      // Search listings
      listings = await cacheQueries.searchListings(search, limit);
    } else if (collection) {
      // Get listings by collection
      listings = await cacheQueries.getListingsByCollection(collection);
    } else if (seller) {
      // Get listings by seller
      listings = await cacheQueries.getListingsBySeller(seller);
    } else {
      // Get all active listings
      listings = await cacheQueries.getActiveListings(limit, offset);
    }

    // Convert to ProcessedNFT format
    const processedNFTs = listings.map(dbToProcessedNFT);

    return NextResponse.json({
      success: true,
      data: processedNFTs,
      total: processedNFTs.length,
      limit,
      offset
    });

  } catch (error) {
    console.error('Error fetching cached listings:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch cached listings'
    }, { status: 500 });
  }
}