import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: listingId } = await params

    if (!listingId) {
      return NextResponse.json(
        { error: 'Listing ID is required' },
        { status: 400 }
      )
    }

    // Increment likes count
    const result = await pool.query(
      `UPDATE listings 
       SET likes_count = likes_count + 1, 
           updated_at = CURRENT_TIMESTAMP
       WHERE listing_id = $1 
       RETURNING likes_count`,
      [listingId]
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Listing not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      message: 'Listing liked successfully',
      likes_count: result.rows[0].likes_count
    })

  } catch (error) {
    console.error('Error liking listing:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}