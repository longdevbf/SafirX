#!/usr/bin/env node

import { config } from 'dotenv'
config()

import { Pool } from 'pg'

async function addNewColumns() {
  console.log('🚀 Adding new columns to listings table...')
  
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is not set!')
    process.exit(1)
  }
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('neon.tech') ? { rejectUnauthorized: false } : false,
  })
  
  try {
    const client = await pool.connect()
    console.log('✅ Connected successfully!')
    
    // Add columns if they don't exist
    const columnsToAdd = [
      { name: 'cover_image_url', type: 'VARCHAR(500) DEFAULT \'\'' },
      { name: 'bundle_price', type: 'VARCHAR(100) DEFAULT \'\'' },
      { name: 'individual_images', type: 'TEXT DEFAULT \'\'' },
      { name: 'individual_metadata', type: 'TEXT DEFAULT \'\'' },
      { name: 'nft_names', type: 'TEXT DEFAULT \'\'' },
      { name: 'nft_descriptions', type: 'TEXT DEFAULT \'\'' },
      { name: 'token_ids_array', type: 'TEXT DEFAULT \'\'' },
      { name: 'individual_prices', type: 'TEXT DEFAULT \'\'' },
      { name: 'collection_type', type: 'VARCHAR(50) DEFAULT \'single\'' }
    ]
    
    for (const column of columnsToAdd) {
      try {
        console.log(`🔨 Adding column: ${column.name}`)
        await client.query(`
          ALTER TABLE listings 
          ADD COLUMN IF NOT EXISTS ${column.name} ${column.type}
        `)
        console.log(`✅ Added column: ${column.name}`)
      } catch (error) {
        console.warn(`⚠️ Column ${column.name} might already exist:`, error)
      }
    }
    
    client.release()
    await pool.end()
    
    console.log('✅ Database schema update completed successfully!')
    
  } catch (error) {
    console.error('❌ Database schema update failed:', error)
    await pool.end()
    process.exit(1)
  }
}

addNewColumns() 