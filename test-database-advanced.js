#!/usr/bin/env node

const { Pool } = require('pg')

// Database connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,  // Maximum number of connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

// Mock data generators
const generateMockAddress = () => `0x${Math.random().toString(16).substring(2, 42).padEnd(40, '0')}`
const generateMockTxHash = () => `0x${Math.random().toString(16).substring(2, 66).padEnd(64, '0')}`
const generateMockPrice = () => (Math.random() * 10).toFixed(8)
const generateMockCollectionId = () => `collection-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`

// Test data sets
const MOCK_COLLECTIONS = Array.from({ length: 100 }, (_, i) => ({
  collection_id: `test-collection-${i}`,
  name: `Test Collection ${i}`,
  description: `This is a test collection number ${i} for performance testing`,
  creator_address: generateMockAddress(),
  contract_address: generateMockAddress(),
  total_items: Math.floor(Math.random() * 1000),
  floor_price: generateMockPrice(),
  total_volume: generateMockPrice(),
  is_bundle: Math.random() > 0.5,
  bundle_price: Math.random() > 0.5 ? generateMockPrice() : null,
  listing_type: Math.floor(Math.random() * 3),
  tx_hash: generateMockTxHash(),
  block_number: Math.floor(Math.random() * 1000000),
  likes_count: Math.floor(Math.random() * 100),
  views_count: Math.floor(Math.random() * 1000)
}))

async function testDatabasePerformance() {
  console.log('🚀 Starting advanced database performance tests...')
  
  const client = await pool.connect()
  
  try {
    // Test 1: Bulk Insert Performance
    console.log('\n📊 Test 1: Bulk Insert Performance')
    const startTime = Date.now()
    
    for (const collection of MOCK_COLLECTIONS) {
      await client.query(`
        INSERT INTO collections (
          collection_id, name, description, creator_address, contract_address,
          total_items, floor_price, total_volume, is_bundle, bundle_price,
          listing_type, tx_hash, block_number, likes_count, views_count
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        ON CONFLICT (collection_id) DO NOTHING
      `, [
        collection.collection_id, collection.name, collection.description,
        collection.creator_address, collection.contract_address,
        collection.total_items, collection.floor_price, collection.total_volume,
        collection.is_bundle, collection.bundle_price, collection.listing_type,
        collection.tx_hash, collection.block_number, collection.likes_count,
        collection.views_count
      ])
    }
    
    const insertTime = Date.now() - startTime
    console.log(`✅ Inserted ${MOCK_COLLECTIONS.length} collections in ${insertTime}ms`)
    console.log(`⚡ Average: ${(insertTime / MOCK_COLLECTIONS.length).toFixed(2)}ms per insert`)
    
    // Test 2: Query Performance
    console.log('\n📊 Test 2: Query Performance')
    const queryTests = [
      {
        name: 'Simple SELECT',
        query: 'SELECT COUNT(*) FROM collections WHERE name ILIKE $1',
        params: ['%Test%']
      },
      {
        name: 'Complex JOIN',
        query: `
          SELECT c.*, COUNT(cl.id) as like_count
          FROM collections c
          LEFT JOIN collection_likes cl ON c.collection_id = cl.collection_id
          WHERE c.is_active = true
          GROUP BY c.id
          ORDER BY like_count DESC
          LIMIT 10
        `,
        params: []
      },
      {
        name: 'Aggregation Query',
        query: `
          SELECT 
            creator_address,
            COUNT(*) as collection_count,
            AVG(floor_price) as avg_floor_price,
            SUM(total_volume) as total_creator_volume
          FROM collections
          WHERE is_active = true
          GROUP BY creator_address
          ORDER BY total_creator_volume DESC
          LIMIT 5
        `,
        params: []
      }
    ]
    
    for (const test of queryTests) {
      const queryStart = Date.now()
      const result = await client.query(test.query, test.params)
      const queryTime = Date.now() - queryStart
      
      console.log(`✅ ${test.name}: ${queryTime}ms (${result.rows.length} rows)`)
    }
    
    // Test 3: Concurrent Operations
    console.log('\n📊 Test 3: Concurrent Operations')
    const concurrentStart = Date.now()
    
    const concurrentPromises = Array.from({ length: 10 }, async (_, i) => {
      const tempClient = await pool.connect()
      try {
        const collectionId = `concurrent-test-${i}`
        await tempClient.query(`
          INSERT INTO collections (collection_id, name, creator_address, contract_address)
          VALUES ($1, $2, $3, $4)
        `, [collectionId, `Concurrent Test ${i}`, generateMockAddress(), generateMockAddress()])
        
        const result = await tempClient.query(`
          SELECT * FROM collections WHERE collection_id = $1
        `, [collectionId])
        
        return result.rows[0]
      } finally {
        tempClient.release()
      }
    })
    
    const concurrentResults = await Promise.all(concurrentPromises)
    const concurrentTime = Date.now() - concurrentStart
    
    console.log(`✅ Completed ${concurrentResults.length} concurrent operations in ${concurrentTime}ms`)
    
    // Test 4: Data Validation and Constraints
    console.log('\n📊 Test 4: Data Validation and Constraints')
    
    // Test unique constraint
    try {
      await client.query(`
        INSERT INTO collections (collection_id, name, creator_address, contract_address)
        VALUES ($1, $2, $3, $4)
      `, ['test-collection-0', 'Duplicate Test', generateMockAddress(), generateMockAddress()])
      console.log('❌ Unique constraint test failed - duplicate was allowed')
    } catch (error) {
      if (error.code === '23505') {
        console.log('✅ Unique constraint working correctly')
      } else {
        console.log('❌ Unexpected error:', error.message)
      }
    }
    
    // Test NOT NULL constraint
    try {
      await client.query(`
        INSERT INTO collections (collection_id, creator_address, contract_address)
        VALUES ($1, $2, $3)
      `, [generateMockCollectionId(), generateMockAddress(), generateMockAddress()])
      console.log('❌ NOT NULL constraint test failed - NULL name was allowed')
    } catch (error) {
      if (error.code === '23502') {
        console.log('✅ NOT NULL constraint working correctly')
      } else {
        console.log('❌ Unexpected error:', error.message)
      }
    }
    
    // Test 5: Transaction Performance
    console.log('\n📊 Test 5: Transaction Performance')
    const transactionStart = Date.now()
    
    await client.query('BEGIN')
    try {
      for (let i = 0; i < 50; i++) {
        const collectionId = `transaction-test-${i}`
        await client.query(`
          INSERT INTO collections (collection_id, name, creator_address, contract_address)
          VALUES ($1, $2, $3, $4)
        `, [collectionId, `Transaction Test ${i}`, generateMockAddress(), generateMockAddress()])
      }
      await client.query('COMMIT')
      
      const transactionTime = Date.now() - transactionStart
      console.log(`✅ Transaction with 50 inserts completed in ${transactionTime}ms`)
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    }
    
    // Test 6: Index Performance
    console.log('\n📊 Test 6: Index Performance')
    const indexTests = [
      {
        name: 'Creator Address Index',
        query: 'SELECT * FROM collections WHERE creator_address = $1',
        params: [MOCK_COLLECTIONS[0].creator_address]
      },
      {
        name: 'Active Status Index',
        query: 'SELECT * FROM collections WHERE is_active = true ORDER BY created_at DESC LIMIT 10',
        params: []
      },
      {
        name: 'Bundle Type Index',
        query: 'SELECT * FROM collections WHERE is_bundle = true AND bundle_price > 0',
        params: []
      }
    ]
    
    for (const test of indexTests) {
      const indexStart = Date.now()
      const result = await client.query(test.query, test.params)
      const indexTime = Date.now() - indexStart
      
      console.log(`✅ ${test.name}: ${indexTime}ms (${result.rows.length} rows)`)
    }
    
    // Test 7: Database Statistics
    console.log('\n📊 Test 7: Database Statistics')
    const stats = await client.query(`
      SELECT 
        schemaname,
        tablename,
        n_tup_ins as inserts,
        n_tup_upd as updates,
        n_tup_del as deletes,
        n_live_tup as live_rows,
        n_dead_tup as dead_rows
      FROM pg_stat_user_tables
      WHERE tablename IN ('collections', 'collection_items', 'collection_likes')
    `)
    
    console.log('📈 Table Statistics:')
    stats.rows.forEach(row => {
      console.log(`  ${row.tablename}: ${row.live_rows} live rows, ${row.inserts} inserts, ${row.updates} updates, ${row.deletes} deletes`)
    })
    
    console.log('\n🎉 All advanced database tests completed successfully!')
    
  } catch (error) {
    console.error('❌ Advanced database test failed:', error)
    throw error
  } finally {
    client.release()
  }
}

