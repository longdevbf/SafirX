#!/usr/bin/env node

import { config } from 'dotenv'
config()

import { Pool } from 'pg'

async function addClaimFieldsToAuctions() {
  console.log('🚀 Adding claim fields to auctions table...')
  
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is not set!')
    process.exit(1)
  }
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('neon.tech') ? { rejectUnauthorized: false } : false,
  })
  
  try {
    console.log('🔍 Testing connection...')
    const client = await pool.connect()
    console.log('✅ Connected successfully!')
    
    // Add new columns for claim/reclaim functionality
    console.log('🔨 Adding claim fields to auctions table...')
    
    const alterTableQuery = `
      ALTER TABLE auctions 
      ADD COLUMN IF NOT EXISTS nft_claimed BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS nft_reclaimed BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS claim_tx_hash VARCHAR(66) NULL,
      ADD COLUMN IF NOT EXISTS reclaim_tx_hash VARCHAR(66) NULL,
      ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMP NULL,
      ADD COLUMN IF NOT EXISTS reclaimed_at TIMESTAMP NULL;
    `
    
    await client.query(alterTableQuery)
    
    console.log('✅ Successfully added claim fields to auctions table!')
    console.log('')
    console.log('📋 New fields added:')
    console.log('   - nft_claimed: BOOLEAN (default: FALSE)')
    console.log('   - nft_reclaimed: BOOLEAN (default: FALSE)')
    console.log('   - claim_tx_hash: VARCHAR(66) (nullable)')
    console.log('   - reclaim_tx_hash: VARCHAR(66) (nullable)')
    console.log('   - claimed_at: TIMESTAMP (nullable)')
    console.log('   - reclaimed_at: TIMESTAMP (nullable)')
    console.log('')
    console.log('🎯 Ready for claim status tracking!')
    
    client.release()
  } catch (error) {
    console.error('❌ Error adding claim fields:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

addClaimFieldsToAuctions()