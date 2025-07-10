/* eslint-disable @typescript-eslint/no-unused-vars */  

import { Pool } from 'pg'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

// ES module __dirname equivalent
const __filename = fileURLToPath(import.meta.url)


// Load environment variables
dotenv.config()

/**
 * Enhanced Listings Migration Script
 * Adds collection support fields to existing listings table
 * SAFE: Uses IF NOT EXISTS to prevent conflicts with existing data
 */

async function enhanceListingsTable() {
  console.log('🚀 Starting Enhanced Listings Migration...')
  
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is not set!')
    process.exit(1)
  }
  
  console.log('🔗 Database:', process.env.DATABASE_URL.split('@')[1]?.split('/')[0] || 'Unknown')
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('neon.tech') ? { rejectUnauthorized: false } : false,
  })
  
  let client = null
  
  try {
    console.log('🔍 Testing connection...')
    client = await pool.connect()
    console.log('✅ Connected successfully!')
    
    // ✅ STEP 1: Add Cover Image Fields
    console.log('📸 Adding cover image fields...')
    try {
      await client.query(`
        ALTER TABLE listings 
        ADD COLUMN IF NOT EXISTS cover_image_url VARCHAR(500)
      `)
      await client.query(`
        ALTER TABLE listings 
        ADD COLUMN IF NOT EXISTS cover_image_drive_id VARCHAR(100)
      `)
      console.log('  ✅ Cover image fields added')
    } catch (error) {
      console.log('  ⚠️ Cover image fields may already exist:', error.message)
    }
    
    // ✅ STEP 2: Add Individual NFT Data Arrays
    console.log('🎨 Adding individual NFT data fields...')
    try {
      await client.query(`
        ALTER TABLE listings 
        ADD COLUMN IF NOT EXISTS individual_images TEXT
      `)
      await client.query(`
        ALTER TABLE listings 
        ADD COLUMN IF NOT EXISTS individual_metadata TEXT
      `)
      await client.query(`
        ALTER TABLE listings 
        ADD COLUMN IF NOT EXISTS nft_names TEXT
      `)
      await client.query(`
        ALTER TABLE listings 
        ADD COLUMN IF NOT EXISTS nft_descriptions TEXT
      `)
      await client.query(`
        ALTER TABLE listings 
        ADD COLUMN IF NOT EXISTS token_ids_array TEXT
      `)
      await client.query(`
        ALTER TABLE listings 
        ADD COLUMN IF NOT EXISTS individual_prices TEXT
      `)
      console.log('  ✅ Individual NFT data fields added')
    } catch (error) {
      console.log('  ⚠️ Individual NFT data fields may already exist:', error.message)
    }
    
    // ✅ STEP 3: Add Collection Type & Management Fields
    console.log('🏷️ Adding collection management fields...')
    try {
      await client.query(`
        ALTER TABLE listings 
        ADD COLUMN IF NOT EXISTS collection_type VARCHAR(50)
      `)
      await client.query(`
        ALTER TABLE listings 
        ADD COLUMN IF NOT EXISTS bundle_price VARCHAR(100)
      `)
      await client.query(`
        ALTER TABLE listings 
        ADD COLUMN IF NOT EXISTS individual_price VARCHAR(100)
      `)
      await client.query(`
        ALTER TABLE listings 
        ADD COLUMN IF NOT EXISTS metadata_synced BOOLEAN DEFAULT FALSE
      `)
      await client.query(`
        ALTER TABLE listings 
        ADD COLUMN IF NOT EXISTS sync_attempts INTEGER DEFAULT 0
      `)
      await client.query(`
        ALTER TABLE listings 
        ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMP
      `)
      console.log('  ✅ Collection management fields added')
    } catch (error) {
      console.log('  ⚠️ Collection management fields may already exist:', error.message)
    }
    
    // ✅ STEP 4: Add Collection Hierarchy Fields
    console.log('🏗️ Adding collection hierarchy fields...')
    try {
      await client.query(`
        ALTER TABLE listings 
        ADD COLUMN IF NOT EXISTS parent_collection_id VARCHAR(100)
      `)
      await client.query(`
        ALTER TABLE listings 
        ADD COLUMN IF NOT EXISTS is_collection_item BOOLEAN DEFAULT FALSE
      `)
      await client.query(`
        ALTER TABLE listings 
        ADD COLUMN IF NOT EXISTS collection_position INTEGER
      `)
      console.log('  ✅ Collection hierarchy fields added')
    } catch (error) {
      console.log('  ⚠️ Collection hierarchy fields may already exist:', error.message)
    }
    
    // ✅ STEP 5: Add Performance Indexes
    console.log('⚡ Creating performance indexes...')
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_listings_cover_image ON listings(cover_image_url)',
      'CREATE INDEX IF NOT EXISTS idx_listings_collection_type ON listings(collection_type)',
      'CREATE INDEX IF NOT EXISTS idx_listings_metadata_synced ON listings(metadata_synced)',
      'CREATE INDEX IF NOT EXISTS idx_listings_parent_collection ON listings(parent_collection_id)',
      'CREATE INDEX IF NOT EXISTS idx_listings_collection_item ON listings(is_collection_item)',
      'CREATE INDEX IF NOT EXISTS idx_listings_bundle_enhanced ON listings(is_bundle, is_active)',
      'CREATE INDEX IF NOT EXISTS idx_listings_marketplace_main ON listings(is_active, is_collection_item, created_at DESC)'
    ]
    
    for (const indexQuery of indexes) {
      try {
        await client.query(indexQuery)
        const indexName = indexQuery.split(' ')[5]
        console.log(`  ✅ Index created: ${indexName}`)
      } catch (error) {
        console.log(`  ⚠️ Index may already exist: ${error.message}`)
      }
    }
    
    // ✅ STEP 6: Migrate Existing Data (Safe Updates)
    console.log('🔄 Migrating existing data...')
    
    // Update existing single NFTs
    try {
      const singleNFTResult = await client.query(`
        UPDATE listings 
        SET 
          collection_type = 'single',
          metadata_synced = TRUE,
          sync_attempts = 1,
          last_sync_at = created_at,
          is_collection_item = FALSE
        WHERE 
          collection_type IS NULL 
          AND is_bundle = FALSE
      `)
      console.log(`  ✅ Updated ${singleNFTResult.rowCount} single NFTs`)
    } catch (error) {
      console.log('  ⚠️ Error updating single NFTs:', error.message)
    }
    
    // Update existing bundles
    try {
      const bundleResult = await client.query(`
        UPDATE listings 
        SET 
          collection_type = 'bundle',
          cover_image_url = collection_image,
          metadata_synced = FALSE,
          sync_attempts = 0,
          is_collection_item = FALSE
        WHERE 
          collection_type IS NULL 
          AND is_bundle = TRUE
      `)
      console.log(`  ✅ Updated ${bundleResult.rowCount} bundles`)
    } catch (error) {
      console.log('  ⚠️ Error updating bundles:', error.message)
    }
    
    // Update bundle_price from price for existing bundles
    try {
      const bundlePriceResult = await client.query(`
        UPDATE listings 
        SET bundle_price = price
        WHERE collection_type = 'bundle' AND bundle_price IS NULL
      `)
      console.log(`  ✅ Updated bundle prices for ${bundlePriceResult.rowCount} collections`)
    } catch (error) {
      console.log('  ⚠️ Error updating bundle prices:', error.message)
    }
    
    // ✅ STEP 7: Verify Migration
    console.log('🔍 Verifying migration...')
    const result = await client.query(`
      SELECT 
        COUNT(*) as total_listings,
        COUNT(CASE WHEN cover_image_url IS NOT NULL THEN 1 END) as with_cover_image,
        COUNT(CASE WHEN collection_type IS NOT NULL THEN 1 END) as with_collection_type,
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
    console.log(`  - Main listings: ${stats.main_listings}`)
    console.log(`  - Collection items: ${stats.collection_items}`)
    console.log(`  - Synced metadata: ${stats.synced_metadata}`)
    
    console.log('✅ Enhanced Listings Migration completed successfully!')
    console.log('')
    console.log('📋 New Fields Added:')
    console.log('  🖼️  Cover Image:')
    console.log('      - cover_image_url (Google Drive URL)')
    console.log('      - cover_image_drive_id (Drive file ID)')
    console.log('')
    console.log('  🎨 Individual NFT Data:')
    console.log('      - individual_images (JSON array of IPFS URLs)')
    console.log('      - individual_metadata (JSON array of full metadata)')
    console.log('      - nft_names (JSON array of NFT names)')
    console.log('      - nft_descriptions (JSON array of descriptions)')
    console.log('      - token_ids_array (JSON array of token IDs)')
    console.log('      - individual_prices (JSON array of prices)')
    console.log('')
    console.log('  🏷️  Collection Management:')
    console.log('      - collection_type (single/bundle/individual/same-price)')
    console.log('      - bundle_price (separate from individual price)')
    console.log('      - individual_price (for collection items)')
    console.log('      - metadata_synced (sync status tracking)')
    console.log('      - sync_attempts (retry counter)')
    console.log('      - last_sync_at (last sync timestamp)')
    console.log('')
    console.log('  🏗️  Collection Hierarchy:')
    console.log('      - parent_collection_id (link to parent collection)')
    console.log('      - is_collection_item (item vs main listing)')
    console.log('      - collection_position (order in collection)')
    console.log('')
    console.log('  ⚡ Performance Indexes: 7 new indexes added')
    console.log('')
    console.log('🎯 Ready for Enhanced Collection System!')
    
  } catch (error) {
    console.error('❌ Enhanced Listings Migration failed:', error)
    process.exit(1)
  } finally {
    if (client) {
      client.release()
    }
    await pool.end()
  }
}

// Run migration immediately when file is executed
enhanceListingsTable().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})