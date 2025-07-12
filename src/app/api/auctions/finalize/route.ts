import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { auctionId, txHash, winnerAddress, finalPrice } = await request.json()

    if (!auctionId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Auction ID is required' 
      }, { status: 400 })
    }

    // Update auction state to FINALIZED
    const result = await db.sql`
      UPDATE auctions 
      SET 
        state = 'FINALIZED',
        winner_address = ${winnerAddress || null},
        final_price = ${finalPrice || null},
        finalization_tx_hash = ${txHash || null},
        finalized_at = NOW(),
        updated_at = NOW()
      WHERE auction_id = ${auctionId}
      RETURNING *
    `

    if (!result || !Array.isArray(result) || result.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Auction not found' 
      }, { status: 404 })
    }

     //auction ${auctionId} to FINALIZED state`)

    return NextResponse.json({ 
      success: true, 
      auction: result[0] 
    })

  } catch (error) {
    console.error('❌ Error finalizing auction:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to finalize auction' 
    }, { status: 500 })
  }
}