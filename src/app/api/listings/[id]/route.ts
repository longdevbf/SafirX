import { NextRequest, NextResponse } from 'next/server'
import { listingQueries } from '@/lib/db'

// GET /api/listings/[id] - Get listing by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: listingId } = await params

    if (!listingId) {
      return NextResponse.json({ error: 'Listing ID is required' }, { status: 400 })
    }

    const listing = await listingQueries.getListingById(listingId)

    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    }

    // ✅ Thêm debug logs
    console.log('🔍 Database listing data:', listing)
    console.log(' Created at from DB:', listing.created_at)
    console.log(' Updated at from DB:', listing.updated_at)

    return NextResponse.json({ listing })
  } catch (error) {
    console.error('Error fetching listing:', error)
    return NextResponse.json({ error: 'Failed to fetch listing' }, { status: 500 })
  }
}

// PUT /api/listings/[id] - Update listing
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: listingId } = await params
    const body = await request.json()

    if (!listingId) {
      return NextResponse.json({ error: 'Listing ID is required' }, { status: 400 })
    }

    const { price, is_active } = body

    if (price !== undefined) {
      // Update price using smart update (handles both regular price and bundle_price)
      const updatedListing = await listingQueries.updatePriceSmart(listingId, price)
      
      if (!updatedListing) {
        return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
      }
      
      return NextResponse.json({ listing: updatedListing })
    }

    if (is_active !== undefined) {
      // Update status
      const updatedListing = await listingQueries.updateListingStatus(listingId, is_active)
      
      if (!updatedListing) {
        return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
      }
      
      return NextResponse.json({ listing: updatedListing })
    }

    return NextResponse.json({ error: 'No valid updates provided' }, { status: 400 })
  } catch (error) {
    console.error('Error updating listing:', error)
    return NextResponse.json({ error: 'Failed to update listing' }, { status: 500 })
  }
}

// DELETE /api/listings/[id] - Delete listing (set inactive)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: listingId } = await params

    if (!listingId) {
      return NextResponse.json({ error: 'Listing ID is required' }, { status: 400 })
    }

    const updatedListing = await listingQueries.updateListingStatus(listingId, false)

    if (!updatedListing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    }

    return NextResponse.json({ listing: updatedListing })
  } catch (error) {
    console.error('Error deleting listing:', error)
    return NextResponse.json({ error: 'Failed to delete listing' }, { status: 500 })
  }
}