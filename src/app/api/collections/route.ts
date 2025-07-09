import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

// ✅ GET /api/collections - Get all collections with pagination
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const creator = searchParams.get('creator')
    const isActive = searchParams.get('active')
    const sortBy = searchParams.get('sort') || 'created_at'
    const order = searchParams.get('order') || 'DESC'
    
    const offset = (page - 1) * limit
    
    // Build WHERE clause
    const conditions = []
    const values = []
    let paramCount = 0
    
    if (creator) {
      paramCount++
      conditions.push(`creator_address = $${paramCount}`)
      values.push(creator)
    }
    
    if (isActive !== null && isActive !== undefined) {
      paramCount++
      conditions.push(`is_active = $${paramCount}`)
      values.push(isActive === 'true')
    }
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
    
    // Get collections with stats
    const collectionsQuery = `
      SELECT 
        c.*,
        COUNT(ci.id) as item_count,
        COUNT(cl.id) as likes_count_actual,
        COALESCE(MIN(ci.price), 0) as floor_price_calculated
      FROM collections c
      LEFT JOIN collection_items ci ON c.collection_id = ci.collection_id AND ci.is_sold = false
      LEFT JOIN collection_likes cl ON c.collection_id = cl.collection_id
      ${whereClause}
      GROUP BY c.id
      ORDER BY ${sortBy} ${order}
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `
    
    values.push(limit, offset)
    
    // Get total count
    const countQuery = `
      SELECT COUNT(DISTINCT c.id) as total
      FROM collections c
      ${whereClause}
    `
    
    const [collectionsResult, countResult] = await Promise.all([
      pool.query(collectionsQuery, values),
      pool.query(countQuery, values.slice(0, -2)) // Remove limit and offset for count
    ])
    
    const collections = collectionsResult.rows
    const totalCount = parseInt(countResult.rows[0].total)
    const totalPages = Math.ceil(totalCount / limit)
    
    return NextResponse.json({
      collections,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    })
  } catch (error) {
    console.error('Error fetching collections:', error)
    return NextResponse.json(
      { error: 'Failed to fetch collections' },
      { status: 500 }
    )
  }
}

// ✅ POST /api/collections - Create new collection
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      collection_id,
      name,
      description,
      cover_image,
      banner_image,
      creator_address,
      contract_address,
      is_bundle = false,
      bundle_price,
      listing_type = 0,
      tx_hash,
      block_number,
      items = [] // Array of NFT items to add to collection
    } = body
    
    // Validate required fields
    if (!collection_id || !name || !creator_address || !contract_address) {
      return NextResponse.json(
        { error: 'Missing required fields: collection_id, name, creator_address, contract_address' },
        { status: 400 }
      )
    }
    
    const client = await pool.connect()
    
    try {
      await client.query('BEGIN')
      
      // Insert collection
      const collectionQuery = `
        INSERT INTO collections (
          collection_id, name, description, cover_image, banner_image,
          creator_address, contract_address, is_bundle, bundle_price,
          listing_type, tx_hash, block_number, total_items
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *
      `
      
      const collectionResult = await client.query(collectionQuery, [
        collection_id, name, description, cover_image, banner_image,
        creator_address, contract_address, is_bundle, bundle_price,
        listing_type, tx_hash, block_number, items.length
      ])
      
      const collection = collectionResult.rows[0]
      
      // Insert collection items if provided
      if (items.length > 0) {
        const itemsQuery = `
          INSERT INTO collection_items (
            collection_id, listing_id, nft_contract, token_id, price, position_in_collection
          ) VALUES ($1, $2, $3, $4, $5, $6)
        `
        
        for (let i = 0; i < items.length; i++) {
          const item = items[i]
          await client.query(itemsQuery, [
            collection_id,
            item.listing_id,
            item.nft_contract,
            item.token_id,
            item.price,
            i + 1 // position starts from 1
          ])
        }
      }
      
      await client.query('COMMIT')
      
      return NextResponse.json({
        success: true,
        collection,
        message: 'Collection created successfully'
      })
      
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
    
  } catch (error) {
    console.error('Error creating collection:', error)
    
    // Handle duplicate collection_id
    if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
      return NextResponse.json(
        { error: 'Collection with this ID already exists' },
        { status: 409 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to create collection' },
      { status: 500 }
    )
  }
}