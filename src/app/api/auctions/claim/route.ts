import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('neon.tech') ? { rejectUnauthorized: false } : false,
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      auctionId, 
      type, // 'claim' or 'reclaim'
      txHash,
      winnerAddress 
    } = body

    if (!auctionId || !type || !txHash) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: auctionId, type, txHash' },
        { status: 400 }
      )
    }

    if (!['claim', 'reclaim'].includes(type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid type. Must be "claim" or "reclaim"' },
        { status: 400 }
      )
    }

    const client = await pool.connect()

    try {
      // First, verify the auction exists and is finalized
      const auctionQuery = `
        SELECT auction_id, state, winner_address, nft_claimed, nft_reclaimed
        FROM auctions 
        WHERE auction_id = $1
      `
      const auctionResult = await client.query(auctionQuery, [auctionId])

      if (auctionResult.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Auction not found' },
          { status: 404 }
        )
      }

      const auction = auctionResult.rows[0]

      if (auction.state !== 'FINALIZED') {
        return NextResponse.json(
          { success: false, error: 'Auction is not finalized' },
          { status: 400 }
        )
      }

      // Handle claim operation
      if (type === 'claim') {
        if (auction.nft_claimed) {
          return NextResponse.json(
            { success: false, error: 'NFT has already been claimed' },
            { status: 400 }
          )
        }

        if (winnerAddress && auction.winner_address?.toLowerCase() !== winnerAddress.toLowerCase()) {
          return NextResponse.json(
            { success: false, error: 'Only the winner can claim the NFT' },
            { status: 403 }
          )
        }

        // Update claim status
        const updateQuery = `
          UPDATE auctions 
          SET nft_claimed = TRUE, 
              claim_tx_hash = $1, 
              claimed_at = CURRENT_TIMESTAMP,
              updated_at = CURRENT_TIMESTAMP
          WHERE auction_id = $2
          RETURNING auction_id, nft_claimed, claim_tx_hash, claimed_at
        `
        
        const result = await client.query(updateQuery, [txHash, auctionId])
        
        return NextResponse.json({
          success: true,
          message: 'NFT claim status updated successfully',
          data: result.rows[0]
        })
      }

      // Handle reclaim operation
      if (type === 'reclaim') {
        if (auction.nft_reclaimed) {
          return NextResponse.json(
            { success: false, error: 'NFT has already been reclaimed' },
            { status: 400 }
          )
        }

        // Update reclaim status
        const updateQuery = `
          UPDATE auctions 
          SET nft_reclaimed = TRUE, 
              reclaim_tx_hash = $1, 
              reclaimed_at = CURRENT_TIMESTAMP,
              updated_at = CURRENT_TIMESTAMP
          WHERE auction_id = $2
          RETURNING auction_id, nft_reclaimed, reclaim_tx_hash, reclaimed_at
        `
        
        const result = await client.query(updateQuery, [txHash, auctionId])
        
        return NextResponse.json({
          success: true,
          message: 'NFT reclaim status updated successfully',
          data: result.rows[0]
        })
      }

    } finally {
      client.release()
    }

  } catch (error) {
    console.error('❌ Error updating claim status:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const auctionId = searchParams.get('auctionId')

    if (!auctionId) {
      return NextResponse.json(
        { success: false, error: 'Missing auctionId parameter' },
        { status: 400 }
      )
    }

    const client = await pool.connect()

    try {
      const query = `
        SELECT 
          auction_id,
          nft_claimed,
          nft_reclaimed,
          claim_tx_hash,
          reclaim_tx_hash,
          claimed_at,
          reclaimed_at,
          winner_address
        FROM auctions 
        WHERE auction_id = $1
      `
      
      const result = await client.query(query, [auctionId])

      if (result.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Auction not found' },
          { status: 404 }
        )
      }

      return NextResponse.json({
        success: true,
        data: result.rows[0]
      })

    } finally {
      client.release()
    }

  } catch (error) {
    console.error('❌ Error fetching claim status:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}