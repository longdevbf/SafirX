#!/usr/bin/env node

import { config } from 'dotenv'
config()

import { Pool } from 'pg'

async function fixUserBanner() {
  console.log('🚀 Fixing specific user banner URL...')
  
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
    
    // Check current user data
    console.log('🔍 Checking current user data...')
    const currentUser = await client.query(`
      SELECT id, w_address, b_img 
      FROM users 
      WHERE w_address = '0xf6a6EBd06249569b9f5621Bc1a22B4a20f18e17E'
    `)
    
    if (currentUser.rows.length > 0) {
      console.log('📊 Current user data:', currentUser.rows[0])
    }
    
    console.log('🔨 Updating banner URL for specific user...')
    const result = await client.query(`
      UPDATE users 
      SET b_img = 'https://dummyimage.com/1200x300/6366f1/ffffff.png&text=Banner+Image',
          updated_at = CURRENT_TIMESTAMP
      WHERE w_address = '0xf6a6EBd06249569b9f5621Bc1a22B4a20f18e17E'
      RETURNING id, w_address, b_img, updated_at
    `)
    
    if (result.rows.length > 0) {
      console.log('✅ User updated successfully:', result.rows[0])
    } else {
      console.log('⚠️ No user found with that address')
    }
    
    // Also fix any other via.placeholder.com URLs
    console.log('🔨 Fixing any remaining via.placeholder.com URLs...')
    const generalResult = await client.query(`
      UPDATE users 
      SET b_img = 'https://dummyimage.com/1200x300/6366f1/ffffff.png&text=Banner+Image',
          updated_at = CURRENT_TIMESTAMP
      WHERE b_img LIKE '%via.placeholder.com%'
      RETURNING id, w_address
    `)
    
    console.log(`✅ Updated ${generalResult.rowCount} additional users`)
    
    client.release()
    await pool.end()
    
    console.log('✅ Banner fix completed successfully!')
    console.log('🔄 Please restart your development server')
    
  } catch (error) {
    console.error('❌ Banner fix failed:', error)
    await pool.end()
    process.exit(1)
  }
}

fixUserBanner()