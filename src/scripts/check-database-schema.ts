#!/usr/bin/env node

import { config } from 'dotenv'
config()

import { Pool } from 'pg'

async function checkDatabaseSchema() {
  console.log('🔍 Checking database schema...')
  
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is not set!')
    process.exit(1)
  }
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('neon.tech') ? { rejectUnauthorized: false } : false,
  })
  
  try {
    console.log('🔌 Connecting to database...')
    const client = await pool.connect()
    console.log('✅ Connected successfully!')
    
    // Check if auctions table exists
    const tableExistsQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'auctions'
      );
    `
    
    const tableResult = await client.query(tableExistsQuery)
    const tableExists = tableResult.rows[0].exists
    
    if (!tableExists) {
      console.log('❌ auctions table does not exist!')
      client.release()
      return
    }
    
    console.log('✅ auctions table exists')
    
    // Check columns in auctions table
    const columnsQuery = `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'auctions'
      ORDER BY ordinal_position;
    `
    
    const columnsResult = await client.query(columnsQuery)
    console.log('\n📋 Current auctions table columns:')
    
    const claimFields = ['nft_claimed', 'nft_reclaimed', 'claim_tx_hash', 'reclaim_tx_hash', 'claimed_at', 'reclaimed_at']
    const existingColumns = columnsResult.rows.map(row => row.column_name)
    
    columnsResult.rows.forEach(row => {
      const isClaimField = claimFields.includes(row.column_name)
      const icon = isClaimField ? '🎯' : '📝'
      console.log(`${icon} ${row.column_name} (${row.data_type}) - nullable: ${row.is_nullable} - default: ${row.column_default || 'none'}`)
    })
    
    // Check which claim fields are missing
    const missingFields = claimFields.filter(field => !existingColumns.includes(field))
    
    if (missingFields.length > 0) {
      console.log('\n❌ Missing claim fields:')
      missingFields.forEach(field => {
        console.log(`   - ${field}`)
      })
      console.log('\n💡 Run the add-claim-fields-to-auctions.ts script to add these fields.')
    } else {
      console.log('\n✅ All claim fields are present!')
    }
    
    // Test a simple query
    console.log('\n🧪 Testing simple query...')
    const testQuery = `SELECT auction_id, state, nft_claimed FROM auctions LIMIT 1`
    const testResult = await client.query(testQuery)
    console.log('✅ Query successful, sample data:', testResult.rows[0] || 'No data')
    
    client.release()
  } catch (error) {
    console.error('❌ Error checking database schema:', error)
    if (error instanceof Error) {
      console.error('Error details:', error.message)
    }
    process.exit(1)
  } finally {
    await pool.end()
  }
}

checkDatabaseSchema()