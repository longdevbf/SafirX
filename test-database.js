#!/usr/bin/env node

const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

async function testDatabase() {
  const client = await pool.connect()
  
  try {
    console.log('🔍 Testing database connection...')
    
    // Test connection
    const result = await client.query('SELECT NOW()')
    console.log('✅ Database connected successfully')
    
    // Create collections table
    console.log('📋 Creating collections table...')
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
        
        -- Collection stats
        total_items INTEGER DEFAULT 0,
        floor_price DECIMAL(20, 8) DEFAULT 0,
        total_volume DECIMAL(20, 8) DEFAULT 0,
        
        -- Collection type and pricing
        is_bundle BOOLEAN DEFAULT FALSE,
        bundle_price DECIMAL(20, 8),
        listing_type SMALLINT DEFAULT 0,
        
        -- Blockchain data
        tx_hash VARCHAR(66),
        block_number BIGINT,
        is_active BOOLEAN DEFAULT TRUE,
        
        -- Social stats
        likes_count INTEGER DEFAULT 0,
        views_count INTEGER DEFAULT 0,
        
        -- Timestamps
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    console.log('✅ Collections table created')
    
    // Create collection_items table
    console.log('📋 Creating collection_items table...')
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
    console.log('✅ Collection items table created')
    
    // Create collection_likes table
    console.log('📋 Creating collection_likes table...')
    await client.query(`
      CREATE TABLE IF NOT EXISTS collection_likes (
        id SERIAL PRIMARY KEY,
        collection_id VARCHAR(50) NOT NULL,
        user_address VARCHAR(42) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        UNIQUE(collection_id, user_address)
      )
    `)
    console.log('✅ Collection likes table created')
    
    // Create indexes
    console.log('📋 Creating indexes...')
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_collections_creator ON collections(creator_address)',
      'CREATE INDEX IF NOT EXISTS idx_collections_contract ON collections(contract_address)',
      'CREATE INDEX IF NOT EXISTS idx_collections_active ON collections(is_active)',
      'CREATE INDEX IF NOT EXISTS idx_collections_bundle ON collections(is_bundle)',
      'CREATE INDEX IF NOT EXISTS idx_collection_items_collection ON collection_items(collection_id)',
      'CREATE INDEX IF NOT EXISTS idx_collection_items_listing ON collection_items(listing_id)',
      'CREATE INDEX IF NOT EXISTS idx_collection_likes_collection ON collection_likes(collection_id)',
      'CREATE INDEX IF NOT EXISTS idx_collection_likes_user ON collection_likes(user_address)'
    ]
    
    for (const indexQuery of indexes) {
      await client.query(indexQuery)
    }
    console.log('✅ Indexes created')
    
    // Create update trigger function
    console.log('📋 Creating update trigger...')
    await client.query(`
      CREATE OR REPLACE FUNCTION update_collection_timestamp()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `)
    
    // Create trigger
    await client.query(`
      DROP TRIGGER IF EXISTS collections_updated_at ON collections
    `)
    
    await client.query(`
      CREATE TRIGGER collections_updated_at
        BEFORE UPDATE ON collections
        FOR EACH ROW
        EXECUTE FUNCTION update_collection_timestamp()
    `)
    console.log('✅ Update trigger created')
    
    // Test insert
    console.log('🧪 Testing insert...')
    const testCollectionId = `test-collection-${Date.now()}`
    await client.query(`
      INSERT INTO collections (
        collection_id, name, description, creator_address, contract_address
      ) VALUES ($1, $2, $3, $4, $5)
    `, [testCollectionId, 'Test Collection', 'Test Description', '0x123...', '0x456...'])
    
    // Test select
    const selectResult = await client.query(`
      SELECT * FROM collections WHERE collection_id = $1
    `, [testCollectionId])
    
    if (selectResult.rows.length > 0) {
      console.log('✅ Insert/Select test passed')
    } else {
      throw new Error('Insert/Select test failed')
    }
    
    // Clean up test data
    await client.query(`
      DELETE FROM collections WHERE collection_id = $1
    `, [testCollectionId])
    console.log('✅ Test data cleaned up')
    
    // Test API endpoints
    console.log('🧪 Testing API endpoints...')
    
    // Test collections API
    try {
      const response = await fetch('http://localhost:3000/api/collections')
      if (response.ok) {
        console.log('✅ Collections API endpoint working')
      } else {
        console.log('⚠️ Collections API endpoint not responding (app might not be running)')
      }
    } catch (error) {
      console.log('⚠️ API test skipped (app not running)')
    }
    
    console.log('🎉 All database tests passed!')
    
  } catch (error) {
    console.error('❌ Database test failed:', error)
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

testDatabase().catch(console.error)