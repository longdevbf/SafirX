import { NextRequest, NextResponse } from "next/server"
import { Pool } from "pg"

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('neon.tech') ? { rejectUnauthorized: false } : false,
})

// GET - Fetch auctions
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const state = searchParams.get('state') // ACTIVE, ENDED, FINALIZED, CANCELLED
  const seller = searchParams.get('seller')
  const type = searchParams.get('type') // SINGLE_NFT, COLLECTION

  try {
    let query = 'SELECT * FROM auctions WHERE 1=1'
    const params: any[] = []
    let paramCount = 0

    if (state) {
      paramCount++
      query += ` AND state = $${paramCount}`
      params.push(state)
    }

    if (seller) {
      paramCount++
      query += ` AND seller_address = $${paramCount}`
      params.push(seller.toLowerCase())
    }

    if (type) {
      paramCount++
      query += ` AND auction_type = $${paramCount}`
      params.push(type)
    }

    // Auto-update ended auctions
    const now = new Date()
    await pool.query(`
      UPDATE auctions 
      SET state = 'ENDED', updated_at = CURRENT_TIMESTAMP
      WHERE state = 'ACTIVE' AND end_time <= $1
    `, [now])

    query += ' ORDER BY created_at DESC'

    const result = await pool.query(query, params)
    
    // Add computed fields
    const auctionsWithStatus = result.rows.map(auction => {
      const now = Date.now()
      const endTime = new Date(auction.end_time).getTime()
      const timeRemaining = Math.max(0, Math.floor((endTime - now) / 1000))
      
      return {
        ...auction,
        timeRemaining,
        isActive: auction.state === 'ACTIVE' && timeRemaining > 0,
        isEnded: auction.state === 'ENDED' || (auction.state === 'ACTIVE' && timeRemaining === 0),
        isFinalized: auction.state === 'FINALIZED',
        isCancelled: auction.state === 'CANCELLED',
        tokenIds: auction.token_ids || (auction.token_id ? [auction.token_id] : [])
      }
    })

    return NextResponse.json({
      success: true,
      auctions: auctionsWithStatus,
      count: result.rows.length
    })

  } catch (error) {
    console.error('Error fetching auctions:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch auctions' },
      { status: 500 }
    )
  }
}

// POST - Create/Update auction
export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    
    if (data.action === 'create') {
      return await createAuction(data)
    } else if (data.action === 'update_state') {
      return await updateAuctionState(data)
    } else if (data.action === 'finalize') {
      return await finalizeAuction(data)
    } else if (data.action === 'sync_bids') {
      return await syncBidHistory(data)
    }
    
    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    )

  } catch (error) {
    console.error('Error in auction POST:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Create new auction
async function createAuction(data: any) {
  const {
    auctionId,
    auctionType,
    title,
    description,
    sellerAddress,
    nftContract,
    tokenId,
    tokenIds,
    nftCount,
    collectionImageUrl,
    collectionImageDriveId,
    startingPrice,
    reservePrice,
    minBidIncrement,
    startTime,
    endTime,
    durationHours,
    allowPublicReveal,
    nftMetadata,
    creationTxHash
  } = data

  try {
    const query = `
      INSERT INTO auctions (
        auction_id, auction_type, title, description, seller_address,
        nft_contract, token_id, token_ids, nft_count,
        collection_image_url, collection_image_drive_id,
        starting_price, reserve_price, min_bid_increment,
        start_time, end_time, duration_hours, allow_public_reveal,
        nft_metadata, creation_tx_hash, state
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, 'ACTIVE'
      ) RETURNING *
    `

    const result = await pool.query(query, [
      auctionId,
      auctionType,
      title,
      description,
      sellerAddress.toLowerCase(),
      nftContract.toLowerCase(),
      tokenId || null,
      tokenIds ? JSON.stringify(tokenIds) : null,
      nftCount || 1,
      collectionImageUrl || null,
      collectionImageDriveId || null,
      startingPrice,
      reservePrice,
      minBidIncrement,
      new Date(startTime * 1000),
      new Date(endTime * 1000),
      durationHours,
      allowPublicReveal,
      nftMetadata ? JSON.stringify(nftMetadata) : null,
      creationTxHash
    ])

    console.log(`✅ Auction ${auctionId} saved to database`)

    return NextResponse.json({
      success: true,
      auction: result.rows[0]
    })

  } catch (error: any) {
    if (error.code === '23505') { // Unique constraint violation
      console.log(`⚠️ Auction ${auctionId} already exists in database`)
      return NextResponse.json({
        success: true,
        message: 'Auction already exists'
      })
    }
    
    console.error('Error creating auction:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create auction' },
      { status: 500 }
    )
  }
}

// Update auction state
async function updateAuctionState(data: any) {
  const { auctionId, state, txHash } = data

  try {
    const query = `
      UPDATE auctions 
      SET state = $1, updated_at = CURRENT_TIMESTAMP
      ${txHash ? ', finalization_tx_hash = $3' : ''}
      WHERE auction_id = $2 
      RETURNING *
    `
    
    const params = txHash ? [state, auctionId, txHash] : [state, auctionId]
    const result = await pool.query(query, params)

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Auction not found' },
        { status: 404 }
      )
    }

    console.log(`✅ Auction ${auctionId} state updated to ${state}`)

    return NextResponse.json({
      success: true,
      auction: result.rows[0]
    })

  } catch (error) {
    console.error('Error updating auction state:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update auction state' },
      { status: 500 }
    )
  }
}

