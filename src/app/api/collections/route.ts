import { NextRequest, NextResponse } from 'next/server'
import { listingQueries } from '@/lib/db'

// GET /api/collections - Get collections summary
export async function GET() {
  try {
    const collections = await listingQueries.getCollectionsSummary()

    return NextResponse.json({
      collections: collections.map(collection => ({
        name: collection.collection_name,
        totalItems: parseInt(collection.total_items),
        floorPrice: parseFloat(collection.floor_price),
        ceilingPrice: parseFloat(collection.ceiling_price),
        avgPrice: parseFloat(collection.avg_price),
        totalLikes: parseInt(collection.total_likes),
        totalViews: parseInt(collection.total_views),
        image: collection.collection_image || '/placeholder.svg'
      }))
    })
  } catch (error) {
    console.error('Error fetching collections:', error)
    return NextResponse.json({ error: 'Failed to fetch collections' }, { status: 500 })
  }
}