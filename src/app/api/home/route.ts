/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextRequest, NextResponse } from 'next/server'
import { listingQueries } from '@/lib/db'

// GET /api/home - Get home page data
export async function GET(request: NextRequest) {
  try {
    const [featuredCollections, trendingNFTs] = await Promise.all([
      listingQueries.getFeaturedCollections(6),
      listingQueries.getTrendingNFTs(4)
    ])

    return NextResponse.json({
      featuredCollections,
      trendingNFTs
    })
  } catch (error) {
    console.error('Error fetching home data:', error)
    return NextResponse.json({ error: 'Failed to fetch home data' }, { status: 500 })
  }
}
