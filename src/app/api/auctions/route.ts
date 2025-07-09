import { NextRequest, NextResponse } from 'next/server'
import { auctionQueries } from '@/lib/db'

// GET /api/auctions - Get paginated auctions
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const category = searchParams.get('category') || undefined
    const collection = searchParams.get('collection') || undefined
    const status = searchParams.get('status') as 'active' | 'ended' | undefined
    const search = searchParams.get('search') || undefined

    const filters = {
      category,
      collection,
      status,
      search
    }

    const auctions = await auctionQueries.getAuctions(page, limit, filters)

    return NextResponse.json({
      auctions,
      pagination: {
        page,
        limit,
        hasNext: auctions.length === limit,
        hasPrev: page > 1
      }
    })
  } catch (error) {
    console.error('Error fetching auctions:', error)
    return NextResponse.json({ error: 'Failed to fetch auctions' }, { status: 500 })
  }
}

// POST /api/auctions - Create new auction
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const {
      auction_id,
      nft_contract,
      token_id,
      seller,
      starting_price,
      reserve_price,
      end_time,
      collection_name,
      name,
      description,
      category,
      image,
      attributes,
      is_collection,
      collection_token_ids,
      collection_image,
      tx_hash
    } = body

    // Validate required fields
    if (!auction_id || !nft_contract || !token_id || !seller || !starting_price || !reserve_price || !end_time || !name || !image || !tx_hash) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const auction = await auctionQueries.createAuction({
      auction_id,
      nft_contract,
      token_id,
      seller,
      starting_price,
      reserve_price,
      end_time: new Date(end_time),
      collection_name,
      name,
      description,
      category,
      image,
      attributes: typeof attributes === 'object' ? JSON.stringify(attributes) : attributes,
      is_collection: Boolean(is_collection),
      collection_token_ids: typeof collection_token_ids === 'object' ? JSON.stringify(collection_token_ids) : collection_token_ids,
      collection_image,
      tx_hash
    })

    return NextResponse.json({ auction }, { status: 201 })
  } catch (error) {
    console.error('Error creating auction:', error)
    return NextResponse.json({ error: 'Failed to create auction' }, { status: 500 })
  }
}