#!/usr/bin/env node

import { Pool } from 'pg'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
})

/**
 * Test Enhanced Collection System
 * Tests the new unified listings table approach for collections
 */

async function testEnhancedCollections() {
  console.log('🧪 Testing Enhanced Collection System...')
  
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is not set!')
    process.exit(1)
  }

  const client = await pool.connect()
  
  try {
    console.log('✅ Database connected successfully')
    
    // Test 1: Check if enhanced fields exist
    console.log('\n📋 Test 1: Checking enhanced fields in listings table...')
    
    const columnsQuery = `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'listings' 
      AND column_name IN (
        'cover_image_url', 'cover_image_drive_id', 'individual_images', 
        'individual_metadata', 'nft_names', 'nft_descriptions',
        'token_ids_array', 'individual_prices', 'collection_type', 'bundle_price',
        'metadata_synced', 'parent_collection_id', 'is_collection_item'
      )
      ORDER BY column_name;
    `
    
    const columnsResult = await client.query(columnsQuery)
    
    if (columnsResult.rows.length === 0) {
      console.log('❌ Enhanced fields not found. Please run the migration first:')
      console.log('   node enhance-listings-migration.mjs')
      return
    }
    
    console.log('✅ Enhanced fields found:')
    columnsResult.rows.forEach(row => {
      console.log(`   - ${row.column_name} (${row.data_type})`)
    })
    
    // Test 2: Check sample collection data
    console.log('\n📋 Test 2: Checking for collection listings...')
    
    const collectionsQuery = `
      SELECT 
        listing_id,
        collection_name,
        cover_image_url,
        collection_type,
        bundle_price,
        is_bundle,
        nft_names,
        metadata_synced,
        parent_collection_id,
        is_collection_item,
        created_at
      FROM listings 
      WHERE collection_name IS NOT NULL 
      AND collection_name != ''
      ORDER BY created_at DESC 
      LIMIT 5;
    `
    
    const collectionsResult = await client.query(collectionsQuery)
    
    if (collectionsResult.rows.length === 0) {
      console.log('ℹ️  No collection listings found yet')
      console.log('   This is normal if you haven\'t created any collections yet')
    } else {
      console.log(`✅ Found ${collectionsResult.rows.length} collection listings:`)
      collectionsResult.rows.forEach(row => {
        console.log(`   - ${row.collection_name} (ID: ${row.listing_id})`)
        console.log(`     Type: ${row.collection_type}, Bundle: ${row.is_bundle}`)
        console.log(`     Cover: ${row.cover_image_url ? '✅ Has cover image' : '❌ No cover image'}`)
        console.log(`     Bundle Price: ${row.bundle_price ? `${row.bundle_price} ROSE` : 'N/A'}`)
        console.log(`     NFT Names: ${row.nft_names ? JSON.parse(row.nft_names).length + ' names' : 'No names'}`)
        console.log(`     Metadata Synced: ${row.metadata_synced ? '✅ Yes' : '❌ No'}`)
        console.log(`     Collection Item: ${row.is_collection_item ? '✅ Yes' : '❌ No'}`)
        console.log('')
      })
    }
    
    // Test 3: Check database indexes for performance
    console.log('\n📋 Test 3: Checking performance indexes...')
    
    const indexesQuery = `
      SELECT 
        schemaname,
        tablename,
        indexname,
        indexdef
      FROM pg_indexes 
      WHERE tablename = 'listings' 
      AND (indexname LIKE '%collection%' OR indexname LIKE '%bundle%' OR indexname LIKE '%metadata%')
      ORDER BY indexname;
    `
    
    const indexesResult = await client.query(indexesQuery)
    
    if (indexesResult.rows.length === 0) {
      console.log('⚠️  No enhanced indexes found')
      console.log('   These indexes should have been created by the migration:')
      console.log('   - idx_listings_collection_type')
      console.log('   - idx_listings_metadata_synced')
      console.log('   - idx_listings_collection_item')
      console.log('   - idx_listings_parent_collection')
      console.log('   Please re-run the migration script!')
    } else {
      console.log('✅ Enhanced indexes found:')
      indexesResult.rows.forEach(row => {
        console.log(`   - ${row.indexname}`)
      })
    }
    
    // Test 4: Test marketplace query performance
    console.log('\n📋 Test 4: Testing marketplace query performance...')
    
    const startTime = Date.now()
    const marketplaceQuery = `
      SELECT 
        listing_id,
        collection_name,
        name,
        price,
        image,
        cover_image_url,
        collection_type,
        bundle_price,
        is_bundle,
        is_active,
        is_collection_item,
        parent_collection_id,
        metadata_synced
      FROM listings 
      WHERE is_active = true 
      ORDER BY created_at DESC 
      LIMIT 20;
    `
    
    const marketplaceResult = await client.query(marketplaceQuery)
    const queryTime = Date.now() - startTime
    
    console.log(`✅ Marketplace query completed in ${queryTime}ms`)
    console.log(`   Found ${marketplaceResult.rows.length} active listings`)
    
    if (queryTime > 100) {
      console.log('⚠️  Query took longer than 100ms. Consider optimizing indexes.')
    }
    
    // Test 5: Test collection detail query
    console.log('\n📋 Test 5: Testing collection detail query...')
    
    if (collectionsResult.rows.length > 0) {
      const testCollectionId = collectionsResult.rows[0].listing_id
      
      const detailStartTime = Date.now()
      const detailQuery = `
        SELECT 
          listing_id,
          collection_name,
          cover_image_url,
          individual_images,
          individual_metadata,
          nft_names,
          nft_descriptions,
          token_ids_array,
          individual_prices,
          collection_type,
          bundle_price,
          metadata_synced,
          parent_collection_id,
          is_collection_item,
          collection_position
        FROM listings 
        WHERE collection_name = (
          SELECT collection_name FROM listings WHERE listing_id = $1
        )
        ORDER BY collection_position NULLS LAST, token_id;
      `
      
      const detailResult = await client.query(detailQuery, [testCollectionId])
      const detailQueryTime = Date.now() - detailStartTime
      
      console.log(`✅ Collection detail query completed in ${detailQueryTime}ms`)
      console.log(`   Found ${detailResult.rows.length} items in collection`)
      
      if (detailResult.rows.length > 0) {
        const sample = detailResult.rows[0]
        console.log('   Sample data:')
        console.log(`     Cover Image: ${sample.cover_image_url ? '✅ Present' : '❌ Missing'}`)
        console.log(`     Individual Images: ${sample.individual_images ? '✅ Present' : '❌ Missing'}`)
        console.log(`     Metadata: ${sample.individual_metadata ? '✅ Present' : '❌ Missing'}`)
        console.log(`     NFT Names: ${sample.nft_names ? '✅ Present' : '❌ Missing'}`)
        console.log(`     NFT Descriptions: ${sample.nft_descriptions ? '✅ Present' : '❌ Missing'}`)
        console.log(`     Token IDs Array: ${sample.token_ids_array ? '✅ Present' : '❌ Missing'}`)
        console.log(`     Individual Prices: ${sample.individual_prices ? '✅ Present' : '❌ Missing'}`)
        console.log(`     Collection Type: ${sample.collection_type || 'Not set'}`)
        console.log(`     Metadata Synced: ${sample.metadata_synced ? '✅ Yes' : '❌ No'}`)
        console.log(`     Is Collection Item: ${sample.is_collection_item ? '✅ Yes' : '❌ No'}`)
      }
    } else {
      console.log('ℹ️  No collections to test detail query')
    }
    
    console.log('\n🎉 Enhanced Collection System Test Complete!')
    console.log('\n📊 Summary:')
    const result = await client.query(`
      SELECT 
        COUNT(*) as total_listings,
        COUNT(CASE WHEN cover_image_url IS NOT NULL THEN 1 END) as with_cover_image,
        COUNT(CASE WHEN collection_type IS NOT NULL THEN 1 END) as with_collection_type,
        COUNT(CASE WHEN collection_type = 'single' THEN 1 END) as single_nfts,
        COUNT(CASE WHEN collection_type IN ('bundle', 'individual', 'same-price') THEN 1 END) as collections,
        COUNT(CASE WHEN is_collection_item = FALSE THEN 1 END) as main_listings,
        COUNT(CASE WHEN is_collection_item = TRUE THEN 1 END) as collection_items,
        COUNT(CASE WHEN metadata_synced = TRUE THEN 1 END) as synced_metadata
      FROM listings
    `)
    const stats = result.rows[0]
    console.log('📊 Migration Statistics:')
    console.log(`  - Total listings: ${stats.total_listings}`)
    console.log(`  - With cover image: ${stats.with_cover_image}`)
    console.log(`  - With collection type: ${stats.with_collection_type}`)
    console.log(`  - Single NFTs: ${stats.single_nfts}`)
    console.log(`  - Collections: ${stats.collections}`)
    console.log(`  - Main listings: ${stats.main_listings}`)
    console.log(`  - Collection items: ${stats.collection_items}`)
    console.log(`  - Synced metadata: ${stats.synced_metadata}`)
    
    console.log('\n🎉 Enhanced Collection System Test Complete!')
    console.log('\n📊 Summary:')
    console.log('   ✅ Enhanced schema: Available')
    console.log(`   ✅ Collection listings: ${collectionsResult.rows.length} found`)
    console.log(`   ✅ Query performance: ${queryTime}ms`)
    console.log(`   ✅ Enhanced indexes: ${indexesResult.rows.length} found`)
    console.log('   ✅ System ready for enhanced collections!')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

// Run the test
testEnhancedCollections().catch(console.error) 