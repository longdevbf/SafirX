import { NextRequest, NextResponse } from 'next/server'
import { listingQueries } from '@/lib/db'

// POST /api/listings/[id]/like - Increment likes for a listing
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    if (!id) {
      return NextResponse.json({ error: 'Listing ID is required' }, { status: 400 })
    }

    const listing = await listingQueries.incrementLikes(id)

    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    }

    return NextResponse.json({ 
      success: true, 
      likes_count: listing.likes_count 
    })
  } catch (error) {
    console.error('Error liking listing:', error)
    return NextResponse.json({ error: 'Failed to like listing' }, { status: 500 })
  }
}