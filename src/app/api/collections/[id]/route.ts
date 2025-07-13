import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

// ✅ GET /api/collections/[id] - Get collection details with items
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: collectionId } = await params
    
    // Get collection details
    const collectionQuery = `
      SELECT 
        c.*,
        COUNT(ci.id) as item_count,
        COUNT(cl.id) as likes_count_actual,
        COALESCE(MIN(ci.price), 0) as floor_price_calculated,
        COALESCE(MAX(ci.price), 0) as ceiling_price,
        COALESCE(AVG(ci.price), 0) as avg_price
      FROM collections c
      LEFT JOIN collection_items ci ON c.collection_id = ci.collection_id AND ci.is_sold = false
      LEFT JOIN collection_likes cl ON c.collection_id = cl.collection_id
      WHERE c.collection_id = $1
      GROUP BY c.id
    `
    
    const collectionResult = await pool.query(collectionQuery, [collectionId])
    
    if (collectionResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Collection not found' },
        { status: 404 }
      )
    }
    
    const collection = collectionResult.rows[0]
    
    // Get collection items with NFT details
    const itemsQuery = `
      SELECT 
        ci.*,
        l.name as nft_name,
        l.description as nft_description,
        l.image as nft_image,
        l.attributes as nft_attributes,
        l.rarity as nft_rarity,
        l.seller as current_seller,
        l.is_active as is_listing_active
      FROM collection_items ci
      LEFT JOIN listings l ON ci.listing_id = l.listing_id
      WHERE ci.collection_id = $1
      ORDER BY ci.position_in_collection ASC, ci.created_at ASC
    `
    
    const itemsResult = await pool.query(itemsQuery, [collectionId])
    
    // Increment view count
    await pool.query(
      'UPDATE collections SET views_count = views_count + 1 WHERE collection_id = $1',
      [collectionId]
    )
    
    return NextResponse.json({
      collection: {
        ...collection,
        likes_count: parseInt(collection.likes_count_actual) || 0,
        item_count: parseInt(collection.item_count) || 0,
        floor_price: parseFloat(collection.floor_price_calculated) || 0,
        ceiling_price: parseFloat(collection.ceiling_price) || 0,
        avg_price: parseFloat(collection.avg_price) || 0
      },
      items: itemsResult.rows.map(item => ({
        ...item,
        price: parseFloat(item.price) || 0,
        nft_attributes: item.nft_attributes ? JSON.parse(item.nft_attributes) : []
      }))
    })
    
  } catch (error) {
    console.error('Error fetching collection details:', error)
    return NextResponse.json(
      { error: 'Failed to fetch collection details' },
      { status: 500 }
    )
  }
}

// ✅ PUT /api/collections/[id] - Update collection
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: collectionId } = await params
    const body = await request.json()
    const {
      name,
      description,
      cover_image,
      banner_image,
      bundle_price,
      is_active
    } = body
    
    // Build update query dynamically
    const updates = []
    const values = []
    let paramCount = 0
    
    if (name !== undefined) {
      paramCount++
      updates.push(`name = $${paramCount}`)
      values.push(name)
    }
    
    if (description !== undefined) {
      paramCount++
      updates.push(`description = $${paramCount}`)
      values.push(description)
    }
    
    if (cover_image !== undefined) {
      paramCount++
      updates.push(`cover_image = $${paramCount}`)
      values.push(cover_image)
    }
    
    if (banner_image !== undefined) {
      paramCount++
      updates.push(`banner_image = $${paramCount}`)
      values.push(banner_image)
    }
    
    if (bundle_price !== undefined) {
      paramCount++
      updates.push(`bundle_price = $${paramCount}`)
      values.push(bundle_price)
    }
    
    if (is_active !== undefined) {
      paramCount++
      updates.push(`is_active = $${paramCount}`)
      values.push(is_active)
    }
    
    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      )
    }
    
    paramCount++
    values.push(collectionId)
    
    const updateQuery = `
      UPDATE collections 
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE collection_id = $${paramCount}
      RETURNING *
    `
    
    const result = await pool.query(updateQuery, values)
    
    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Collection not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      collection: result.rows[0],
      message: 'Collection updated successfully'
    })
    
  } catch (error) {
    console.error('Error updating collection:', error)
    return NextResponse.json(
      { error: 'Failed to update collection' },
      { status: 500 }
    )
  }
}

// ✅ DELETE /api/collections/[id] - Delete collection
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: collectionId } = await params
    
    const result = await pool.query(
      'DELETE FROM collections WHERE collection_id = $1 RETURNING *',
      [collectionId]
    )
    
    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Collection not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      message: 'Collection deleted successfully'
    })
    
  } catch (error) {
    console.error('Error deleting collection:', error)
    return NextResponse.json(
      { error: 'Failed to delete collection' },
      { status: 500 }
    )
  }
}