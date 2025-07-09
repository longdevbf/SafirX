#!/usr/bin/env node

// Import from existing db.ts file
const path = require('path')
const { Pool } = require('pg')

// Use same config as db.ts
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('neon.tech') ? { rejectUnauthorized: false } : false,
})

async function testCollectionsDB() {
  const client = await pool.connect()
  
  try {
    console.log('🔍 Testing database connection...')
    
    // Test connection
    const result = await client.query('SELECT NOW()')
    console.log('✅ Database connected successfully at:', result.rows[0].now)
    
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
    console.log('✅ Collections table created/verified')
    
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
    console.log('✅ Collection items table created/verified')
    
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
    console.log('✅ Collection likes table created/verified')
    
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
    console.log('✅ Indexes created/verified')
    
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
    console.log('✅ Update trigger created/verified')
    
    // Test CRUD operations
    console.log('🧪 Testing CRUD operations...')
    
    const testCollectionId = `test-collection-${Date.now()}`
    const testAddress = '0x1234567890123456789012345678901234567890'
    
    // Test INSERT
    console.log('  Testing INSERT...')
    await client.query(`
      INSERT INTO collections (
        collection_id, name, description, creator_address, contract_address, cover_image
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `, [testCollectionId, 'Test Collection', 'Test Description', testAddress, testAddress, '/test-image.jpg'])
    
    // Test SELECT
    console.log('  Testing SELECT...')
    const selectResult = await client.query(`
      SELECT * FROM collections WHERE collection_id = $1
    `, [testCollectionId])
    
    if (selectResult.rows.length === 0) {
      throw new Error('INSERT/SELECT test failed')
    }
    
    console.log('  ✅ Found collection:', selectResult.rows[0].name)
    
    // Test UPDATE
    console.log('  Testing UPDATE...')
    await client.query(`
      UPDATE collections 
      SET description = $1, likes_count = $2
      WHERE collection_id = $3
    `, ['Updated Description', 5, testCollectionId])
    
    const updateResult = await client.query(`
      SELECT * FROM collections WHERE collection_id = $1
    `, [testCollectionId])
    
    if (updateResult.rows[0].description !== 'Updated Description' || updateResult.rows[0].likes_count !== 5) {
      throw new Error('UPDATE test failed')
    }
    
    console.log('  ✅ Update successful')
    
    // Test collection_items
    console.log('  Testing collection_items...')
    await client.query(`
      INSERT INTO collection_items (
        collection_id, listing_id, nft_contract, token_id, price
      ) VALUES ($1, $2, $3, $4, $5)
    `, [testCollectionId, 'listing-1', testAddress, '1', 10.5])
    
    const itemsResult = await client.query(`
      SELECT * FROM collection_items WHERE collection_id = $1
    `, [testCollectionId])
    
    if (itemsResult.rows.length === 0) {
      throw new Error('Collection items test failed')
    }
    
    console.log('  ✅ Collection items working')
    
    // Test collection_likes
    console.log('  Testing collection_likes...')
    await client.query(`
      INSERT INTO collection_likes (collection_id, user_address) VALUES ($1, $2)
    `, [testCollectionId, testAddress])
    
    const likesResult = await client.query(`
      SELECT * FROM collection_likes WHERE collection_id = $1
    `, [testCollectionId])
    
    if (likesResult.rows.length === 0) {
      throw new Error('Collection likes test failed')
    }
    
    console.log('  ✅ Collection likes working')
    
    // Test JOIN query
    console.log('  Testing JOIN query...')
    const joinResult = await client.query(`
      SELECT 
        c.*,
        COUNT(ci.id) as item_count,
        COUNT(cl.id) as likes_count_actual
      FROM collections c
      LEFT JOIN collection_items ci ON c.collection_id = ci.collection_id
      LEFT JOIN collection_likes cl ON c.collection_id = cl.collection_id
      WHERE c.collection_id = $1
      GROUP BY c.id
    `, [testCollectionId])
    
    if (joinResult.rows.length === 0) {
      throw new Error('JOIN query test failed')
    }
    
    console.log('  ✅ JOIN query working, found:', {
      name: joinResult.rows[0].name,
      item_count: joinResult.rows[0].item_count,
      likes_count_actual: joinResult.rows[0].likes_count_actual
    })
    
    // Clean up test data
    console.log('🧹 Cleaning up test data...')
    await client.query(`DELETE FROM collection_likes WHERE collection_id = $1`, [testCollectionId])
    await client.query(`DELETE FROM collection_items WHERE collection_id = $1`, [testCollectionId])
    await client.query(`DELETE FROM collections WHERE collection_id = $1`, [testCollectionId])
    
    console.log('✅ Test data cleaned up')
    
    // Show table info
    console.log('📊 Table information:')
    
    const tablesResult = await client.query(`
      SELECT table_name, column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name IN ('collections', 'collection_items', 'collection_likes')
      ORDER BY table_name, ordinal_position
    `)
    
    const tables = {}
    tablesResult.rows.forEach(row => {
      if (!tables[row.table_name]) {
        tables[row.table_name] = []
      }
      tables[row.table_name].push({
        column: row.column_name,
        type: row.data_type,
        nullable: row.is_nullable
      })
    })
    
    Object.keys(tables).forEach(tableName => {
      console.log(`\n  📋 ${tableName}:`)
      tables[tableName].forEach(col => {
        console.log(`    - ${col.column} (${col.type})${col.nullable === 'YES' ? ' nullable' : ''}`)
      })
    })
    
    console.log('\n🎉 All database tests passed successfully!')
    console.log('✅ Collections system database is ready!')
    
  } catch (error) {
    console.error('❌ Database test failed:', error)
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

// Run the test
if (require.main === module) {
  testCollectionsDB().catch(console.error)
}

module.exports = { testCollectionsDB }