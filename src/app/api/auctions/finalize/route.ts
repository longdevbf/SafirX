import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { auctionId, txHash } = await request.json()

    if (!auctionId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Auction ID is required' 
      }, { status: 400 })
    }

    console.log(` Finalizing auction ${auctionId} with txHash:`, txHash)

    // ✅ FIX: Chỉ cập nhật state và txHash, không cần winnerAddress/finalPrice
    const result = await db.sql`
      UPDATE auctions 
      SET 
        state = 'FINALIZED',
        finalization_tx_hash = ${txHash || null},
        finalized_at = NOW(),
        updated_at = NOW()
      WHERE auction_id = ${auctionId}
      RETURNING *
    `

    if (!result || !Array.isArray(result) || result.length === 0) {
      console.error(`❌ Auction ${auctionId} not found in database`)
      return NextResponse.json({ 
        success: false, 
        error: 'Auction not found' 
      }, { status: 404 })
    }

    console.log(`✅ Auction ${auctionId} finalized successfully:`, result[0])

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