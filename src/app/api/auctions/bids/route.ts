import { NextRequest, NextResponse } from "next/server"
import { Pool } from "pg"

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('neon.tech') ? { rejectUnauthorized: false } : false,
})

// GET - Fetch bid history for an auction
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const auctionId = searchParams.get('auctionId')

  if (!auctionId) {
    return NextResponse.json({ 
      success: false, 
      error: 'Auction ID is required' 
    }, { status: 400 })
  }

  try {
    const client = await pool.connect()
    
    // Get bid history for this auction
    const result = await client.query(
      `SELECT 
        abh.*,
        a.title as auction_title,
        a.state as auction_state,
        a.allow_public_reveal
      FROM auction_bid_history abh
      JOIN auctions a ON abh.auction_id = a.auction_id
      WHERE abh.auction_id = $1
      ORDER BY abh.bid_amount DESC, abh.bid_timestamp ASC`,
      [auctionId]
    )

    client.release()

    return NextResponse.json({
      success: true,
      bidHistory: result.rows,
      totalBids: result.rows.length,
      message: `Found ${result.rows.length} bids for auction ${auctionId}`
    })

  } catch (error) {
    console.error('❌ Error fetching bid history:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

// POST - Sync bid history from blockchain
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Check if this is a new bid update
    if (body.auctionId && body.bidderAddress && body.bidAmount) {
      // Handle new bid update
      const { auctionId, bidderAddress, bidAmount } = body
      
      console.log(`🔍 Processing bid update for auction ${auctionId}:`, {
        bidderAddress,
        bidAmount,
        timestamp: new Date().toISOString()
      })
      
      const client = await pool.connect()
      
      try {
        await client.query('BEGIN')
        
        // Get current auction data
        const auction = await client.query(
          'SELECT total_bids, unique_bidders FROM auctions WHERE auction_id = $1',
          [auctionId]
        )

        if (auction.rows.length === 0) {
          await client.query('ROLLBACK')
          console.log(`❌ Auction ${auctionId} not found in database`)
          return NextResponse.json(
            { success: false, error: `Auction ${auctionId} not found in database` },
            { status: 404 }
          )
        }

        const currentAuction = auction.rows[0]
        const currentTotalBids = parseInt(currentAuction.total_bids || '0')
        const currentUniqueBidders = parseInt(currentAuction.unique_bidders || '0')
        
        console.log(`📊 Current auction stats: total_bids=${currentTotalBids}, unique_bidders=${currentUniqueBidders}`)

        // Check if this bidder has already bid on this auction
        const existingBid = await client.query(
          'SELECT id FROM auction_bid_history WHERE auction_id = $1 AND bidder_address = $2',
          [auctionId, bidderAddress]
        )

        const isNewBidder = existingBid.rows.length === 0
        // ✅ FIXED: Chỉ tăng total_bids và unique_bidders khi có bidder mới
        const newTotalBids = isNewBidder ? currentTotalBids + 1 : currentTotalBids
        const newUniqueBidders = isNewBidder ? currentUniqueBidders + 1 : currentUniqueBidders
        
        console.log(`🔄 Bidder status: isNewBidder=${isNewBidder}`)
        console.log(`📈 New stats: total_bids=${newTotalBids}, unique_bidders=${newUniqueBidders}`)

        // Update auction with new bid counts
        await client.query(
          `UPDATE auctions 
           SET total_bids = $1, unique_bidders = $2, updated_at = NOW()
           WHERE auction_id = $3`,
          [newTotalBids.toString(), newUniqueBidders.toString(), auctionId]
        )

        // Insert bid record into auction_bid_history
        await client.query(
          `INSERT INTO auction_bid_history 
           (auction_id, bidder_address, bid_amount, bid_number, bid_timestamp, visibility)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (auction_id, bidder_address) 
           DO UPDATE SET 
             bid_amount = EXCLUDED.bid_amount,
             bid_timestamp = EXCLUDED.bid_timestamp,
             synced_at = NOW()`,
          [
            auctionId, 
            bidderAddress, 
            bidAmount, 
            isNewBidder ? newTotalBids : (existingBid.rows[0]?.bid_number || 1), // Giữ nguyên bid_number nếu update
            new Date().toISOString(),
            'HIDDEN' // Sealed bids are hidden by default
          ]
        )
        
        await client.query('COMMIT')
        
        console.log(`✅ Updated bid counts for auction ${auctionId}: total_bids=${newTotalBids}, unique_bidders=${newUniqueBidders}`)
        
        return NextResponse.json({
          success: true,
          data: {
            auctionId,
            totalBids: newTotalBids,
            uniqueBidders: newUniqueBidders,
            isNewBidder
          }
        })
        
      } catch (error) {
        await client.query('ROLLBACK')
        throw error
      } finally {
        client.release()
      }
    }
    
    // Handle sync bid history (existing logic)
    const { action, auctionId, bidHistory } = body
    
    if (action !== 'sync') {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid action' 
      }, { status: 400 })
    }

    if (!auctionId || !bidHistory || !Array.isArray(bidHistory)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Auction ID and bid history array are required' 
      }, { status: 400 })
    }

    const client = await pool.connect()
    
    try {
      await client.query('BEGIN')
      
      // Clear existing bid history for this auction
      await client.query(
        'DELETE FROM auction_bid_history WHERE auction_id = $1',
        [auctionId]
      )
      
      // Insert new bid history
      for (const bid of bidHistory) {
        await client.query(
          `INSERT INTO auction_bid_history 
           (auction_id, bidder_address, bid_amount, bid_number, bid_timestamp, visibility)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            auctionId,
            bid.bidder_address,
            bid.bid_amount,
            bid.bid_number,
            bid.bid_timestamp,
            bid.visibility || 'HIDDEN'
          ]
        )
      }
      
      // Update auction stats
      await client.query(
        `UPDATE auctions 
         SET total_bids = $1, 
             unique_bidders = $2, 
             updated_at = CURRENT_TIMESTAMP
         WHERE auction_id = $3`,
        [
          bidHistory.length,
          new Set(bidHistory.map(b => b.bidder_address.toLowerCase())).size,
          auctionId
        ]
      )
      
      await client.query('COMMIT')
      
      console.log(`✅ Synced ${bidHistory.length} bids for auction ${auctionId}`)
      
      return NextResponse.json({
        success: true,
        message: `Synced ${bidHistory.length} bids for auction ${auctionId}`,
        totalBids: bidHistory.length
      })
      
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }

  } catch (error) {
    console.error('❌ Error in POST /api/auctions/bids:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

// PUT - Update bid visibility (for reveal functionality)
export async function PUT(request: NextRequest) {
  try {
    const { auctionId, bidderAddress, visibility } = await request.json()
    
    if (!auctionId || !bidderAddress || !visibility) {
      return NextResponse.json({ 
        success: false, 
        error: 'Auction ID, bidder address, and visibility are required' 
      }, { status: 400 })
    }

    if (!['HIDDEN', 'REVEALED', 'AUTO_REVEALED'].includes(visibility)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid visibility value' 
      }, { status: 400 })
    }

    const client = await pool.connect()
    
    const result = await client.query(
      `UPDATE auction_bid_history 
       SET visibility = $1, synced_at = CURRENT_TIMESTAMP
       WHERE auction_id = $2 AND bidder_address = $3`,
      [visibility, auctionId, bidderAddress]
    )

    client.release()

    if (result.rowCount === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Bid not found' 
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: `Updated bid visibility to ${visibility} for auction ${auctionId}`,
      affectedRows: result.rowCount
    })

  } catch (error) {
    console.error('❌ Error updating bid visibility:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}