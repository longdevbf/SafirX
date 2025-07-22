/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextRequest, NextResponse } from 'next/server'
import { auctionQueries } from '@/lib/db'

export async function PUT(request: NextRequest) {
    try {
        const { auctionId, state, txHash } = await request.json()

        if (!auctionId || !state) {
            return NextResponse.json(
                { error: 'Missing required fields: auctionId, state' },
                { status: 400 }
            )
        }

        // ✅ Update auction state using db.ts
        const result = await auctionQueries.updateAuctionState(auctionId, state)

        if (!result) {
            return NextResponse.json(
                { error: 'Auction not found' },
                { status: 404 }
            )
        }

        return NextResponse.json({ 
            success: true, 
            message: `Auction ${auctionId} state updated to ${state}` 
        })

    } catch (error) {
        console.error('❌ Error updating auction state:', error)
        return NextResponse.json(
            { error: 'Failed to update auction state' },
            { status: 500 }
        )
    }
} 