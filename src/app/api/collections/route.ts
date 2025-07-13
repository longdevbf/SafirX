/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'
import { google } from 'googleapis'
import { Readable } from 'stream'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
})

// Google Drive setup
let drive: any = null
let driveInitialized = false

try {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_DRIVE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_DRIVE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  })

  drive = google.drive({ version: 'v3', auth })
  driveInitialized = true
  console.log('✅ Google Drive initialized successfully')
} catch (error) {
  console.error('❌ Failed to initialize Google Drive:', error)
  driveInitialized = false
}

async function uploadToGoogleDrive(file: File, fileName: string): Promise<string> {
  try {
    if (!driveInitialized || !drive) {
      throw new Error('Google Drive not initialized. Check environment variables.')
    }
    
    console.log('🔄 Starting Google Drive upload for:', fileName)
    console.log('📁 File details:', { size: file.size, type: file.type, name: file.name })
    
    const buffer = Buffer.from(await file.arrayBuffer())
    const stream = Readable.from(buffer)
    
    console.log('📤 Creating file in Google Drive...')
    const response = await drive.files.create({
      requestBody: {
        name: `collection_${fileName}_${Date.now()}.${file.name.split('.').pop()}`,
        parents: [process.env.GOOGLE_DRIVE_FOLDER_ID!],
      },
      media: {
        mimeType: file.type,
        body: stream,
      },
    })

    const fileId = response.data.id
    
    if (!fileId) {
      throw new Error('Failed to get file ID from Google Drive response')
    }
    
    console.log('✅ File created with ID:', fileId)
    
    // Make file publicly accessible
    console.log('🔓 Setting file permissions...')
    await drive.permissions.create({
      fileId: fileId,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    })
    
    const imageUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=w800`
    console.log('✅ Upload complete. Image URL:', imageUrl)

    // Return direct image URL that works with Next.js Image component
    return imageUrl
  } catch (error) {
    console.error('❌ Google Drive upload error:', error)
    throw error // Re-throw the error so it can be handled by the caller
  }
}

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

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type')
    
    if (contentType?.includes('multipart/form-data')) {
      console.log('🔄 Processing image upload...')
      
      // Check environment variables
      console.log('🔍 Checking environment variables...')
      console.log('GOOGLE_DRIVE_CLIENT_EMAIL:', !!process.env.GOOGLE_DRIVE_CLIENT_EMAIL)
      console.log('GOOGLE_DRIVE_PRIVATE_KEY:', !!process.env.GOOGLE_DRIVE_PRIVATE_KEY)
      console.log('GOOGLE_DRIVE_FOLDER_ID:', !!process.env.GOOGLE_DRIVE_FOLDER_ID)
      
      if (!driveInitialized) {
        console.error('❌ Google Drive not initialized')
        return NextResponse.json({ 
          error: 'Google Drive not configured properly.',
          details: 'Check environment variables'
        }, { status: 500 })
      }
      
      const formData = await request.formData()
      const file = formData.get('file') as File
      
      if (!file) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 })
      }
      
      console.log('📁 File details:', {
        name: file.name,
        size: file.size,
        type: file.type
      })

      try {
        const url = await uploadToGoogleDrive(file, 'collection_cover')
        console.log('✅ Upload successful:', url)
        return NextResponse.json({ url })
      } catch (uploadError) {
        console.error('❌ Google Drive upload failed:', uploadError)
        
        return NextResponse.json({ 
          error: 'Failed to upload image to Google Drive',
          details: (uploadError as Error).message
        }, { status: 500 })
      }
    } else {
      // Handle collection listing creation
      const body = await request.json()
      const {
        collection_id,
        name,
        description,
        cover_image_url,
        cover_image_drive_id,
        creator_address,
        contract_address,
        is_bundle,
        bundle_price,
        listing_type,
        tx_hash,
        total_items,
        items // Array of NFT items with metadata
      } = body

      const client = await pool.connect()
      
      try {
        await client.query('BEGIN')
        
        // Insert each NFT as a separate listing in the unified listings table
        for (const item of items) {
          const {
            listing_id,
            token_id,
            price,
            nft_name,
            nft_description,
            nft_image,
            nft_attributes,
            nft_rarity
          } = item

          await client.query(`
            INSERT INTO listings (
              listing_id, 
              nft_contract, 
              token_id, 
              seller, 
              price, 
              collection_name, 
              name, 
              description, 
              category, 
              image, 
              attributes, 
              rarity, 
              is_bundle, 
              bundle_token_ids, 
              collection_image, 
              tx_hash, 
              is_active,
              created_at,
              cover_image_url,
              cover_image_drive_id,
              individual_images,
              individual_metadata,
              nft_names,
              nft_descriptions,
              token_ids_array,
              individual_prices,
              collection_type,
              bundle_price,
              individual_price,
              metadata_synced,
              parent_collection_id,
              is_collection_item,
              collection_position
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33)
            ON CONFLICT (listing_id) DO UPDATE SET
              nft_contract = EXCLUDED.nft_contract,
              token_id = EXCLUDED.token_id,
              seller = EXCLUDED.seller,
              price = EXCLUDED.price,
              collection_name = EXCLUDED.collection_name,
              name = EXCLUDED.name,
              description = EXCLUDED.description,
              category = EXCLUDED.category,
              image = EXCLUDED.image,
              attributes = EXCLUDED.attributes,
              rarity = EXCLUDED.rarity,
              is_bundle = EXCLUDED.is_bundle,
              bundle_token_ids = EXCLUDED.bundle_token_ids,
              collection_image = EXCLUDED.collection_image,
              tx_hash = EXCLUDED.tx_hash,
              is_active = EXCLUDED.is_active,
              cover_image_url = EXCLUDED.cover_image_url,
              cover_image_drive_id = EXCLUDED.cover_image_drive_id,
              individual_images = EXCLUDED.individual_images,
              individual_metadata = EXCLUDED.individual_metadata,
              nft_names = EXCLUDED.nft_names,
              nft_descriptions = EXCLUDED.nft_descriptions,
              token_ids_array = EXCLUDED.token_ids_array,
              individual_prices = EXCLUDED.individual_prices,
              collection_type = EXCLUDED.collection_type,
              bundle_price = EXCLUDED.bundle_price,
              individual_price = EXCLUDED.individual_price,
              metadata_synced = EXCLUDED.metadata_synced,
              parent_collection_id = EXCLUDED.parent_collection_id,
              is_collection_item = EXCLUDED.is_collection_item,
              collection_position = EXCLUDED.collection_position,
              updated_at = NOW()
          `, [
            listing_id,
            contract_address,
            token_id,
            creator_address,
            price.toString(),
            name,
            nft_name || `${name} #${token_id}`,
            nft_description || description,
            'Collection',
            nft_image || cover_image_url,
            nft_attributes || '[]',
            nft_rarity || 'Common',
            is_bundle,
            is_bundle ? items.map((i: { token_id: any }) => i.token_id).join(',') : token_id,
            cover_image_url || '',
            tx_hash,
            true,
            new Date().toISOString(),
            cover_image_url || '',
            cover_image_drive_id || '',
            JSON.stringify(items.map((i: { nft_image: any }) => i.nft_image || cover_image_url)),
            JSON.stringify(items.map((i: { nft_name: any; nft_description: any; nft_attributes: any }) => ({ 
              name: i.nft_name, 
              description: i.nft_description, 
              attributes: i.nft_attributes 
            }))),
            JSON.stringify(items.map((i: { nft_name: any }) => i.nft_name)),
            JSON.stringify(items.map((i: { nft_description: any }) => i.nft_description)),
            JSON.stringify(items.map((i: { token_id: any }) => i.token_id)),
            JSON.stringify(items.map((i: { price: { toString: () => any } }) => i.price.toString())),
            is_bundle ? 'bundle' : (listing_type === 2 ? 'same-price' : 'individual'),
            bundle_price ? bundle_price.toString() : null,
            is_bundle ? null : price.toString(),
            true, // metadata_synced
            is_bundle ? null : collection_id, // parent_collection_id
            !is_bundle, // is_collection_item
            is_bundle ? null : items.findIndex((i: { token_id: any }) => i.token_id === token_id) + 1 // collection_position
          ])
        }
        
        await client.query('COMMIT')
        
        return NextResponse.json({ 
          success: true, 
          message: 'Collection saved to database successfully',
          total_items: items.length 
        })
        
      } catch (error) {
        await client.query('ROLLBACK')
        throw error
      } finally {
        client.release()
      }
    }
  } catch (error) {
    console.error('❌ General error in POST:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    )
  }
}