async function cleanupTestData() {
  console.log('\n🧹 Cleaning up test data...')
  const client = await pool.connect()
  
  try {
    // Delete test collections
    await client.query(`
      DELETE FROM collections 
      WHERE collection_id LIKE 'test-collection-%' 
         OR collection_id LIKE 'concurrent-test-%'
         OR collection_id LIKE 'transaction-test-%'
    `)
    
    // Delete test collection items
    await client.query(`
      DELETE FROM collection_items 
      WHERE collection_id LIKE 'test-collection-%'
         OR collection_id LIKE 'concurrent-test-%'
         OR collection_id LIKE 'transaction-test-%'
    `)
    
    // Delete test likes
    await client.query(`
      DELETE FROM collection_likes 
      WHERE collection_id LIKE 'test-collection-%'
         OR collection_id LIKE 'concurrent-test-%'
         OR collection_id LIKE 'transaction-test-%'
    `)
    
    console.log('✅ Test data cleaned up successfully')
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error)
  } finally {
    client.release()
  }
}

// Main test execution
async function runAdvancedTests() {
  try {
    await testDatabasePerformance()
    await cleanupTestData()
    console.log('\n🏁 Advanced database testing completed!')
  } catch (error) {
    console.error('💥 Test suite failed:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAdvancedTests()
}

module.exports = {
  testDatabasePerformance,
  cleanupTestData,
  runAdvancedTests
}