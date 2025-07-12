/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextRequest, NextResponse } from "next/server"
import { Pool } from "pg"

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('neon.tech') ? { rejectUnauthorized: false } : false,
})

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Running database migration...')
    
    // Add nft_metadata_individuals column
    await pool.query(`
      ALTER TABLE auctions 
      ADD COLUMN IF NOT EXISTS nft_metadata_individuals JSONB;
    `)
    
    // Add comment for documentation
    await pool.query(`
      COMMENT ON COLUMN auctions.nft_metadata_individuals IS 'Individual NFT metadata for collection auctions - stores detailed info for each NFT';
    `)
    
    // Add index for better performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_auctions_nft_metadata_individuals 
      ON auctions USING GIN (nft_metadata_individuals);
    `)
    
    console.log('✅ Migration completed successfully')
    
    return NextResponse.json({
      success: true,
      message: 'Database migration completed successfully'
    })
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
    return NextResponse.json(
      { success: false, error: 'Migration failed' },
      { status: 500 }
    )
  }
}