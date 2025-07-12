import {  NextResponse } from 'next/server'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('neon.tech') ? { rejectUnauthorized: false } : false,
})

export async function POST() {
  try {
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
      
      // Create update trigger function
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
      
      console.log('✅ Collections tables created successfully!')
      
      return NextResponse.json({
        success: true,
        message: 'Collections tables created successfully'
      })
      
    } finally {
      client.release()
    }
    
  } catch (error) {
    console.error('❌ Error creating tables:', error)
    return NextResponse.json(
      { error: 'Failed to create tables', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}