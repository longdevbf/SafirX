import { NextRequest, NextResponse } from 'next/server'
import { listingQueries } from '@/lib/db'

// GET /api/listings - Get paginated listings
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const category = searchParams.get('category') || undefined
    const collection = searchParams.get('collection') || undefined
    const rarity = searchParams.get('rarity') || undefined
    const priceMin = searchParams.get('priceMin') ? parseFloat(searchParams.get('priceMin')!) : undefined
    const priceMax = searchParams.get('priceMax') ? parseFloat(searchParams.get('priceMax')!) : undefined
    const search = searchParams.get('search') || undefined

    const filters = {
      category,
      collection,
      rarity,
      priceMin,
      priceMax,
      search
    }

    const [listings, totalCount] = await Promise.all([
      listingQueries.getListings(page, limit, filters),
      listingQueries.getListingsCount(filters)
    ])

    const totalPages = Math.ceil(totalCount / limit)

    return NextResponse.json({
      listings,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    })
  } catch (error) {
    console.error('Error fetching listings:', error)
    return NextResponse.json({ error: 'Failed to fetch listings' }, { status: 500 })
  }
}

// POST /api/listings - Create new listing
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const {
      listing_id,
      nft_contract,
      token_id,
      seller,
      price,
      collection_name,
      name,
      description,
      category,
      image,
      attributes,
      rarity,
      is_bundle,
      bundle_token_ids,
      collection_image,
      tx_hash
    } = body

    // Validate required fields
    if (!listing_id || !nft_contract || !token_id || !seller || !price || !name || !image || !tx_hash) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const listing = await listingQueries.createListing({
      listing_id,
      nft_contract,
      token_id,
      seller,
      price,
      collection_name,
      name,
      description,
      category,
      image,
      attributes: typeof attributes === 'object' ? JSON.stringify(attributes) : attributes,
      rarity,
      is_bundle: Boolean(is_bundle),
      bundle_token_ids: typeof bundle_token_ids === 'object' ? JSON.stringify(bundle_token_ids) : bundle_token_ids,
      collection_image,
      tx_hash
    })

    return NextResponse.json({ listing }, { status: 201 })
  } catch (error) {
    console.error('Error creating listing:', error)
    return NextResponse.json({ error: 'Failed to create listing' }, { status: 500 })
  }
}

// PUT /api/listings - Update listing status
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { listing_id, is_active } = body

    if (!listing_id || typeof is_active !== 'boolean') {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const listing = await listingQueries.updateListingStatus(listing_id, is_active)

    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    }

    return NextResponse.json({ listing })
  } catch (error) {
    console.error('Error updating listing:', error)
    return NextResponse.json({ error: 'Failed to update listing' }, { status: 500 })
  }
}