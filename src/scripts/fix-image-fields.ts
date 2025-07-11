#!/usr/bin/env node

import { config } from 'dotenv'
config()

import { Pool } from 'pg'

async function fixImageFields() {
  console.log('🚀 Starting database migration to fix image fields...')
  
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
    
    console.log('🔨 Updating m_img field to TEXT...')
    await client.query(`
      ALTER TABLE users 
      ALTER COLUMN m_img TYPE TEXT
    `)
    
    console.log('🔨 Updating b_img field to TEXT...')
    await client.query(`
      ALTER TABLE users 
      ALTER COLUMN b_img TYPE TEXT
    `)
    
    console.log('🔨 Cleaning up existing placeholder images...')
    await client.query(`
      UPDATE users 
      SET m_img = 'https://api.dicebear.com/7.x/identicon/svg?seed=' || w_address || '&size=400&backgroundColor=random'
      WHERE m_img LIKE 'data:image/%' OR m_img = ''
    `)
    
    client.release()
    await pool.end()
    
    console.log('✅ Database migration completed successfully!')
    console.log('📋 Changes made:')
    console.log('  - m_img field changed from VARCHAR(200) to TEXT')
    console.log('  - b_img field changed from VARCHAR(200) to TEXT')
    console.log('  - Cleaned up existing base64 data with proper placeholder URLs')
    
  } catch (error) {
    console.error('❌ Database migration failed:', error)
    await pool.end()
    process.exit(1)
  }
}

fixImageFields()