#!/usr/bin/env node

import { config } from 'dotenv'
config()

import { Pool } from 'pg'

async function createTables() {
  console.log('🚀 Starting database table creation...')
  
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is not set!')
    process.exit(1)
  }
  
  console.log('🔗 Using database:', process.env.DATABASE_URL.split('@')[1]?.split('/')[0] || 'Unknown')
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('neon.tech') ? { rejectUnauthorized: false } : false,
  })
  
  try {
    console.log('🔍 Testing connection...')
    const client = await pool.connect()
    console.log('✅ Connected successfully!')
    
    console.log('🔨 Creating users table...')
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        description VARCHAR(500),
        w_address VARCHAR(200) UNIQUE NOT NULL,
        m_img VARCHAR(200) DEFAULT '',
        b_img VARCHAR(200) DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    
    console.log('🔨 Creating listings table...')
    await client.query(`
      CREATE TABLE IF NOT EXISTS listings (
        id SERIAL PRIMARY KEY,
        listing_id VARCHAR(100) UNIQUE NOT NULL,
        nft_contract VARCHAR(100) NOT NULL,
        token_id VARCHAR(100) NOT NULL,
        seller VARCHAR(100) NOT NULL,
        price VARCHAR(100) NOT NULL,
        collection_name VARCHAR(200) DEFAULT '',
        name VARCHAR(200) NOT NULL,
        description TEXT DEFAULT '',
        category VARCHAR(100) DEFAULT '',
        image VARCHAR(500) NOT NULL,
        attributes TEXT DEFAULT '',
        rarity VARCHAR(50) DEFAULT 'Common',
        is_bundle BOOLEAN DEFAULT FALSE,
        bundle_token_ids TEXT DEFAULT '',
        collection_image VARCHAR(500) DEFAULT '',
        tx_hash VARCHAR(100) NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        likes_count INTEGER DEFAULT 0,
        views_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    console.log('🔨 Creating auctions table...')
    await client.query(`
      CREATE TABLE IF NOT EXISTS auctions (
        id SERIAL PRIMARY KEY,
        auction_id VARCHAR(100) UNIQUE NOT NULL,
        nft_contract VARCHAR(100) NOT NULL,
        token_id VARCHAR(100) NOT NULL,
        seller VARCHAR(100) NOT NULL,
        starting_price VARCHAR(100) NOT NULL,
        reserve_price VARCHAR(100) NOT NULL,
        current_bid VARCHAR(100) DEFAULT '0',
        highest_bidder VARCHAR(100) DEFAULT '',
        end_time TIMESTAMP NOT NULL,
        collection_name VARCHAR(200) DEFAULT '',
        name VARCHAR(200) NOT NULL,
        description TEXT DEFAULT '',
        category VARCHAR(100) DEFAULT '',
        image VARCHAR(500) NOT NULL,
        attributes TEXT DEFAULT '',
        is_collection BOOLEAN DEFAULT FALSE,
        collection_token_ids TEXT DEFAULT '',
        collection_image VARCHAR(500) DEFAULT '',
        tx_hash VARCHAR(100) NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        likes_count INTEGER DEFAULT 0,
        views_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    
    console.log('🔨 Creating indexes...')
    await client.query('CREATE INDEX IF NOT EXISTS idx_users_w_address ON users(w_address)')
    await client.query('CREATE INDEX IF NOT EXISTS idx_listings_listing_id ON listings(listing_id)')
    await client.query('CREATE INDEX IF NOT EXISTS idx_listings_seller ON listings(seller)')
    await client.query('CREATE INDEX IF NOT EXISTS idx_listings_collection ON listings(collection_name)')
    await client.query('CREATE INDEX IF NOT EXISTS idx_listings_category ON listings(category)')
    await client.query('CREATE INDEX IF NOT EXISTS idx_listings_active ON listings(is_active)')
    await client.query('CREATE INDEX IF NOT EXISTS idx_auctions_auction_id ON auctions(auction_id)')
    await client.query('CREATE INDEX IF NOT EXISTS idx_auctions_end_time ON auctions(end_time)')
    await client.query('CREATE INDEX IF NOT EXISTS idx_auctions_active ON auctions(is_active)')
    
    client.release()
    await pool.end()
    
    console.log('✅ Database initialization completed successfully!')
    console.log('📋 Created tables:')
    console.log('  - users (with profile information)')
    console.log('  - listings (with NFT marketplace data)')
    console.log('  - auctions (with auction data)')
    console.log('  - indexes (for performance optimization)')
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error)
    await pool.end()
    process.exit(1)
  }
}

createTables()