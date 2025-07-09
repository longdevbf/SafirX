import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

// ✅ POST /api/collections/[id]/like - Like/Unlike collection
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const collectionId = params.id
    const body = await request.json()
    const { user_address } = body
    
    if (!user_address) {
      return NextResponse.json(
        { error: 'User address is required' },
        { status: 400 }
      )
    }
    
    const client = await pool.connect()
    
    try {
      await client.query('BEGIN')
      
      // Check if already liked
      const existingLike = await client.query(
        'SELECT id FROM collection_likes WHERE collection_id = $1 AND user_address = $2',
        [collectionId, user_address]
      )
      
      let isLiked = false
      let likesCount = 0
      
      if (existingLike.rows.length > 0) {
        // Unlike - remove like
        await client.query(
          'DELETE FROM collection_likes WHERE collection_id = $1 AND user_address = $2',
          [collectionId, user_address]
        )
        
        // Decrement likes count
        await client.query(
          'UPDATE collections SET likes_count = GREATEST(likes_count - 1, 0) WHERE collection_id = $1',
          [collectionId]
        )
        
        isLiked = false
      } else {
        // Like - add like
        await client.query(
          'INSERT INTO collection_likes (collection_id, user_address) VALUES ($1, $2)',
          [collectionId, user_address]
        )
        
        // Increment likes count
        await client.query(
          'UPDATE collections SET likes_count = likes_count + 1 WHERE collection_id = $1',
          [collectionId]
        )
        
        isLiked = true
      }
      
      // Get updated likes count
      const countResult = await client.query(
        'SELECT likes_count FROM collections WHERE collection_id = $1',
        [collectionId]
      )
      
      if (countResult.rows.length > 0) {
        likesCount = parseInt(countResult.rows[0].likes_count) || 0
      }
      
      await client.query('COMMIT')
      
      return NextResponse.json({
        success: true,
        isLiked,
        likesCount,
        message: isLiked ? 'Collection liked' : 'Collection unliked'
      })
      
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
    
  } catch (error) {
    console.error('Error toggling collection like:', error)
    return NextResponse.json(
      { error: 'Failed to toggle like' },
      { status: 500 }
    )
  }
}

// ✅ GET /api/collections/[id]/like - Check if user liked collection
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const collectionId = params.id
    const { searchParams } = new URL(request.url)
    const userAddress = searchParams.get('user_address')
    
    if (!userAddress) {
      return NextResponse.json({
        isLiked: false,
        likesCount: 0
      })
    }
    
    // Check if user liked this collection
    const likeResult = await pool.query(
      'SELECT id FROM collection_likes WHERE collection_id = $1 AND user_address = $2',
      [collectionId, userAddress]
    )
    
    // Get total likes count
    const countResult = await pool.query(
      'SELECT likes_count FROM collections WHERE collection_id = $1',
      [collectionId]
    )
    
    const isLiked = likeResult.rows.length > 0
    const likesCount = countResult.rows.length > 0 ? parseInt(countResult.rows[0].likes_count) || 0 : 0
    
    return NextResponse.json({
      isLiked,
      likesCount
    })
    
  } catch (error) {
    console.error('Error checking collection like status:', error)
    return NextResponse.json(
      { error: 'Failed to check like status' },
      { status: 500 }
    )
  }
}