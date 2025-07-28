import { NextRequest, NextResponse } from "next/server"
import { Pool } from "pg"

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('neon.tech') ? { rejectUnauthorized: false } : false,
})

// POST - Cancel auction and delete from database
export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const { auctionId, txHash, reason, sellerAddress } = data

    if (!auctionId || !txHash || !sellerAddress) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: auctionId, txHash, sellerAddress' },
        { status: 400 }
      )
    }

    // First, verify the auction exists and belongs to the seller
    const verifyQuery = 'SELECT * FROM auctions WHERE auction_id = $1 AND seller_address = $2'
    const verifyResult = await pool.query(verifyQuery, [auctionId, sellerAddress.toLowerCase()])

    if (verifyResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Auction not found or you are not the seller' },
        { status: 404 }
      )
    }

    const auction = verifyResult.rows[0]

    // Check if auction can be cancelled (no bids)
    if (auction.total_bids > 0) {
      return NextResponse.json(
        { success: false, error: 'Cannot cancel auction with existing bids' },
        { status: 400 }
      )
    }

    // Get NFT information before deletion
    const nftInfo = {
      auctionId: auction.auction_id,
      tokenId: auction.token_id,
      tokenIds: auction.token_ids,
      nftContract: auction.nft_contract,
      title: auction.title,
      auctionType: auction.auction_type
    }

    // Delete the auction record directly (no transaction needed for single table)
    const deleteResult = await pool.query(
      'DELETE FROM auctions WHERE auction_id = $1 AND seller_address = $2 RETURNING *',
      [auctionId, sellerAddress.toLowerCase()]
    )

    if (deleteResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Failed to delete auction record' },
        { status: 500 }
      )
    }

    console.log('✅ Auction cancelled and deleted:', {
      auctionId,
      nftInfo,
      txHash,
      reason: reason || 'No reason provided'
    })

    return NextResponse.json({
      success: true,
      message: 'Auction cancelled and deleted successfully',
      data: {
        deletedAuction: deleteResult.rows[0],
        nftInfo,
        txHash,
        cancelReason: reason
      }
    })

  } catch (error) {
    console.error('❌ Error cancelling auction:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to cancel auction' 
      },
      { status: 500 }
    )
  }
}

// GET - Get cancelled auctions (optional, for history tracking)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const seller = searchParams.get('seller')

  try {
    let query = 'SELECT * FROM auctions WHERE state = $1'
    const params: string[] = ['CANCELLED']

    if (seller) {
      query += ' AND seller_address = $2'
      params.push(seller.toLowerCase())
    }

    query += ' ORDER BY updated_at DESC'

    const result = await pool.query(query, params)

    return NextResponse.json({
      success: true,
      cancelledAuctions: result.rows,
      count: result.rows.length
    })

  } catch (error) {
    console.error('Error fetching cancelled auctions:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch cancelled auctions' },
      { status: 500 }
    )
  }
}
