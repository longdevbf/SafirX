#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)();
const pg_1 = require("pg");
async function createAuctionsTable() {
    console.log('🚀 Creating auctions table...');
    if (!process.env.DATABASE_URL) {
        console.error('❌ DATABASE_URL environment variable is not set!');
        process.exit(1);
    }
    const pool = new pg_1.Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_URL?.includes('neon.tech') ? { rejectUnauthorized: false } : false,
    });
    try {
        console.log('🔍 Testing connection...');
        const client = await pool.connect();
        console.log('✅ Connected successfully!');
        // Create auctions table
        console.log('🔨 Creating auctions table...');
        await client.query(`
      CREATE TABLE IF NOT EXISTS auctions (
        id SERIAL PRIMARY KEY,
        auction_id BIGINT UNIQUE NOT NULL,  -- On-chain auction ID
        auction_type VARCHAR(20) NOT NULL CHECK (auction_type IN ('SINGLE_NFT', 'COLLECTION')),
        
        -- Basic auction info
        title VARCHAR(255) NOT NULL,
        description TEXT,
        seller_address VARCHAR(42) NOT NULL,
        
        -- NFT info
        nft_contract VARCHAR(42) NOT NULL,
        token_id BIGINT NULL,  -- For single NFT, NULL for collection
        token_ids JSONB NULL,  -- For collection, array of token IDs
        nft_count INTEGER NOT NULL DEFAULT 1,  -- 1 for single, count for collection
        
        -- Collection specific
        collection_image_url TEXT NULL,  -- Representative image for collection
        collection_image_drive_id VARCHAR(255) NULL,
        
        -- Auction parameters
        starting_price DECIMAL(20, 8) NOT NULL,
        reserve_price DECIMAL(20, 8) NOT NULL,
        min_bid_increment DECIMAL(20, 8) NOT NULL,
        
        -- Timing
        start_time TIMESTAMP NOT NULL,
        end_time TIMESTAMP NOT NULL,
        duration_hours INTEGER NOT NULL,
        
        -- State
        state VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (state IN ('ACTIVE', 'ENDED', 'FINALIZED', 'CANCELLED')),
        allow_public_reveal BOOLEAN NOT NULL DEFAULT FALSE,
        
        -- Results (filled when finalized)
        winner_address VARCHAR(42) NULL,
        final_price DECIMAL(20, 8) NULL,
        total_bids INTEGER DEFAULT 0,
        unique_bidders INTEGER DEFAULT 0,
        
        -- Metadata
        nft_metadata JSONB NULL,  -- Store NFT metadata for fast display
        
        -- Blockchain info
        creation_tx_hash VARCHAR(66) NOT NULL,
        finalization_tx_hash VARCHAR(66) NULL,
        
        -- Timestamps
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        finalized_at TIMESTAMP NULL
      )
    `);
        // Create indexes for performance
        console.log('📊 Creating indexes...');
        await client.query(`
      CREATE INDEX IF NOT EXISTS idx_auctions_auction_id ON auctions(auction_id);
      CREATE INDEX IF NOT EXISTS idx_auctions_seller ON auctions(seller_address);
      CREATE INDEX IF NOT EXISTS idx_auctions_state ON auctions(state);
      CREATE INDEX IF NOT EXISTS idx_auctions_end_time ON auctions(end_time);
      CREATE INDEX IF NOT EXISTS idx_auctions_nft_contract ON auctions(nft_contract);
      CREATE INDEX IF NOT EXISTS idx_auctions_type ON auctions(auction_type);
    `);
        // Create bid history table for finalized auctions
        console.log('🔨 Creating auction_bid_history table...');
        await client.query(`
      CREATE TABLE IF NOT EXISTS auction_bid_history (
        id SERIAL PRIMARY KEY,
        auction_id BIGINT NOT NULL REFERENCES auctions(auction_id),
        bidder_address VARCHAR(42) NOT NULL,
        bid_amount DECIMAL(20, 8) NOT NULL,
        bid_number INTEGER NOT NULL,
        bid_timestamp TIMESTAMP NOT NULL,
        visibility VARCHAR(20) DEFAULT 'HIDDEN' CHECK (visibility IN ('HIDDEN', 'REVEALED', 'AUTO_REVEALED')),
        
        -- Sync info
        synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        UNIQUE(auction_id, bidder_address)  -- One bid per bidder per auction
      )
    `);
        console.log('📊 Creating bid history indexes...');
        await client.query(`
      CREATE INDEX IF NOT EXISTS idx_bid_history_auction ON auction_bid_history(auction_id);
      CREATE INDEX IF NOT EXISTS idx_bid_history_bidder ON auction_bid_history(bidder_address);
      CREATE INDEX IF NOT EXISTS idx_bid_history_amount ON auction_bid_history(bid_amount DESC);
    `);
        // Create trigger to update updated_at
        console.log('⚡ Creating update trigger...');
        await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';
      
      DROP TRIGGER IF EXISTS update_auctions_updated_at ON auctions;
      CREATE TRIGGER update_auctions_updated_at
        BEFORE UPDATE ON auctions
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `);
        console.log('✅ Auctions table created successfully!');
        console.log('');
        console.log('📋 Table structure:');
        console.log('   - auctions: Main auction data (single NFT + collection)');
        console.log('   - auction_bid_history: Bid history for finalized auctions');
        console.log('');
        console.log('🎯 Ready for auction sync from blockchain!');
        client.release();
    }
    catch (error) {
        console.error('❌ Error creating auctions table:', error);
        process.exit(1);
    }
    finally {
        await pool.end();
    }
}
createAuctionsTable();
