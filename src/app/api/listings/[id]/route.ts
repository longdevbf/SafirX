import { NextRequest, NextResponse } from 'next/server'
import { listingQueries } from '@/lib/db'

// GET /api/listings/[id] - Get specific listing
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    if (!id) {
      return NextResponse.json({ error: 'Listing ID is required' }, { status: 400 })
    }

    const listing = await listingQueries.getListingById(id)

    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    }

    return NextResponse.json({ listing })
  } catch (error) {
    console.error('Error fetching listing:', error)
    return NextResponse.json({ error: 'Failed to fetch listing' }, { status: 500 })
  }
}

// PUT /api/listings/[id] - Update listing price
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const { price } = await request.json()

    if (!id) {
      return NextResponse.json({ error: 'Listing ID is required' }, { status: 400 })
    }

    if (!price) {
      return NextResponse.json({ error: 'Price is required' }, { status: 400 })
    }

    const updatedListing = await listingQueries.updateListingPrice(id, price)

    if (!updatedListing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    }

    return NextResponse.json({ 
      success: true, 
      listing: updatedListing 
    })
  } catch (error) {
    console.error('Error updating listing price:', error)
    return NextResponse.json({ error: 'Failed to update listing price' }, { status: 500 })
  }
}

// DELETE /api/listings/[id] - Cancel/delete listing
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    if (!id) {
      return NextResponse.json({ error: 'Listing ID is required' }, { status: 400 })
    }

    const result = await listingQueries.updateListingStatus(id, false)

    if (!result) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Listing cancelled successfully' 
    })
  } catch (error) {
    console.error('Error cancelling listing:', error)
    return NextResponse.json({ error: 'Failed to cancel listing' }, { status: 500 })
  }
}