import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { auctionId, txHash, claimerAddress } = await request.json()

    if (!auctionId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Auction ID is required' 
      }, { status: 400 })
    }

    console.log(`🎯 Claiming NFT for auction ${auctionId} with:`, {
      txHash,
      claimerAddress
    })

    // Update auction state to CLAIMED
    const result = await db.sql`
      UPDATE auctions 
      SET 
        nft_claimed = TRUE,
        claim_tx_hash = ${txHash || null},
        claimed_at = NOW(),
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

    console.log(`✅ NFT claimed successfully for auction ${auctionId}:`, result[0])

    return NextResponse.json({ 
      success: true, 
      auction: result[0] 
    })

  } catch (error) {
    console.error('❌ Error claiming NFT:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to claim NFT' 
    }, { status: 500 })
  }
}