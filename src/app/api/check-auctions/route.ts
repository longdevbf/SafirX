/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextRequest, NextResponse } from "next/server"
import { Pool } from "pg"

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('neon.tech') ? { rejectUnauthorized: false } : false,
})

export async function GET(request: NextRequest) {
  try {
    const client = await pool.connect()
    
    // Get all auctions
    const result = await client.query(`
      SELECT auction_id, title, total_bids, unique_bidders, state 
      FROM auctions 
      ORDER BY auction_id
    `)

    client.release()

    return NextResponse.json({
      success: true,
      auctions: result.rows,
      count: result.rows.length
    })

  } catch (error) {
    console.error('❌ Error checking auctions:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
} 