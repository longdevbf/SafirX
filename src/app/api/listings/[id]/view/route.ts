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

    // Increment views count
    const result = await pool.query(
      `UPDATE listings 
       SET views_count = views_count + 1, 
           updated_at = CURRENT_TIMESTAMP
       WHERE listing_id = $1 
       RETURNING views_count`,
      [listingId]
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Listing not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      message: 'View count updated successfully',
      views_count: result.rows[0].views_count
    })

  } catch (error) {
    console.error('Error updating view count:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}