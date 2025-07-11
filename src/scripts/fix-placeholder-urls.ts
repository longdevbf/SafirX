#!/usr/bin/env node

import { config } from 'dotenv'
config()

import { Pool } from 'pg'

async function fixPlaceholderUrls() {
  console.log('🚀 Starting database migration to fix placeholder URLs...')
  
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
    
    console.log('🔨 Fixing via.placeholder.com URLs in users table...')
    const userResult = await client.query(`
      UPDATE users 
      SET b_img = 'https://dummyimage.com/1200x300/6366f1/ffffff.png&text=Banner+Image'
      WHERE b_img LIKE '%via.placeholder.com%'
    `)
    
    console.log(`✅ Updated ${userResult.rowCount} user banner images`)
    
    console.log('🔨 Fixing via.placeholder.com URLs in listings table...')
    const listingResult = await client.query(`
      UPDATE listings 
      SET image = 'https://picsum.photos/400/400?random=' || id,
          cover_image_url = CASE 
            WHEN cover_image_url LIKE '%via.placeholder.com%' 
            THEN 'https://picsum.photos/400/400?random=' || (id + 1000)
            ELSE cover_image_url 
          END,
          individual_images = CASE
            WHEN individual_images LIKE '%via.placeholder.com%'
            THEN replace(individual_images, 'via.placeholder.com', 'picsum.photos')
            ELSE individual_images
          END
      WHERE image LIKE '%via.placeholder.com%' 
         OR cover_image_url LIKE '%via.placeholder.com%' 
         OR individual_images LIKE '%via.placeholder.com%'
    `)
    
    console.log(`✅ Updated ${listingResult.rowCount} listing images`)
    
    console.log('🔨 Fixing via.placeholder.com URLs in auctions table...')
    const auctionResult = await client.query(`
      UPDATE auctions 
      SET image = 'https://picsum.photos/400/400?random=' || (id + 2000)
      WHERE image LIKE '%via.placeholder.com%'
    `)
    
    console.log(`✅ Updated ${auctionResult.rowCount} auction images`)
    
    client.release()
    await pool.end()
    
    console.log('✅ Database migration completed successfully!')
    console.log('📋 Changes made:')
    console.log('  - Replaced via.placeholder.com with dummyimage.com for banners')
    console.log('  - Replaced via.placeholder.com with picsum.photos for NFT images')
    console.log('  - All URLs now use stable, accessible services')
    
  } catch (error) {
    console.error('❌ Database migration failed:', error)
    await pool.end()
    process.exit(1)
  }
}

fixPlaceholderUrls()