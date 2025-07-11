import { NextRequest, NextResponse } from "next/server"
import { Pool } from "pg"

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('neon.tech') ? { rejectUnauthorized: false } : false,
})

export async function GET(request: NextRequest) {
  try {
    // Check auctions table structure
    const schemaResult = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'auctions'
      ORDER BY ordinal_position;
    `)
    
    // Check if nft_metadata_individuals column exists
    const hasColumn = schemaResult.rows.find(row => row.column_name === 'nft_metadata_individuals')
    
    // Get sample auction data
    const sampleResult = await pool.query(`
      SELECT auction_id, auction_type, nft_metadata, nft_metadata_individuals
      FROM auctions 
      WHERE auction_type = 'COLLECTION'
      ORDER BY created_at DESC 
      LIMIT 1;
    `)
    
    return NextResponse.json({
      success: true,
      schema: schemaResult.rows,
      hasNftMetadataIndividualsColumn: !!hasColumn,
      sampleData: sampleResult.rows[0] || null
    })
    
  } catch (error) {
    console.error('Error checking database:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to check database' },
      { status: 500 }
    )
  }
}