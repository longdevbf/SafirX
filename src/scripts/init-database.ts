#!/usr/bin/env node

import { initializeDatabase, testConnection } from '../lib/db'

async function main() {
  console.log('🚀 Starting database initialization...')
  
  try {
    // Test connection first
    console.log('🔍 Testing database connection...')
    const connected = await testConnection()
    
    if (!connected) {
      console.error('❌ Database connection failed!')
      process.exit(1)
    }
    
    console.log('✅ Database connection successful!')
    
    // Initialize database tables
    console.log('🔨 Creating database tables...')
    await initializeDatabase()
    
    console.log('✅ Database initialization completed successfully!')
    console.log('📋 Created tables:')
    console.log('  - users')
    console.log('  - listings')
    console.log('  - auctions')
    console.log('  - indexes for performance')
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error)
    process.exit(1)
  }
}

// Run the script
main().catch(console.error)