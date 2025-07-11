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
    const { action, auctionId, bidHistory } = await request.json()
    
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
    console.error('❌ Error syncing bid history:', error)
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