// Finalize auction with results
async function finalizeAuction(data: any) {
  const {
    auctionId,
    winnerAddress,
    finalPrice,
    totalBids,
    uniqueBidders,
    finalizationTxHash
  } = data

  try {
    const query = `
      UPDATE auctions 
      SET 
        state = 'FINALIZED',
        winner_address = $1,
        final_price = $2,
        total_bids = $3,
        unique_bidders = $4,
        finalization_tx_hash = $5,
        finalized_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE auction_id = $6 
      RETURNING *
    `

    const result = await pool.query(query, [
      winnerAddress ? winnerAddress.toLowerCase() : null,
      finalPrice,
      totalBids,
      uniqueBidders,
      finalizationTxHash,
      auctionId
    ])

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Auction not found' },
        { status: 404 }
      )
    }

    console.log(`✅ Auction ${auctionId} finalized with winner ${winnerAddress}`)

    return NextResponse.json({
      success: true,
      auction: result.rows[0]
    })

  } catch (error) {
    console.error('Error finalizing auction:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to finalize auction' },
      { status: 500 }
    )
  }
}

// Sync bid history from blockchain
async function syncBidHistory(data: any) {
  const { auctionId, bidHistory } = data

  try {
    // Clear existing bid history
    await pool.query('DELETE FROM auction_bid_history WHERE auction_id = $1', [auctionId])

    if (bidHistory && bidHistory.length > 0) {
      // Insert new bid history
      const insertQuery = `
        INSERT INTO auction_bid_history (
          auction_id, bidder_address, bid_amount, bid_number, bid_timestamp, visibility
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `

      for (const bid of bidHistory) {
        await pool.query(insertQuery, [
          auctionId,
          bid.bidder.toLowerCase(),
          bid.amount,
          bid.bidNumber,
          new Date(Number(bid.timestamp) * 1000),
          'AUTO_REVEALED'
        ])
      }

      console.log(`✅ Synced ${bidHistory.length} bids for auction ${auctionId}`)
    }

    return NextResponse.json({
      success: true,
      message: `Synced ${bidHistory?.length || 0} bids`
    })

  } catch (error) {
    console.error('Error syncing bid history:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to sync bid history' },
      { status: 500 }
    )
  }
}

// GET bid history for an auction
export async function GET_BID_HISTORY(auctionId: string) {
  try {
    const query = `
      SELECT bidder_address, bid_amount, bid_number, bid_timestamp, visibility
      FROM auction_bid_history 
      WHERE auction_id = $1 
      ORDER BY bid_amount DESC
    `

    const result = await pool.query(query, [auctionId])

    return {
      success: true,
      bidHistory: result.rows
    }

  } catch (error) {
    console.error('Error fetching bid history:', error)
    return {
      success: false,
      error: 'Failed to fetch bid history'
    }
  }
}