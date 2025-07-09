// Simple migration script to create collections tables
const { Pool } = require('pg')

// Import database URL from environment (same as app)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:lYnJPGH8cMKR@ep-delicate-darkness-a5vq7qkj.us-east-2.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
})

async function createCollectionsTables() {
  const client = await pool.connect()
  
  try {
    console.log('🚀 Creating collections tables...')
    
    // Create collections table
    await client.query(`
      CREATE TABLE IF NOT EXISTS collections (
        id SERIAL PRIMARY KEY,
        collection_id VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        cover_image TEXT,
        banner_image TEXT,
        creator_address VARCHAR(42) NOT NULL,
        contract_address VARCHAR(42) NOT NULL,
        total_items INTEGER DEFAULT 0,
        floor_price DECIMAL(20, 8) DEFAULT 0,
        total_volume DECIMAL(20, 8) DEFAULT 0,
        is_bundle BOOLEAN DEFAULT FALSE,
        bundle_price DECIMAL(20, 8),
        listing_type SMALLINT DEFAULT 0,
        tx_hash VARCHAR(66),
        block_number BIGINT,
        is_active BOOLEAN DEFAULT TRUE,
        likes_count INTEGER DEFAULT 0,
        views_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS collection_items (
        id SERIAL PRIMARY KEY,
        collection_id VARCHAR(50) NOT NULL,
        listing_id VARCHAR(50) NOT NULL,
        nft_contract VARCHAR(42) NOT NULL,
        token_id VARCHAR(50) NOT NULL,
        price DECIMAL(20, 8),
        position_in_collection INTEGER,
        is_sold BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(collection_id, token_id, nft_contract)
      )
    `)
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS collection_likes (
        id SERIAL PRIMARY KEY,
        collection_id VARCHAR(50) NOT NULL,
        user_address VARCHAR(42) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(collection_id, user_address)
      )
    `)
    
    // Create indexes
    await client.query(`CREATE INDEX IF NOT EXISTS idx_collections_creator ON collections(creator_address)`)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_collections_active ON collections(is_active)`)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_collection_items_collection ON collection_items(collection_id)`)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_collection_likes_collection ON collection_likes(collection_id)`)
    
    console.log('✅ Collections tables created successfully!')
    
  } catch (error) {
    console.error('❌ Error creating tables:', error)
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

createCollectionsTables().catch(console.error)