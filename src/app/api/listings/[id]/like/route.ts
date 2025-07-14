import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const listingId = params.id

    // Update like count
    const result = await db.sql`
      UPDATE listings 
      SET likes_count = likes_count + 1, updated_at = NOW()
      WHERE listing_id = ${listingId}
      RETURNING likes_count
    `

    if (!result || !Array.isArray(result) || result.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Listing not found' 
      }, { status: 404 })
    }

    return NextResponse.json({ 
      success: true, 
      likes_count: result[0].likes_count 
    })

  } catch (error) {
    console.error('❌ Error updating like count:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to update like count' 
    }, { status: 500 })
  }
}