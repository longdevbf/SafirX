/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextRequest, NextResponse } from 'next/server'
import { auctionQueries } from '@/lib/db'

export async function POST(request: NextRequest) {
    try {
        const { auctionId, bidderAddress, bidAmount, txHash } = await request.json()

        if (!auctionId || !bidderAddress || !bidAmount) {
            return NextResponse.json(
                { error: 'Missing required fields: auctionId, bidderAddress, bidAmount' },
                { status: 400 }
            )
        }

        // ✅ Update auction with bid information
        const result = await auctionQueries.updateAuctionBid(auctionId, bidderAddress, bidAmount)

        if (!result) {
            return NextResponse.json(
                { error: 'Auction not found' },
                { status: 404 }
            )
        }

        return NextResponse.json({ 
            success: true, 
            message: `Bid updated for auction ${auctionId}` 
        })

    } catch (error) {
        console.error('❌ Error updating bid:', error)
        return NextResponse.json(
            { error: 'Failed to update bid' },
            { status: 500 }
        )
    }
} 