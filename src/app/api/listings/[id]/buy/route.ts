import { NextRequest, NextResponse } from 'next/server'
import { listingQueries } from '@/lib/db'

// POST /api/listings/[id]/buy - Buy NFT (mark listing as inactive)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { buyer } = await request.json()

    if (!id) {
      return NextResponse.json({ error: 'Listing ID is required' }, { status: 400 })
    }

    if (!buyer) {
      return NextResponse.json({ error: 'Buyer address is required' }, { status: 400 })
    }

    // First check if listing exists and is active
    const listing = await listingQueries.getListingById(id)
    
    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    }

    if (!listing.is_active) {
      return NextResponse.json({ error: 'Listing is no longer active' }, { status: 400 })
    }

    // Mark listing as inactive (bought)
    const result = await listingQueries.updateListingStatus(id, false)

    if (!result) {
      return NextResponse.json({ error: 'Failed to update listing' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'NFT purchased successfully',
      listing: result
    })
  } catch (error) {
    console.error('Error buying NFT:', error)
    return NextResponse.json({ error: 'Failed to buy NFT' }, { status: 500 })
  }
}