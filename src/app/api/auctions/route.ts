/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
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
    const params: (string | number)[] = []
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

    // ⚠️ TEMPORARILY DISABLED: Auto-update ended auctions
    const now = new Date()
    console.log('🕒 Current time for auction status check:', now.toISOString())
    
    // Check which auctions would be updated
    const checkResult = await pool.query(`
      SELECT auction_id, title, end_time, state 
      FROM auctions 
      WHERE state = 'ACTIVE' AND end_time <= $1
    `, [now])
    
    if (checkResult.rows.length > 0) {
      console.log('🔄 Would update these auctions to ENDED:', checkResult.rows.map(a => ({
        id: a.auction_id.slice(0,8),
        title: a.title,
        endTime: a.end_time,
        currentState: a.state
      })))
    }
    
    // COMMENTED OUT FOR DEBUGGING
    /*
    await pool.query(`
      UPDATE auctions 
      SET state = 'ENDED', updated_at = CURRENT_TIMESTAMP
      WHERE state = 'ACTIVE' AND end_time <= $1
    `, [now])
    */

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

interface CreateAuctionData {
  auctionId: number
  auctionType: 'SINGLE_NFT' | 'COLLECTION'
  title: string
  description?: string
  sellerAddress: string
  nftContract: string
  tokenId?: number
  tokenIds?: number[]
  nftCount?: number
  collectionImageUrl?: string
  collectionImageDriveId?: string
  startingPrice: string
  reservePrice: string
  minBidIncrement: string
  startTime: number
  endTime: number
  durationHours: number
  allowPublicReveal?: boolean
  nftMetadata?: Record<string, unknown>
  individualNftMetadata?: any[]
  creationTxHash: string
}

// Create new auction
async function createAuction(data: CreateAuctionData) {
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
    individualNftMetadata,
    creationTxHash
  } = data

  try {
    // ✅ FORCE FIX: If individualNftMetadata is undefined but we have nftMetadata.individualNfts, use that
    let actualIndividualNftMetadata = individualNftMetadata
    if (!actualIndividualNftMetadata && nftMetadata && typeof nftMetadata === 'object' && 'individualNfts' in nftMetadata) {
      actualIndividualNftMetadata = (nftMetadata as any).individualNfts
    }

    const query = `
      INSERT INTO auctions (
        auction_id, auction_type, title, description, seller_address,
        nft_contract, token_id, token_ids, nft_count,
        collection_image_url, collection_image_drive_id,
        starting_price, reserve_price, min_bid_increment,
        start_time, end_time, duration_hours, allow_public_reveal,
        nft_metadata, nft_metadata_individuals, creation_tx_hash, state,
        nft_claimed, nft_reclaimed, claim_tx_hash, reclaim_tx_hash, claimed_at, reclaimed_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, 'ACTIVE',
        FALSE, FALSE, NULL, NULL, NULL, NULL
      ) RETURNING *
    `

    // Merge individual NFT metadata into the main metadata for collection auctions
    const finalMetadata = auctionType === 'COLLECTION' ? {
      ...nftMetadata,
      individualNfts: actualIndividualNftMetadata && actualIndividualNftMetadata.length > 0 
        ? actualIndividualNftMetadata 
        : []
    } : nftMetadata

    // ✅ DEBUG: Log metadata construction
    console.log('🔍 DEBUG API finalMetadata construction:', {
      auctionType,
      nftMetadata,
      individualNftMetadata,
      actualIndividualNftMetadata,
      individualNftMetadataLength: actualIndividualNftMetadata?.length || 0,
      finalMetadata,
      individualNftsCount: finalMetadata && typeof finalMetadata === 'object' && 'individualNfts' in finalMetadata 
        ? (finalMetadata.individualNfts as any[])?.length || 0 
        : 0
    })

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
      finalMetadata ? JSON.stringify(finalMetadata) : null,
      actualIndividualNftMetadata && actualIndividualNftMetadata.length > 0 ? JSON.stringify(actualIndividualNftMetadata) : null,
      creationTxHash
    ])

    console.log(`✅ Auction ${auctionId} saved to database`)

    return NextResponse.json({
      success: true,
      auction: result.rows[0]
    })

  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && error.code === '23505') { // Unique constraint violation
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

interface UpdateAuctionStateData {
  auctionId: number
  state: 'ACTIVE' | 'ENDED' | 'FINALIZED' | 'CANCELLED'
  txHash?: string
}

// Update auction state
async function updateAuctionState(data: UpdateAuctionStateData) {
  const { auctionId, state, txHash } = data

  try {
    if (state === 'CANCELLED') {
      // Hard delete cancelled auctions so they no longer appear
      await pool.query('DELETE FROM auctions WHERE auction_id = $1', [auctionId])
      console.log(`🗑️ Auction ${auctionId} deleted from database (cancelled)`)
      return NextResponse.json({ success: true })
    }

    const query = `
      UPDATE auctions
      SET state = $2, updated_at = CURRENT_TIMESTAMP${txHash ? ', finalization_tx_hash = $3' : ''}
      WHERE auction_id = $1
    `

    const params: (string | number)[] = [auctionId, state]
    if (txHash) params.push(txHash)

    await pool.query(query, params)

    console.log(`✅ Auction ${auctionId} state updated to ${state}`)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating auction state:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update auction state' },
      { status: 500 }
    )
  }
}

interface FinalizeAuctionData {
  auctionId: number
  winnerAddress?: string
  finalPrice?: string
  totalBids?: number
  uniqueBidders?: number
  finalizationTxHash: string
}

// Finalize auction with results
async function finalizeAuction(data: FinalizeAuctionData) {
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

interface SyncBidHistoryData {
  auctionId: number
  bidHistory?: Array<{
    bidder: string
    amount: string
    bidNumber: number
    timestamp: string
  }>
}

// Sync bid history from blockchain
async function syncBidHistory(data: SyncBidHistoryData) {
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
async function GET_BID_HISTORY(auctionId: string) {
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